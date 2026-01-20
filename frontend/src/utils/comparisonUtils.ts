/**
 * Comparison Utilities for Harmonic A/B Workbench
 */

export interface DivergenceResult {
  isDivergent: boolean;
  semitoneDiff: number;
}

/**
 * Calculates melodic divergence between source and reference pitch.
 * Threshold: 1 semitone.
 */
export function calculateMelodicDivergence(sourcePitch: number, refPitch: number): DivergenceResult {
  if (sourcePitch <= 0 || refPitch <= 0) {
    return { isDivergent: false, semitoneDiff: 0 };
  }

  const semitoneDiff = Math.abs(12 * Math.log2(sourcePitch / refPitch));
  return {
    isDivergent: semitoneDiff > 1.0,
    semitoneDiff
  };
}

/**
 * Smoothing logic for bloom trigger.
 * Prevents flickering due to vibrato or micro-jitter.
 * @param currentlyDivergent Boolean flag for current frame divergence
 * @param lastTriggerTime Timestamp of last divergence
 * @param holdTime Duration to hold the bloom (e.g., 100ms)
 * @param currentTime Current timestamp
 */
export function shouldTriggerBloom(
  currentlyDivergent: boolean,
  lastTriggerTime: number,
  holdTime: number,
  currentTime: number
): boolean {
  if (currentlyDivergent) return true;
  return (currentTime - lastTriggerTime) < holdTime;
}

/**
 * Linearly interpolates bloom intensity.
 */
export function lerpBloom(current: number, target: number, factor: number = 0.1): number {
  const result = current + (target - current) * factor;
  return result < 0.001 ? 0 : result;
}
