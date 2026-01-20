/**
 * Machine Learning Inference Types
 * Strict schemas for the TensorFlow.js pipeline.
 */

export interface MLModelConfig {
  modelName: string;
  version: string;
  modelUrl: string;
  labelsUrl: string;
  threshold: number;
}

export interface MLInferenceInput {
  /** 
   * Normalized log-mel spectrogram data.
   * Shape: [187, 96] (Time x Frequency)
   */
  melSpectrogram: Float32Array;
  /** Audio duration in seconds */
  duration: number;
  /** Sample rate used for extraction */
  sampleRate: number;
  /** Unique identifier for the audio being analyzed */
  audioId?: string;
}

export interface MLPrediction {
  label: string;
  confidence: number;
}

export interface MLTelemetry {
  model_load_time_ms?: number;
  cache_hit?: boolean;
  inference_latency_ms?: number;
  backend_used?: 'webgl' | 'wasm' | 'cpu';
  backend_switch_reason?: string;
  worker_restart_count?: number;
}

export interface MLInferenceResult {
  /** Top classifications (Genre, Mood, etc.) */
  predictions: MLPrediction[];
  /** Inference metadata */
  metadata: {
    latencyMs: number;
    modelVersion: string;
    backend: string;
    telemetry?: MLTelemetry;
  };
}

export type MLWorkerMessageType = 
  | 'WARMUP'
  | 'PREDICT'
  | 'DISPOSE'
  | 'READY'
  | 'ERROR'
  | 'PROGRESS'
  | 'ANALYSIS_COMPLETE'
  | 'TELEMETRY';

export interface MLWorkerMessage {
  type: MLWorkerMessageType;
  id?: string;
  payload?: any;
}

/**
 * Normalization statistics for the model
 */
export interface NormalizationStats {
  means: number[];
  stds: number[];
  epsilon: number;
  version: string;
}
