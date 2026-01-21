import { SpectrogramTileSpec } from '../types/persistence';

export const PLATINUM_SPECTROGRAM_CONFIG: SpectrogramTileSpec = {
  tileSeconds: 30,
  guardSeconds: 0.5,
  freqBins: 1024,
  hopSize: 512,
  windowSize: 2048,
  sampleRateUsed: 44100,
  dbMin: -100,
  dbMax: 0,
  gamma: 1.0
};

export const SPECTROGRAM_SCHEMA_VERSION = 1;
