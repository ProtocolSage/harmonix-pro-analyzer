import type { AudioAnalysisResult, AnalysisProgress, FeatureToggles, EngineConfig } from '../types/audio';
import { PerformanceMonitor, PerformanceCategory } from '../utils/PerformanceMonitor';
import { warnUnsupportedFeatureToggles } from './featureToggleUtils';
import { handleAnalysisError, handlePerformanceError } from '../utils/ErrorHandler';
import { mergeStreamingResults } from './streamingAnalysisCore';

export interface StreamingAnalysisConfig {
  chunkSize: number; // Size of each audio chunk in samples
  overlapSize: number; // Overlap between chunks in samples
  maxFileSize: number; // Maximum file size for streaming analysis
  frameSize: number;
  hopSize: number;
  analysisFeatures: {
    spectral: boolean;
    tempo: boolean;
    key: boolean;
    mfcc: boolean;
    onset: boolean;
    segments: boolean;
    mlClassification: boolean;
  };
  enableProgressiveResults: boolean; // Return partial results during analysis
  memoryLimit: number; // Memory limit in bytes
}

export interface StreamingFeatureToggles {
  spectral?: boolean;
  tempo?: boolean;
  key?: boolean;
  mfcc?: boolean;
  onset?: boolean;
  segments?: boolean;
  mlClassification?: boolean;
}

export interface StreamingChunk {
  index: number;
  startTime: number;
  endTime: number;
  audioData: Float32Array;
  sampleRate: number;
  isComplete: boolean;
}

export interface ProgressiveAnalysisResult {
  chunkIndex: number;
  totalChunks: number;
  partialResult: Partial<AudioAnalysisResult>;
  aggregatedResult: Partial<AudioAnalysisResult>;
  isComplete: boolean;
  processingTime: number;
}

export class StreamingAnalysisEngine {
  private config: StreamingAnalysisConfig = {
    chunkSize: 44100 * 10, // 10 seconds at 44.1kHz
    overlapSize: 44100 * 1, // 1 second overlap
    maxFileSize: 100 * 1024 * 1024, // 100MB
    frameSize: 2048,
    hopSize: 1024,
    analysisFeatures: {
      spectral: true,
      tempo: true,
      key: true,
      mfcc: true,
      onset: true,
      segments: true,
      mlClassification: true
    },
    enableProgressiveResults: true,
    memoryLimit: 50 * 1024 * 1024 // 50MB
  };

  private worker: Worker | null = null;
  private isAnalyzing = false;
  private currentAnalysisId: string | null = null;
  private chunkResults: Map<number, Partial<AudioAnalysisResult>> = new Map();
  private aggregatedResult: Partial<AudioAnalysisResult> = {};

  /**
   * @param config - Legacy StreamingAnalysisConfig or unified EngineConfig
   */
  constructor(config?: Partial<StreamingAnalysisConfig> | EngineConfig) {
    if (config) {
      // Check if this is an EngineConfig (has backend or featureToggles properties)
      if ('backend' in config || ('featureToggles' in config && !('chunkSize' in config))) {
        // Convert EngineConfig to StreamingAnalysisConfig
        const engineConfig = config as EngineConfig;
        this.config = {
          ...this.config,
          frameSize: engineConfig.frameSize ?? this.config.frameSize,
          hopSize: engineConfig.hopSize ?? this.config.hopSize,
          analysisFeatures: {
            spectral: engineConfig.featureToggles?.spectral ?? true,
            tempo: engineConfig.featureToggles?.tempo ?? true,
            key: engineConfig.featureToggles?.key ?? true,
            mfcc: engineConfig.featureToggles?.mfcc ?? true,
            onset: engineConfig.featureToggles?.onset ?? true,
            segments: engineConfig.featureToggles?.segments ?? true,
            mlClassification: engineConfig.featureToggles?.mlClassification ?? true,
          },
        };
      } else {
        // Legacy StreamingAnalysisConfig
        this.config = { ...this.config, ...config as Partial<StreamingAnalysisConfig> };
      }
    }
    this.initializeWorker();
  }

  private async initializeWorker(): Promise<void> {
    try {
      this.worker = new Worker(new URL('../workers/streaming-analysis-worker.ts', import.meta.url), {
        type: 'module'
      });
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = (ev: ErrorEvent) => this.handleWorkerError(new Error(ev.message));
    } catch (error) {
      console.error('Failed to initialize streaming worker:', error);
    }
  }

  private handleWorkerMessage(event: MessageEvent): void {
    const { type, payload, id } = event.data;

    switch (type) {
      case 'WORKER_READY':
        console.log('Streaming worker ready');
        break;

      case 'CHUNK_COMPLETE':
        this.handleChunkComplete(payload);
        break;

      case 'ERROR':
        this.handleWorkerError(new Error(payload.error));
        break;
    }
  }

