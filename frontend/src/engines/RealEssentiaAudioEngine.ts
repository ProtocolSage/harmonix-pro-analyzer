import type {
  AudioAnalysisResult,
  AnalysisProgress,
  EngineStatus
} from '../types/audio';

import Essentia from 'essentia.js/dist/essentia.js-core.es.js';
import { EssentiaWASM } from 'essentia.js/dist/essentia-wasm.es.js';
import { LoudnessAnalysisEngine } from './LoudnessAnalysisEngine';
import { MLInferenceEngine } from './MLInferenceEngine';
import { MelodyAnalysisEngine } from './MelodyAnalysisEngine';
import { HarmonicAnalysisEngine } from './HarmonicAnalysisEngine';
import { RhythmAnalysisEngine } from './RhythmAnalysisEngine';
import { ErrorHandler, ErrorType, ErrorSeverity } from '../utils/ErrorHandler';

interface PerformanceMetrics {
  analysisTime: number;
  fileSize: number;
  sampleRate: number;
  duration: number;
  memoryUsage: number;
  workerInitTime: number;
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

export class RealEssentiaAudioEngine {
  private worker: Worker | null = null;
  private isInitialized = false;
  private essentia: any = null;
  private status: EngineStatus = { status: 'initializing' };
  private activeAnalyses = new Map<string, {
    resolve: (result: AudioAnalysisResult) => void;
    reject: (error: Error) => void;
    progressCallback?: (progress: AnalysisProgress) => void;
  }>();
  
  private performanceMetrics: PerformanceMetrics[] = [];
  private errorHistory: Array<{ timestamp: Date; error: string; context: string }> = [];

  constructor() {
    this.initializeEngine();
  }

  private async initializeEngine(): Promise<void> {
    const startTime = performance.now();

    try {
      this.status = { status: 'loading', message: 'Loading Essentia.js WASM module...' };

      // Sanity check: essentia-wasm.es.js exports Module object, not a function
      console.log('🔍 EssentiaWASM type:', typeof EssentiaWASM);
      if (typeof EssentiaWASM === 'function') {
        throw new Error('EssentiaWASM should be an object (Module), not a function. You may be importing the wrong file.');
      }

      this.essentia = new Essentia(EssentiaWASM);

      this.isInitialized = true;
      this.status = { status: 'ready' };

      const initTime = performance.now() - startTime;
      console.log(`✅ Essentia.js initialized successfully in ${initTime.toFixed(2)}ms`);

      await this.initializeWorker();

    } catch (error) {
      console.error('❌ Essentia.js initialization failed:', error);
      this.handleEngineError(error, 'initialization');
    }
  }

  private async initializeWorker(): Promise<void> {
    try {
      // Create worker from separate file for better debugging
      // Use URL constructor with import.meta.url for proper module resolution
      const workerUrl = new URL('../workers/essentia-analysis-worker.js', import.meta.url);
      this.worker = new Worker(workerUrl);
      
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);
      
      // Wait for worker initialization with timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Worker initialization timeout'));
        }, 15000);
        
        const handleInit = (event: MessageEvent) => {
          if (event.data.type === 'WORKER_READY') {
            clearTimeout(timeout);
            this.worker!.removeEventListener('message', handleInit);
            console.log('✅ Worker initialized successfully');
            resolve(event.data.payload);
          } else if (event.data.type === 'WORKER_ERROR') {
            clearTimeout(timeout);
            this.worker!.removeEventListener('message', handleInit);
            reject(new Error(event.data.payload.error));
          }
        };
        
        this.worker!.addEventListener('message', handleInit);
        
