import { AudioAnalysisResult } from './audio';

export type StereoPair = [number, number];

export interface TrackMetadata {
  bpm?: number;
  key?: string;
  energy?: number;
  genre: string[];
  mood: string[];
}

export type ArtifactType = 
  | 'full_analysis' 
  | 'spectrogram_tile' 
  | 'spectrogram_manifest' 
  | 'waveform_map';

export interface BaseArtifact {
  trackId: string;
  type: ArtifactType;
  key: string;          // REQUIRED (matches DB keyPath)
  schemaVersion: number;
  updatedAt: number;
  codec: 'json' | 'raw' | 'msgpack';
  audioFingerprint: string; // Platinum validation
}

export interface FullAnalysisArtifact extends BaseArtifact {
  type: 'full_analysis';
  key: 'default';
  codec: 'json';
  data: AudioAnalysisResult;
}

export interface SpectrogramTileMetadata {
  fftSize: number;
  hopSize: number;
  sampleRate: number;
  windowFunction: string;
  freqBins: number;
  timeFrames: number;
  dbMin: number;
  dbMax: number;
  gamma: number;
  tileStartSec: number;
  tileDurationSec: number;
}

export interface SpectrogramTileArtifact extends BaseArtifact {
  type: 'spectrogram_tile';
  key: string;          // e.g. "t:0"
  codec: 'raw';
  data: ArrayBuffer;
  meta: SpectrogramTileMetadata;
}

export interface SpectrogramTileSpec {
  tileSeconds: number;
  guardSeconds: number;
  freqBins: number;
  hopSize: number;
  windowSize: number;
  sampleRateUsed: number;
  dbMin: number;
  dbMax: number;
  gamma: number;
}

export interface SpectrogramManifestArtifact extends BaseArtifact {
  type: 'spectrogram_manifest';
  key: 'default';
  codec: 'json';
  data: {
    tileSpec: SpectrogramTileSpec;
    completedTiles: number[]; // Array of indices for simplicity, bitmap if large
    totalTiles: number;
  };
}

export interface WaveformMapArtifact extends BaseArtifact {
  type: 'waveform_map';
  key: 'default';
  codec: 'raw';
  data: ArrayBuffer;    // Float32Array.buffer
  meta: {
    format: 'f32';
    reducedResolution: number;
    length: number;     // number of float samples
  };
}

export type AnalysisArtifact =
  | FullAnalysisArtifact
  | SpectrogramTileArtifact
  | SpectrogramManifestArtifact
  | WaveformMapArtifact;

export interface SessionState {
  id: 'current';
  lastTrackId: string | null;
  updatedAt: number;
  settings: {
    theme: string;
    precisionMode: boolean;
    volume: number;
    playbackRate: number;
  };
  layout: {
    sidebarMode: string;
    inspectorTab: string;
  };
}