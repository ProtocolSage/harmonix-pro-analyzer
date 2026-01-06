// EssentiaWorker.ts - Real Essentia.js Web Worker Implementation

// Essentia.js is loaded via importScripts, not ES modules.
// These declarations tell TypeScript that these variables exist in the global scope.
declare function importScripts(...urls: string[]): void;
declare let Essentia: any;
declare let EssentiaWASM: any;

import type { 
  AudioAnalysisResult, 
  AnalysisProgress, 
  SpectralFeatures,
  TempoAnalysis,
  KeyAnalysis 
} from '../types/audio';

interface WorkerMessage {
  type: 'INIT' | 'ANALYZE' | 'ANALYZE_CHUNK' | 'PROGRESS' | 'ERROR' | 'COMPLETE';
  payload?: any;
  id?: string;
}

interface AnalysisConfig {
  sampleRate: number;
  frameSize: number;
  hopSize: number;
  enableRealTime: boolean;
  chunkSize: number;
  analysisOptions: {
    spectral: boolean;
    tempo: boolean;
    key: boolean;
    mfcc: boolean;
    onset: boolean;
    chromagram: boolean;
  };
}

class EssentiaAnalysisWorker {
  private essentia: any = null;
  private isInitialized = false;
  private performanceMonitor = new Map<string, number>();

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const startTime = performance.now();
      
      // Load Essentia.js UMD bundles using importScripts.
      // The paths are absolute from the server root, as Vite serves the `public` directory there.
      importScripts(
        '/essentia/essentia.js-core.js',
        '/essentia/essentia-wasm.web.js'
      );

      const wasmModulePromiseOrValue = EssentiaWASM();

      let actualWasmModule;
      if (wasmModulePromiseOrValue && typeof wasmModulePromiseOrValue.then === 'function') {
        actualWasmModule = await wasmModulePromiseOrValue;
      } else {
        actualWasmModule = wasmModulePromiseOrValue;
      }

      this.essentia = new Essentia(actualWasmModule);
      
      this.isInitialized = true;
      
      const initTime = performance.now() - startTime;
      this.performanceMonitor.set('initialization', initTime);
      
