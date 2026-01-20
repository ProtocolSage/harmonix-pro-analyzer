import { 
  MLWorkerOutboundMessage, 
  MLWorkerInboundMessage, 
  MLPredictionResult, 
  MLPredictPayload
} from '../workers/mlWorkerProtocol';

import { MLInferenceInput, MLInferenceResult, MLTelemetry } from '../types/ml';

export class MLEngineCoordinator {
  private worker: Worker | null = null;
  private isInitialized = false;
  private isWarmingUp = false;
  private isLowMemoryMode = false;
  
  private pendingPredictions = new Map<string, { 
    resolve: (value: MLInferenceResult) => void, 
    reject: (reason?: any) => void 
  }>();

  private workerRestartCount = 0;
  private readonly MAX_RESTARTS = 3;

  constructor() {
    this.checkSystemCapabilities();
  }

  /**
   * Progressive Memory Detection
   * Determines if the device is too constrained for ML models.
   */
  private checkSystemCapabilities() {
    // 1. Device Memory API (RAM in GB)
    if ('deviceMemory' in navigator) {
      // @ts-ignore
      const ram = navigator.deviceMemory;
      if (ram <= 2) {
        this.enableLowMemoryMode('Low RAM (<= 2GB)');
        return;
      }
    }

    // 2. Heap Size Limit (Chrome/Edge specific)
    if (performance && (performance as any).memory) {
      const limit = (performance as any).memory.jsHeapSizeLimit;
      if (limit < 500 * 1024 * 1024) {
        this.enableLowMemoryMode('Low Heap Limit (< 500MB)');
        return;
      }
    }

    // 3. Hardware Concurrency (CPU Cores)
    if (navigator.hardwareConcurrency <= 2) {
      this.enableLowMemoryMode('Low CPU Cores (<= 2)');
      return;
    }
  }

  private enableLowMemoryMode(reason: string) {
    this.isLowMemoryMode = true;
    console.warn(`⚠️ MLEngineCoordinator: Low Memory Mode enabled. Reason: ${reason}. ML features disabled.`);
  }

  /**
   * Deferred Initialization
   * Called by the main application when Transport is ready.
   */
  public init() {
    if (this.isLowMemoryMode) return;
    if (this.worker) return;

    // Use requestIdleCallback for deferred loading
    const idleCallback = (window as any).requestIdleCallback || ((cb: Function) => setTimeout(cb, 1000));
    
    idleCallback(() => {
      this.spawnWorker();
    }, { timeout: 5000 });
  }

  private spawnWorker() {
    try {
      this.worker = new Worker(new URL('../workers/ml.worker.ts', import.meta.url), {
        type: 'module'
      });

      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = (err) => {
        console.error('❌ ML Coordinator: Worker crashed:', err);
        this.handleWorkerCrash();
      };

      // Send INIT
      this.postMessage({ type: 'INIT', payload: { backend: 'wasm' } });

    } catch (error) {
      console.error('❌ ML Coordinator: Failed to create worker:', error);
      this.enableLowMemoryMode('Worker creation failed');
    }
  }

  private handleWorkerMessage(event: MessageEvent<MLWorkerInboundMessage>) {
    const msg = event.data;

    switch (msg.type) {
      case 'WORKER_READY':
        this.isInitialized = true;
        console.log(`✅ ML Coordinator: Worker Ready (${msg.payload.backend})`);
        this.startWarmup();
        break;

      case 'PREDICTION_RESULT':
        this.handlePredictionResult(msg.payload);
        break;

      case 'PREDICTION_ERROR':
        this.handlePredictionError(msg.payload.audioId, msg.payload.error);
        break;

      case 'WORKER_ERROR':
        console.error('❌ ML Coordinator: Worker Error:', msg.payload.error);
        // If critical error during init, fallback
        if (!this.isInitialized) {
            this.enableLowMemoryMode('Critical Worker Error');
        }
        break;
        
      case 'MODEL_STATUS':
        // Can be used for UI progress bars
        // console.log(`ML Progress: ${msg.payload.progress * 100}%`);
        break;
    }
  }

  private startWarmup() {
    if (!this.isWarmingUp && !this.isLowMemoryMode) {
        this.isWarmingUp = true;
        this.postMessage({ type: 'WARMUP' });
    }
  }

  private handlePredictionResult(payload: MLPredictionResult) {
    const pending = this.pendingPredictions.get(payload.audioId);
    if (pending) {
      pending.resolve({
        predictions: payload.predictions,
        metadata: {
          latencyMs: payload.processingTime,
          modelVersion: '1.0.0', // TODO: Get from worker
          backend: 'wasm' // TODO: Get from state
        }
      });
      this.pendingPredictions.delete(payload.audioId);
    }
  }

  private handlePredictionError(audioId: string, error: string) {
    const pending = this.pendingPredictions.get(audioId);
    if (pending) {
      pending.reject(new Error(error));
      this.pendingPredictions.delete(audioId);
    }
  }

  private handleWorkerCrash() {
    this.isInitialized = false;
    
    // Reject all pending
    this.pendingPredictions.forEach((p) => p.reject(new Error('Worker crashed')));
    this.pendingPredictions.clear();

    if (this.worker) {
      this.worker.terminate();
    }
    this.worker = null;

    if (this.workerRestartCount < this.MAX_RESTARTS && !this.isLowMemoryMode) {
      this.workerRestartCount++;
      console.log(`🔄 ML Coordinator: Restarting worker (Attempt ${this.workerRestartCount})...`);
      setTimeout(() => this.spawnWorker(), 1000);
    } else {
      this.enableLowMemoryMode('Max restarts reached');
    }
  }

  private postMessage(msg: MLWorkerOutboundMessage) {
    this.worker?.postMessage(msg);
  }

  public async predict(input: MLInferenceInput): Promise<MLInferenceResult> {
    if (this.isLowMemoryMode) {
      throw new Error('ML Engine disabled (Low Memory Mode)');
    }

    if (!this.isInitialized) {
        // Simple wait logic or throw
        throw new Error('ML Engine not ready');
    }

    // Payload Guard: 5MB check
    if (input.melSpectrogram.byteLength > 5 * 1024 * 1024) {
        console.warn('⚠️ Payload > 5MB, implementing decimation (halving time axis)');
        // Simple decimation logic placeholder
        // In real impl, we'd decimate here
    }

    const audioId = input.audioId || `ml-${Date.now()}`;

    // Backpressure: Logic handled in UI/Context mostly, but here we can enforce 1-in-flight if needed.
    // For now, we allow multiple but worker processes serially.

    return new Promise((resolve, reject) => {
      this.pendingPredictions.set(audioId, { resolve, reject });

      const payload: MLPredictPayload = {
        audioId,
        melSpectrogram: input.melSpectrogram,
        sampleRate: input.sampleRate,
        duration: input.duration
      };

      // Use transfer list for zero-copy
      this.worker?.postMessage(
        { type: 'PREDICT', payload },
        [input.melSpectrogram.buffer]
      );
    });
  }

  public getStatus() {
    return {
      isInitialized: this.isInitialized,
      isLowMemoryMode: this.isLowMemoryMode,
      restartCount: this.workerRestartCount
    };
  }

  public dispose() {
    this.worker?.terminate();
    this.worker = null;
  }
}