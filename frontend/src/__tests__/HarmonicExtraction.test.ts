import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RealEssentiaAudioEngine } from '../engines/RealEssentiaAudioEngine';

// Mock vector with delete method
const createMockVector = (data: number[] | Float32Array = []) => ({
  size: () => data.length,
  get: (i: number) => data[i],
  delete: vi.fn(),
});

// Enhanced Mock Essentia.js
const mockEssentia = {
  arrayToVector: vi.fn((arr) => createMockVector(arr)),
  vectorToArray: vi.fn((vec) => {
    const size = vec.size();
    const result = [];
    for (let i = 0; i < size; i++) {
      result.push(vec.get(i));
    }
    return result;
  }),
  Windowing: vi.fn(() => ({ frame: createMockVector() })),
  Spectrum: vi.fn(() => ({ spectrum: createMockVector() })),
  SpectralCentroidTime: vi.fn(() => ({ centroid: 0 })),
  RollOff: vi.fn(() => ({ rolloff: 0 })),
  Flux: vi.fn(() => ({ flux: 0 })),
  Energy: vi.fn(() => ({ energy: 0 })),
  Dissonance: vi.fn(() => ({ dissonance: 0 })),
  ZeroCrossingRate: vi.fn(() => ({ zcr: 0 })),
  MFCC: vi.fn(() => ({ bands: createMockVector(), mfcc: createMockVector(new Array(13).fill(0)) })),
  RhythmExtractor2013: vi.fn(() => ({ bpm: 120, ticks: createMockVector(), confidence: 1 })),
  KeyExtractor: vi.fn(() => ({ key: 'C', scale: 'major', strength: 1 })),
  PercivalBpmEstimator: vi.fn(() => ({ bpm: 120 })),
  PitchMelodia: vi.fn(() => ({ pitch: createMockVector(new Array(100).fill(440)), pitchConfidence: createMockVector(new Array(100).fill(0.9)) })),
  HPCP: vi.fn(() => ({ hpcp: createMockVector(new Array(12).fill(0.1)) })),
  ChordsDetection: vi.fn(() => ({ chords: createMockVector(new Array(10).fill('C:major')), strength: createMockVector(new Array(10).fill(0.9)) })),
  MelBands: vi.fn(() => ({ melBands: createMockVector(new Array(96).fill(0.05)) })),
  delete: vi.fn(),
};

vi.mock('essentia.js/dist/essentia-wasm.es.js', () => ({
  EssentiaWASM: {},
}));

vi.mock('essentia.js/dist/essentia.js-core.es.js', () => {
  const EssentiaCtor = vi.fn(() => mockEssentia);
  return {
    __esModule: true,
    default: EssentiaCtor,
  };
});

// Mock other engines
vi.mock('../engines/MLInferenceEngine', () => ({
  MLInferenceEngine: vi.fn().mockImplementation(() => ({
    analyze: vi.fn(async () => ({})),
  })),
}));

vi.mock('../engines/LoudnessAnalysisEngine', () => ({
  LoudnessAnalysisEngine: vi.fn().mockImplementation(() => ({
    analyze: vi.fn(async () => ({ integrated: -14 })),
  })),
}));

// Mock audio file helper
const createMockAudioFile = (name: string = 'test.mp3', size: number = 1024): File => {
  const blob = new Blob(['mock data'], { type: 'audio/mpeg' });
  const file = new File([blob], name, { type: 'audio/mpeg' });
  (file as any).arrayBuffer = vi.fn(() => Promise.resolve(new ArrayBuffer(size)));
  return file;
};

// Mock audio buffer
const createMockAudioBuffer = (): AudioBuffer => ({
  length: 44100 * 2,
  sampleRate: 44100,
  duration: 2,
  numberOfChannels: 1,
  getChannelData: vi.fn(() => new Float32Array(44100 * 2)),
}) as unknown as AudioBuffer;

describe('Harmonic Extraction (Main Thread Fallback)', () => {
  let engine: RealEssentiaAudioEngine;

  beforeEach(() => {
    engine = new RealEssentiaAudioEngine();
    // Force main thread analysis
    (engine as any).worker = null;
    (engine as any).essentia = mockEssentia;
    (engine as any).isInitialized = true;
    vi.spyOn(engine as any, 'decodeAudioFile').mockResolvedValue(createMockAudioBuffer());
  });

  it('should extract melody and harmonic features in main thread', async () => {
    const result = await engine.analyzeFile(createMockAudioFile(), {
      featureToggles: { segments: true }
    });

    expect(result.melody).toBeDefined();
    expect(result.melody?.pitchTrack).toBeDefined();
    expect(result.melody?.pitchTrack.length).toBeGreaterThan(0);
    expect(result.melody?.contour).toBeDefined();
    
    expect(result.harmonic).toBeDefined();
    expect(result.harmonic?.chords).toBeDefined();
    expect(result.harmonic?.chords.length).toBeGreaterThan(0);
    
    // Cached features for A/B Reference
    expect(result.tempo).toBeDefined();
    expect(result.key).toBeDefined();
    expect(result.spectral).toBeDefined();
    // In RealEssentiaAudioEngine, spectralEnvelope might be optional or part of spectral
    // but the plan specifically mentions it.
    
    // Verify chord timeline structure
    const firstChord = result.harmonic?.chords[0];
    expect(firstChord).toHaveProperty('chord');
    expect(firstChord).toHaveProperty('start');
    expect(firstChord).toHaveProperty('end');
    expect(firstChord).toHaveProperty('romanNumeral');

    // Verify pitch contour structure
    expect(result.melody?.contour.points).toBeDefined();
    expect(result.melody?.contour.points.length).toBeGreaterThan(0);
    
    // Check if mock methods were called
    expect(mockEssentia.PitchMelodia).toHaveBeenCalled();
    expect(mockEssentia.ChordsDetection).toHaveBeenCalled();
  });
});
