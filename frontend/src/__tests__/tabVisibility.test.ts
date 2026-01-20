import { describe, it, expect } from 'vitest';
import { getTabVisibility, getAllTabVisibility } from '../utils/tabVisibility';
import type { AudioAnalysisResult } from '../types/audio';

describe('Tab Visibility', () => {
  it('hides all tabs when no analysis data', () => {
    const visibility = getAllTabVisibility(null);

    expect(visibility.spectral.visible).toBe(false);
    expect(visibility.musical.visible).toBe(false);
    expect(visibility.rhythm.visible).toBe(false);
    expect(visibility.technical.visible).toBe(false);
    // Overview should still be hidden with null data
    expect(visibility.overview.visible).toBe(false);
  });

  it('shows overview tab when any data exists', () => {
    const partialData = {
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
    } as AudioAnalysisResult;

    const visibility = getTabVisibility('overview', partialData);
    expect(visibility.visible).toBe(true);
    expect(visibility.dimmed).toBe(false);
  });

  it('hides spectral tab when no spectral data', () => {
    const dataWithoutSpectral = {
      tempo: { bpm: 120, confidence: 0.9 },
    } as AudioAnalysisResult;

    const visibility = getTabVisibility('spectral', dataWithoutSpectral);
    expect(visibility.visible).toBe(false);
    expect(visibility.tooltip).toContain('not included');
  });

  it('shows spectral tab with full data', () => {
    const fullSpectralData = {
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
      mfcc: [1, 2, 3, 4, 5],
    } as AudioAnalysisResult;

    const visibility = getTabVisibility('spectral', fullSpectralData);
    expect(visibility.visible).toBe(true);
    expect(visibility.dimmed).toBe(false);
    expect(visibility.dataCompleteness).toBe(100);
  });

  it('dims spectral tab with partial data', () => {
    const partialSpectralData = {
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
      // Missing MFCC
    } as AudioAnalysisResult;

    const visibility = getTabVisibility('spectral', partialSpectralData);
    expect(visibility.visible).toBe(true);
    expect(visibility.dimmed).toBe(true);
    expect(visibility.tooltip).toContain('Partial');
    expect(visibility.dataCompleteness).toBe(50); // 1 of 2 datasets present
  });

  it('hides musical tab when no musical data', () => {
    const dataWithoutMusical = {
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
    } as AudioAnalysisResult;

    const visibility = getTabVisibility('musical', dataWithoutMusical);
    expect(visibility.visible).toBe(false);
  });

  it('shows musical tab with key data', () => {
    const musicalData = {
      key: {
        key: 'C',
        scale: 'major',
        confidence: 0.9,
      },
    } as AudioAnalysisResult;

    const visibility = getTabVisibility('musical', musicalData);
    expect(visibility.visible).toBe(true);
    expect(visibility.dimmed).toBe(true); // Partial because missing mood and genre
    expect(visibility.dataCompleteness).toBeCloseTo(33.33, 1);
  });

  it('hides rhythm tab when no rhythm data', () => {
    const dataWithoutRhythm = {
      key: {
        key: 'D',
        scale: 'minor',
        confidence: 0.85,
      },
    } as AudioAnalysisResult;

    const visibility = getTabVisibility('rhythm', dataWithoutRhythm);
    expect(visibility.visible).toBe(false);
  });

  it('shows rhythm tab with tempo data', () => {
    const rhythmData = {
      tempo: {
        bpm: 128,
        confidence: 0.92,
        beats: [0, 0.5, 1.0],
      },
    } as AudioAnalysisResult;

    const visibility = getTabVisibility('rhythm', rhythmData);
    expect(visibility.visible).toBe(true);
    expect(visibility.dimmed).toBe(true); // Partial, missing rhythm analysis
    expect(visibility.dataCompleteness).toBeCloseTo(66.67, 1); // tempo + beats, missing rhythm
  });

  it('hides technical tab when no technical data', () => {
    const dataWithoutTechnical = {
      tempo: { bpm: 120, confidence: 0.9 },
    } as AudioAnalysisResult;

    const visibility = getTabVisibility('technical', dataWithoutTechnical);
    expect(visibility.visible).toBe(false);
  });

  it('shows technical tab with loudness data', () => {
    const technicalData = {
      loudness: {
        integrated: -14.5,
        range: 8.2,
        truePeak: -0.5,
        momentaryMax: -10.2,
        shortTermMax: -11.5,
        dynamicRange: 8.2,
      },
    } as unknown as AudioAnalysisResult;

    const visibility = getTabVisibility('technical', technicalData);
    expect(visibility.visible).toBe(true);
    expect(visibility.dimmed).toBe(true); // Partial, missing spectral
    expect(visibility.dataCompleteness).toBe(50);
  });

  it('computes visibility for all tabs at once', () => {
    const fullData = {
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
      mfcc: [1, 2, 3],
      tempo: { bpm: 120, confidence: 0.9, beats: [0, 0.5] },
      key: { key: 'C', scale: 'major', confidence: 0.9 },
      loudness: { integrated: -14.5, range: 8.2, truePeak: -0.5, momentaryMax: -10.2, shortTermMax: -11.5, dynamicRange: 8.2 },
    } as unknown as AudioAnalysisResult;

    const allVisibility = getAllTabVisibility(fullData);

    expect(allVisibility.overview.visible).toBe(true);
    expect(allVisibility.spectral.visible).toBe(true);
    expect(allVisibility.musical.visible).toBe(true);
    expect(allVisibility.rhythm.visible).toBe(true);
    expect(allVisibility.technical.visible).toBe(true);
  });
});
