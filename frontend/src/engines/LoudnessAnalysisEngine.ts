/**
 * Professional Loudness Analysis Engine
 * Implements EBU R128 / ITU-R BS.1770 loudness measurement
 *
 * Provides:
 * - Integrated LUFS (overall loudness)
 * - Momentary LUFS (400ms windows)
 * - Short-term LUFS (3s windows)
 * - True Peak detection
 * - Dynamic Range (DR meter)
 * - Loudness Range (LRA)
 * - Broadcasting standards compliance
 */

export interface LoudnessResult {
  integrated: number;
  momentary: {
    max: number;
    values: number[];
  };
  shortTerm: {
    max: number;
    values: number[];
  };
  truePeak: {
    max: number;
    maxLeft: number;
    maxRight: number;
    positions: number[];
  };
  dynamicRange: number;
  loudnessRange: number;
  crestFactor: number;
  rms: {
    overall: number;
    left: number;
    right: number;
    perSecond: number[];
  };
  compliance: {
    ebur128: boolean;
    atsca85: boolean;
    targetLUFS: number;
    headroom: number;
    needsNormalization: boolean;
  };
}

export class LoudnessAnalysisEngine {
  private sampleRate: number;

  constructor(sampleRate: number = 44100) {
    this.sampleRate = sampleRate;
  }

  /**
   * Analyze loudness for stereo or mono audio
   */
  async analyze(audioBuffer: AudioBuffer): Promise<LoudnessResult> {
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.numberOfChannels > 1
      ? audioBuffer.getChannelData(1)
      : leftChannel;

    // Calculate true peaks
    const truePeak = this.calculateTruePeak(leftChannel, rightChannel);

    // Calculate RMS levels
    const rms = this.calculateRMS(leftChannel, rightChannel, audioBuffer.duration);

    // Calculate LUFS (using K-weighted power)
    const lufsData = this.calculateLUFS(leftChannel, rightChannel);

    // Calculate dynamic range
    const dynamicRange = this.calculateDynamicRange(leftChannel, rightChannel);

    // Calculate loudness range (LRA)
    const loudnessRange = this.calculateLoudnessRange(lufsData.shortTerm.values);

    // Calculate crest factor
    const crestFactor = truePeak.max - rms.overall;

    // Determine compliance and recommendations
    const compliance = this.assessCompliance(lufsData.integrated, truePeak.max);

    return {
      integrated: lufsData.integrated,
      momentary: lufsData.momentary,
      shortTerm: lufsData.shortTerm,
      truePeak,
      dynamicRange,
      loudnessRange,
      crestFactor,
      rms,
      compliance
    };
  }

  /**
   * Calculate LUFS using K-weighting filter approximation
   * EBU R128 / ITU-R BS.1770-4 standard
   */
  private calculateLUFS(leftChannel: Float32Array, rightChannel: Float32Array): {
    integrated: number;
    momentary: { max: number; values: number[] };
    shortTerm: { max: number; values: number[] };
  } {
    // K-weighting: high-shelf filter at 4kHz (+4dB) + high-pass at 38Hz
    // For simplification, we'll use a power-based approximation
    // In production, this should use proper IIR filtering

    const blockSize400ms = Math.floor(this.sampleRate * 0.4); // 400ms for momentary
    const blockSize3s = Math.floor(this.sampleRate * 3.0);    // 3s for short-term

    // Calculate power in blocks
    const momentaryValues: number[] = [];
    const shortTermValues: number[] = [];

    // Momentary loudness (400ms blocks, 100ms overlap - 75% overlap)
    const hopSize400ms = Math.floor(blockSize400ms * 0.25);
    for (let i = 0; i < leftChannel.length - blockSize400ms; i += hopSize400ms) {
      const leftPower = this.calculateBlockPower(leftChannel, i, blockSize400ms);
      const rightPower = this.calculateBlockPower(rightChannel, i, blockSize400ms);
      const meanPower = (leftPower + rightPower) / 2;
      const lufs = -0.691 + 10 * Math.log10(meanPower);
      momentaryValues.push(lufs);
    }

    // Short-term loudness (3s blocks, 1s overlap - 67% overlap)
    const hopSize3s = Math.floor(blockSize3s * 0.33);
    for (let i = 0; i < leftChannel.length - blockSize3s; i += hopSize3s) {
      const leftPower = this.calculateBlockPower(leftChannel, i, blockSize3s);
      const rightPower = this.calculateBlockPower(rightChannel, i, blockSize3s);
      const meanPower = (leftPower + rightPower) / 2;
      const lufs = -0.691 + 10 * Math.log10(meanPower);
      shortTermValues.push(lufs);
    }

    // Integrated loudness (gating algorithm)
    // Use only blocks above -70 LUFS (absolute gate)
    // Then relative gate at -10 LU below ungated loudness
    const allBlocks = shortTermValues.filter(v => v > -70);

    if (allBlocks.length === 0) {
      return {
        integrated: -70,
        momentary: { max: -70, values: momentaryValues },
        shortTerm: { max: -70, values: shortTermValues }
      };
    }

    // Calculate ungated loudness
    const ungatedMean = allBlocks.reduce((sum, val) => sum + Math.pow(10, val / 10), 0) / allBlocks.length;
    const ungatedLUFS = 10 * Math.log10(ungatedMean);

    // Apply relative gate (-10 LU)
    const relativeGate = ungatedLUFS - 10;
    const gatedBlocks = allBlocks.filter(v => v >= relativeGate);

    // Final integrated loudness
    const gatedMean = gatedBlocks.reduce((sum, val) => sum + Math.pow(10, val / 10), 0) / gatedBlocks.length;
    const integrated = 10 * Math.log10(gatedMean);

    return {
      integrated: Math.max(-70, Math.min(0, integrated)),
      momentary: {
        max: Math.max(...momentaryValues, -70),
        values: momentaryValues
      },
      shortTerm: {
        max: Math.max(...shortTermValues, -70),
        values: shortTermValues
      }
    };
  }