  private handleChunkComplete(result: ProgressiveAnalysisResult): void {
    // Store chunk result
    this.chunkResults.set(result.chunkIndex, result.partialResult);
    this.aggregatedResult = mergeStreamingResults(Array.from(this.chunkResults.values()));

    // Notify progress
    if (this.progressCallback) {
      const progress = result.chunkIndex / result.totalChunks;
      this.progressCallback({
        progress,
        stage: 'analyzing',
        percentage: Math.round(progress * 100),
        currentStep: 'streaming-analysis',
        completedSteps: [],
        message: `Analyzing chunk ${result.chunkIndex + 1} of ${result.totalChunks}...`
      });
    }

    // Check memory usage
    this.checkMemoryUsage();

    // Call progressive results callback
    if (this.config.enableProgressiveResults && this.progressiveCallback) {
      this.progressiveCallback(result);
    }

    // Complete analysis if all chunks processed
    if (result.isComplete && this.completeCallback) {
      this.finalizeAnalysis();
    }
  }

  private handleWorkerError(error: Error): void {
    console.error('Streaming worker error:', error);
    handleAnalysisError(error, 'streaming-analysis');
    this.isAnalyzing = false;
  }

  private checkMemoryUsage(): void {
    // @ts-expect-error - performance.memory might not be available
    if (typeof performance !== 'undefined' && performance.memory) {
      // @ts-expect-error - performance.memory is not in TypeScript lib but exists in Chrome
      const memoryUsage = performance.memory.usedJSHeapSize;
      
      if (memoryUsage > this.config.memoryLimit) {
        handlePerformanceError('memory-usage', memoryUsage, this.config.memoryLimit);
        
        // Clear old chunk results to free memory
        this.clearOldChunkResults();
      }
    }
  }

  private clearOldChunkResults(): void {
    // Keep only the last 5 chunk results to save memory
    const sortedKeys = Array.from(this.chunkResults.keys()).sort((a, b) => b - a);
    const keysToKeep = sortedKeys.slice(0, 5);
    
    for (const key of this.chunkResults.keys()) {
      if (!keysToKeep.includes(key)) {
        this.chunkResults.delete(key);
      }
    }
  }

  private async finalizeAnalysis(): Promise<void> {
    const timingId = PerformanceMonitor.startTiming(
      'streaming.finalization',
      PerformanceCategory.ANALYSIS
    );

    try {
      // Create final aggregated result
      const finalResult: AudioAnalysisResult = {
        ...this.aggregatedResult,
        duration: this.totalDuration,
        sampleRate: this.sampleRate,
        channels: this.channels,
        performance: {
          totalAnalysisTime: performance.now() - this.analysisStartTime,
          breakdown: {
            'streaming-analysis': performance.now() - this.analysisStartTime
          },
          memoryUsage: this.getCurrentMemoryUsage()
        }
      } as AudioAnalysisResult;

      this.isAnalyzing = false;
      this.currentAnalysisId = null;

      if (this.completeCallback) {
        this.completeCallback(finalResult);
      }

    } catch (error) {
      handleAnalysisError(error as Error, 'finalization');
    } finally {
      PerformanceMonitor.endTiming(timingId);
    }
  }

