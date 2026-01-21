import type { 
  AudioAnalysisResult, 
  AnalysisOptions, 
  AnalysisProgress,
  EngineStatus, 
  ExportResult, 
  ExportOptions,
  StreamingChunk 
} from '../types/audio';

/**
 * Professional Essentia.js Audio Analysis Engine
 * Research-grade music analysis with ML model support
 */
export class EssentiaAudioEngine {
  private audioContext: AudioContext | null = null;
  private analysisWorker: Worker | null = null;
  private isInitialized = false;
  private models = {
    loaded: false,
    modelCache: new Map<string, ArrayBuffer>()
  };
  private pendingPromises = new Map<number, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }>();
  private messageId = 0;

  constructor() {
    this.initialize();
  }

  async initialize(): Promise<boolean> {
    try {
      // Initialize service worker for asset preloading
      await this.initializeServiceWorker();
      
      // Initialize audio context
      const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextCtor({
        sampleRate: 44100,
        latencyHint: 'balanced'
      });

      // Initialize analysis worker
      await this.initializeWorker();
      
      this.isInitialized = true;
      console.log('Enhanced Essentia.js engine initialized with Web Worker');
      return true;
    } catch (error) {
      console.error('Failed to initialize enhanced engine:', error);
      return false;
    }
  }

  private async initializeServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('ServiceWorker registered:', registration.scope);
        
        // Request preloading of Essentia.js assets
        if (registration.active) {
          registration.active.postMessage({
            type: 'PRELOAD_ESSENTIA',
            urls: [
              'https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia-wasm.web.js',
              'https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia.wasm'
            ]
          });
        }
      } catch (error) {
        console.warn('ServiceWorker registration failed:', error);
      }
    }
  }

  private async initializeWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create worker with embedded Essentia.js analysis code
        const workerCode = this.getWorkerCode();
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.analysisWorker = new Worker(URL.createObjectURL(blob));

        this.analysisWorker.onmessage = (e) => {
          const { type, messageId, result, error } = e.data;
          
          if (type === 'WORKER_READY') {
            resolve();
          } else if (type === 'WORKER_ERROR') {
            reject(new Error(error));
          } else if (type === 'RESULT' || type === 'ERROR') {
            const promise = this.pendingPromises.get(messageId);
            if (promise) {
              this.pendingPromises.delete(messageId);
              if (type === 'RESULT') {
                promise.resolve(result);
              } else {
                promise.reject(new Error(error));
              }
            }
          }
        };

        this.analysisWorker.postMessage({ type: 'INIT' });
      } catch (error) {
        reject(error);
      }
    });
  }

  private getWorkerCode(): string {
    return `
      let essentia = null;
      let isInitialized = false;
      
      async function initializeEssentia() {
        try {
          const { Essentia, EssentiaWASM } = await import('https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia-wasm.web.js');
          essentia = new Essentia(EssentiaWASM);
          isInitialized = true;
          self.postMessage({ type: 'WORKER_READY' });
        } catch (error) {
          self.postMessage({ type: 'WORKER_ERROR', error: error.message });
        }
      }
      
      self.onmessage = async function(e) {
        const { type, data, messageId } = e.data;
        
        if (type === 'INIT') {
          await initializeEssentia();
          return;
        }
        
        if (!isInitialized) {
          self.postMessage({ 
            type: 'ERROR', 
            messageId, 
            error: 'Essentia not initialized' 
          });
          return;
        }
        
        try {
          let result;
          
          switch (type) {
            case 'ANALYZE_KEY':
              result = await analyzeKey(data.audioVector, data.sampleRate);
              break;
            case 'ANALYZE_TEMPO':
              result = await analyzeTempo(data.audioVector, data.sampleRate);
              break;
            case 'EXTRACT_FEATURES':
              result = await extractFeatures(data.audioVector, data.sampleRate);
              break;
            case 'FULL_ANALYSIS':
              result = await performFullAnalysis(data.audioVector, data.sampleRate);
              break;
            case 'EXTRACT_MFCC':
              result = await extractMFCC(data.audioVector, data.sampleRate);
              break;
            default:
              throw new Error('Unknown analysis type: ' + type);
          }
          
          self.postMessage({ 
            type: 'RESULT', 
            messageId, 
            result 
          });
        } catch (error) {
          self.postMessage({ 
            type: 'ERROR', 
            messageId, 
            error: error.message 
          });
        }
      };
      
      async function analyzeKey(audioVector, sampleRate) {
        const frameSize = 4096;
        const hopSize = 2048;
        
        const frames = essentia.FrameGenerator(audioVector, frameSize, hopSize);
        const windows = frames.map(frame => essentia.Windowing(frame).frame);
        const spectrums = windows.map(window => essentia.Spectrum(window).spectrum);
        
        const peaks = spectrums.map(spectrum => {
          const spectralPeaks = essentia.SpectralPeaks(spectrum);
          return {
            frequencies: spectralPeaks.frequencies,
            magnitudes: spectralPeaks.magnitudes
          };
        });

        const hpcpFrames = peaks.map(peak => {
          return essentia.HPCP(peak.frequencies, peak.magnitudes, {
            sampleRate: sampleRate,
            maxFrequency: 5000,
            minFrequency: 200,
            referenceFrequency: 440,
            harmonics: 8,
            bandPreset: true,
            weightType: 'cosine'
          }).hpcp;
        });

        const avgHPCP = new Array(12).fill(0);
        hpcpFrames.forEach(hpcp => {
          hpcp.forEach((val, idx) => avgHPCP[idx] += val);
        });
        avgHPCP.forEach((val, idx) => avgHPCP[idx] /= hpcpFrames.length);

        const keyEstimation = essentia.Key(avgHPCP, {
          profileType: 'krumhansl',
          usePolyphony: true,
          useThreeChords: true
        });

        return {
          key: keyEstimation.key,
          scale: keyEstimation.scale,
          confidence: keyEstimation.strength,
          hpcp: avgHPCP
        };
      }
      
      async function analyzeTempo(audioVector, sampleRate) {
        const frameSize = 1024;
        const hopSize = 512;
        
        const frames = essentia.FrameGenerator(audioVector, frameSize, hopSize);
        const windows = frames.map(frame => essentia.Windowing(frame).frame);
        const spectrums = windows.map(window => essentia.Spectrum(window).spectrum);
        
        const onsetRates = spectrums.map(spectrum => {
          return essentia.OnsetDetection(spectrum, {
            method: 'hfc',
            sampleRate: sampleRate
          }).onsetDetection;
        });

        const tempoEstimation = essentia.TempoTapDegara(onsetRates, {
          sampleRate: sampleRate / hopSize,
          maxTempo: 208,
          minTempo: 40
        });

        const rhythmExtraction = essentia.RhythmExtractor2013(audioVector, {
          method: 'degara',
          maxTempo: 208,
          minTempo: 40
        });

        return {
          bpm: Math.round(tempoEstimation.tempo || rhythmExtraction.bpm),
          confidence: tempoEstimation.confidence || 0.8,
          beats: rhythmExtraction.beats || [],
          ticks: rhythmExtraction.ticks || [],
          onsetRate: onsetRates
        };
      }
      
      async function extractFeatures(audioVector, sampleRate) {
        const frameSize = 2048;
        const hopSize = 1024;
        
        const frames = essentia.FrameGenerator(audioVector, frameSize, hopSize);
        const windows = frames.map(frame => essentia.Windowing(frame).frame);
        const spectrums = windows.map(window => essentia.Spectrum(window).spectrum);

        const features = spectrums.map(spectrum => {
          return {
            centroid: essentia.SpectralCentroid(spectrum).spectralCentroid,
            rolloff: essentia.SpectralRolloff(spectrum).spectralRolloff,
            flux: essentia.SpectralFlux(spectrum).spectralFlux,
            kurtosis: essentia.SpectralKurtosis(spectrum).spectralKurtosis,
            skewness: essentia.SpectralSkewness(spectrum).spectralSkewness,
            spread: essentia.SpectralSpread(spectrum).spectralSpread,
            brightness: essentia.SpectralBrightness(spectrum).spectralBrightness,
            roughness: essentia.SpectralRoughness(spectrum).spectralRoughness,
            energyBands: essentia.EnergyBand(spectrum, {
              startCutoffFrequency: 0,
              stopCutoffFrequency: sampleRate / 2
            }).energyBand
          };
        });

        const aggregated = {
          centroid: { mean: 0, std: 0 },
          rolloff: { mean: 0, std: 0 },
          flux: { mean: 0, std: 0 },
          brightness: { mean: 0, std: 0 },
          roughness: { mean: 0, std: 0 }
        };

        Object.keys(aggregated).forEach(feature => {
          const values = features.map(f => f[feature]).filter(v => !isNaN(v));
          if (values.length > 0) {
            aggregated[feature].mean = values.reduce((a, b) => a + b, 0) / values.length;
            const variance = values.reduce((a, b) => a + Math.pow(b - aggregated[feature].mean, 2), 0) / values.length;
            aggregated[feature].std = Math.sqrt(variance);
          }
        });

        return aggregated;
      }

      async function extractMFCC(audioVector, sampleRate) {
        const frameSize = 2048;
        const hopSize = 1024;
        
        const frames = essentia.FrameGenerator(audioVector, frameSize, hopSize);
        const windows = frames.map(frame => essentia.Windowing(frame).frame);
        const spectrums = windows.map(window => essentia.Spectrum(window).spectrum);

        const mfccs = spectrums.map(spectrum => {
          return essentia.MFCC(spectrum, {
            sampleRate: sampleRate,
            numberCoefficients: 13,
            lowFrequencyBound: 0,
            highFrequencyBound: sampleRate / 2
          }).mfcc;
        });

        if (mfccs.length === 0) return [];
        
        const avgMFCC = new Array(13).fill(0);
        mfccs.forEach(mfcc => {
          mfcc.forEach((coeff, idx) => {
            if (idx < avgMFCC.length) avgMFCC[idx] += coeff;
          });
        });
        avgMFCC.forEach((coeff, idx) => avgMFCC[idx] /= mfccs.length);

        return avgMFCC;
      }
      
      async function performFullAnalysis(audioVector, sampleRate) {
        const [keyAnalysis, tempoAnalysis, spectralFeatures, mfccFeatures] = await Promise.all([
          analyzeKey(audioVector, sampleRate),
          analyzeTempo(audioVector, sampleRate),
          extractFeatures(audioVector, sampleRate),
          extractMFCC(audioVector, sampleRate)
        ]);
        
        return {
          key: keyAnalysis,
          tempo: tempoAnalysis,
          spectral: spectralFeatures,
          mfcc: mfccFeatures,
          timestamp: Date.now()
        };
      }
    `;
  }

  async loadModels(): Promise<void> {
    try {
      console.log('Loading real Essentia.js ML models...');
      
      // Real model URLs for production deployment
      const modelUrls = {
        musicnn: 'https://essentia.upf.edu/models/tensorflow/musicnn-mtt-musicnn.pb',
        moodHappy: 'https://essentia.upf.edu/models/tensorflow/mood_happy-discogs-effnet-1.pb',
        moodSad: 'https://essentia.upf.edu/models/tensorflow/mood_sad-discogs-effnet-1.pb',
        danceability: 'https://essentia.upf.edu/models/tensorflow/danceability-discogs-effnet-1.pb',
        genre: 'https://essentia.upf.edu/models/tensorflow/genre_discogs400-discogs-effnet-1.pb'
      };

      const modelPromises = Object.entries(modelUrls).map(async ([modelName, url]) => {
        try {
          if (this.models.modelCache.has(modelName)) {
            return { modelName, model: this.models.modelCache.get(modelName) };
          }

          console.log(`Loading ${modelName} model...`);
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch ${modelName}: ${response.status}`);
          }
          
          const modelBuffer = await response.arrayBuffer();
          this.models.modelCache.set(modelName, modelBuffer);
          
          return { modelName, model: modelBuffer };
        } catch (error) {
          console.warn(`Failed to load ${modelName} model:`, error);
          return { modelName, model: null };
        }
      });

      const modelResults = await Promise.allSettled(modelPromises);
      
      modelResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.model) {
          const { modelName } = result.value;
          console.log(`✓ ${modelName} model loaded successfully`);
        }
      });

      this.models.loaded = true;
      console.log('Model loading complete');
      
    } catch (error) {
      console.error('Model loading failed:', error);
      this.models.loaded = false;
    }
  }

  private async analyze(type: string, data: unknown): Promise<any> {
    if (!this.analysisWorker || !this.isInitialized) {
      throw new Error('Worker not ready');
    }

    return new Promise((resolve, reject) => {
      const messageId = ++this.messageId;
      this.pendingPromises.set(messageId, { resolve, reject });
      
      this.analysisWorker!.postMessage({
        type,
        data,
        messageId
      });
    });
  }

  private async decodeAudioFile(file: File): Promise<AudioBuffer> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextCtor();
      
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      await audioContext.close();
      
      return audioBuffer;
    } catch (error) {
      throw new Error(`Failed to decode audio file: ${error}`);
    }
  }

  async analyzeFile(file: File, options: AnalysisOptions = {}): Promise<AudioAnalysisResult> {
    const audioBuffer = await this.decodeAudioFile(file);
    return this.analyzeAudio(audioBuffer, options);
  }

  async analyzeAudio(audioBuffer: AudioBuffer, options: AnalysisOptions = {}): Promise<AudioAnalysisResult> {
    if (!this.isInitialized) {
      throw new Error('Enhanced Essentia engine not initialized');
    }

    const audioVector = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    
    console.log('Running comprehensive enhanced analysis...');
    
    try {
      const startTime = performance.now();
      
      // Determine analysis strategy based on file size
      const useStreaming = duration > 300 || options.forceStreaming;
      
      let coreAnalysis;
      if (useStreaming) {
        console.log('Using streaming analysis for large file...');
        coreAnalysis = await this.analyzeStream(audioBuffer, options.progressCallback);
      } else {
        coreAnalysis = await this.analyze('FULL_ANALYSIS', {
          audioVector,
          sampleRate
        });
      }
      
      const processingTime = performance.now() - startTime;
      
      return {
        ...coreAnalysis,
        duration,
        sampleRate,
        channels: audioBuffer.numberOfChannels,
        analysisTimestamp: Date.now(),
        processingTime,
        essentiaVersion: 'Essentia.js v0.1.3',
        analysisType: useStreaming ? 'streaming' : 'full'
      };
    } catch (error) {
      console.error('Comprehensive analysis failed:', error);
      throw error;
    }
  }

  private async analyzeStream(audioBuffer: AudioBuffer, progressCallback?: (progress: AnalysisProgress) => void): Promise<Partial<AudioAnalysisResult>> {
    const chunkSize = 44100 * 30; // 30-second chunks
    const overlap = 44100 * 5; // 5-second overlap
    const audioVector = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    const results: StreamingChunk[] = [];
    const totalChunks = Math.ceil((audioVector.length - overlap) / (chunkSize - overlap));
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * (chunkSize - overlap);
      const end = Math.min(start + chunkSize, audioVector.length);
      const chunk = audioVector.slice(start, end);
      
      try {
        const chunkAnalysis = await this.analyze('FULL_ANALYSIS', {
          audioVector: chunk,
          sampleRate
        }) as Partial<AudioAnalysisResult>;
        
        results.push({
          ...chunkAnalysis,
          startTime: start / sampleRate,
          endTime: end / sampleRate,
          chunkIndex: i
        });
        
        if (progressCallback) {
          progressCallback({
            stage: 'analyzing',
            percentage: ((i + 1) / totalChunks) * 100,
            progress: (i + 1) / totalChunks,
            currentStep: `Analyzing chunk ${i + 1}/${totalChunks}`,
            completedSteps: []
          });
        }
      } catch (error) {
        console.error(`Chunk ${i} analysis failed:`, error);
      }
    }
    
    return this.aggregateStreamResults(results);
  }

  private aggregateStreamResults(chunks: StreamingChunk[]): Partial<AudioAnalysisResult> {
    if (chunks.length === 0) return {};
    
    // Aggregate tempo analysis with confidence weighting
    const tempoValues = chunks.map(c => ({ bpm: c.tempo?.bpm || 0, confidence: c.tempo?.confidence || 0 }));
    const weightedTempo = tempoValues.reduce((acc, curr) => {
      acc.totalBpm += curr.bpm * curr.confidence;
      acc.totalWeight += curr.confidence;
      return acc;
    }, { totalBpm: 0, totalWeight: 0 });
    
    const avgTempo = weightedTempo.totalWeight > 0 ? 
      Math.round(weightedTempo.totalBpm / weightedTempo.totalWeight) : 0;
    
    // Key detection with voting system
    const keyVotes: Record<string, number> = {};
    chunks.forEach(chunk => {
      const key = chunk.key?.key;
      if (key && key !== 'Unknown') {
        keyVotes[key] = (keyVotes[key] || 0) + (chunk.key?.confidence || 0);
      }
    });
    
    const dominantKey = Object.keys(keyVotes).reduce((a, b) => 
      keyVotes[a] > keyVotes[b] ? a : b, 'Unknown');
    
    // Average spectral features
    const spectralFeatures: Record<string, { mean: number; std: number }> = {};
    const firstChunk = chunks[0];
    if (firstChunk.spectral) {
      Object.keys(firstChunk.spectral).forEach(feature => {
        const values = chunks.map(c => {
          const spectralValue = c.spectral?.[feature];
          return (spectralValue && typeof spectralValue === 'object' && 'mean' in spectralValue) 
            ? spectralValue.mean 
            : undefined;
        }).filter(v => v !== undefined && !isNaN(v as number)) as number[];
        if (values.length > 0) {
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
          spectralFeatures[feature] = {
            mean,
            std: Math.sqrt(variance)
          };
        }
      });
    }
    
    return {
      key: { key: dominantKey, confidence: keyVotes[dominantKey] || 0, scale: 'major' },
      tempo: { bpm: avgTempo, confidence: weightedTempo.totalWeight / chunks.length },
      spectral: spectralFeatures as unknown as AudioAnalysisResult['spectral'],
      mfcc: chunks[0]?.mfcc || [],
      chunks: chunks.length,
      analysisType: 'streaming'
    };
  }

  exportResults(analysisData: AudioAnalysisResult, options: ExportOptions): ExportResult {
    const timestamp = new Date().toISOString();
    const filename = `harmonix_analysis_${timestamp.replace(/[:.]/g, '-')}`;
    
    switch (options.format) {
      case 'json':
        return {
          filename: `${filename}.json`,
          data: JSON.stringify(analysisData, null, 2),
          mimeType: 'application/json'
        };
      case 'csv':
        return {
          filename: `${filename}.csv`,
          data: this.convertToCSV(analysisData),
          mimeType: 'text/csv'
        };
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  private convertToCSV(data: AudioAnalysisResult): string {
    const rows: string[][] = [];
    
    rows.push(['Feature', 'Value', 'Confidence/Additional Info']);
    rows.push(['Duration', `${Math.floor(data.duration / 60)}:${String(Math.floor(data.duration % 60)).padStart(2, '0')}`, '']);
    rows.push(['Sample Rate', `${data.sampleRate}Hz`, '']);
    rows.push(['Channels', data.channels.toString(), '']);
    
    if (data.key) {
      rows.push(['Key', data.key.key, `Confidence: ${(data.key.confidence * 100).toFixed(1)}%`]);
    }
    if (data.tempo) {
      rows.push(['BPM', data.tempo.bpm.toString(), `Confidence: ${(data.tempo.confidence * 100).toFixed(1)}%`]);
    }
    
    if (data.spectral) {
      Object.entries(data.spectral).forEach(([feature, values]) => {
        if (values && typeof values === 'object' && 'mean' in values && 'std' in values) {
          rows.push([`Spectral ${feature}`, values.mean?.toFixed(3) || 'N/A', `Std: ${values.std?.toFixed(3) || 'N/A'}`]);
        }
      });
    }
    
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  getEngineStatus(): EngineStatus {
    return {
      status: !this.isInitialized ? 'loading' : 'ready',
      message: this.isInitialized ? 'Engine ready for analysis' : 'Initializing...',
      modelsLoaded: this.models.modelCache.size,
      totalModels: 5
    };
  }

  terminate(): void {
    if (this.analysisWorker) {
      this.analysisWorker.terminate();
      this.analysisWorker = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.isInitialized = false;
  }
}