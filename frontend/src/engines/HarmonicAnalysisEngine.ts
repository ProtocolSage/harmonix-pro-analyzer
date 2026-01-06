/**
 * Harmonic Analysis Engine
 * Comprehensive harmonic and chord analysis:
 * - Chord detection with Roman numeral analysis
 * - Chord progressions and patterns
 * - Cadence detection (authentic, plagal, deceptive, half)
 * - Key modulation detection
 * - Harmonic rhythm analysis
 * - Tension/resolution mapping
 * - Functional harmonic analysis
 */

import type { HarmonicAnalysis, KeyAnalysis } from '../types/audio';

export class HarmonicAnalysisEngine {
  private sampleRate: number;
  private key: KeyAnalysis;

  // Note mapping for Roman numeral analysis
  private static readonly NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // Major scale intervals (semitones from root)
  private static readonly MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

  // Natural minor scale intervals
  private static readonly MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

  // Roman numerals for major and minor keys
  private static readonly MAJOR_NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
  private static readonly MINOR_NUMERALS = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];

  // Common chord progressions
  private static readonly COMMON_PROGRESSIONS = [
    { pattern: ['I', 'V', 'vi', 'IV'], name: 'Pop progression', strength: 0.9 },
    { pattern: ['I', 'IV', 'V', 'I'], name: 'Cadential', strength: 0.95 },
    { pattern: ['ii', 'V', 'I'], name: 'Jazz ii-V-I', strength: 0.9 },
    { pattern: ['I', 'vi', 'IV', 'V'], name: '50s progression', strength: 0.85 },
    { pattern: ['vi', 'IV', 'I', 'V'], name: 'Sensitive female', strength: 0.85 },
    { pattern: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'], name: 'Pachelbel', strength: 0.8 },
    { pattern: ['I', 'III', 'IV', 'iv'], name: 'Royal Road', strength: 0.75 },
  ];

  constructor(sampleRate: number, key: KeyAnalysis) {
    this.sampleRate = sampleRate;
    this.key = key;
  }

  /**
   * Analyze harmonics from audio buffer
   */
  async analyze(audioBuffer: AudioBuffer): Promise<HarmonicAnalysis> {
    const channelData = audioBuffer.getChannelData(0);

    // Step 1: Detect chords using HPCP-based analysis
    const detectedChords = await this.detectChords(audioBuffer);

    // Step 2: Add Roman numeral analysis to chords
    const chords = this.addRomanNumerals(detectedChords);

    // Step 3: Identify chord progressions
    const progressions = this.identifyProgressions(chords);

    // Step 4: Detect cadences
    const cadences = this.detectCadences(chords);

    // Step 5: Detect key modulations
    const modulations = this.detectModulations(chords);

    // Step 6: Analyze harmonic rhythm
    const harmonicRhythm = this.analyzeHarmonicRhythm(chords);

    // Step 7: Create tension/resolution curve
    const tensionCurve = this.analyzeTensionCurve(chords);

    // Step 8: Functional analysis
    const functionalAnalysis = this.analyzeFunctionalHarmony(chords);

    // Step 9: Calculate overall characteristics
    const complexity = this.calculateHarmonicComplexity(chords, progressions);
    const chromaticism = this.calculateChromaticism(chords);
    const stability = this.calculateStability(chords, tensionCurve);
    const uniqueChords = new Set(chords.map(c => c.chord)).size;
    const modalMixture = this.calculateModalMixture(chords);

    return {
      chords,
      progressions,
      cadences,
      modulations,
      harmonicRhythm,
      tensionCurve,
      functionalAnalysis,
      complexity,
      chromaticism,
      stability,
      uniqueChords,
      modalMixture
    };
  }

  /**
   * Detect chords using HPCP (Harmonic Pitch Class Profile)
   * Simplified chord detection - in production, use Essentia's ChordsDetection
   */
  private async detectChords(audioBuffer: AudioBuffer): Promise<Array<{
    chord: string;
    start: number;
    end: number;
    duration: number;
    root: string;
    quality: string;
    inversion: number;
  }>> {
    const chords: Array<{
      chord: string;
      start: number;
      end: number;
      duration: number;
      root: string;
      quality: string;
      inversion: number;
    }> = [];

    const channelData = audioBuffer.getChannelData(0);
    const frameSize = 4096;
    const hopSize = 2048;
    const duration = audioBuffer.duration;

    // Process in frames
    for (let i = 0; i + frameSize < channelData.length; i += hopSize) {
      const frame = channelData.slice(i, i + frameSize);
      const time = i / this.sampleRate;

      // Extract pitch class profile
      const chromagram = this.extractChromagram(frame);

      // Detect chord from chromagram
      const chord = this.chromagramToChord(chromagram);

      // Merge consecutive same chords
      if (chords.length > 0 && chords[chords.length - 1].chord === chord.chord) {
        chords[chords.length - 1].end = time + (hopSize / this.sampleRate);
        chords[chords.length - 1].duration = chords[chords.length - 1].end - chords[chords.length - 1].start;
      } else {
        chords.push({
          ...chord,
          start: time,
          end: time + (hopSize / this.sampleRate),
          duration: hopSize / this.sampleRate
        });
      }
    }

    // Filter out very short chords (likely noise)
    return chords.filter(c => c.duration > 0.1);
  }

  /**
   * Extract chromagram (12-bin pitch class profile)
   */
  private extractChromagram(frame: Float32Array): number[] {
    const chromagram = new Array(12).fill(0);
    const fftSize = frame.length;

    // Simple FFT-based chromagram
    // In production, use Essentia's HPCP algorithm
    for (let bin = 0; bin < fftSize / 2; bin++) {
      const freq = (bin * this.sampleRate) / fftSize;

      if (freq < 60 || freq > 5000) continue;

      // Convert frequency to pitch class
      const pitchClass = Math.round(12 * Math.log2(freq / 440)) % 12;
      const magnitude = Math.abs(frame[bin]);

      chromagram[(pitchClass + 12) % 12] += magnitude;
    }

    // Normalize
    const max = Math.max(...chromagram);
    if (max > 0) {
      return chromagram.map(v => v / max);
    }
    return chromagram;
  }

  /**
   * Convert chromagram to chord
   */
  private chromagramToChord(chromagram: number[]): {
    chord: string;
    root: string;
    quality: string;
    inversion: number;
  } {
    // Chord templates (which pitch classes are active)
    const templates = {
      major: [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0], // Root, major 3rd, perfect 5th
      minor: [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0], // Root, minor 3rd, perfect 5th
      diminished: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0], // Root, minor 3rd, diminished 5th
      augmented: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], // Root, major 3rd, augmented 5th
      dominant7: [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], // Root, major 3rd, perfect 5th, minor 7th
      major7: [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1], // Root, major 3rd, perfect 5th, major 7th
      minor7: [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0], // Root, minor 3rd, perfect 5th, minor 7th
    };

    let bestMatch = { root: 0, quality: 'major', score: 0 };

    // Try all 12 roots and all qualities
    for (let root = 0; root < 12; root++) {
      for (const [quality, template] of Object.entries(templates)) {
        // Rotate template to this root
        const rotated = [...template.slice(root), ...template.slice(0, root)];

        // Calculate correlation with chromagram
        let score = 0;
        for (let i = 0; i < 12; i++) {
          score += chromagram[i] * rotated[i];
        }

        if (score > bestMatch.score) {
          bestMatch = { root, quality, score };
        }
      }
    }

    const rootNote = HarmonicAnalysisEngine.NOTE_NAMES[bestMatch.root];
    const quality = bestMatch.quality;

    let chordName = rootNote;
    if (quality === 'minor') chordName += 'm';
    else if (quality === 'diminished') chordName += 'dim';
    else if (quality === 'augmented') chordName += 'aug';
    else if (quality === 'dominant7') chordName += '7';
    else if (quality === 'major7') chordName += 'maj7';
    else if (quality === 'minor7') chordName += 'm7';

    return {
      chord: chordName,
      root: rootNote,
      quality: bestMatch.quality,
      inversion: 0 // Simplified - inversion detection requires more complex analysis
    };
  }

  /**
   * Add Roman numeral analysis to chords based on key
   */
  private addRomanNumerals(chords: Array<{
    chord: string;
    start: number;
    end: number;
    duration: number;
    root: string;
    quality: string;
    inversion: number;
  }>): HarmonicAnalysis['chords'] {
    const keyRoot = this.key.key;
    const isMinor = this.key.scale === 'minor';
    const scale = isMinor ? HarmonicAnalysisEngine.MINOR_SCALE : HarmonicAnalysisEngine.MAJOR_SCALE;
    const numerals = isMinor ? HarmonicAnalysisEngine.MINOR_NUMERALS : HarmonicAnalysisEngine.MAJOR_NUMERALS;

    const keyRootIndex = HarmonicAnalysisEngine.NOTE_NAMES.indexOf(keyRoot);

    return chords.map(chord => {
      const chordRootIndex = HarmonicAnalysisEngine.NOTE_NAMES.indexOf(chord.root);
      const intervalFromKey = (chordRootIndex - keyRootIndex + 12) % 12;

      // Find scale degree
      let scaleDegree = scale.indexOf(intervalFromKey);
      let romanNumeral = '';

      if (scaleDegree !== -1) {
        // Diatonic chord
        romanNumeral = numerals[scaleDegree];

        // Add quality modifications
        if (chord.quality === 'dominant7') {
          romanNumeral += '7';
        } else if (chord.quality === 'major7') {
          romanNumeral += 'maj7';
        } else if (chord.quality === 'minor7') {
          romanNumeral += '7';
        }
      } else {
        // Chromatic chord - use accidentals
        const nearestScaleDegree = scale.reduce((prev, curr) =>
          Math.abs(curr - intervalFromKey) < Math.abs(prev - intervalFromKey) ? curr : prev
        );
        scaleDegree = scale.indexOf(nearestScaleDegree);
        const accidental = intervalFromKey > nearestScaleDegree ? '#' : 'b';
        romanNumeral = accidental + numerals[scaleDegree];
      }

      // Calculate harmonic tension
      const tension = this.calculateChordTension(chord, intervalFromKey, isMinor);

      return {
        ...chord,
        romanNumeral,
        tension
      };
    });
  }

  /**
   * Calculate harmonic tension for a chord
   */
  private calculateChordTension(
    chord: { quality: string; root: string },
    intervalFromKey: number,
    isMinor: boolean
  ): number {
    let tension = 0;

    // Tonic = low tension (0.1), dominant = high tension (0.8)
    const scale = isMinor ? HarmonicAnalysisEngine.MINOR_SCALE : HarmonicAnalysisEngine.MAJOR_SCALE;

    if (intervalFromKey === 0) {
      tension = 0.1; // Tonic
    } else if (intervalFromKey === 7) {
      tension = 0.8; // Dominant
    } else if (intervalFromKey === 5) {
      tension = 0.5; // Subdominant
    } else if (scale.includes(intervalFromKey)) {
      tension = 0.4; // Other diatonic
    } else {
      tension = 0.9; // Chromatic
    }

    // Diminished and dominant 7 add tension
    if (chord.quality === 'diminished') tension += 0.2;
    if (chord.quality === 'dominant7') tension += 0.15;
    if (chord.quality === 'augmented') tension += 0.25;

    return Math.min(1, tension);
  }

  /**
   * Identify chord progressions
   */
  private identifyProgressions(chords: HarmonicAnalysis['chords']): HarmonicAnalysis['progressions'] {
    const progressions: HarmonicAnalysis['progressions'] = [];

    // Look for progressions of length 3-8
    for (let length = 3; length <= Math.min(8, chords.length); length++) {
      for (let i = 0; i <= chords.length - length; i++) {
        const sequence = chords.slice(i, i + length);
        const romanSequence = sequence.map(c => c.romanNumeral);
        const chordNames = sequence.map(c => c.chord);

        // Check against common progressions
        const match = HarmonicAnalysisEngine.COMMON_PROGRESSIONS.find(p =>
          this.sequenceMatches(romanSequence, p.pattern)
        );

        if (match) {
          progressions.push({
            progression: romanSequence,
            chordNames,
            start: sequence[0].start,
            end: sequence[sequence.length - 1].end,
            strength: match.strength,
            type: match.name
          });
        }
      }
    }

    // Also identify circle-of-fifths progressions
    for (let i = 0; i < chords.length - 2; i++) {
      const seq = chords.slice(i, i + 3);
      if (this.isCircleOfFifths(seq.map(c => c.romanNumeral))) {
        progressions.push({
          progression: seq.map(c => c.romanNumeral),
          chordNames: seq.map(c => c.chord),
          start: seq[0].start,
          end: seq[2].end,
          strength: 0.85,
          type: 'circle-of-fifths'
        });
      }
    }

    return progressions;
  }

  /**
   * Check if sequence matches pattern (allowing for variations)
   */
  private sequenceMatches(sequence: string[], pattern: string[]): boolean {
    if (sequence.length !== pattern.length) return false;

    // Exact match
    if (sequence.every((s, i) => s === pattern[i])) return true;

    // Allow for minor variations (e.g., V vs V7)
    return sequence.every((s, i) => s.replace(/7|maj7|dim|aug/, '') === pattern[i].replace(/7|maj7|dim|aug/, ''));
  }

  /**
   * Check if progression follows circle of fifths
   */
  private isCircleOfFifths(numerals: string[]): boolean {
    // Common circle-of-fifths patterns: ii-V-I, vi-ii-V, etc.
    const patterns = [
      ['ii', 'V', 'I'],
      ['vi', 'ii', 'V'],
      ['iii', 'vi', 'ii'],
      ['IV', 'vii°', 'iii']
    ];

    return patterns.some(pattern => this.sequenceMatches(numerals, pattern));
  }

  /**
   * Detect cadences
   */
  private detectCadences(chords: HarmonicAnalysis['chords']): HarmonicAnalysis['cadences'] {
    const cadences: HarmonicAnalysis['cadences'] = [];

    for (let i = 0; i < chords.length - 1; i++) {
      const curr = chords[i];
      const next = chords[i + 1];

      // Authentic cadence: V-I or V7-I
      if ((curr.romanNumeral === 'V' || curr.romanNumeral === 'V7') && next.romanNumeral === 'I') {
        cadences.push({
          type: 'authentic',
          position: next.start,
          strength: 0.95,
          chords: [curr.chord, next.chord],
          romanNumerals: [curr.romanNumeral, next.romanNumeral]
        });
      }
      // Plagal cadence: IV-I
      else if (curr.romanNumeral === 'IV' && next.romanNumeral === 'I') {
        cadences.push({
          type: 'plagal',
          position: next.start,
          strength: 0.75,
          chords: [curr.chord, next.chord],
          romanNumerals: [curr.romanNumeral, next.romanNumeral]
        });
      }
      // Deceptive cadence: V-vi
      else if ((curr.romanNumeral === 'V' || curr.romanNumeral === 'V7') && next.romanNumeral === 'vi') {
        cadences.push({
          type: 'deceptive',
          position: next.start,
          strength: 0.7,
          chords: [curr.chord, next.chord],
          romanNumerals: [curr.romanNumeral, next.romanNumeral]
        });
      }
      // Half cadence: any-V
      else if (next.romanNumeral === 'V' && curr.romanNumeral !== 'V') {
        cadences.push({
          type: 'half',
          position: next.start,
          strength: 0.6,
          chords: [curr.chord, next.chord],
          romanNumerals: [curr.romanNumeral, next.romanNumeral]
        });
      }
    }

    return cadences;
  }

  /**
   * Detect key modulations (simplified)
   */
  private detectModulations(chords: HarmonicAnalysis['chords']): HarmonicAnalysis['modulations'] {
    const modulations: HarmonicAnalysis['modulations'] = [];

    // Look for sequences of chromatic chords indicating modulation
    let chromaticStreak = 0;

    for (let i = 0; i < chords.length; i++) {
      if (chords[i].romanNumeral.includes('#') || chords[i].romanNumeral.includes('b')) {
        chromaticStreak++;
      } else {
        chromaticStreak = 0;
      }

      // If 3+ chromatic chords, likely a modulation
      if (chromaticStreak >= 3) {
        modulations.push({
          fromKey: this.key.key + ' ' + this.key.scale,
          toKey: 'Unknown', // Simplified - would need key detection per section
          position: chords[i].start,
          method: 'chromatic'
        });
      }
    }

    return modulations;
  }

  /**
   * Analyze harmonic rhythm
   */
  private analyzeHarmonicRhythm(chords: HarmonicAnalysis['chords']): HarmonicAnalysis['harmonicRhythm'] {
    if (chords.length === 0) {
      return {
        meanDuration: 0,
        variance: 0,
        stability: 0,
        changeRate: 0
      };
    }

    const durations = chords.map(c => c.duration);
    const meanDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    const variance = durations.reduce((sum, d) => sum + Math.pow(d - meanDuration, 2), 0) / durations.length;

    const stability = Math.max(0, 1 - (Math.sqrt(variance) / meanDuration));

    const totalDuration = chords[chords.length - 1].end - chords[0].start;
    const changeRate = chords.length / totalDuration;

    return {
      meanDuration,
      variance,
      stability,
      changeRate
    };
  }

  /**
   * Analyze tension/resolution curve
   */
  private analyzeTensionCurve(chords: HarmonicAnalysis['chords']): HarmonicAnalysis['tensionCurve'] {
    return chords.map(chord => ({
      time: chord.start + chord.duration / 2,
      tension: chord.tension
    }));
  }

  /**
   * Analyze functional harmony
   */
  private analyzeFunctionalHarmony(chords: HarmonicAnalysis['chords']): HarmonicAnalysis['functionalAnalysis'] {
    if (chords.length === 0) {
      return {
        tonic: 0,
        subdominant: 0,
        dominant: 0,
        tonicization: 0
      };
    }

    const totalDuration = chords.reduce((sum, c) => sum + c.duration, 0);

    let tonicDuration = 0;
    let subdominantDuration = 0;
    let dominantDuration = 0;
    let chromaticDuration = 0;

    for (const chord of chords) {
      const numeral = chord.romanNumeral.replace(/7|maj7|dim|aug/, '');

      if (['I', 'i', 'vi', 'VI'].includes(numeral)) {
        tonicDuration += chord.duration;
      } else if (['IV', 'iv', 'ii', 'II'].includes(numeral)) {
        subdominantDuration += chord.duration;
      } else if (['V', 'v', 'vii°', 'VII'].includes(numeral)) {
        dominantDuration += chord.duration;
      }

      if (numeral.includes('#') || numeral.includes('b')) {
        chromaticDuration += chord.duration;
      }
    }

    return {
      tonic: tonicDuration / totalDuration,
      subdominant: subdominantDuration / totalDuration,
      dominant: dominantDuration / totalDuration,
      tonicization: chromaticDuration / totalDuration
    };
  }

  /**
   * Calculate overall harmonic complexity
   */
  private calculateHarmonicComplexity(
    chords: HarmonicAnalysis['chords'],
    progressions: HarmonicAnalysis['progressions']
  ): number {
    if (chords.length === 0) return 0;

    // Factors: unique chords, progression variety, chromatic chords
    const uniqueChords = new Set(chords.map(c => c.chord)).size;
    const chordVariety = Math.min(1, uniqueChords / 12);

    const chromaticCount = chords.filter(c =>
      c.romanNumeral.includes('#') || c.romanNumeral.includes('b')
    ).length;
    const chromaticFactor = chromaticCount / chords.length;

    const progressionVariety = Math.min(1, progressions.length / 5);

    return (chordVariety * 0.4) + (chromaticFactor * 0.3) + (progressionVariety * 0.3);
  }

  /**
   * Calculate chromaticism
   */
  private calculateChromaticism(chords: HarmonicAnalysis['chords']): number {
    if (chords.length === 0) return 0;

    const chromaticChords = chords.filter(c =>
      c.romanNumeral.includes('#') || c.romanNumeral.includes('b')
    ).length;

    return chromaticChords / chords.length;
  }

  /**
   * Calculate harmonic stability
   */
  private calculateStability(
    chords: HarmonicAnalysis['chords'],
    tensionCurve: HarmonicAnalysis['tensionCurve']
  ): number {
    if (tensionCurve.length === 0) return 0;

    // Lower average tension = higher stability
    const avgTension = tensionCurve.reduce((sum, t) => sum + t.tension, 0) / tensionCurve.length;

    // Less tension variance = higher stability
    const mean = avgTension;
    const variance = tensionCurve.reduce((sum, t) => sum + Math.pow(t.tension - mean, 2), 0) / tensionCurve.length;

    const stabilityFromTension = 1 - avgTension;
    const stabilityFromVariance = 1 - Math.sqrt(variance);

    return (stabilityFromTension * 0.6) + (stabilityFromVariance * 0.4);
  }

  /**
   * Calculate modal mixture (borrowed chords from parallel mode)
   */
  private calculateModalMixture(chords: HarmonicAnalysis['chords']): number {
    if (chords.length === 0) return 0;

    // Count chords that don't fit the key's diatonic scale
    const isMinor = this.key.scale === 'minor';
    const expectedQualities = isMinor
      ? ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major']
      : ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'];

    let borrowedCount = 0;

    for (const chord of chords) {
      const numeral = chord.romanNumeral.replace(/7|maj7|dim|aug|#|b/, '');
      const scaleDegrees = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];
      const index = scaleDegrees.indexOf(numeral);

      if (index !== -1 && index < 7) {
        // Check if quality matches expected
        const expected = expectedQualities[index];
        if (chord.quality !== expected && !chord.quality.includes('7')) {
          borrowedCount++;
        }
      }
    }

    return borrowedCount / chords.length;
  }
}
