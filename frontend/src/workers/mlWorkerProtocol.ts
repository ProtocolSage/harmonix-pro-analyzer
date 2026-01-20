/**
 * MLWorker Protocol Definitions
 * Defines the communication interface for the Machine Learning inference worker.
 */

export type MLWorkerMessageType =
  | 'INIT'               // Request initialization
  | 'WARMUP'             // Start model preloading
  | 'PREDICT'            // Request inference
  | 'WORKER_READY'       // Initialization complete
  | 'MODEL_STATUS'       // Progress update on model loading
  | 'PREDICTION_RESULT'  // Inference complete
  | 'PREDICTION_ERROR'   // Inference failed
  | 'WORKER_ERROR';      // Critical worker failure

export interface MLPrediction {
  label: string;
  confidence: number;
}

export interface MLPredictionResult {
  audioId: string;
  predictions: MLPrediction[];
  modelName: string;
  processingTime: number;
}

export interface MLModelStatus {
  modelName: string;
  loaded: boolean;
  progress: number; // 0-1
}

export interface MLPredictPayload {
  audioId: string;
  melSpectrogram: Float32Array; // Transferable data
  sampleRate: number;
  duration: number;
}

export type MLWorkerOutboundMessage =
  | { type: 'INIT'; payload: { backend: 'wasm' | 'webgl' | 'cpu' } }
  | { type: 'WARMUP' }
  | { type: 'PREDICT'; payload: MLPredictPayload };

export type MLWorkerInboundMessage =
  | { type: 'WORKER_READY'; payload: { backend: string; version: string } }
  | { type: 'MODEL_STATUS'; payload: MLModelStatus }
  | { type: 'PREDICTION_RESULT'; payload: MLPredictionResult }
  | { type: 'PREDICTION_ERROR'; payload: { audioId: string; error: string } }
  | { type: 'WORKER_ERROR'; payload: { error: string } };
