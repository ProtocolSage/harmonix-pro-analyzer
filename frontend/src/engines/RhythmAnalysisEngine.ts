/**
 * Rhythm Analysis Engine
 * Comprehensive rhythmic and temporal analysis:
 * - Time signature detection
 * - Downbeat detection and bar tracking
 * - Beat grid with subdivisions
 * - Groove analysis (swing, syncopation, quantization)
 * - Rhythm pattern detection
 * - Polyrhythm detection
 * - Tempo variation mapping
 * - Rhythmic complexity metrics
 */

import type { RhythmAnalysis, TempoAnalysis } from '../types/audio';

export class RhythmAnalysisEngine {
  private sampleRate: number;
  private tempo: TempoAnalysis;

  constructor(sampleRate: number, tempo: TempoAnalysis) {
    this.sampleRate = sampleRate;
    this.tempo = tempo;
  }

  /**
   * Analyze rhythm from audio buffer
   */
  async analyze(audioBuffer: AudioBuffer): Promise<RhythmAnalysis> {
    const channelData = audioBuffer.getChannelData(0);

    // Step 1: Detect onsets (note attacks)
    const onsets = await this.detectOnsets(channelData);

    // Step 2: Detect time signature
    const timeSignature = this.detectTimeSignature(this.tempo.beats || [], onsets);

    // Step 3: Detect downbeats
    const downbeats = this.detectDownbeats(this.tempo.beats || [], timeSignature);

    // Step 4: Generate measures
    const measures = this.generateMeasures(downbeats, timeSignature);

    // Step 5: Create beat grid
    const beatGrid = this.createBeatGrid(this.tempo.beats || [], downbeats, timeSignature);

    // Step 6: Analyze groove
    const groove = this.analyzeGroove(this.tempo.beats || [], onsets);

    // Step 7: Detect rhythm patterns
    const patterns = this.detectRhythmPatterns(onsets);

    // Step 8: Detect polyrhythm
    const polyrhythm = this.detectPolyrhythm(onsets);

    // Step 9: Create tempo map
    const tempoMap = this.createTempoMap(this.tempo.beats || []);

    // Step 10: Calculate complexity metrics
    const complexity = this.calculateRhythmicComplexity(patterns, groove);
    const density = onsets.length / audioBuffer.duration;
    const irregularity = this.calculateIrregularity(this.tempo.beats || []);
    const { acceleration, deceleration } = this.analyzeTempoTrend(tempoMap);

    return {
      timeSignature,
      downbeats,
      measures,
      beatGrid,
      groove,
      patterns,
      polyrhythm,
      tempoMap,
      complexity,
      density,
      irregularity,
      acceleration,
      deceleration
    };
  }

  /**
   * Detect onsets (note attacks) in audio
   */
  private async detectOnsets(channelData: Float32Array): Promise<number[]> {
    const onsets: number[] = [];
    const frameSize = 512;
    const hopSize = 256;

    // Calculate spectral flux for onset detection
    let prevSpectrum: number[] = [];

    for (let i = 0; i + frameSize < channelData.length; i += hopSize) {
      const frame = channelData.slice(i, i + frameSize);
      const spectrum = this.calculateSpectrum(frame);

      if (prevSpectrum.length > 0) {
        // Spectral flux: difference from previous frame
        let flux = 0;
        for (let j = 0; j < spectrum.length; j++) {
          const diff = spectrum[j] - prevSpectrum[j];
          flux += diff > 0 ? diff : 0; // Half-wave rectified
        }

        // Threshold for onset detection
        if (flux > 0.05) {
          const time = i / this.sampleRate;
          // Avoid duplicates (within 50ms)
          if (onsets.length === 0 || time - onsets[onsets.length - 1] > 0.05) {
            onsets.push(time);
          }
        }
      }

      prevSpectrum = spectrum;
    }

    return onsets;
  }

  /**
   * Simple spectrum calculation for onset detection
   */
  private calculateSpectrum(frame: Float32Array): number[] {
    const spectrum: number[] = [];
    const numBins = 64; // Simplified

    for (let i = 0; i < numBins; i++) {
      let sum = 0;
      const startIdx = Math.floor((i * frame.length) / numBins);
      const endIdx = Math.floor(((i + 1) * frame.length) / numBins);

      for (let j = startIdx; j < endIdx; j++) {
        sum += Math.abs(frame[j]);
      }

      spectrum.push(sum / (endIdx - startIdx));
    }

    return spectrum;
  }

