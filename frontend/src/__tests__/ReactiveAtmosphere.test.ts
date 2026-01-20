import { describe, it, expect } from 'vitest';
import { calculateGlow, calculateFlicker, mapMoodToColor } from '../utils/AtmosphereManager';

describe('Reactive Atmosphere', () => {
  describe('Confidence Mapping', () => {
    it('should map high confidence to tight glow radius', () => {
      // Confidence 1.0 -> Radius 12px
      expect(calculateGlow(1.0).radius).toBe(12);
    });

    it('should map low confidence to diffuse glow radius', () => {
      // Confidence 0.0 -> Radius 40px
      expect(calculateGlow(0.0).radius).toBe(40);
    });

    it('should map confidence to glow intensity', () => {
      // 0.0 -> 0.3, 1.0 -> 1.0
      expect(calculateGlow(0.0).intensity).toBeCloseTo(0.3);
      expect(calculateGlow(1.0).intensity).toBeCloseTo(1.0);
      expect(calculateGlow(0.5).intensity).toBeCloseTo(0.65);
    });

    it('should map high confidence to stable flicker (0Hz)', () => {
      expect(calculateFlicker(1.0)).toBe(0);
    });

    it('should map low confidence to jittery flicker (8Hz)', () => {
      expect(calculateFlicker(0.0)).toBe(8);
    });
  });

  describe('Mood Color Mapping', () => {
    it('should map aggressive mood to Ruby/Magma', () => {
      const colors = mapMoodToColor('aggressive');
      expect(colors.primary).toContain('225, 29, 72'); // Ruby-ish
    });

    it('should map calm mood to Amethyst/Midnight', () => {
      const colors = mapMoodToColor('calm');
      expect(colors.primary).toContain('139, 92, 246'); // Amethyst-ish
    });

    it('should default to Cyan for unknown/neutral', () => {
      const colors = mapMoodToColor('unknown');
      expect(colors.primary).toContain('14, 165, 233'); // Cyan
    });
  });
});
