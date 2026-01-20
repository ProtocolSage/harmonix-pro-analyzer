// Professional audio analysis type definitions

export interface SpectralFeatures {
  centroid: { mean: number; std: number };
  rolloff: { mean: number; std: number };
  flux: { mean: number; std: number };
  energy: { mean: number; std: number };
  brightness: { mean: number; std: number };
  roughness: { mean: number; std: number };
  spread: { mean: number; std: number };
  contrast?: number[];
  complexity?: number;
  zcr: { mean: number; std: number };
  [key: string]: { mean: number; std: number } | number[] | number | undefined;
}

export interface TempoAnalysis {
  bpm: number;
  confidence: number;
  beats?: number[];
  ticks?: number[];
  onsetRate?: number[];
  onset_strength?: number;
  tempo_stability?: number;
}

export interface RhythmAnalysis {
  // Time signature detection
  timeSignature: {
    numerator: number;              // Beats per measure (e.g., 4 in 4/4)
    denominator: number;            // Note value (e.g., 4 in 4/4)
    confidence: number;             // 0-1, detection confidence
    label: string;                  // Human-readable (e.g., "4/4", "3/4", "6/8")
    compound: boolean;              // True for compound meters (6/8, 9/8, 12/8)
  };

  // Downbeat detection
  downbeats: {
    positions: number[];            // Downbeat positions in seconds
    confidence: number[];           // Confidence per downbeat
    beatStrength: number[];         // Relative strength (0-1) of each downbeat
  };

  // Bar/measure tracking
  measures: Array<{
    index: number;                  // Measure number (0-based)
    start: number;                  // Start time in seconds
    end: number;                    // End time in seconds
    duration: number;               // Duration in seconds
    tempo: number;                  // BPM at this measure
  }>;

  // Beat grid (all beats, not just downbeats)
  beatGrid: {
    positions: number[];            // All beat positions in seconds
    strengths: number[];            // Beat strength (1.0 for downbeat, lower for others)
    subdivisions: number[];         // Sub-beat positions (8th notes, 16th notes)
  };

  // Groove analysis
  groove: {
    swing: number;                  // 0-1, amount of swing/shuffle
    syncopation: number;            // 0-1, rhythmic syncopation level
    quantization: number;           // 0-1, how quantized (0=human, 1=perfect)
    microTiming: number;            // 0-1, microtiming variation
    evenness: number;               // 0-1, rhythmic evenness
  };

  // Rhythm patterns
  patterns: Array<{
    pattern: number[];              // Inter-onset intervals (IOIs) in ms
    occurrences: number;            // How many times it appears
    positions: number[];            // Where it appears (in seconds)
    strength: number;               // 0-1, pattern strength/regularity
    description: string;            // e.g., "straight 8ths", "syncopated 16ths"
  }>;

  // Polyrhythm detection
  polyrhythm: {
    detected: boolean;              // Is polyrhythm present?
    ratio?: string;                 // e.g., "3:2", "4:3"
    confidence?: number;            // 0-1, detection confidence
    layers?: Array<{
      period: number;               // Period in seconds
      strength: number;             // 0-1, layer strength
    }>;
  };

  // Tempo variation over time
  tempoMap: Array<{
    time: number;                   // Time in seconds
    bpm: number;                    // BPM at this point
    confidence: number;             // Confidence of tempo estimate
  }>;

  // Rhythmic complexity metrics
  complexity: number;               // 0-1, overall rhythmic complexity
  density: number;                  // Events per second
  irregularity: number;             // 0-1, deviation from regular pulse
  acceleration: number;             // 0-1, tendency to speed up
  deceleration: number;             // 0-1, tendency to slow down
}

export interface KeyAnalysis {
  key: string;
  scale: string;
  confidence: number;
  hpcp?: number[];
  tonic_frequency?: number;
}