      this.postMessage({
        type: 'INIT',
        payload: { 
          success: true, 
          initTime,
          version: this.essentia.version || '2.1.1'
        }
      });
    } catch (error) {
      this.postMessage({
        type: 'ERROR',
        payload: { 
          error: 'Failed to initialize Essentia.js WASM',
          details: error instanceof Error ? error.message : 'Unknown error',
          stage: 'initialization'
        }
      });
    }
  }

  private extractSpectralFeatures(audioVector: Float32Array, sampleRate: number): SpectralFeatures {
    const startTime = performance.now();
    
    try {
      // Windowing
      const windowed = this.essentia.Windowing(audioVector, true, 4096, "hann");
      
      // FFT
      const spectrum = this.essentia.Spectrum(windowed, 4096);
      
      // Spectral features
      const centroid = this.essentia.SpectralCentroid(spectrum, sampleRate);
      const rolloff = this.essentia.SpectralRolloff(spectrum, sampleRate);
      const flux = this.essentia.SpectralFlux(spectrum);
      const energy = this.essentia.Energy(spectrum);
      
      // Advanced spectral features
      const spectralComplexity = this.essentia.SpectralComplexity(spectrum, sampleRate);
      const spectralContrast = this.essentia.SpectralContrast(spectrum, sampleRate);
      const brightness = centroid / (sampleRate / 2); // Normalized brightness
      
      // Zero crossing rate for temporal texture
      const zcr = this.essentia.ZeroCrossingRate(audioVector);
      
      // Roughness estimation (simplified)
      const roughness = this.calculateRoughness(spectrum);
      
      // Spread calculation
      const spread = this.essentia.SpectralCentroid(
        spectrum.map((val: number, idx: number) => 
          val * Math.pow((idx * sampleRate / spectrum.length) - centroid, 2)
        ),
        sampleRate
      );

      const processingTime = performance.now() - startTime;
      this.performanceMonitor.set('spectral_features', processingTime);

      return {
        centroid: { mean: centroid, std: 0 },
        rolloff: { mean: rolloff, std: 0 },
        flux: { mean: flux, std: 0 },
        energy: { mean: energy, std: 0 },
        brightness: { mean: brightness, std: 0 },
        roughness: { mean: roughness, std: 0 },
        spread: { mean: spread, std: 0 },
        contrast: spectralContrast,
        complexity: spectralComplexity,
        zcr: { mean: zcr, std: 0 }
      };
    } catch (error) {
      throw new Error(`Spectral analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractTempoFeatures(audioVector: Float32Array, sampleRate: number): TempoAnalysis {
    const startTime = performance.now();
    
    try {
      // Onset detection for beat tracking
      const windowed = this.essentia.Windowing(audioVector, true, 1024, "hann");
      const spectrum = this.essentia.Spectrum(windowed, 1024);
      const melBands = this.essentia.MelBands(spectrum, sampleRate);
      
      // High Frequency Content for onset detection
      const hfc = this.essentia.HFC(spectrum);
      
      // Simplified tempo estimation using autocorrelation
      const tempo = this.estimateTempo(audioVector, sampleRate);
      const confidence = this.calculateTempoConfidence(audioVector, tempo, sampleRate);
      
      // Beat positions (simplified - real implementation would use more sophisticated beat tracking)
      const beats = this.detectBeats(audioVector, tempo, sampleRate);

      const processingTime = performance.now() - startTime;
      this.performanceMonitor.set('tempo_analysis', processingTime);

      return {
        bpm: Math.round(tempo),
        confidence: confidence,
        beats: beats,
        onset_strength: hfc,
        tempo_stability: this.calculateTempoStability(beats)
      };
    } catch (error) {
      throw new Error(`Tempo analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractKeyFeatures(audioVector: Float32Array, sampleRate: number): KeyAnalysis {
    const startTime = performance.now();
    
    try {
      // HPCP (Harmonic Pitch Class Profile) for key detection
      const windowed = this.essentia.Windowing(audioVector, true, 4096, "blackmanharris62");
      const spectrum = this.essentia.Spectrum(windowed, 4096);
      const spectralPeaks = this.essentia.SpectralPeaks(spectrum);
      
      // HPCP calculation
      const hpcp = this.essentia.HPCP(
        spectralPeaks.frequencies,
        spectralPeaks.magnitudes,
        sampleRate
      );
      
      // Key estimation from HPCP
      const keyResult = this.essentia.Key(hpcp);
      
      const processingTime = performance.now() - startTime;
      this.performanceMonitor.set('key_analysis', processingTime);

      return {
        key: keyResult.key,
        scale: keyResult.scale,
        confidence: keyResult.strength,
        hpcp: hpcp,
        tonic_frequency: this.calculateTonicFrequency(keyResult.key)
      };
    } catch (error) {
      throw new Error(`Key analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractMFCCFeatures(audioVector: Float32Array, sampleRate: number): number[] {
    const startTime = performance.now();
    
    try {
      const windowed = this.essentia.Windowing(audioVector, true, 2048, "hann");
      const spectrum = this.essentia.Spectrum(windowed, 2048);
      const melBands = this.essentia.MelBands(spectrum, sampleRate);
      const mfcc = this.essentia.MFCC(melBands);

      const processingTime = performance.now() - startTime;
      this.performanceMonitor.set('mfcc_extraction', processingTime);

      return mfcc;
    } catch (error) {
      throw new Error(`MFCC extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeAudioBuffer(
    audioBuffer: AudioBuffer, 
    config: AnalysisConfig,
    progressCallback: (progress: AnalysisProgress) => void
  ): Promise<AudioAnalysisResult> {
    
    if (!this.isInitialized) {
      throw new Error('Essentia worker not initialized');
    }

    const totalStartTime = performance.now();
    const audioData = audioBuffer.getChannelData(0); // Use first channel
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;

    // Initialize result object
    const result: AudioAnalysisResult = {
      duration,
      sampleRate,
      channels: audioBuffer.numberOfChannels,
      analysisTimestamp: Date.now()
    };

    try {
      // Step 1: Preprocessing
      progressCallback({
        stage: 'analyzing' as const,
        percentage: 10,
        progress: 0.1,
        currentStep: 'preprocessing',
        completedSteps: [],
        message: 'Preprocessing audio data...'
      });

      // Convert to mono if needed and normalize
      const processedAudio = this.preprocessAudio(audioData, sampleRate);

      // Step 2: Spectral Analysis
      if (config.analysisOptions.spectral) {
        progressCallback({
          stage: 'analyzing' as const,
          percentage: 20,
          progress: 0.2,
          currentStep: 'spectral',
          completedSteps: ['preprocessing'],
          message: 'Extracting spectral features...'
        });

        result.spectral = this.extractSpectralFeatures(processedAudio, sampleRate);
      }

      // Step 3: Tempo Analysis
      if (config.analysisOptions.tempo) {
        progressCallback({
          stage: 'analyzing' as const,
          percentage: 40,
          progress: 0.4,
          currentStep: 'tempo',
          completedSteps: ['preprocessing', 'spectral'],
          message: 'Analyzing tempo and rhythm...'
        });

        result.tempo = this.extractTempoFeatures(processedAudio, sampleRate);
      }

      // Step 4: Key Detection
      if (config.analysisOptions.key) {
        progressCallback({
          stage: 'analyzing' as const,
          percentage: 60,
          progress: 0.6,
          currentStep: 'key',
          completedSteps: ['preprocessing', 'spectral', 'tempo'],
          message: 'Detecting musical key...'
        });

        result.key = this.extractKeyFeatures(processedAudio, sampleRate);
      }

      // Step 5: MFCC Extraction
      if (config.analysisOptions.mfcc) {
        progressCallback({
          stage: 'analyzing' as const,
          percentage: 80,
          progress: 0.8,
          currentStep: 'mfcc',
          completedSteps: ['preprocessing', 'spectral', 'tempo', 'key'],
          message: 'Computing MFCC coefficients...'
        });

        result.mfcc = this.extractMFCCFeatures(processedAudio, sampleRate);
      }

      // Step 6: Finalization
      progressCallback({
        stage: 'analyzing' as const,
        percentage: 95,
        progress: 0.95,
        currentStep: 'finalization',
        completedSteps: ['preprocessing', 'spectral', 'tempo', 'key', 'mfcc'],
        message: 'Finalizing analysis...'
      });

      // Add performance metrics
      const totalTime = performance.now() - totalStartTime;
      result.performance = {
        totalAnalysisTime: totalTime,
        breakdown: Object.fromEntries(this.performanceMonitor),
        memoryUsage: this.getMemoryUsage()
      };

      progressCallback({
        progress: 1.0,
        stage: 'analyzing',
        percentage: 100,
        currentStep: 'finalization',
        completedSteps: ['preprocessing', 'spectral', 'tempo', 'key', 'mfcc', 'finalization'],
        message: 'Analysis complete!'
      });

      return result;

    } catch (error) {
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper methods
  private preprocessAudio(audioData: Float32Array, sampleRate: number): Float32Array {
    // Apply high-pass filter to remove DC offset
    const filtered = this.essentia.HighPass(audioData, 20, sampleRate);
    
    // Normalize audio
    const max = Math.max(...filtered.map(Math.abs));
    if (max > 0) {
      return filtered.map((sample: number) => sample / max);
    }
    return filtered;
  }

  private calculateRoughness(spectrum: Float32Array): number {
    // Simplified roughness calculation based on spectral irregularity
    let roughness = 0;
    for (let i = 1; i < spectrum.length - 1; i++) {
      roughness += Math.abs(spectrum[i] - (spectrum[i-1] + spectrum[i+1]) / 2);
    }
    return roughness / spectrum.length;
  }

  private estimateTempo(audioData: Float32Array, sampleRate: number): number {
    // Simplified tempo estimation using onset detection and autocorrelation
    const hopSize = 512;
    const frameSize = 1024;
    const onsetStrengths: number[] = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
      const frame = audioData.slice(i, i + frameSize);
      const windowed = this.essentia.Windowing(frame, true, frameSize, "hann");
      const spectrum = this.essentia.Spectrum(windowed, frameSize);
      const hfc = this.essentia.HFC(spectrum);
      onsetStrengths.push(hfc);
    }
    
    // Find tempo using autocorrelation of onset strength
    const tempo = this.autocorrelationTempo(onsetStrengths, sampleRate / hopSize);
    return Math.max(60, Math.min(180, tempo)); // Clamp to reasonable range
  }

  private autocorrelationTempo(onsetStrengths: number[], frameRate: number): number {
    const minTempo = 60;
    const maxTempo = 180;
    const minLag = Math.floor(60 * frameRate / maxTempo);
    const maxLag = Math.floor(60 * frameRate / minTempo);
    
    let maxCorr = 0;
    let bestLag = minLag;
    
    for (let lag = minLag; lag <= maxLag && lag < onsetStrengths.length / 2; lag++) {
      let correlation = 0;
      const validLength = onsetStrengths.length - lag;
      
      for (let i = 0; i < validLength; i++) {
        correlation += onsetStrengths[i] * onsetStrengths[i + lag];
      }
      
      correlation /= validLength;
      
      if (correlation > maxCorr) {
        maxCorr = correlation;
        bestLag = lag;
      }
    }
    
    return 60 * frameRate / bestLag;
  }

  private calculateTempoConfidence(audioData: Float32Array, tempo: number, sampleRate: number): number {
    // Simplified confidence calculation based on periodicity strength
    const beatInterval = 60 / tempo;
    const samplesPerBeat = beatInterval * sampleRate;
    
    let correlation = 0;
    let count = 0;
    
    for (let i = 0; i < audioData.length - samplesPerBeat; i += samplesPerBeat) {
      const segment1 = audioData.slice(i, i + samplesPerBeat / 4);
      const segment2 = audioData.slice(i + samplesPerBeat, i + samplesPerBeat + samplesPerBeat / 4);
      
      if (segment2.length === segment1.length) {
        let segmentCorr = 0;
        for (let j = 0; j < segment1.length; j++) {
          segmentCorr += segment1[j] * segment2[j];
        }
        correlation += segmentCorr / segment1.length;
        count++;
      }
    }
    
    return count > 0 ? Math.max(0, Math.min(1, correlation / count + 0.5)) : 0.5;
  }

  private detectBeats(audioData: Float32Array, tempo: number, sampleRate: number): number[] {
    const beatInterval = 60 / tempo;
    const beats: number[] = [];
    
    for (let time = 0; time < audioData.length / sampleRate; time += beatInterval) {
      beats.push(time);
    }
    
    return beats.slice(0, 32); // Limit to first 32 beats for performance
  }

  private calculateTempoStability(beats: number[]): number {
    if (beats.length < 2) return 0;
    
    const intervals = [];
    for (let i = 1; i < beats.length; i++) {
      intervals.push(beats[i] - beats[i-1]);
    }
    
    const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - meanInterval, 2), 0) / intervals.length;
    const stability = 1 / (1 + variance);
    
    return Math.max(0, Math.min(1, stability));
  }

  private calculateTonicFrequency(key: string): number {
    const keyToFreq: { [key: string]: number } = {
      'C': 261.63, 'C#': 277.18, 'Db': 277.18, 'D': 293.66, 'D#': 311.13, 'Eb': 311.13,
      'E': 329.63, 'F': 349.23, 'F#': 369.99, 'Gb': 369.99, 'G': 392.00, 'G#': 415.30,
      'Ab': 415.30, 'A': 440.00, 'A#': 466.16, 'Bb': 466.16, 'B': 493.88
    };
    return keyToFreq[key] || 440.0;
  }

  private getMemoryUsage(): number {
    // @ts-expect-error - performance.memory might not be available in all browsers
    if (typeof performance !== 'undefined' && performance.memory) {
      // @ts-expect-error - performance.memory is not in TypeScript lib but exists in Chrome
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  private postMessage(message: WorkerMessage): void {
    postMessage(message);
  }

  // Public method to handle messages from main thread
  public handleMessage(event: MessageEvent<WorkerMessage>): void {
    const { type, payload, id } = event.data;

    switch (type) {
      case 'ANALYZE':
        this.analyzeAudioBuffer(
          payload.audioBuffer,
          payload.config,
          (progress: AnalysisProgress) => {
            this.postMessage({
              type: 'PROGRESS',
              payload: progress,
              id
            });
          }
        ).then(result => {
          this.postMessage({
            type: 'COMPLETE',
            payload: result,
            id
          });
        }).catch(error => {
          this.postMessage({
            type: 'ERROR',
            payload: {
              error: error.message,
              details: error.stack,
              stage: 'analysis'
            },
            id
          });
        });
        break;
    }
  }
}

// Web Worker entry point
const worker = new EssentiaAnalysisWorker();

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  worker.handleMessage(event);
};