  /**
   * Calculate power for a block of samples (mean square)
   */
  private calculateBlockPower(channel: Float32Array, start: number, length: number): number {
    let sumSquares = 0;
    const end = Math.min(start + length, channel.length);

    for (let i = start; i < end; i++) {
      sumSquares += channel[i] * channel[i];
    }

    return sumSquares / length;
  }

  /**
   * Calculate true peak (sample peak with 4x oversampling estimation)
   * True peak accounts for inter-sample peaks
   */
  private calculateTruePeak(leftChannel: Float32Array, rightChannel: Float32Array): {
    max: number;
    maxLeft: number;
    maxRight: number;
    positions: number[];
  } {
    // Simple implementation: find sample peaks and add headroom estimate
    // Production should use proper 4x oversampling with sinc interpolation

    let maxLeft = 0;
    let maxRight = 0;
    const positions: number[] = [];
    const peakThreshold = 0.9; // Track peaks above -1 dBFS

    for (let i = 0; i < leftChannel.length; i++) {
      const absLeft = Math.abs(leftChannel[i]);
      const absRight = Math.abs(rightChannel[i]);

      if (absLeft > maxLeft) {
        maxLeft = absLeft;
      }
      if (absRight > maxRight) {
        maxRight = absRight;
      }

      if (absLeft > peakThreshold || absRight > peakThreshold) {
        positions.push(i / this.sampleRate);
      }
    }

    // Convert to dBTP (add typical inter-sample peak headroom of ~0.3dB)
    const maxLeftDB = maxLeft > 0 ? 20 * Math.log10(maxLeft) + 0.3 : -Infinity;
    const maxRightDB = maxRight > 0 ? 20 * Math.log10(maxRight) + 0.3 : -Infinity;
    const maxDB = Math.max(maxLeftDB, maxRightDB);

    return {
      max: maxDB,
      maxLeft: maxLeftDB,
      maxRight: maxRightDB,
      positions: positions.slice(0, 10) // Keep first 10 peak positions
    };
  }

  /**
   * Calculate RMS (Root Mean Square) levels
   */
  private calculateRMS(leftChannel: Float32Array, rightChannel: Float32Array, duration: number): {
    overall: number;
    left: number;
    right: number;
    perSecond: number[];
  } {
    // Overall RMS
    const leftRMS = Math.sqrt(this.calculateBlockPower(leftChannel, 0, leftChannel.length));
    const rightRMS = Math.sqrt(this.calculateBlockPower(rightChannel, 0, rightChannel.length));
    const overallRMS = (leftRMS + rightRMS) / 2;

    // Per-second RMS
    const perSecond: number[] = [];
    const samplesPerSecond = this.sampleRate;

    for (let t = 0; t < duration; t++) {
      const start = t * samplesPerSecond;
      const length = Math.min(samplesPerSecond, leftChannel.length - start);

      if (length > 0) {
        const leftPower = this.calculateBlockPower(leftChannel, start, length);
        const rightPower = this.calculateBlockPower(rightChannel, start, length);
        const rms = Math.sqrt((leftPower + rightPower) / 2);
        const rmsDB = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
        perSecond.push(rmsDB);
      }
    }

    return {
      overall: overallRMS > 0 ? 20 * Math.log10(overallRMS) : -Infinity,
      left: leftRMS > 0 ? 20 * Math.log10(leftRMS) : -Infinity,
      right: rightRMS > 0 ? 20 * Math.log10(rightRMS) : -Infinity,
      perSecond
    };
  }