export interface MelodyAnalysis {
  // Pitch tracking (frame-by-frame)
  pitchTrack: number[];           // Hz values per frame
  pitchConfidence: number[];      // Confidence per frame
  // Melodic contour
  contour: {
    points: Array<{ time: number; pitch: number }>;
    direction: 'ascending' | 'descending' | 'stable' | 'mixed';
    smoothness: number;           // 0-1, how smooth the melody is
  };
  // Pitch range statistics
  range: {
    min: number;                  // Lowest pitch in Hz
    max: number;                  // Highest pitch in Hz
    span: number;                 // Range in semitones
    tessitura: number;            // Average pitch (center of range)
  };
  // Melodic intervals
  intervals: {
    semitones: number[];          // Interval sizes in semitones
    types: string[];              // Interval names (minor 2nd, major 3rd, etc.)
    meanInterval: number;         // Average interval size
    maxLeap: number;              // Largest interval jump
  };
  // Motifs and patterns
  motifs: Array<{
    pattern: number[];            // Pitch sequence
    occurrences: number;          // How many times it appears
    positions: number[];          // Where it appears (in seconds)
  }>;
  // Overall characteristics
  complexity: number;             // 0-1, melodic complexity score
  stepwise: number;               // 0-1, percentage of stepwise motion
  chromaticism: number;           // 0-1, amount of chromatic movement
}

export interface HarmonicAnalysis {
  // Chord detection with Roman numeral analysis
  chords: Array<{
    chord: string;                // Chord name (e.g., "C major", "G7", "Am")
    romanNumeral: string;         // Roman numeral in key (e.g., "I", "V7", "vi")
    start: number;                // Start time in seconds
    end: number;                  // End time in seconds
    duration: number;             // Duration in seconds
    root: string;                 // Root note
    quality: string;              // major, minor, diminished, augmented, dominant7, etc.
    inversion: number;            // 0=root position, 1=first inversion, etc.
    tension: number;              // 0-1, harmonic tension level
  }>;

  // Chord progressions
  progressions: Array<{
    progression: string[];        // Sequence of Roman numerals (e.g., ["I", "IV", "V", "I"])
    chordNames: string[];         // Actual chord names
    start: number;                // Start time in seconds
    end: number;                  // End time in seconds
    strength: number;             // 0-1, how common/strong this progression is
    type: string;                 // e.g., "cadential", "circle-of-fifths", "chromatic"
  }>;

  // Cadence detection
  cadences: Array<{
    type: 'authentic' | 'plagal' | 'deceptive' | 'half' | 'imperfect';
    position: number;             // Time in seconds
    strength: number;             // 0-1, strength of cadence
    chords: string[];             // Chord sequence (e.g., ["V7", "I"])
    romanNumerals: string[];      // Roman numeral sequence
  }>;

  // Key modulations
  modulations: Array<{
    fromKey: string;              // Original key
    toKey: string;                // New key
    position: number;             // Time in seconds
    method: string;               // e.g., "pivot chord", "direct", "chromatic"
    pivotChord?: string;          // If pivot chord modulation
  }>;

  // Harmonic rhythm (rate of chord changes)
  harmonicRhythm: {
    meanDuration: number;         // Average chord duration
    variance: number;             // Variance in chord durations
    stability: number;            // 0-1, how stable the harmonic rhythm is
    changeRate: number;           // Chords per second
  };

  // Tension/resolution analysis
  tensionCurve: Array<{
    time: number;                 // Time in seconds
    tension: number;              // 0-1, harmonic tension at this point
  }>;

  // Functional analysis (how chords function in the key)
  functionalAnalysis: {
    tonic: number;                // 0-1, percentage of tonic function chords (I, vi)
    subdominant: number;          // 0-1, percentage of subdominant function (IV, ii)
    dominant: number;             // 0-1, percentage of dominant function (V, vii°)
    tonicization: number;         // 0-1, amount of temporary key changes
  };

  // Overall characteristics
  complexity: number;             // 0-1, harmonic complexity score
  chromaticism: number;           // 0-1, amount of chromatic harmony
  stability: number;              // 0-1, harmonic stability
  uniqueChords: number;           // Number of unique chords used
  modalMixture: number;           // 0-1, use of chords from parallel modes
}