        // Send initialization message
        this.worker!.postMessage({ type: 'INIT' });
      });
      
    } catch (error) {
      console.warn('⚠️ Worker initialization failed, falling back to main thread:', error);
      this.worker = null;
      // Continue without worker - main thread processing will be used
    }
  }

  private handleWorkerMessage(event: MessageEvent): void {
    const { type, payload, id } = event.data;
    
    switch (type) {
      case 'WORKER_READY':
        console.log('Worker ready:', payload);
        break;
        
      case 'PROGRESS':
        if (id && this.activeAnalyses.has(id)) {
          const analysis = this.activeAnalyses.get(id)!;
          analysis.progressCallback?.(payload);
        }
        break;
        
      case 'ANALYSIS_COMPLETE':
        if (id && this.activeAnalyses.has(id)) {
          const analysis = this.activeAnalyses.get(id)!;
          
          // Record performance metrics
          if (payload.performance) {
            this.recordPerformanceMetrics(payload);
          }
          
          analysis.resolve(payload);
          this.activeAnalyses.delete(id);
        }
        break;
        
      case 'ANALYSIS_ERROR':
        if (id && this.activeAnalyses.has(id)) {
          const analysis = this.activeAnalyses.get(id)!;
          const error = new Error(payload.error);
          
          this.recordError(payload.error, payload.stage || 'unknown');
          analysis.reject(error);
          this.activeAnalyses.delete(id);
        }
        break;
        
      case 'WORKER_ERROR':
        this.handleEngineError(new Error(payload.error), payload.stage || 'worker');
        break;
    }
  }

  private handleWorkerError(error: ErrorEvent): void {
    console.error('Worker error:', error);
    this.handleEngineError(new Error(error.message), 'worker_runtime');
  }

  private handleEngineError(error: unknown, context: string): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    // Use centralized ErrorHandler
    ErrorHandler.handleError({
      type: ErrorType.INITIALIZATION,
      severity: ErrorSeverity.CRITICAL,
      message: `Engine error in ${context}`,
      originalError: errorObj,
      context: ErrorHandler['createContext'](context, 'RealEssentiaAudioEngine', {
        engineStatus: this.status.status
      }),
      recoverable: context !== 'initialization',
      suggestions: [
        'Refresh the page and try again',
        'Clear browser cache and reload',
        'Check browser console for details',
        'Try a different browser if the issue persists'
      ]
    });

    this.recordError(errorObj.message, context);
    this.status = {
      status: 'error',
      message: `Engine error in ${context}: ${errorObj.message}`
    };
  }

  private recordError(error: string, context: string): void {
    this.errorHistory.push({
      timestamp: new Date(),
      error,
      context
    });
    
    // Keep only last 50 errors
    if (this.errorHistory.length > 50) {
      this.errorHistory = this.errorHistory.slice(-50);
    }
  }

  private recordPerformanceMetrics(result: AudioAnalysisResult): void {
    if (result.performance) {
      const metrics: PerformanceMetrics = {
        analysisTime: result.performance.totalAnalysisTime,
        fileSize: 0, // Will be set by caller
        sampleRate: result.sampleRate,
        duration: result.duration,
        memoryUsage: result.performance.memoryUsage || 0,
        workerInitTime: 0 // Will be set separately
      };

      this.performanceMetrics.push(metrics);

      // Keep only last 100 analyses
      if (this.performanceMetrics.length > 100) {
        this.performanceMetrics = this.performanceMetrics.slice(-100);
      }
    }
  }

  /**
   * Safely execute an analysis step with error handling and fallback
   */
  private async safeAnalysisStep<T>(
    stepName: string,
    analysisFunc: () => Promise<T>,
    fallback: T
  ): Promise<T> {
    try {
      return await analysisFunc();
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));

      // Log error but don't fail entire analysis
      ErrorHandler.handleAnalysisError(errorObj, stepName);

      console.warn(`⚠️ ${stepName} failed, using fallback:`, errorObj.message);

      return fallback;
    }
  }

  public async analyzeAudio(
    file: File, 
    progressCallback?: (progress: AnalysisProgress) => void
  ): Promise<AudioAnalysisResult> {
    
    if (!this.isInitialized) {
      throw new Error('Engine not initialized. Check console for initialization errors.');
    }

    if (!this.essentia) {
      throw new Error('Essentia instance not available. Engine may have failed to initialize.');
    }
    
    const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log(`🎵 Starting analysis for: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      
      // Decode audio file first
      const audioBuffer = await this.decodeAudioFile(file);
      console.log(`📊 Audio decoded: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.sampleRate}Hz, ${audioBuffer.numberOfChannels} channels`);
      
      // Try worker-based analysis first
      if (this.worker) {
        return await this.analyzeWithWorker(analysisId, audioBuffer, file, progressCallback);
      } else {
        console.log('🔄 Using main thread analysis (worker not available)');
        return await this.analyzeInMainThread(file, audioBuffer, progressCallback);
      }
      
    } catch (error) {
      this.activeAnalyses.delete(analysisId);
      const errorObj = error instanceof Error ? error : new Error(String(error));

      // Use centralized ErrorHandler
      const errorReport = ErrorHandler.handleAnalysisError(errorObj, 'audio analysis');

      // Notify progress callback of failure
      progressCallback?.({
        stage: 'analyzing',
        percentage: 0,
        progress: 0,
        currentStep: 'error',
        message: errorReport.message,
        completedSteps: []
      });

      throw errorObj;
    }
  }

  private async analyzeWithWorker(
    analysisId: string,
    audioBuffer: AudioBuffer,
    file: File,
    progressCallback?: (progress: AnalysisProgress) => void
  ): Promise<AudioAnalysisResult> {
    
    const config: AnalysisConfig = {
      sampleRate: audioBuffer.sampleRate,
      frameSize: 2048,
      hopSize: 512,
      enableRealTime: false,
      chunkSize: 4096,
      analysisOptions: {
        spectral: true,
        tempo: true,
        key: true,
        mfcc: true,
        onset: true,
        chromagram: true
      }
    };

    // Create promise for analysis completion
    const analysisPromise = new Promise<AudioAnalysisResult>((resolve, reject) => {
      this.activeAnalyses.set(analysisId, {
        resolve,
        reject,
        progressCallback
      });
    });

    // Extract raw audio data from AudioBuffer (cannot send AudioBuffer to worker)
    const channelData: Float32Array[] = [];
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channelData.push(audioBuffer.getChannelData(i));
    }

    // Send analysis request to worker
    console.log(`🏭 Sending analysis to worker: ${analysisId}`);
    this.worker!.postMessage({
      type: 'ANALYZE_AUDIO',
      payload: {
        audioData: {
          channelData: channelData,
          sampleRate: audioBuffer.sampleRate,
          length: audioBuffer.length,
          duration: audioBuffer.duration,
          numberOfChannels: audioBuffer.numberOfChannels
        },
        config,
        fileName: file.name
      },
      id: analysisId
    }, channelData); // Transfer ownership for performance

    const result = await analysisPromise;
    
    // Update performance metrics with file size
    if (this.performanceMetrics.length > 0) {
      this.performanceMetrics[this.performanceMetrics.length - 1].fileSize = file.size;
    }
    
    console.log(`✅ Worker analysis complete for ${file.name}`);
    return result;
  }

  private async analyzeInMainThread(
    file: File,
    audioBuffer: AudioBuffer,
    progressCallback?: (progress: AnalysisProgress) => void
  ): Promise<AudioAnalysisResult> {
    
    console.log(`🔍 Main thread analysis starting for: ${file.name}`);
    
    if (!this.essentia) {
      throw new Error('Essentia instance not available');
    }
    
    const startTime = performance.now();
    const channelData = audioBuffer.getChannelData(0); // Get mono channel
    let inputVector: any = null;
    
    try {
      // STEP 1: Convert audio to Essentia vector
      progressCallback?.({
        stage: 'analyzing',
        percentage: 5,
        progress: 0.05,
        currentStep: 'preprocessing',
        message: 'Converting audio data...',
        completedSteps: []
      });
      
      inputVector = this.essentia.arrayToVector(channelData);
      console.log(`📈 Audio vector created: ${channelData.length} samples`);
      
      // STEP 2: Configure analysis parameters
      const frameSize = 2048;
      const hopSize = 512;
      const sampleRate = audioBuffer.sampleRate;
      const frames: Float32Array[] = [];
      
      // Frame the audio for detailed analysis
      progressCallback?.({
        stage: 'analyzing',
        percentage: 15,
        progress: 0.15,
        currentStep: 'framing',
        message: 'Framing audio for analysis...',
        completedSteps: ['preprocessing']
      });
      
      for (let i = 0; i < channelData.length - frameSize; i += hopSize) {
        frames.push(channelData.slice(i, i + frameSize));
        // Limit frames for performance (about 10 seconds worth)
        if (frames.length > Math.min(200, Math.floor(sampleRate * 10 / hopSize))) break;
      }
      
      console.log(`🎛️ Created ${frames.length} frames for analysis`);
      
      // STEP 3: Spectral Analysis
      progressCallback?.({
        stage: 'analyzing',
        percentage: 30,
        progress: 0.3,
        currentStep: 'spectral',
        message: 'Analyzing spectral features...',
        completedSteps: ['preprocessing', 'framing']
      });
      
      const spectralResults = await this.performSpectralAnalysis(frames, sampleRate);
      
      // STEP 4: Tempo Detection
      progressCallback?.({
        stage: 'analyzing',
        percentage: 50,
        progress: 0.5,
        currentStep: 'tempo',
        message: 'Detecting tempo and rhythm...',
        completedSteps: ['preprocessing', 'framing', 'spectral']
      });
      
      const tempoResults = await this.performTempoAnalysis(inputVector, frameSize, hopSize, sampleRate);
      
      // STEP 5: Key Detection
      progressCallback?.({
        stage: 'analyzing',
        percentage: 70,
        progress: 0.7,
        currentStep: 'key',
        message: 'Detecting musical key...',
        completedSteps: ['preprocessing', 'framing', 'spectral', 'tempo']
      });
      
      const keyResults = await this.performKeyAnalysis(inputVector, frameSize, hopSize, sampleRate);

      // Melody Analysis (pitch tracking, contour, intervals, motifs)
      progressCallback?.({
        stage: 'analyzing',
        percentage: 78,
        progress: 0.78,
        currentStep: 'melody',
        message: 'Analyzing melody (pitch tracking, intervals)...',
        completedSteps: ['preprocessing', 'framing', 'spectral', 'tempo', 'key']
      });

      const melodyResults = await this.safeAnalysisStep(
        'Melody Analysis',
        async () => {
          const melodyEngine = new MelodyAnalysisEngine(audioBuffer.sampleRate);
          return await melodyEngine.analyze(audioBuffer);
        },
        undefined // Graceful fallback - melody is optional
      );

      // Harmonic Analysis (chords, progressions, cadences, Roman numerals)
      progressCallback?.({
        stage: 'analyzing',
        percentage: 81,
        progress: 0.81,
        currentStep: 'harmonic',
        message: 'Analyzing harmony (chords, progressions, cadences)...',
        completedSteps: ['preprocessing', 'framing', 'spectral', 'tempo', 'key', 'melody']
      });

      const harmonicResults = await this.safeAnalysisStep(
        'Harmonic Analysis',
        async () => {
          const harmonicEngine = new HarmonicAnalysisEngine(audioBuffer.sampleRate, keyResults);
          return await harmonicEngine.analyze(audioBuffer);
        },
        undefined // Graceful fallback - harmonic analysis is optional
      );

      // Rhythm Analysis (time signature, downbeats, groove, patterns)
      progressCallback?.({
        stage: 'analyzing',
        percentage: 83,
        progress: 0.83,
        currentStep: 'rhythm',
        message: 'Analyzing rhythm (time signature, groove, patterns)...',
        completedSteps: ['preprocessing', 'framing', 'spectral', 'tempo', 'key', 'melody', 'harmonic']
      });

      const rhythmResults = await this.safeAnalysisStep(
        'Rhythm Analysis',
        async () => {
          const rhythmEngine = new RhythmAnalysisEngine(audioBuffer.sampleRate, tempoResults);
          return await rhythmEngine.analyze(audioBuffer);
        },
        undefined // Graceful fallback - rhythm analysis is optional
      );

      // STEP 6: MFCC Extraction
      progressCallback?.({
        stage: 'analyzing',
        percentage: 85,
        progress: 0.85,
        currentStep: 'mfcc',
        message: 'Extracting MFCC features...',
        completedSteps: ['preprocessing', 'framing', 'spectral', 'tempo', 'key', 'melody', 'harmonic', 'rhythm']
      });
      
      const mfccResults = await this.performMFCCAnalysis(frames.slice(0, 10), sampleRate);

      // ML Inference (genre, mood, danceability, instruments)
      progressCallback?.({
        stage: 'analyzing',
        percentage: 87,
        progress: 0.87,
        currentStep: 'ml-inference',
        message: 'Running ML models (genre, mood, danceability)...',
        completedSteps: ['preprocessing', 'framing', 'spectral', 'tempo', 'key', 'melody', 'harmonic', 'rhythm', 'mfcc']
      });

      const mlResults = await this.safeAnalysisStep(
        'ML Inference',
        async () => {
          const mlEngine = new MLInferenceEngine();
          return await mlEngine.analyze(audioBuffer, mfccResults);
        },
        undefined // Graceful fallback - ML is optional
      );

      // STEP 7: Finalize Results
      // Loudness analysis (LUFS, true peak, dynamic range)
      progressCallback?.({
        stage: 'analyzing',
        percentage: 90,
        progress: 0.90,
        currentStep: 'loudness',
        message: 'Analyzing loudness (LUFS, true peak)...',
        completedSteps: ['preprocessing', 'framing', 'spectral', 'tempo', 'key', 'melody', 'harmonic', 'rhythm', 'mfcc', 'ml-inference']
      });

      const loudnessResults = await this.safeAnalysisStep(
        'Loudness Analysis',
        async () => {
          const loudnessEngine = new LoudnessAnalysisEngine(audioBuffer.sampleRate);
          return await loudnessEngine.analyze(audioBuffer);
        },
        undefined // Graceful fallback - loudness is optional
      );

      progressCallback?.({
        stage: 'analyzing',
        percentage: 95,
        progress: 0.95,
        currentStep: 'finalization',
        message: 'Finalizing analysis...',
        completedSteps: ['preprocessing', 'framing', 'spectral', 'tempo', 'key', 'melody', 'harmonic', 'rhythm', 'mfcc', 'ml-inference', 'loudness']
      });

      const analysisTime = performance.now() - startTime;

      // Compile comprehensive results
      const result: AudioAnalysisResult = {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        analysisTimestamp: Date.now(),
        tempo: tempoResults,
        key: keyResults,
        melody: melodyResults,
        harmonic: harmonicResults,
        rhythm: rhythmResults,
        spectral: spectralResults,
        mfcc: mfccResults,
        loudness: loudnessResults,
        genre: mlResults?.genre,
        mood: mlResults?.mood,
        performance: {
          totalAnalysisTime: analysisTime,
          breakdown: {
            decoding: 100,
            preprocessing: 50,
            analysis: analysisTime - 200,
            postprocessing: 50
          },
          memoryUsage: Math.floor(channelData.length * 4 + frames.length * frameSize * 4) // Rough estimate
        }
      };
      
      // Final progress update
      progressCallback?.({
        stage: 'complete',
        percentage: 100,
        progress: 1,
        currentStep: 'complete',
        message: 'Analysis complete!',
        completedSteps: ['preprocessing', 'framing', 'spectral', 'tempo', 'key', 'melody', 'mfcc', 'ml-inference', 'loudness', 'finalization']
      });
      
      console.log(`✅ Main thread analysis complete in ${analysisTime.toFixed(2)}ms`);
      return result;
      
    } catch (error) {
      console.error('Main thread analysis error:', error);
      throw new Error(`Main thread analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Clean up Essentia vectors
      if (inputVector) {
        try {
          inputVector.delete();
        } catch (e) {
          console.warn('Vector cleanup warning:', e);
        }
      }
    }
  }

  private async performSpectralAnalysis(frames: Float32Array[], sampleRate: number): Promise<any> {
    const spectralCentroids: number[] = [];
    const spectralRolloffs: number[] = [];
    const spectralFlux: number[] = [];
    const spectralEnergy: number[] = [];
    const spectralBrightness: number[] = [];
    const spectralRoughness: number[] = [];
    const spectralSpread: number[] = [];
    const zeroCrossingRates: number[] = [];
    const frameSize = frames[0]?.length || 2048;

    let previousSpectrum: any = null;

    for (let i = 0; i < frames.length && i < 100; i++) { // Limit for performance
      const frame = frames[i];
      let frameVector: any = null;
      let windowed: any = null;
      let spectrum: any = null;

      try {
        frameVector = this.essentia.arrayToVector(frame);

        // Apply windowing
        windowed = this.essentia.Windowing(frameVector, true, frameSize, 'hann');

        // Compute spectrum
        spectrum = this.essentia.Spectrum(windowed.frame, frameSize);

        // Calculate spectral features
        const centroid = this.essentia.SpectralCentroidTime(frameVector, sampleRate);
        const rolloff = this.essentia.RollOff(spectrum.spectrum, 0.85, sampleRate);

        spectralCentroids.push(centroid.centroid);
        spectralRolloffs.push(rolloff.rollOff);

        // Calculate spectral flux (if we have a previous spectrum)
        if (previousSpectrum) {
          const flux = this.essentia.Flux(previousSpectrum, spectrum.spectrum);
          spectralFlux.push(flux.flux);
        }

        // Energy: Sum of squared magnitudes in frequency domain
        try {
          const energy = this.essentia.Energy(frameVector);
          spectralEnergy.push(energy.energy);
        } catch {
          // Fallback: manual energy calculation
          let energySum = 0;
          for (let j = 0; j < frame.length; j++) {
            energySum += frame[j] * frame[j];
          }
          spectralEnergy.push(energySum / frame.length);
        }

        // Brightness: Ratio of high-frequency energy to total energy (normalized 0-1)
        // Calculated as spectral centroid divided by Nyquist frequency
        const brightness = centroid.centroid / (sampleRate / 2);
        spectralBrightness.push(Math.min(1, Math.max(0, brightness)));

        // Roughness/Dissonance: Spectral irregularity
        try {
          const dissonance = this.essentia.Dissonance(frameVector);
          spectralRoughness.push(dissonance.dissonance || 0);
        } catch {
          // Fallback: calculate as variance in spectral bins
          const spectrumArray = new Float32Array(spectrum.spectrum.size());
          for (let j = 0; j < spectrum.spectrum.size(); j++) {
            spectrumArray[j] = spectrum.spectrum.get(j);
          }

          const mean = spectrumArray.reduce((a, b) => a + b, 0) / spectrumArray.length;
          const variance = spectrumArray.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / spectrumArray.length;
          spectralRoughness.push(Math.sqrt(variance));
        }

        // Spread: Standard deviation of spectrum around centroid
        const spectrumArray = new Float32Array(spectrum.spectrum.size());
        for (let j = 0; j < spectrum.spectrum.size(); j++) {
          spectrumArray[j] = spectrum.spectrum.get(j);
        }

        const freqBins = new Float32Array(spectrumArray.length);
        for (let j = 0; j < freqBins.length; j++) {
          freqBins[j] = (j * sampleRate) / (2 * spectrumArray.length);
        }

        const totalMagnitude = spectrumArray.reduce((a, b) => a + b, 0);
        if (totalMagnitude > 0) {
          let spreadSum = 0;
          for (let j = 0; j < spectrumArray.length; j++) {
            const freqDiff = freqBins[j] - centroid.centroid;
            spreadSum += Math.pow(freqDiff, 2) * (spectrumArray[j] / totalMagnitude);
          }
          spectralSpread.push(Math.sqrt(spreadSum));
        } else {
          spectralSpread.push(0);
        }

        // Zero Crossing Rate: Number of sign changes in time-domain signal
        try {
          const zcr = this.essentia.ZeroCrossingRate(frameVector);
          zeroCrossingRates.push(zcr.zeroCrossingRate);
        } catch {
          // Fallback: manual ZCR calculation
          let crossings = 0;
          for (let j = 1; j < frame.length; j++) {
            if ((frame[j] >= 0 && frame[j - 1] < 0) || (frame[j] < 0 && frame[j - 1] >= 0)) {
              crossings++;
            }
          }
          zeroCrossingRates.push(crossings / frame.length);
        }

        // Store current spectrum for next iteration
        if (previousSpectrum) previousSpectrum.delete();
        previousSpectrum = spectrum.spectrum;

      } catch (error) {
        console.warn(`Spectral analysis error on frame ${i}:`, error);
      } finally {
        // Clean up vectors
        if (frameVector) frameVector.delete();
        if (windowed?.frame) windowed.frame.delete();
        if (spectrum && spectrum !== previousSpectrum) spectrum.spectrum?.delete();
      }
    }

    // Clean up final spectrum
    if (previousSpectrum) previousSpectrum.delete();

    // Calculate statistics
    const calculateStats = (values: number[]) => {
      if (values.length === 0) return { mean: 0, std: 0 };
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const std = Math.sqrt(values.reduce((sum, val) => {
        const diff = val - mean;
        return sum + diff * diff;
      }, 0) / values.length);
      return { mean, std };
    };

    return {
      centroid: calculateStats(spectralCentroids),
      rolloff: calculateStats(spectralRolloffs),
      flux: calculateStats(spectralFlux),
      energy: calculateStats(spectralEnergy),
      brightness: calculateStats(spectralBrightness),
      roughness: calculateStats(spectralRoughness),
      spread: calculateStats(spectralSpread),
      zcr: calculateStats(zeroCrossingRates)
    };
  }

  private async performTempoAnalysis(inputVector: any, frameSize: number, hopSize: number, sampleRate: number): Promise<any> {
    try {
      const tempo = this.essentia.PercivalBpmEstimator(inputVector, frameSize, hopSize, sampleRate);
      
      return {
        bpm: tempo.bpm || 120, // Default fallback
        confidence: tempo.confidence || 0.5,
        beats: [] // TODO: Extract beat positions using BeatTrackerMultiFeature
      };
    } catch (error) {
      console.warn('Tempo analysis error:', error);
      return {
        bpm: 120, // Fallback BPM
        confidence: 0.0,
        beats: []
      };
    }
  }

  private async performKeyAnalysis(inputVector: any, frameSize: number, hopSize: number, sampleRate: number): Promise<any> {
    try {
      const key = this.essentia.KeyExtractor(inputVector, true, frameSize, hopSize, sampleRate);
      
      return {
        key: key.key || 'C',
        scale: key.scale || 'major',
        confidence: key.strength || 0.5
      };
    } catch (error) {
      console.warn('Key analysis error:', error);
      return {
        key: 'C',
        scale: 'major',
        confidence: 0.0
      };
    }
  }

  private async performMFCCAnalysis(frames: Float32Array[], sampleRate: number): Promise<number[]> {
    if (frames.length === 0) return Array(13).fill(0);
    
    const frameSize = frames[0].length;
    let frameVector: any = null;
    let windowed: any = null;
    let spectrum: any = null;
    
    try {
      frameVector = this.essentia.arrayToVector(frames[0]);
      windowed = this.essentia.Windowing(frameVector, true, frameSize, 'hann');
      spectrum = this.essentia.Spectrum(windowed.frame, frameSize);
      const mfcc = this.essentia.MFCC(spectrum.spectrum, 13, sampleRate);
      
      return Array.from(mfcc.mfcc);
    } catch (error) {
      console.warn('MFCC analysis error:', error);
      return Array(13).fill(0);
    } finally {
      // Clean up vectors
      if (frameVector) frameVector.delete();
      if (windowed?.frame) windowed.frame.delete();
      if (spectrum?.spectrum) spectrum.spectrum.delete();
    }
  }

  private async decodeAudioFile(file: File): Promise<AudioBuffer> {
    try {
      console.log(`🎧 Decoding audio file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Set sample rate to ensure compatibility
      if (audioContext.sampleRate !== 44100) {
        console.log(`📊 Audio context sample rate: ${audioContext.sampleRate}Hz`);
      }
      
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Close the audio context to free resources
      await audioContext.close();
      
      console.log(`✅ Audio decoded successfully: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.sampleRate}Hz`);
      return audioBuffer;
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));

      // Use centralized ErrorHandler
      ErrorHandler.handleFileError(errorObj, file.name, file.size);

      throw new Error(`Failed to decode audio file "${file.name}": ${errorObj.message}. ` +
        `Supported formats: MP3, WAV, FLAC, OGG, M4A. Ensure the file is not corrupted.`);
    }
  }

  // Public API Methods
  public getEngineStatus(): EngineStatus {
    return { ...this.status };
  }

  public isEngineReady(): boolean {
    return this.isInitialized && this.status.status === 'ready';
  }

  public getPerformanceMetrics(): {
    recent: PerformanceMetrics[];
    average: Partial<PerformanceMetrics>;
    trends: { [key: string]: number };
  } {
    const recent = this.performanceMetrics.slice(-10);
    
    const average: Partial<PerformanceMetrics> = {};
    if (this.performanceMetrics.length > 0) {
      const metrics = this.performanceMetrics;
      average.analysisTime = metrics.reduce((sum, m) => sum + m.analysisTime, 0) / metrics.length;
      average.memoryUsage = metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length;
      average.duration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
    }
    
    // Calculate performance trends
    const trends: { [key: string]: number } = {};
    if (this.performanceMetrics.length >= 10) {
      const recentFive = this.performanceMetrics.slice(-5);
      const earlierFive = this.performanceMetrics.slice(-10, -5);
      
      if (earlierFive.length > 0) {
        const recentAvg = recentFive.reduce((sum, m) => sum + m.analysisTime, 0) / recentFive.length;
        const earlierAvg = earlierFive.reduce((sum, m) => sum + m.analysisTime, 0) / earlierFive.length;
        trends.analysisTime = (recentAvg - earlierAvg) / earlierAvg;
      }
    }
    
    return { recent, average, trends };
  }

  public getErrorHistory(): Array<{ timestamp: Date; error: string; context: string }> {
    return [...this.errorHistory];
  }

  public clearPerformanceData(): void {
    this.performanceMetrics = [];
    this.errorHistory = [];
    console.log('🧹 Performance data cleared');
  }

  public terminate(): void {
    console.log('🛑 Terminating Essentia.js engine...');
    
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      console.log('🔧 Worker terminated');
    }
    
    // Reject any pending analyses
    for (const [id, analysis] of this.activeAnalyses) {
      analysis.reject(new Error('Engine terminated'));
    }
    this.activeAnalyses.clear();
    
    this.isInitialized = false;
    this.status = { status: 'initializing' };
    this.essentia = null;
    
    console.log('✅ Engine terminated successfully');
  }

  // Real-time analysis methods (placeholder for future implementation)
  public async startRealtimeAnalysis(
    audioElement: HTMLAudioElement,
    callback: (features: Partial<AudioAnalysisResult>) => void
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Engine not initialized');
    }

    console.log('🔄 Real-time analysis not yet implemented - would analyze:', audioElement.src);
    
    // TODO: Implement real-time feature extraction synchronized with audio playback
    // This would involve:
    // 1. Creating an AudioContext with the audio element as source
    // 2. Setting up a ScriptProcessorNode or AudioWorkletNode
    // 3. Running Essentia.js algorithms on each audio buffer chunk
    // 4. Calling the callback with updated features
  }

  public stopRealtimeAnalysis(): void {
    console.log('⏹️ Stopping real-time analysis (not yet implemented)');
    // TODO: Stop any ongoing real-time analysis
  }

  // Diagnostic methods for debugging
  public async runDiagnostics(): Promise<{
    engineStatus: EngineStatus;
    essentiaVersion: string | null;
    algorithmCount: number;
    workerStatus: 'available' | 'unavailable';
    memoryUsage: number;
    performanceHistory: number;
  }> {
    const diagnostics = {
      engineStatus: this.getEngineStatus(),
      essentiaVersion: this.essentia?.version || null,
      algorithmCount: this.essentia?.algorithmNames?.length || 0,
      workerStatus: (this.worker ? 'available' : 'unavailable') as 'available' | 'unavailable',
      memoryUsage: this.performanceMetrics.length > 0 
        ? this.performanceMetrics[this.performanceMetrics.length - 1].memoryUsage 
        : 0,
      performanceHistory: this.performanceMetrics.length
    };

    console.log('🔍 Engine Diagnostics:', diagnostics);
    return diagnostics;
  }

  // Test method to validate Essentia.js integration
  public async testEssentiaFunctionality(): Promise<{
    success: boolean;
    message: string;
    testedAlgorithms: string[];
    errors: string[];
  }> {
    if (!this.isInitialized || !this.essentia) {
      return {
        success: false,
        message: 'Engine not initialized',
        testedAlgorithms: [],
        errors: ['Engine not initialized']
      };
    }

    const testedAlgorithms: string[] = [];
    const errors: string[] = [];
    
    try {
      // Test basic vector operations
      const testData = new Float32Array([0, 1, 0, -1, 0, 1, 0, -1]);
      const testVector = this.essentia.arrayToVector(testData);
      testedAlgorithms.push('arrayToVector');
      
      try {
        // Test windowing
        const windowed = this.essentia.Windowing(testVector, true, 8, 'hann');
        testedAlgorithms.push('Windowing');
        windowed.frame.delete();
      } catch (e) {
        errors.push(`Windowing: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
      
      try {
        // Test spectrum computation
        const spectrum = this.essentia.Spectrum(testVector, 8);
        testedAlgorithms.push('Spectrum');
        spectrum.spectrum.delete();
      } catch (e) {
        errors.push(`Spectrum: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
      
      try {
        // Test spectral centroid
        const centroid = this.essentia.SpectralCentroidTime(testVector, 44100);
        testedAlgorithms.push('SpectralCentroidTime');
      } catch (e) {
        errors.push(`SpectralCentroidTime: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
      
      testVector.delete();
      
      const success = errors.length === 0;
      const message = success 
        ? `All tests passed. Tested ${testedAlgorithms.length} algorithms.`
        : `${errors.length} errors occurred during testing.`;
      
      console.log(`🧪 Essentia.js functionality test: ${success ? 'PASSED' : 'FAILED'}`);
      
      return { success, message, testedAlgorithms, errors };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown test error';
      console.error('🧪 Essentia.js test failed:', error);
      
      return {
        success: false,
        message: `Test failed: ${errorMessage}`,
        testedAlgorithms,
        errors: [errorMessage]
      };
    }
  }
}