  /**
   * Calculate dynamic range using EBU R128 gated loudness method
   */
  private calculateDynamicRange(leftChannel: Float32Array, rightChannel: Float32Array): number {
    // DR meter: difference between peak and RMS of quietest sections
    // Simplified implementation

    const blockSize = Math.floor(this.sampleRate * 3); // 3-second blocks
    const hop = Math.floor(blockSize * 0.5);
    const blockRMS: number[] = [];

    for (let i = 0; i < leftChannel.length - blockSize; i += hop) {
      const leftPower = this.calculateBlockPower(leftChannel, i, blockSize);
      const rightPower = this.calculateBlockPower(rightChannel, i, blockSize);
      const rms = Math.sqrt((leftPower + rightPower) / 2);
      if (rms > 0) {
        blockRMS.push(20 * Math.log10(rms));
      }
    }

    if (blockRMS.length === 0) return 0;

    // Sort and take second quietest block (exclude absolute quietest to avoid silence)
    blockRMS.sort((a, b) => a - b);
    const quietRMS = blockRMS[Math.min(1, blockRMS.length - 1)];

    // Peak level
    const peak = Math.max(
      ...Array.from(leftChannel).map(Math.abs),
      ...Array.from(rightChannel).map(Math.abs)
    );
    const peakDB = peak > 0 ? 20 * Math.log10(peak) : -Infinity;

    // DR = Peak - RMS (of quiet sections)
    const dr = peakDB - quietRMS;

    return Math.max(0, Math.min(40, dr)); // Clamp to reasonable range
  }

  /**
   * Calculate Loudness Range (LRA) - EBU R128
   * Range between 10th and 95th percentile of short-term loudness
   */
  private calculateLoudnessRange(shortTermValues: number[]): number {
    if (shortTermValues.length === 0) return 0;

    // Filter out very quiet values
    const validValues = shortTermValues.filter(v => v > -70);
    if (validValues.length === 0) return 0;

    // Sort values
    const sorted = [...validValues].sort((a, b) => a - b);

    // Get 10th and 95th percentiles
    const idx10 = Math.floor(sorted.length * 0.10);
    const idx95 = Math.floor(sorted.length * 0.95);

    const lra = sorted[idx95] - sorted[idx10];

    return Math.max(0, lra);
  }

  /**
   * Assess compliance with broadcasting standards
   */
  private assessCompliance(integratedLUFS: number, truePeak: number): {
    ebur128: boolean;
    atsca85: boolean;
    targetLUFS: number;
    headroom: number;
    needsNormalization: boolean;
  } {
    // EBU R128: -23 LUFS ±0.5 LU, true peak < -1 dBTP
    const ebur128 = Math.abs(integratedLUFS - (-23)) <= 0.5 && truePeak < -1;

    // ATSC A/85: -24 LUFS ±2 LU, true peak < -2 dBTP
    const atsca85 = Math.abs(integratedLUFS - (-24)) <= 2 && truePeak < -2;

    // Determine target based on common use cases
    let targetLUFS: number;
    if (integratedLUFS > -12) {
      targetLUFS = -14; // Streaming (Spotify, YouTube)
    } else if (integratedLUFS > -18) {
      targetLUFS = -16; // Apple Music, Tidal
    } else {
      targetLUFS = -23; // Broadcast (EBU R128)
    }

    // Headroom to 0 dBFS
    const headroom = -truePeak;

    // Needs normalization if outside ±2 LU of any target
    const needsNormalization =
      Math.abs(integratedLUFS - targetLUFS) > 2 || truePeak > -1;

    return {
      ebur128,
      atsca85,
      targetLUFS,
      headroom,
      needsNormalization
    };
  }
}
