/**
 * Melody Analysis Engine
 * Extracts and analyzes melodic content from audio:
 * - Pitch tracking (fundamental frequency detection)
 * - Melodic contour (shape and direction)
 * - Pitch range and tessitura
 * - Melodic intervals
 * - Motif detection (repeated patterns)
 * - Melodic complexity metrics
 */

import type { MelodyAnalysis } from '../types/audio';
import type Essentia from 'essentia.js/dist/essentia.js-core.es.js';

export class MelodyAnalysisEngine {
  private sampleRate: number;
  private essentia: Essentia | null = null;

  constructor(sampleRate: number = 44100, essentia?: any) {
    this.sampleRate = sampleRate;
    this.essentia = essentia || null;
  }

  /**
   * Analyze melody from audio buffer
   */
  async analyze(audioBuffer: AudioBuffer): Promise<MelodyAnalysis> {
    const channelData = audioBuffer.getChannelData(0);

    // Step 1: Pitch tracking (fundamental frequency estimation)
    const { pitchTrack, pitchConfidence } = await this.extractPitchTrack(channelData);

    // Step 2: Analyze melodic contour
    const contour = this.analyzeMelodicContour(pitchTrack, pitchConfidence);

    // Step 3: Calculate pitch range statistics
    const range = this.calculatePitchRange(pitchTrack, pitchConfidence);

    // Step 4: Analyze melodic intervals
    const intervals = this.analyzeMelodicIntervals(pitchTrack, pitchConfidence);

    // Step 5: Detect motifs and patterns
    const motifs = this.detectMotifs(pitchTrack, pitchConfidence);

    // Step 6: Calculate overall characteristics
    const complexity = this.calculateComplexity(intervals, contour);
    const stepwise = this.calculateStepwiseMotion(intervals);
    const chromaticism = this.calculateChromaticism(intervals);

    return {
      pitchTrack,
      pitchConfidence,
      contour,
      range,
      intervals,
      motifs,
      complexity,
      stepwise,
      chromaticism
    };
  }

  /**
   * Extract pitch track using autocorrelation (YIN-like algorithm)
   */
  private async extractPitchTrack(channelData: Float32Array): Promise<{
    pitchTrack: number[];
    pitchConfidence: number[];
  }> {
    if (this.essentia) {
      const frameSize = 2048;
      const hopSize = 512;
      
      // Limit to 30s segment for performance in main thread
      const maxSamples = this.sampleRate * 30;
      const startIdx = Math.max(0, Math.floor((channelData.length - maxSamples) / 2));
      const segment = channelData.slice(startIdx, startIdx + maxSamples);
      
      const inputVector = this.essentia.arrayToVector(segment);
      const result = this.essentia.PitchMelodia(inputVector, {
        sampleRate: this.sampleRate,
        frameSize: frameSize,
        hopSize: hopSize,
        guessUnvoiced: true
      });

      const pitchTrack = Array.from(this.essentia.vectorToArray(result.pitch) as number[]);
      const pitchConfidence = Array.from(this.essentia.vectorToArray(result.pitchConfidence) as number[]);

      inputVector.delete();
      result.pitch.delete();
      result.pitchConfidence.delete();

      return { pitchTrack, pitchConfidence };
    }

    const frameSize = 2048;
    const hopSize = 512;
    const minFreq = 60; // C2
    const maxFreq = 2000; // B6 (covering most melodic range)

    const pitchTrack: number[] = [];
    const pitchConfidence: number[] = [];

    // Process in overlapping frames
    for (let i = 0; i + frameSize < channelData.length; i += hopSize) {
      const frame = channelData.slice(i, i + frameSize);
      const { pitch, confidence } = this.detectPitchYIN(frame, minFreq, maxFreq);

      pitchTrack.push(pitch);
      pitchConfidence.push(confidence);
    }

    return { pitchTrack, pitchConfidence };
  }

