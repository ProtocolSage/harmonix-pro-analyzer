// Type definitions for Essentia.js
declare module 'essentia.js/dist/essentia.js-core.es.js' {
  export default class Essentia {
    constructor(EssentiaWASM: any, isDebug?: boolean);
    module: any;
    version: string;
    algorithmNames: string[];
    
    // Vector conversion
    arrayToVector(array: Float32Array | number[]): any;
    vectorToArray(vector: any): Float32Array;
    
    // Windowing
    Windowing(frame: any, normalized?: boolean, size?: number, type?: string, zeroPadding?: number, zeroPhase?: boolean): { frame: any };
    
    // Spectral
    Spectrum(frame: any, size?: number): { spectrum: any };
    SpectralCentroidTime(signal: any, sampleRate: number): { centroid: number };
    RollOff(spectrum: any, cutoff?: number, sampleRate?: number): { rollOff: number };
    
    // Tempo
    PercivalBpmEstimator(signal: any, frameSize?: number, hopSize?: number, sampleRate?: number): { bpm: number; confidence?: number };
    
    // Key
    KeyExtractor(signal: any, averageDetuningCorrection?: boolean, frameSize?: number, hopSize?: number, sampleRate?: number): {
      key: string;
      scale: string;
      strength: number;
    };
    
    // MFCC
    MFCC(spectrum: any, numberCoefficients?: number, sampleRate?: number): { mfcc: any };
  }
}

declare module 'essentia.js/dist/essentia-wasm.es.js' {
  export const EssentiaWASM: any;
}

declare module 'essentia.js/dist/essentia-wasm.web.js' {
  const EssentiaWASM: any;
  export default EssentiaWASM;
}