export interface AudioAnalysisResult {
  key?: KeyAnalysis;
  tempo?: TempoAnalysis;
  rhythm?: RhythmAnalysis;
  melody?: MelodyAnalysis;
  spectral?: SpectralFeatures;
  mfcc?: number[];
  melSpectrogram?: Float32Array;
  spectralEnvelope?: Float32Array;
  genre?: {
    genre: string;
    confidence: number;
    predictions: Array<{
      genre: string;
      confidence: number;
    }>;
  };
  mood?: {
    [moodType: string]: {
      confidence: number;
      value?: number;
    };
  };
  onsets?: {
    onsets: number[];
    error?: string;
  };
  structure?: {
    structure: Array<{
      label: string;
      start: number;
      end: number;
    }>;
    error?: string;
  };
  loudness?: {
    // Integrated loudness (overall average)
    integrated: number;           // LUFS integrated
    // Momentary loudness (400ms windows)
    momentary: {
      max: number;
      values: number[];           // Time-series data
    };
    // Short-term loudness (3s windows)
    shortTerm: {
      max: number;
      values: number[];           // Time-series data
    };
    // True peak detection
    truePeak: {
      max: number;                // dBTP
      maxLeft: number;
      maxRight: number;
      positions: number[];        // Time positions of peaks
    };
    // Dynamic range metrics
    dynamicRange: number;         // DR meter value
    loudnessRange: number;        // LRA (EBU R128)
    crestFactor: number;          // Peak to RMS ratio
    // RMS levels
    rms: {
      overall: number;            // Overall RMS in dBFS
      left: number;
      right: number;
      perSecond: number[];        // Per-second RMS values
    };
    // Compliance and recommendations
    compliance: {
      ebur128: boolean;           // EBU R128 compliant
      atsca85: boolean;           // ATSC A/85 compliant
      targetLUFS: number;         // Recommended target (-14, -16, -23)
      headroom: number;           // Headroom to 0 dBFS
      needsNormalization: boolean;
    };
    error?: string;
  };
  instruments?: {
    instruments: string[];
    confidence: number;
    error?: string;
  };
  harmonic?: HarmonicAnalysis;
  duration: number;
  sampleRate: number;
  channels: number;
  analysisTimestamp: number;
  modelsAvailable?: string[];
  analysisType?: 'full' | 'streaming';
  chunks?: number;
  processingTime?: number;
  fileSize?: string;
  format?: string;
  essentiaVersion?: string;
  performance?: {
    totalAnalysisTime: number;
    breakdown: Record<string, number>;
    memoryUsage: number;
  };
}

export interface AnalysisProgress {
  stage: 'decoding' | 'analyzing' | 'complete' | 'batch';
  mlPending?: boolean;
  percentage: number;
  progress: number; // 0-1
  currentStep: string;
  completedSteps: string[];
  fileIndex?: number;
  totalFiles?: number;
  currentFile?: string;
  message?: string;
}

export interface EngineStatus {
  status: 'initializing' | 'loading' | 'ready' | 'error';
  message?: string;
  modelsLoaded?: number;
  totalModels?: number;
  mlStatus?: {
    isInitialized: boolean;
    isWarmingUp: boolean;
    isUnavailable: boolean;
    restartCount: number;
    warmupAttempts: number;
  };
}

export interface WorkerMessage {
  type: string;
  data?: any;
  messageId?: number;
  result?: any;
  error?: string;
}

export interface StreamingChunk {
  startTime: number;
  endTime: number;
  chunkIndex: number;
  key?: KeyAnalysis;
  tempo?: TempoAnalysis;
  spectral?: SpectralFeatures;
  mfcc?: number[];
}

export interface ModelConfig {
  musicnn?: string;
  moodHappy?: string;
  moodSad?: string;
  danceability?: string;
  genre?: string;
}

export interface FeatureToggles {
  spectral?: boolean;
  tempo?: boolean;
  key?: boolean;
  mfcc?: boolean;
  onset?: boolean;
  segments?: boolean;
  mlClassification?: boolean;
}

/**
 * Unified engine configuration for all analysis backends.
 * Centralizes frame/hop settings, feature toggles, and backend selection.
 */
export interface EngineConfig {
  /** Frame size for windowed analysis (default: 2048) */
  frameSize?: number;
  /** Hop size for window advancement (default: 1024) */
  hopSize?: number;
  /** Feature toggles to enable/disable specific analyses */
  featureToggles?: FeatureToggles;
  /** Backend to use: 'essentia' (batch), 'streaming', or 'mock' (testing) */
  backend?: 'essentia' | 'streaming' | 'mock';
  /** Progress callback for long-running analyses */
  progressCallback?: (progress: AnalysisProgress) => void;
  /** ML model configuration */
  modelConfig?: ModelConfig;
}

export interface AnalysisOptions {
  includeAdvanced?: boolean;
  forceStreaming?: boolean;
  progressCallback?: (progress: AnalysisProgress) => void;
  modelConfig?: ModelConfig;
  featureToggles?: FeatureToggles;
  /** Unified engine configuration (preferred over individual fields) */
  engineConfig?: EngineConfig;
}

export interface ExportOptions {
  format: 'json' | 'csv';
  includeRawData?: boolean;
  timestamp?: boolean;
}

export interface ExportResult {
  filename: string;
  data: string;
  mimeType: string;
}
