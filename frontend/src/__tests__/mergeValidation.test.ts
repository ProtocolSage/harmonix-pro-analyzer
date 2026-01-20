import { describe, it, expect } from 'vitest';
import { mergeStreamingResults } from '../engines/streamingAnalysisCore';
import type { AudioAnalysisResult } from '../types/audio';

describe('Real-Time Merge Validation', () => {
  it('merges empty results array correctly', () => {
    const merged = mergeStreamingResults([]);
    expect(merged).toEqual({});
  });

  it('merges single chunk result correctly', () => {
    const singleChunk: Partial<AudioAnalysisResult> = {
      spectral: {
        centroid: { mean: 1000, std: 0 },
        rolloff: { mean: 5000, std: 0 },
        flux: { mean: 0.5, std: 0 },
        energy: { mean: 0.8, std: 0 },
        brightness: { mean: 0.6, std: 0 },
        roughness: { mean: 0, std: 0 },
        spread: { mean: 0, std: 0 },
        zcr: { mean: 0.05, std: 0 },
      },
      tempo: { bpm: 120, confidence: 0.9 },
      key: { key: 'C', scale: 'major', confidence: 0.85 },
    };

    const merged = mergeStreamingResults([singleChunk]);

    expect(merged.spectral?.centroid?.mean).toBe(1000);
    expect(merged.tempo?.bpm).toBe(120);
    expect(merged.key?.key).toBe('C');
  });

  it('averages spectral features across chunks', () => {
    const chunk1: Partial<AudioAnalysisResult> = {
      spectral: {
        centroid: { mean: 1000, std: 0 },
        rolloff: { mean: 5000, std: 0 },
        flux: { mean: 0.5, std: 0 },
        energy: { mean: 0.8, std: 0 },
        brightness: { mean: 0.6, std: 0 },
        roughness: { mean: 0, std: 0 },
        spread: { mean: 0, std: 0 },
        zcr: { mean: 0.05, std: 0 },
      },
    };

    const chunk2: Partial<AudioAnalysisResult> = {
      spectral: {
        centroid: { mean: 1200, std: 0 },
        rolloff: { mean: 5500, std: 0 },
        flux: { mean: 0.7, std: 0 },
        energy: { mean: 0.9, std: 0 },
        brightness: { mean: 0.7, std: 0 },
        roughness: { mean: 0, std: 0 },
        spread: { mean: 0, std: 0 },
        zcr: { mean: 0.06, std: 0 },
      },
    };

    const merged = mergeStreamingResults([chunk1, chunk2]);

    expect(merged.spectral?.centroid?.mean).toBe((1000 + 1200) / 2);
    expect(merged.spectral?.rolloff?.mean).toBe((5000 + 5500) / 2);
    expect(merged.spectral?.flux?.mean).toBe((0.5 + 0.7) / 2);
    expect(merged.spectral?.zcr?.mean).toBeCloseTo((0.05 + 0.06) / 2, 5);
  });

  it('selects highest confidence tempo across chunks', () => {
    const chunk1: Partial<AudioAnalysisResult> = {
      tempo: { bpm: 120, confidence: 0.8 },
    };

    const chunk2: Partial<AudioAnalysisResult> = {
      tempo: { bpm: 122, confidence: 0.95 },
    };

    const chunk3: Partial<AudioAnalysisResult> = {
      tempo: { bpm: 121, confidence: 0.85 },
    };

    const merged = mergeStreamingResults([chunk1, chunk2, chunk3]);

    expect(merged.tempo?.bpm).toBe(122); // Highest confidence
    expect(merged.tempo?.confidence).toBe(0.95);
  });

  it('selects highest confidence key across chunks', () => {
    const chunk1: Partial<AudioAnalysisResult> = {
      key: { key: 'C', scale: 'major', confidence: 0.7 },
    };

    const chunk2: Partial<AudioAnalysisResult> = {
      key: { key: 'D', scale: 'minor', confidence: 0.92 },
    };

    const chunk3: Partial<AudioAnalysisResult> = {
      key: { key: 'C', scale: 'major', confidence: 0.85 },
    };

    const merged = mergeStreamingResults([chunk1, chunk2, chunk3]);

    expect(merged.key?.key).toBe('D'); // Highest confidence
    expect(merged.key?.scale).toBe('minor');
    expect(merged.key?.confidence).toBe(0.92);
  });

  it('averages MFCC coefficients across chunks', () => {
    const chunk1: Partial<AudioAnalysisResult> = {
      mfcc: [1, 2, 3, 4, 5],
    };

    const chunk2: Partial<AudioAnalysisResult> = {
      mfcc: [1.5, 2.5, 3.5, 4.5, 5.5],
    };

    const merged = mergeStreamingResults([chunk1, chunk2]);

    expect(merged.mfcc).toBeDefined();
    expect(merged.mfcc![0]).toBe((1 + 1.5) / 2);
    expect(merged.mfcc![1]).toBe((2 + 2.5) / 2);
    expect(merged.mfcc![2]).toBe((3 + 3.5) / 2);
  });

  it('handles chunks with missing data gracefully', () => {
    const chunk1: Partial<AudioAnalysisResult> = {
      spectral: {
        centroid: { mean: 1000, std: 0 },
        rolloff: { mean: 5000, std: 0 },
        flux: { mean: 0.5, std: 0 },
        energy: { mean: 0.8, std: 0 },
        brightness: { mean: 0.6, std: 0 },
        roughness: { mean: 0, std: 0 },
        spread: { mean: 0, std: 0 },
        zcr: { mean: 0.05, std: 0 },
      },
      tempo: { bpm: 120, confidence: 0.9 },
    };

    const chunk2: Partial<AudioAnalysisResult> = {
      key: { key: 'C', scale: 'major', confidence: 0.85 },
    };

    const merged = mergeStreamingResults([chunk1, chunk2]);

    expect(merged.spectral?.centroid?.mean).toBe(1000);
    expect(merged.tempo?.bpm).toBe(120);
    expect(merged.key?.key).toBe('C');
  });

  it('does not drop data when merging multiple chunks', () => {
    const chunks: Partial<AudioAnalysisResult>[] = Array.from({ length: 5 }, (_, i) => ({
      spectral: {
        centroid: { mean: 1000 + i * 100, std: 0 },
        rolloff: { mean: 5000 + i * 200, std: 0 },
        flux: { mean: 0.5 + i * 0.1, std: 0 },
        energy: { mean: 0.8, std: 0 },
        brightness: { mean: 0.6, std: 0 },
        roughness: { mean: 0, std: 0 },
        spread: { mean: 0, std: 0 },
        zcr: { mean: 0.05, std: 0 },
      },
      tempo: { bpm: 120 + i, confidence: 0.8 + i * 0.02 },
      mfcc: [1 + i, 2 + i, 3 + i],
    }));

    const merged = mergeStreamingResults(chunks);

    expect(merged.spectral).toBeDefined();
    expect(merged.tempo).toBeDefined();
    expect(merged.mfcc).toBeDefined();

    // Validate averages
    const expectedCentroid = chunks.reduce((sum, c) => sum + (c.spectral?.centroid?.mean || 0), 0) / chunks.length;
    expect(merged.spectral?.centroid?.mean).toBeCloseTo(expectedCentroid, 5);

    // Tempo should be highest confidence
    const maxConfidenceTempo = chunks.reduce((max, c) =>
      (c.tempo?.confidence || 0) > (max.tempo?.confidence || 0) ? c : max
    , chunks[0]);
    expect(merged.tempo?.bpm).toBe(maxConfidenceTempo.tempo?.bpm);
  });

  it('preserves all spectral fields during merge', () => {
    const chunk: Partial<AudioAnalysisResult> = {
      spectral: {
        centroid: { mean: 1000, std: 100 },
        rolloff: { mean: 5000, std: 500 },
        flux: { mean: 0.5, std: 0.1 },
        energy: { mean: 0.8, std: 0.2 },
        brightness: { mean: 0.6, std: 0.1 },
        roughness: { mean: 0.3, std: 0.05 },
        spread: { mean: 2000, std: 300 },
        zcr: { mean: 0.05, std: 0.01 },
      },
    };

    const merged = mergeStreamingResults([chunk, chunk]);

    expect(merged.spectral?.centroid).toBeDefined();
    expect(merged.spectral?.rolloff).toBeDefined();
    expect(merged.spectral?.flux).toBeDefined();
    expect(merged.spectral?.energy).toBeDefined();
    expect(merged.spectral?.brightness).toBeDefined();
    expect(merged.spectral?.roughness).toBeDefined();
    expect(merged.spectral?.spread).toBeDefined();
    expect(merged.spectral?.zcr).toBeDefined();
  });
});
