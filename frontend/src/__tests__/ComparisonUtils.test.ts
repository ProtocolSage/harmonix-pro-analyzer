import { describe, it, expect } from 'vitest';
import { calculateMelodicDivergence, shouldTriggerBloom, lerpBloom } from '../utils/comparisonUtils';

describe('Comparison Utilities', () => {
  describe('calculateMelodicDivergence', () => {
    it('should detect divergence > 1 semitone', () => {
      // 440Hz (A4) vs 466.16Hz (A#4) is 1 semitone
      const res1 = calculateMelodicDivergence(440, 440 * Math.pow(2, 0.5/12)); // 0.5 semitone
      expect(res1.isDivergent).toBe(false);

      const res2 = calculateMelodicDivergence(440, 440 * Math.pow(2, 1.1/12)); // 1.1 semitones
      expect(res2.isDivergent).toBe(true);
    });

    it('should return 0 diff for unvoiced segments', () => {
      const res = calculateMelodicDivergence(0, 440);
      expect(res.isDivergent).toBe(false);
      expect(res.semitoneDiff).toBe(0);
    });
  });

  describe('shouldTriggerBloom', () => {
    it('should return true if currently divergent', () => {
      expect(shouldTriggerBloom(true, 0, 100, 50)).toBe(true);
    });

    it('should hold bloom during holdTime', () => {
      // last trigger at 1000, current time 1050, hold 100ms
      expect(shouldTriggerBloom(false, 1000, 100, 1050)).toBe(true);
      
      // last trigger at 1000, current time 1150, hold 100ms
      expect(shouldTriggerBloom(false, 1000, 100, 1150)).toBe(false);
    });
  });

  describe('lerpBloom', () => {
    it('should smoothly interpolate', () => {
      const current = 0;
      const target = 1.0;
      const first = lerpBloom(current, target, 0.1);
      expect(first).toBeCloseTo(0.1);
      
      const second = lerpBloom(first, target, 0.1);
      expect(second).toBeCloseTo(0.19);
    });
  });
});