  /**
   * YIN algorithm for pitch detection
   * Simplified implementation of the YIN fundamental frequency estimator
   */
  private detectPitchYIN(
    frame: Float32Array,
    minFreq: number,
    maxFreq: number
  ): { pitch: number; confidence: number } {
    const maxLag = Math.floor(this.sampleRate / minFreq);
    const minLag = Math.floor(this.sampleRate / maxFreq);

    // Difference function
    const diff = new Float32Array(maxLag);
    for (let tau = 0; tau < maxLag; tau++) {
      let sum = 0;
      for (let i = 0; i < frame.length - tau; i++) {
        const delta = frame[i] - frame[i + tau];
        sum += delta * delta;
      }
      diff[tau] = sum;
    }

    // Cumulative mean normalized difference
    const cmndf = new Float32Array(maxLag);
    cmndf[0] = 1;
    let runningSum = 0;

    for (let tau = 1; tau < maxLag; tau++) {
      runningSum += diff[tau];
      cmndf[tau] = diff[tau] / (runningSum / tau);
    }

    // Find best tau (first minimum below threshold)
    const threshold = 0.1;
    let bestTau = minLag;
    let bestValue = 1;

    for (let tau = minLag; tau < maxLag; tau++) {
      if (cmndf[tau] < threshold) {
        bestTau = tau;
        bestValue = cmndf[tau];
        break;
      }
      if (cmndf[tau] < bestValue) {
        bestTau = tau;
        bestValue = cmndf[tau];
      }
    }

    // Parabolic interpolation for sub-sample accuracy
    if (bestTau > minLag && bestTau < maxLag - 1) {
      const s0 = cmndf[bestTau - 1];
      const s1 = cmndf[bestTau];
      const s2 = cmndf[bestTau + 1];
      const adjustment = 0.5 * (s0 - s2) / (s0 - 2 * s1 + s2);
      bestTau += adjustment;
    }

    const pitch = this.sampleRate / bestTau;
    const confidence = 1 - bestValue; // Convert CMNDF to confidence

    // Filter out unreliable detections
    if (confidence < 0.5 || pitch < minFreq || pitch > maxFreq) {
      return { pitch: 0, confidence: 0 };
    }

    return { pitch, confidence };
  }

  /**
   * Analyze melodic contour (shape and direction)
   */
  private analyzeMelodicContour(
    pitchTrack: number[],
    pitchConfidence: number[]
  ): MelodyAnalysis['contour'] {
    // Filter valid pitches
    const validPoints: Array<{ time: number; pitch: number }> = [];
    const hopSize = 512;

    for (let i = 0; i < pitchTrack.length; i++) {
      if (pitchConfidence[i] > 0.5 && pitchTrack[i] > 0) {
        validPoints.push({
          time: (i * hopSize) / this.sampleRate,
          pitch: pitchTrack[i]
        });
      }
    }

    if (validPoints.length < 2) {
      return {
        points: validPoints,
        direction: 'stable',
        smoothness: 0
      };
    }

    // Determine overall direction
    const firstThird = validPoints.slice(0, Math.floor(validPoints.length / 3));
    const lastThird = validPoints.slice(Math.floor(2 * validPoints.length / 3));

    const avgFirst = firstThird.reduce((sum, p) => sum + p.pitch, 0) / firstThird.length;
    const avgLast = lastThird.reduce((sum, p) => sum + p.pitch, 0) / lastThird.length;

    const semitoneChange = 12 * Math.log2(avgLast / avgFirst);

    let direction: 'ascending' | 'descending' | 'stable' | 'mixed';
    if (Math.abs(semitoneChange) < 2) {
      direction = 'stable';
    } else if (semitoneChange > 0) {
      direction = 'ascending';
    } else {
      direction = 'descending';
    }

    // Check for mixed movement
    let changes = 0;
    let lastDirection = 0;
    for (let i = 1; i < validPoints.length; i++) {
      const currentDirection = Math.sign(validPoints[i].pitch - validPoints[i - 1].pitch);
      if (currentDirection !== 0 && currentDirection !== lastDirection && lastDirection !== 0) {
        changes++;
      }
      if (currentDirection !== 0) {
        lastDirection = currentDirection;
      }
    }

    if (changes > validPoints.length * 0.3) {
      direction = 'mixed';
    }

    // Calculate smoothness (inverse of pitch variation)
    const pitchVariance = validPoints.reduce((sum, p, i, arr) => {
      if (i === 0) return 0;
      const diff = Math.abs(p.pitch - arr[i - 1].pitch);
      return sum + diff;
    }, 0) / validPoints.length;

    const smoothness = Math.max(0, 1 - pitchVariance / 100);

    return {
      points: validPoints,
      direction,
      smoothness
    };
  }

  /**
   * Calculate pitch range statistics
   */
  private calculatePitchRange(
    pitchTrack: number[],
    pitchConfidence: number[]
  ): MelodyAnalysis['range'] {
    const validPitches = pitchTrack.filter((p, i) => pitchConfidence[i] > 0.5 && p > 0);

    if (validPitches.length === 0) {
      return {
        min: 0,
        max: 0,
        span: 0,
        tessitura: 0
      };
    }

    const min = Math.min(...validPitches);
    const max = Math.max(...validPitches);
    const span = 12 * Math.log2(max / min); // Range in semitones
    const tessitura = validPitches.reduce((sum, p) => sum + p, 0) / validPitches.length;

    return { min, max, span, tessitura };
  }

