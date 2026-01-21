// src/types/essentia.d.ts
// Minimal, practical typings for the Essentia.js ESM bundles used by this repo.
// Intentionally limited to algorithms actually called in this codebase.

declare module 'essentia.js/dist/essentia-wasm.es.js' {
  export const EssentiaWASM: unknown;
}

declare module 'essentia.js/dist/essentia.js-core.es.js' {
  export interface EssentiaVectorFloat {
    size(): number;
    get(index: number): number;
    delete(): void;
  }

  export interface WindowingOutput { frame: EssentiaVectorFloat; }
  export interface SpectrumOutput { spectrum: EssentiaVectorFloat; }

  export interface SpectralCentroidTimeOutput { centroid: number; }
  export interface RollOffOutput { rollOff: number; }
  export interface FluxOutput { flux: number; }
  export interface EnergyOutput { energy: number; }
  export interface ZeroCrossingRateOutput { zeroCrossingRate: number; }
  export interface DissonanceOutput { dissonance: number; }
  export interface PercivalBpmEstimatorOutput { bpm: number; confidence: number; }
  export interface KeyExtractorOutput { key: string; scale: string; strength: number; }
  export interface MFCCOutput { mfcc: number[] | Float32Array; }

  export default class Essentia {
    constructor(wasmModule: unknown);

    arrayToVector(input: Float32Array | number[]): EssentiaVectorFloat;

    Windowing(
      frame: EssentiaVectorFloat,
      apply: boolean,
      size: number,
      type: 'hann' | 'hamming' | string
    ): WindowingOutput;

    Spectrum(frame: EssentiaVectorFloat, size: number): SpectrumOutput;

    SpectralCentroidTime(frame: EssentiaVectorFloat, sampleRate: number): SpectralCentroidTimeOutput;

    RollOff(spectrum: EssentiaVectorFloat, threshold: number, sampleRate: number): RollOffOutput;

    Flux(previousSpectrum: EssentiaVectorFloat, spectrum: EssentiaVectorFloat): FluxOutput;

    Energy(frame: EssentiaVectorFloat): EnergyOutput;

    Dissonance(frame: EssentiaVectorFloat): DissonanceOutput;

    ZeroCrossingRate(frame: EssentiaVectorFloat): ZeroCrossingRateOutput;

    PercivalBpmEstimator(
      audio: EssentiaVectorFloat,
      frameSize: number,
      hopSize: number,
      sampleRate: number
    ): PercivalBpmEstimatorOutput;

    KeyExtractor(
      audio: EssentiaVectorFloat,
      profileType: boolean,
      frameSize: number,
      hopSize: number,
      sampleRate: number
    ): KeyExtractorOutput;

    MFCC(spectrum: EssentiaVectorFloat, numberCoefficients: number, sampleRate: number): MFCCOutput;

    HPCP(frame: EssentiaVectorFloat, params?: any): { hpcp: EssentiaVectorFloat };

    ChordsDetection(hpcp: EssentiaVectorFloat, params?: any): { chords: EssentiaVectorFloat; strength: EssentiaVectorFloat };

    PitchMelodia(audio: EssentiaVectorFloat, params?: any): { pitch: EssentiaVectorFloat; pitchConfidence: EssentiaVectorFloat };

    vectorToArray(vector: EssentiaVectorFloat): Float32Array | number[] | string[];
  }
}
