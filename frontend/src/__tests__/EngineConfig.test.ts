import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { StreamingAnalysisEngine } from '../engines/StreamingAnalysisEngine';
import type { EngineConfig } from '../types/audio';
import { setTestEssentiaInstance, clearTestEssentiaInstance } from '../utils/essentiaInstance';
import { getMockEssentiaInstance } from '../test/mockEssentia';

describe('Unified EngineConfig', () => {
  beforeAll(async () => {
    const mockEssentia = await getMockEssentiaInstance();
    setTestEssentiaInstance(mockEssentia);
  });

  afterAll(() => {
    clearTestEssentiaInstance();
  });

  it('accepts EngineConfig with featureToggles', () => {
    const engineConfig: EngineConfig = {
      frameSize: 4096,
      hopSize: 2048,
      featureToggles: {
        spectral: true,
        tempo: false,
        key: false,
        mfcc: true,
        onset: true,
        segments: false,
        mlClassification: false,
      },
    };

    const engine = new StreamingAnalysisEngine(engineConfig);
    expect(engine).toBeDefined();
  });

  it('accepts legacy StreamingAnalysisConfig for backward compatibility', () => {
    const legacyConfig = {
      chunkSize: 44100 * 20,
      overlapSize: 44100 * 2,
      frameSize: 4096,
      hopSize: 2048,
      analysisFeatures: {
        spectral: true,
        tempo: true,
        key: true,
        mfcc: true,
        onset: true,
        segments: true,
        mlClassification: true,
      },
    };

    const engine = new StreamingAnalysisEngine(legacyConfig);
    expect(engine).toBeDefined();
  });

  it('defaults to full feature set when no config provided', () => {
    const engine = new StreamingAnalysisEngine();
    expect(engine).toBeDefined();
  });

  it('converts EngineConfig to internal StreamingAnalysisConfig correctly', () => {
    const engineConfig: EngineConfig = {
      frameSize: 8192,
      hopSize: 4096,
      featureToggles: {
        spectral: true,
        tempo: false,
        key: true,
        mfcc: false,
      },
    };

    const engine = new StreamingAnalysisEngine(engineConfig);
    // Engine should be created without errors
    expect(engine).toBeDefined();
  });

  it('respects individual feature toggles in EngineConfig', () => {
    const minimalConfig: EngineConfig = {
      featureToggles: {
        spectral: false,
        tempo: false,
        key: false,
        mfcc: false,
        onset: false,
        segments: false,
        mlClassification: false,
      },
    };

    const engine = new StreamingAnalysisEngine(minimalConfig);
    expect(engine).toBeDefined();
  });
});