  /**
   * Detect time signature
   */
  private detectTimeSignature(beats: number[], onsets: number[]): RhythmAnalysis['timeSignature'] {
    if (beats.length < 8) {
      return {
        numerator: 4,
        denominator: 4,
        confidence: 0.5,
        label: '4/4',
        compound: false
      };
    }

    // Calculate inter-beat intervals
    const intervals: number[] = [];
    for (let i = 1; i < beats.length; i++) {
      intervals.push(beats[i] - beats[i - 1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Look for patterns in beat strengths
    const beatStrengths = this.calculateBeatStrengths(beats, onsets);

    // Detect meter by analyzing strong beat patterns
    const { numerator, compound } = this.detectMeter(beatStrengths);

    const confidence = this.calculateTimeSignatureConfidence(beatStrengths, numerator);

    const label = `${numerator}/${compound ? 8 : 4}`;

    return {
      numerator,
      denominator: compound ? 8 : 4,
      confidence,
      label,
      compound
    };
  }

  /**
   * Calculate beat strengths based on onset proximity
   */
  private calculateBeatStrengths(beats: number[], onsets: number[]): number[] {
    return beats.map(beat => {
      // Find onsets near this beat (within 50ms)
      const nearOnsets = onsets.filter(onset => Math.abs(onset - beat) < 0.05);
      return nearOnsets.length > 0 ? 1.0 : 0.3;
    });
  }

  /**
   * Detect meter from beat strength pattern
   */
  private detectMeter(beatStrengths: number[]): { numerator: number; compound: boolean } {
    // Look for repeating patterns in strong beats
    const strongBeats: number[] = [];
    for (let i = 0; i < beatStrengths.length; i++) {
      if (beatStrengths[i] > 0.7) {
        strongBeats.push(i);
      }
    }

    if (strongBeats.length < 3) {
      return { numerator: 4, compound: false };
    }

    // Calculate most common interval between strong beats
    const intervals: number[] = [];
    for (let i = 1; i < strongBeats.length; i++) {
      intervals.push(strongBeats[i] - strongBeats[i - 1]);
    }

    const intervalCounts = new Map<number, number>();
    intervals.forEach(interval => {
      intervalCounts.set(interval, (intervalCounts.get(interval) || 0) + 1);
    });

    const mostCommonInterval = Array.from(intervalCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 4;

    // Determine if compound meter (6/8, 9/8, 12/8)
    const compound = mostCommonInterval % 3 === 0 && mostCommonInterval >= 6;

    return {
      numerator: compound ? mostCommonInterval / 2 : mostCommonInterval,
      compound
    };
  }

  /**
   * Calculate time signature detection confidence
   */
  private calculateTimeSignatureConfidence(beatStrengths: number[], numerator: number): number {
    let matches = 0;
    let total = 0;

    for (let i = 0; i < beatStrengths.length; i++) {
      if (i % numerator === 0) {
        // Should be strong
        if (beatStrengths[i] > 0.7) matches++;
        total++;
      } else {
        // Should be weaker
        if (beatStrengths[i] < 0.7) matches++;
        total++;
      }
    }

    return total > 0 ? matches / total : 0.5;
  }

  /**
   * Detect downbeats
   */
  private detectDownbeats(beats: number[], timeSignature: RhythmAnalysis['timeSignature']): RhythmAnalysis['downbeats'] {
    const positions: number[] = [];
    const confidence: number[] = [];
    const beatStrength: number[] = [];

    // Every Nth beat is a downbeat based on time signature
    for (let i = 0; i < beats.length; i += timeSignature.numerator) {
      positions.push(beats[i]);
      confidence.push(0.9); // Simplified - would use ML model in production
      beatStrength.push(1.0);
    }

    return {
      positions,
      confidence,
      beatStrength
    };
  }

  /**
   * Generate measures/bars
   */
  private generateMeasures(
    downbeats: RhythmAnalysis['downbeats'],
    timeSignature: RhythmAnalysis['timeSignature']
  ): RhythmAnalysis['measures'] {
    const measures: RhythmAnalysis['measures'] = [];

    for (let i = 0; i < downbeats.positions.length - 1; i++) {
      const start = downbeats.positions[i];
      const end = downbeats.positions[i + 1];
      const duration = end - start;
      const tempo = (60 / duration) * timeSignature.numerator;

      measures.push({
        index: i,
        start,
        end,
        duration,
        tempo
      });
    }

    return measures;
  }

  /**
   * Create beat grid with subdivisions
   */
  private createBeatGrid(
    beats: number[],
    downbeats: RhythmAnalysis['downbeats'],
    timeSignature: RhythmAnalysis['timeSignature']
  ): RhythmAnalysis['beatGrid'] {
    const positions = [...beats];
    const strengths = beats.map(beat =>
      downbeats.positions.some(db => Math.abs(db - beat) < 0.001) ? 1.0 : 0.5
    );

    // Generate subdivisions (8th notes)
    const subdivisions: number[] = [];
    for (let i = 0; i < beats.length - 1; i++) {
      const interval = beats[i + 1] - beats[i];
      subdivisions.push(beats[i] + interval / 2);
    }

    return {
      positions,
      strengths,
      subdivisions
    };
  }

  /**
   * Analyze groove characteristics
   */
  private analyzeGroove(beats: number[], onsets: number[]): RhythmAnalysis['groove'] {
    // Swing: analyze if subdivisions are uneven
    const swing = this.calculateSwing(beats, onsets);

    // Syncopation: onsets between beats
    const syncopation = this.calculateSyncopation(beats, onsets);

    // Quantization: how close onsets are to beat grid
    const quantization = this.calculateQuantization(beats, onsets);

    // Microtiming: small timing variations
    const microTiming = this.calculateMicroTiming(beats);

    // Evenness: consistency of beat intervals
    const evenness = this.calculateEvenness(beats);

    return {
      swing,
      syncopation,
      quantization,
      microTiming,
      evenness
    };
  }

  /**
   * Calculate swing amount
   */
  private calculateSwing(beats: number[], onsets: number[]): number {
    let swingSum = 0;
    let count = 0;

    for (let i = 0; i < beats.length - 1; i++) {
      const interval = beats[i + 1] - beats[i];
      const subdivision = beats[i] + interval / 2;

      // Find closest onset to subdivision point
      const nearestOnset = onsets.reduce((prev, curr) =>
        Math.abs(curr - subdivision) < Math.abs(prev - subdivision) ? curr : prev
      , onsets[0]);

      if (Math.abs(nearestOnset - subdivision) < interval * 0.3) {
        const deviation = (nearestOnset - subdivision) / interval;
        swingSum += Math.abs(deviation);
        count++;
      }
    }

    return count > 0 ? Math.min(1, swingSum / count * 5) : 0;
  }

  /**
   * Calculate syncopation level
   */
  private calculateSyncopation(beats: number[], onsets: number[]): number {
    let offBeatOnsets = 0;

    for (const onset of onsets) {
      // Check if onset is NOT close to any beat
      const nearestBeat = beats.reduce((prev, curr) =>
        Math.abs(curr - onset) < Math.abs(prev - onset) ? curr : prev
      , beats[0]);

      const beatInterval = beats.length > 1 ? beats[1] - beats[0] : 0.5;
      if (Math.abs(nearestBeat - onset) > beatInterval * 0.15) {
        offBeatOnsets++;
      }
    }

    return onsets.length > 0 ? offBeatOnsets / onsets.length : 0;
  }

  /**
   * Calculate quantization level
   */
  private calculateQuantization(beats: number[], onsets: number[]): number {
    let totalDeviation = 0;

    for (const onset of onsets) {
      const nearestBeat = beats.reduce((prev, curr) =>
        Math.abs(curr - onset) < Math.abs(prev - onset) ? curr : prev
      , beats[0]);

      const beatInterval = beats.length > 1 ? beats[1] - beats[0] : 0.5;
      const deviation = Math.abs(nearestBeat - onset) / beatInterval;
      totalDeviation += deviation;
    }

    const avgDeviation = onsets.length > 0 ? totalDeviation / onsets.length : 0;
    return Math.max(0, 1 - avgDeviation * 10); // Invert: high quantization = low deviation
  }

  /**
   * Calculate microtiming variation
   */
  private calculateMicroTiming(beats: number[]): number {
    if (beats.length < 3) return 0;

    const intervals: number[] = [];
    for (let i = 1; i < beats.length; i++) {
      intervals.push(beats[i] - beats[i - 1]);
    }

    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) =>
      sum + Math.pow(interval - mean, 2), 0
    ) / intervals.length;

    return Math.min(1, Math.sqrt(variance) * 20);
  }

  /**
   * Calculate rhythmic evenness
   */
  private calculateEvenness(beats: number[]): number {
    if (beats.length < 3) return 1;

    const intervals: number[] = [];
    for (let i = 1; i < beats.length; i++) {
      intervals.push(beats[i] - beats[i - 1]);
    }

    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const maxDeviation = Math.max(...intervals.map(i => Math.abs(i - mean)));

    return Math.max(0, 1 - (maxDeviation / mean));
  }

  /**
   * Detect rhythm patterns
   */
  private detectRhythmPatterns(onsets: number[]): RhythmAnalysis['patterns'] {
    const patterns: Map<string, {
      pattern: number[];
      positions: number[];
      description: string;
    }> = new Map();

    // Calculate inter-onset intervals
    const iois: number[] = [];
    for (let i = 1; i < onsets.length; i++) {
      iois.push((onsets[i] - onsets[i - 1]) * 1000); // Convert to ms
    }

    // Look for repeated patterns (length 2-6)
    for (let length = 2; length <= Math.min(6, iois.length / 2); length++) {
      for (let i = 0; i <= iois.length - length; i++) {
        const pattern = iois.slice(i, i + length);
        const key = pattern.map(v => Math.round(v / 10) * 10).join(','); // Round to 10ms

        // Look for similar patterns
        for (let j = i + length; j <= iois.length - length; j++) {
          const candidate = iois.slice(j, j + length);
          const candidateKey = candidate.map(v => Math.round(v / 10) * 10).join(',');

          if (candidateKey === key) {
            if (!patterns.has(key)) {
              patterns.set(key, {
                pattern,
                positions: [onsets[i]],
                description: this.describePattern(pattern)
              });
            }
            patterns.get(key)!.positions.push(onsets[j]);
          }
        }
      }
    }

    // Convert to array
    return Array.from(patterns.values())
      .filter(p => p.positions.length >= 2)
      .map(p => ({
        pattern: p.pattern,
        occurrences: p.positions.length,
        positions: p.positions,
        strength: Math.min(1, p.positions.length / 5),
        description: p.description
      }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 5);
  }

  /**
   * Describe rhythm pattern in musical terms
   */
  private describePattern(pattern: number[]): string {
    const avg = pattern.reduce((a, b) => a + b, 0) / pattern.length;

    if (avg < 150) return 'fast 16ths';
    if (avg < 250) return 'straight 8ths';
    if (avg < 400) return 'quarter notes';
    if (avg < 700) return 'half notes';

    const variance = pattern.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / pattern.length;
    if (Math.sqrt(variance) > avg * 0.3) return 'syncopated pattern';

    return 'steady rhythm';
  }

  /**
   * Detect polyrhythm
   */
  private detectPolyrhythm(onsets: number[]): RhythmAnalysis['polyrhythm'] {
    if (onsets.length < 12) {
      return { detected: false };
    }

    // Use autocorrelation to find multiple periodicities
    const periods = this.findPeriodicities(onsets);

    if (periods.length < 2) {
      return { detected: false };
    }

    // Check if periods form simple ratios (2:3, 3:4, etc.)
    const ratio = this.findSimpleRatio(periods[0].period, periods[1].period);

    if (ratio) {
      return {
        detected: true,
        ratio,
        confidence: Math.min(periods[0].strength, periods[1].strength),
        layers: periods
      };
    }

    return { detected: false };
  }

  /**
   * Find periodicities in onset times
   */
  private findPeriodicities(onsets: number[]): Array<{ period: number; strength: number }> {
    const maxPeriod = 2.0; // Max 2 seconds
    const minPeriod = 0.2; // Min 200ms

    const periodicities: Array<{ period: number; strength: number }> = [];

    // Test different periods
    for (let period = minPeriod; period < maxPeriod; period += 0.05) {
      let matchCount = 0;
      let totalTests = 0;

      for (let i = 0; i < onsets.length; i++) {
        const expectedTime = onsets[i] + period;
        const match = onsets.some(onset => Math.abs(onset - expectedTime) < 0.05);
        if (match) matchCount++;
        totalTests++;
      }

      const strength = totalTests > 0 ? matchCount / totalTests : 0;

      if (strength > 0.3) {
        periodicities.push({ period, strength });
      }
    }

    return periodicities.sort((a, b) => b.strength - a.strength).slice(0, 3);
  }

  /**
   * Find simple ratio between two periods
   */
  private findSimpleRatio(period1: number, period2: number): string | null {
    const ratio = period1 / period2;

    const simpleRatios = [
      { value: 2 / 3, label: '2:3' },
      { value: 3 / 4, label: '3:4' },
      { value: 3 / 2, label: '3:2' },
      { value: 4 / 3, label: '4:3' },
      { value: 5 / 4, label: '5:4' }
    ];

    for (const simple of simpleRatios) {
      if (Math.abs(ratio - simple.value) < 0.1) {
        return simple.label;
      }
    }

    return null;
  }

  /**
   * Create tempo map over time
   */
  private createTempoMap(beats: number[]): RhythmAnalysis['tempoMap'] {
    const tempoMap: RhythmAnalysis['tempoMap'] = [];
    const windowSize = 8; // Calculate tempo over 8 beats

    for (let i = 0; i < beats.length - windowSize; i += 2) {
      const windowBeats = beats.slice(i, i + windowSize);
      const duration = windowBeats[windowBeats.length - 1] - windowBeats[0];
      const bpm = ((windowSize - 1) / duration) * 60;
      const time = (windowBeats[0] + windowBeats[windowBeats.length - 1]) / 2;

      tempoMap.push({
        time,
        bpm,
        confidence: 0.8
      });
    }

    return tempoMap;
  }

  /**
   * Calculate overall rhythmic complexity
   */
  private calculateRhythmicComplexity(
    patterns: RhythmAnalysis['patterns'],
    groove: RhythmAnalysis['groove']
  ): number {
    // Factors: pattern variety, syncopation, swing
    const patternComplexity = Math.min(1, patterns.length / 5);
    const syncopationFactor = groove.syncopation;
    const swingFactor = groove.swing * 0.5; // Swing adds some complexity

    return (patternComplexity * 0.4) + (syncopationFactor * 0.4) + (swingFactor * 0.2);
  }

  /**
   * Calculate rhythmic irregularity
   */
  private calculateIrregularity(beats: number[]): number {
    if (beats.length < 3) return 0;

    const intervals: number[] = [];
    for (let i = 1; i < beats.length; i++) {
      intervals.push(beats[i] - beats[i - 1]);
    }

    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) =>
      sum + Math.pow(interval - mean, 2), 0
    ) / intervals.length;

    return Math.min(1, Math.sqrt(variance) / mean * 5);
  }

  /**
   * Analyze tempo trend (acceleration/deceleration)
   */
  private analyzeTempoTrend(tempoMap: RhythmAnalysis['tempoMap']): {
    acceleration: number;
    deceleration: number;
  } {
    if (tempoMap.length < 3) {
      return { acceleration: 0, deceleration: 0 };
    }

    let accelerationSum = 0;
    let decelerationSum = 0;
    let count = 0;

    for (let i = 1; i < tempoMap.length; i++) {
      const change = tempoMap[i].bpm - tempoMap[i - 1].bpm;
      if (change > 0) {
        accelerationSum += change;
      } else {
        decelerationSum += Math.abs(change);
      }
      count++;
    }

    const avgChange = count > 0 ? 5 : 0; // Normalize by typical BPM change

    return {
      acceleration: Math.min(1, accelerationSum / (count * avgChange)),
      deceleration: Math.min(1, decelerationSum / (count * avgChange))
    };
  }
}
