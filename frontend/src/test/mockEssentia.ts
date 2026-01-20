/**
 * Test-only Essentia mock to bypass WASM initialization issues in Vitest/Node.
 * This allows testing merge logic, config propagation, and worker communication
 * without requiring the full WASM runtime.
 */

export class MockEssentia {
  // Vector helpers
  arrayToVector(arr: Float32Array | number[]): any {
    return arr;
  }

  vectorToArray(vec: any): Float32Array {
    return vec instanceof Float32Array ? vec : new Float32Array(vec);
  }

  // Windowing
  Windowing(frame: any): { frame: any } {
    return { frame };
  }

  // Spectrum
  Spectrum(windowed: any): { spectrum: Float32Array } {
    const len = windowed.length || 1024;
    const spectrum = new Float32Array(len / 2);
    // Generate synthetic spectrum with some energy distribution
    for (let i = 0; i < spectrum.length; i++) {
      spectrum[i] = Math.random() * 0.1 * Math.exp(-i / spectrum.length);
    }
    return { spectrum };
  }

  // Spectral features
  SpectralCentroidTime(frame: any, sampleRate: number): { spectralCentroid: number } {
    return { spectralCentroid: 1000 + Math.random() * 500 };
  }

  ZeroCrossingRate(frame: any): { zeroCrossingRate: number } {
    return { zeroCrossingRate: 0.05 + Math.random() * 0.05 };
  }

  // MFCC
  MFCC(spectrum: any, numCoeffs: number, sampleRate: number): { mfcc: number[] } {
    const mfcc = Array.from({ length: numCoeffs }, () => Math.random() * 2 - 1);
    return { mfcc };
  }

  // Rhythm
  RhythmExtractor2013(audio: any, options: any): { bpm: number; confidence: number; beats: number[]; ticks: number[] } {
    return {
      bpm: 120 + Math.random() * 20,
      confidence: 0.8 + Math.random() * 0.15,
      beats: [0, 0.5, 1.0, 1.5],
      ticks: [0, 0.25, 0.5, 0.75, 1.0],
    };
  }

  // Key detection
  KeyExtractor(audio: any, pcpSize: boolean, frameSize: number, hopSize: number, sampleRate: number): {
    key: string;
    scale: string;
    strength: number;
  } {
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const scales = ['major', 'minor'];
    return {
      key: keys[Math.floor(Math.random() * keys.length)],
      scale: scales[Math.floor(Math.random() * scales.length)],
      strength: 0.7 + Math.random() * 0.25,
    };
  }

  // Melody
  PitchMelodia(audio: any, options: any): { pitch: Float32Array; pitchConfidence: Float32Array } {
    const len = audio.length || 1024;
    const frames = Math.floor(len / (options.hopSize || 512));
    return {
      pitch: new Float32Array(frames).fill(440),
      pitchConfidence: new Float32Array(frames).fill(0.95),
    };
  }

  // HPCP
  HPCP(audio: any, options: any): { hpcp: Float32Array } {
    return {
      hpcp: new Float32Array(12).fill(0.1),
    };
  }

  // Chords
  ChordsDetection(hpcp: any, options: any): { chords: string[]; strength: Float32Array } {
    return {
      chords: ['C', 'C', 'G', 'G'],
      strength: new Float32Array([0.9, 0.85, 0.88, 0.92]),
    };
  }

  // Mel Bands
  MelBands(spectrum: any, numBands: number, sampleRate: number): { melBands: Float32Array } {
    return {
      melBands: new Float32Array(numBands).fill(0.05),
    };
  }

  // Cleanup (no-op for mock)
  delete(vec: any): void {
    // No cleanup needed for mock
  }
}

let mockInstance: MockEssentia | null = null;

export async function getMockEssentiaInstance(): Promise<MockEssentia> {
  if (!mockInstance) {
    mockInstance = new MockEssentia();
  }
  return mockInstance;
}
