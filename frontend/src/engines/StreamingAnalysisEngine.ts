import type { AudioAnalysisResult, AnalysisProgress } from '../types/audio';
import { PerformanceMonitor, PerformanceCategory } from '../utils/PerformanceMonitor';
import { handleAnalysisError, handlePerformanceError } from '../utils/ErrorHandler';

export interface StreamingAnalysisConfig {
  chunkSize: number; // Size of each audio chunk in samples
  overlapSize: number; // Overlap between chunks in samples
  maxFileSize: number; // Maximum file size for streaming analysis
  analysisFeatures: {
    spectral: boolean;
    tempo: boolean;
    key: boolean;
    mfcc: boolean;
    onset: boolean;
  };
  enableProgressiveResults: boolean; // Return partial results during analysis
  memoryLimit: number; // Memory limit in bytes
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
    analysisFeatures: {
      spectral: true,
      tempo: true,
      key: true,
      mfcc: true,
      onset: true
    },
    enableProgressiveResults: true,
    memoryLimit: 50 * 1024 * 1024 // 50MB
  };

  private worker: Worker | null = null;
  private isAnalyzing = false;
  private currentAnalysisId: string | null = null;
  private chunkResults: Map<number, Partial<AudioAnalysisResult>> = new Map();
  private aggregatedResult: Partial<AudioAnalysisResult> = {};

  constructor(config?: Partial<StreamingAnalysisConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.initializeWorker();
  }

  private async initializeWorker(): Promise<void> {
    try {
      const workerCode = this.generateWorkerCode();
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      
      this.worker = new Worker(workerUrl);
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = (ev: ErrorEvent) => this.handleWorkerError(new Error(ev.message));
      
      URL.revokeObjectURL(workerUrl);
    } catch (error) {
      console.error('Failed to initialize streaming worker:', error);
    }
  }

  private generateWorkerCode(): string {
    return `
      let essentia = null;
      let isInitialized = false;
      let chunkResults = new Map();

      // Simplified mock implementation for development
      // In production, this would use real Essentia.js
      async function initializeEssentia() {
        // Mock initialization
        await new Promise(resolve => setTimeout(resolve, 100));
        isInitialized = true;
        
        postMessage({
          type: 'WORKER_READY',
          payload: { success: true }
        });
      }

      function analyzeChunk(chunkData, chunkIndex, config) {
        return new Promise((resolve) => {
          // Simulate chunk analysis
          setTimeout(() => {
            const mockResult = {
              chunkIndex,
              spectral: config.analysisFeatures.spectral ? {
                centroid: { mean: 1000 + Math.random() * 1000, std: 100 },
                rolloff: { mean: 2000 + Math.random() * 1000, std: 200 },
                flux: { mean: Math.random() * 0.5, std: 0.1 }
              } : undefined,
              tempo: config.analysisFeatures.tempo ? {
                bpm: 80 + Math.random() * 60,
                confidence: 0.7 + Math.random() * 0.3
              } : undefined,
              mfcc: config.analysisFeatures.mfcc ? 
                Array.from({length: 13}, () => (Math.random() - 0.5) * 10) : undefined
            };
            
            resolve(mockResult);
          }, 100 + Math.random() * 200);
        });
      }

      function aggregateResults(chunkResults) {
        const results = Array.from(chunkResults.values());
        if (results.length === 0) return {};

        const aggregated = {};

        // Aggregate spectral features
        const spectralResults = results.filter(r => r.spectral);
        if (spectralResults.length > 0) {
          aggregated.spectral = {
            centroid: {
              mean: spectralResults.reduce((sum, r) => sum + r.spectral.centroid.mean, 0) / spectralResults.length,
              std: Math.sqrt(spectralResults.reduce((sum, r) => sum + Math.pow(r.spectral.centroid.std, 2), 0) / spectralResults.length)
            },
            rolloff: {
              mean: spectralResults.reduce((sum, r) => sum + r.spectral.rolloff.mean, 0) / spectralResults.length,
              std: Math.sqrt(spectralResults.reduce((sum, r) => sum + Math.pow(r.spectral.rolloff.std, 2), 0) / spectralResults.length)
            },
            flux: {
              mean: spectralResults.reduce((sum, r) => sum + r.spectral.flux.mean, 0) / spectralResults.length,
              std: Math.sqrt(spectralResults.reduce((sum, r) => sum + Math.pow(r.spectral.flux.std, 2), 0) / spectralResults.length)
            }
          };
        }

        // Aggregate tempo (use most confident result)
        const tempoResults = results.filter(r => r.tempo);
        if (tempoResults.length > 0) {
          const bestTempo = tempoResults.reduce((best, current) => 
            current.tempo.confidence > best.tempo.confidence ? current : best);
          aggregated.tempo = bestTempo.tempo;
        }

        // Aggregate MFCC (average)
        const mfccResults = results.filter(r => r.mfcc);
        if (mfccResults.length > 0) {
          const mfccLength = mfccResults[0].mfcc.length;
          aggregated.mfcc = Array.from({length: mfccLength}, (_, i) => 
            mfccResults.reduce((sum, r) => sum + r.mfcc[i], 0) / mfccResults.length
          );
        }

        return aggregated;
      }

      self.onmessage = async function(event) {
        const { type, payload, id } = event.data;

        switch (type) {
          case 'ANALYZE_CHUNK':
            if (!isInitialized) {
              postMessage({
                type: 'ERROR',
                payload: { error: 'Worker not initialized' },
                id
              });
              return;
            }

            try {
              const { chunkData, chunkIndex, totalChunks, config } = payload;
              
              const chunkResult = await analyzeChunk(chunkData, chunkIndex, config);
              chunkResults.set(chunkIndex, chunkResult);
              
              // Calculate aggregated results
              const aggregated = aggregateResults(chunkResults);
              
              postMessage({
                type: 'CHUNK_COMPLETE',
                payload: {
                  chunkIndex,
                  totalChunks,
                  partialResult: chunkResult,
                  aggregatedResult: aggregated,
                  isComplete: chunkResults.size === totalChunks,
                  processingTime: 100 + Math.random() * 200
                },
                id
              });

            } catch (error) {
              postMessage({
                type: 'ERROR',
                payload: { error: error.message, chunkIndex: payload.chunkIndex },
                id
              });
            }
            break;

          case 'RESET':
            chunkResults.clear();
            break;
        }
      };

      // Initialize on startup
      initializeEssentia();
    `;
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
    this.aggregatedResult = result.aggregatedResult;

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
    progressiveCallback?: (result: ProgressiveAnalysisResult) => void
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
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
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
          chunkIndex: chunk.index,
          totalChunks: chunks.length,
          config: this.config
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
      (window as any).gc();
    }
    
    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  public updateConfig(newConfig: Partial<StreamingAnalysisConfig>): void {
    this.config = { ...this.config, ...newConfig };
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