import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { analyzeChunkData, mergeStreamingResults } from '../engines/streamingAnalysisCore';
import { setTestEssentiaInstance, clearTestEssentiaInstance } from '../utils/essentiaInstance';
import { getMockEssentiaInstance } from '../test/mockEssentia';

function makeSineWave(samples: number, frequency = 440, sampleRate = 44100): Float32Array {
  const data = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    data[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
  }
  return data;
}

describe('Streaming analysis core', () => {
  beforeAll(async () => {
    // Inject mock Essentia to bypass WASM initialization issues in Vitest
    const mockEssentia = await getMockEssentiaInstance();
    setTestEssentiaInstance(mockEssentia);
  });

  afterAll(() => {
    clearTestEssentiaInstance();
  });
  const sampleRate = 44100;
  const frameSize = 1024;
  const hopSize = 512;
  const audio = makeSineWave(sampleRate); // 1 second

  it('returns real spectral and mfcc data', async () => {
    const result = await analyzeChunkData(audio, sampleRate, {
      analysisFeatures: {
        spectral: true,
        tempo: true,
        key: true,
        mfcc: true,
        onset: true,
        segments: true,
        mlClassification: true,
      },
      frameSize,
      hopSize,
    });

    expect(result.spectral?.centroid?.mean).toBeGreaterThan(0);
    expect(result.mfcc && result.mfcc.length).toBe(13);
  });

  it('respects feature toggles (tempo/key off)', async () => {
    const result = await analyzeChunkData(audio, sampleRate, {
      analysisFeatures: {
        spectral: true,
        tempo: false,
        key: false,
        mfcc: true,
        onset: true,
        segments: true,
        mlClassification: true,
      },
      frameSize,
      hopSize,
    });

    expect(result.tempo).toBeUndefined();
    expect(result.key).toBeUndefined();
  });

  it('merges chunk results with averaging and best-confidence selection', async () => {
    const chunk1 = await analyzeChunkData(audio, sampleRate, {
      analysisFeatures: {
        spectral: true,
        tempo: true,
        key: true,
        mfcc: true,
        onset: true,
        segments: true,
        mlClassification: true,
      },
      frameSize,
      hopSize,
    });

    const chunk2 = { ...chunk1, tempo: { bpm: 130, confidence: 0.99 } };

    const merged = mergeStreamingResults([chunk1, chunk2]);

    expect(merged.spectral?.centroid?.mean).toBeGreaterThan(0);
    expect(merged.mfcc && merged.mfcc.length).toBe(13);
    expect(merged.tempo?.bpm).toBe(130);
  });
});
