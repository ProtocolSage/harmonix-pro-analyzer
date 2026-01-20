// src/workers/essentiaWorkerProtocol.ts
import type { AudioAnalysisResult, AnalysisProgress } from '../types/audio';

export type EssentiaWorkerMessageType =
  | 'INIT'
  | 'ANALYZE_AUDIO'
  | 'WORKER_READY'
  | 'PROGRESS'
  | 'ANALYSIS_COMPLETE'
  | 'ANALYSIS_ERROR'
  | 'WORKER_ERROR';

export interface TransferAudioData {
  channelData: Float32Array[];
  sampleRate: number;
  length: number;
  duration: number;
  numberOfChannels: number;
}

export interface AnalysisConfig {
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

export interface WorkerAnalyzePayload {
  audioData: TransferAudioData;
  config: AnalysisConfig;
  fileName?: string;
}

export type WorkerOutboundMessage =
  | { type: 'INIT' }
  | { type: 'ANALYZE_AUDIO'; id: string; payload: WorkerAnalyzePayload };

export type WorkerInboundMessage =
  | { type: 'WORKER_READY'; payload?: unknown }
  | { type: 'PROGRESS'; id: string; payload: AnalysisProgress }
  | { type: 'ANALYSIS_COMPLETE'; id: string; payload: AudioAnalysisResult }
  | { type: 'ANALYSIS_ERROR'; id: string; payload: { error: string } }
  | { type: 'WORKER_ERROR'; payload: { error: string } };