  private getCurrentMemoryUsage(): number {
    // @ts-expect-error - performance.memory is not in TypeScript lib but exists in Chrome
    if (typeof performance !== 'undefined' && performance.memory) {
      // @ts-expect-error - performance.memory is not in TypeScript lib but exists in Chrome
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  // Public properties for callbacks
  private progressCallback: ((progress: AnalysisProgress) => void) | null = null;
  private progressiveCallback: ((result: ProgressiveAnalysisResult) => void) | null = null;
  private completeCallback: ((result: AudioAnalysisResult) => void) | null = null;
  private analysisStartTime = 0;
  private totalDuration = 0;
  private sampleRate = 44100;
  private channels = 1;

  public async analyzeFile(
    file: File,
    progressCallback?: (progress: AnalysisProgress) => void,
    progressiveCallback?: (result: ProgressiveAnalysisResult) => void,
    featureToggles?: StreamingFeatureToggles
  ): Promise<AudioAnalysisResult> {
    
    if (this.isAnalyzing) {
      throw new Error('Analysis already in progress');
    }

    if (file.size > this.config.maxFileSize) {
      throw new Error(`File too large for streaming analysis: ${file.size} bytes (max: ${this.config.maxFileSize})`);
    }

    this.isAnalyzing = true;
    this.analysisStartTime = performance.now();
    this.progressCallback = progressCallback ?? null;
    this.progressiveCallback = progressiveCallback ?? null;

    if (featureToggles) {
      warnUnsupportedFeatureToggles(featureToggles, console.warn, 'StreamingAnalysisEngine');
      this.updateConfig({
        analysisFeatures: {
          ...this.config.analysisFeatures,
          ...featureToggles,
        },
      });
    }

    try {
      // Decode audio file
      const audioBuffer = await this.decodeAudioFile(file);
      this.totalDuration = audioBuffer.duration;
      this.sampleRate = audioBuffer.sampleRate;
      this.channels = audioBuffer.numberOfChannels;

      // Create chunks
      const chunks = this.createAudioChunks(audioBuffer);
      
      // Reset worker state
      this.worker?.postMessage({ type: 'RESET' });
      this.chunkResults.clear();
      this.aggregatedResult = {};

      // Analyze chunks
      return new Promise((resolve, reject) => {
        this.completeCallback = resolve;
        
        // Process chunks sequentially to manage memory
        this.processChunksSequentially(chunks);
      });

    } catch (error) {
      this.isAnalyzing = false;
      throw error;
    }
  }

  private async decodeAudioFile(file: File): Promise<AudioBuffer> {
    const timingId = PerformanceMonitor.startTiming(
      'streaming.decode',
      PerformanceCategory.FILE_OPERATIONS
    );

    try {
      const arrayBuffer = await file.arrayBuffer();
            const AudioContextCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error('Web Audio API is not supported in this environment');
      }
      const audioContext = new AudioContextCtor();
      
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      await audioContext.close();
      
      return audioBuffer;
    } catch (error) {
      throw new Error(`Failed to decode audio file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      PerformanceMonitor.endTiming(timingId);
    }
  }

  private createAudioChunks(audioBuffer: AudioBuffer): StreamingChunk[] {
    const chunks: StreamingChunk[] = [];
    const audioData = audioBuffer.getChannelData(0); // Use first channel
    const totalSamples = audioData.length;
    const effectiveChunkSize = this.config.chunkSize - this.config.overlapSize;

    let chunkIndex = 0;
    for (let start = 0; start < totalSamples; start += effectiveChunkSize) {
      const end = Math.min(start + this.config.chunkSize, totalSamples);
      const chunkData = audioData.slice(start, end);
      
      chunks.push({
        index: chunkIndex,
        startTime: start / audioBuffer.sampleRate,
        endTime: end / audioBuffer.sampleRate,
        audioData: chunkData,
        sampleRate: audioBuffer.sampleRate,
        isComplete: end >= totalSamples
      });
      
      chunkIndex++;
    }

    return chunks;
  }

  private async processChunksSequentially(chunks: StreamingChunk[]): Promise<void> {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Check if we should pause for memory management
      if (i > 0 && i % 5 === 0) {
        await this.waitForMemoryCleanup();
      }

      // Send chunk to worker
      this.worker?.postMessage({
        type: 'ANALYZE_CHUNK',
        payload: {
          chunkData: chunk.audioData,
          sampleRate: chunk.sampleRate,
          chunkIndex: chunk.index,
          totalChunks: chunks.length,
          analysisFeatures: this.config.analysisFeatures,
          frameSize: this.config.frameSize,
          hopSize: this.config.hopSize
        },
        id: `chunk-${chunk.index}`
      });

      // Add small delay between chunks to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  private async waitForMemoryCleanup(): Promise<void> {
    // Force garbage collection if available (Chrome DevTools)
    if ('gc' in window) {
      if (typeof (globalThis as unknown as { gc?: () => void }).gc === 'function') (globalThis as unknown as { gc: () => void }).gc();
    }
    
    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  public updateConfig(newConfig: Partial<StreamingAnalysisConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      analysisFeatures: {
        ...this.config.analysisFeatures,
        ...(newConfig.analysisFeatures || {}),
      },
    };
  }

  public getConfig(): StreamingAnalysisConfig {
    return { ...this.config };
  }

  public isAnalysisInProgress(): boolean {
    return this.isAnalyzing;
  }

  public getCurrentProgress(): {
    chunksCompleted: number;
    totalChunks: number;
    progressPercentage: number;
  } {
    const chunksCompleted = this.chunkResults.size;
    // This would need to be tracked properly in a real implementation
    const totalChunks = chunksCompleted; // Placeholder
    
    return {
      chunksCompleted,
      totalChunks,
      progressPercentage: totalChunks > 0 ? (chunksCompleted / totalChunks) * 100 : 0
    };
  }

  public cancelAnalysis(): void {
    this.isAnalyzing = false;
    this.currentAnalysisId = null;
    this.chunkResults.clear();
    this.aggregatedResult = {};
    
    // Reset worker
    this.worker?.postMessage({ type: 'RESET' });
  }

  public destroy(): void {
    this.cancelAnalysis();
    
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