  /**
   * Analyze melodic intervals
   */
  private analyzeMelodicIntervals(
    pitchTrack: number[],
    pitchConfidence: number[]
  ): MelodyAnalysis['intervals'] {
    const semitones: number[] = [];
    const types: string[] = [];

    const intervalNames = [
      'unison', 'minor 2nd', 'major 2nd', 'minor 3rd', 'major 3rd',
      'perfect 4th', 'tritone', 'perfect 5th', 'minor 6th', 'major 6th',
      'minor 7th', 'major 7th', 'octave'
    ];

    // Calculate intervals between consecutive valid pitches
    for (let i = 1; i < pitchTrack.length; i++) {
      if (pitchConfidence[i] > 0.5 && pitchConfidence[i - 1] > 0.5 &&
          pitchTrack[i] > 0 && pitchTrack[i - 1] > 0) {
        const semitone = Math.abs(12 * Math.log2(pitchTrack[i] / pitchTrack[i - 1]));

        if (semitone < 13) { // Within an octave
          semitones.push(semitone);
          const rounded = Math.round(semitone);
          types.push(intervalNames[rounded] || `${rounded} semitones`);
        }
      }
    }

    const meanInterval = semitones.length > 0
      ? semitones.reduce((sum, s) => sum + s, 0) / semitones.length
      : 0;

    const maxLeap = semitones.length > 0 ? Math.max(...semitones) : 0;

    return {
      semitones,
      types,
      meanInterval,
      maxLeap
    };
  }

  /**
   * Detect repeated melodic motifs
   */
  private detectMotifs(
    pitchTrack: number[],
    pitchConfidence: number[]
  ): MelodyAnalysis['motifs'] {
    // Convert pitches to semitone sequence (relative to first note)
    const validPitches: number[] = [];
    const validTimes: number[] = [];
    const hopSize = 512;

    for (let i = 0; i < pitchTrack.length; i++) {
      if (pitchConfidence[i] > 0.5 && pitchTrack[i] > 0) {
        validPitches.push(pitchTrack[i]);
        validTimes.push((i * hopSize) / this.sampleRate);
      }
    }

    if (validPitches.length < 4) {
      return [];
    }

    // Convert to relative semitones
    const relativeSemitones = validPitches.map(p =>
      Math.round(12 * Math.log2(p / validPitches[0]))
    );

    // Find repeated patterns (length 3-8 notes)
    const motifs: Map<string, { pattern: number[]; positions: number[] }> = new Map();

    for (let length = 3; length <= Math.min(8, relativeSemitones.length / 2); length++) {
      for (let i = 0; i <= relativeSemitones.length - length; i++) {
        const pattern = relativeSemitones.slice(i, i + length);
        const key = pattern.join(',');

        // Look for this pattern elsewhere
        for (let j = i + length; j <= relativeSemitones.length - length; j++) {
          const candidate = relativeSemitones.slice(j, j + length);
          if (candidate.join(',') === key) {
            if (!motifs.has(key)) {
              motifs.set(key, {
                pattern,
                positions: [validTimes[i]]
              });
            }
            motifs.get(key)!.positions.push(validTimes[j]);
          }
        }
      }
    }

    // Convert to array and filter (only keep patterns that repeat at least once)
    return Array.from(motifs.values())
      .filter(m => m.positions.length >= 2)
      .map(m => ({
        pattern: m.pattern,
        occurrences: m.positions.length,
        positions: m.positions
      }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 5); // Top 5 motifs
  }

  /**
   * Calculate melodic complexity (based on interval variety and contour changes)
   */
  private calculateComplexity(
    intervals: MelodyAnalysis['intervals'],
    contour: MelodyAnalysis['contour']
  ): number {
    if (intervals.semitones.length === 0) return 0;

    // Factors: interval variety, large leaps, contour smoothness
    const uniqueIntervals = new Set(intervals.types).size;
    const intervalVariety = uniqueIntervals / 12; // Normalize by number of interval types

    const leapFactor = Math.min(1, intervals.maxLeap / 12); // Large leaps increase complexity

    const smoothnessFactor = 1 - contour.smoothness; // Less smooth = more complex

    // Weighted combination
    const complexity = (intervalVariety * 0.4) + (leapFactor * 0.3) + (smoothnessFactor * 0.3);

    return Math.min(1, complexity);
  }

  /**
   * Calculate percentage of stepwise motion (steps vs leaps)
   */
  private calculateStepwiseMotion(intervals: MelodyAnalysis['intervals']): number {
    if (intervals.semitones.length === 0) return 0;

    // Stepwise = intervals of 1 or 2 semitones
    const stepwiseCount = intervals.semitones.filter(s => s <= 2).length;

    return stepwiseCount / intervals.semitones.length;
  }

  /**
   * Calculate chromaticism (non-diatonic movement)
   */
  private calculateChromaticism(intervals: MelodyAnalysis['intervals']): number {
    if (intervals.semitones.length === 0) return 0;

    // Diatonic intervals: 0, 2, 3, 5, 7, 8, 10, 12 semitones
    const diatonicIntervals = new Set([0, 2, 3, 5, 7, 8, 10, 12]);

    const chromaticCount = intervals.semitones.filter(s => {
      const rounded = Math.round(s);
      return !diatonicIntervals.has(rounded);
    }).length;

    return chromaticCount / intervals.semitones.length;
  }
}
