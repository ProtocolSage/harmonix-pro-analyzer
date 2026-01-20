import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VisualAdaptiveManager } from '../utils/VisualAdaptiveManager';
import { ReactiveBloom } from '../utils/ReactiveBloom';

describe('Visual Adaptive System', () => {
  let manager: VisualAdaptiveManager;

  beforeEach(() => {
    vi.useFakeTimers();
    // @ts-ignore - reset singleton
    VisualAdaptiveManager.instance = undefined;
    manager = VisualAdaptiveManager.getInstance();
    
    // Clear CSS variables
    document.documentElement.style.setProperty('--glow-intensity', '0');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('VisualAdaptiveManager', () => {
    it('should initialize with bloom disabled', () => {
      expect(manager.getBloomEnabled()).toBe(false);
    });

    it('should fallback to static mode when frame time > 3ms for 30 consecutive frames', () => {
      // Manually enable bloom
      (manager as any).setBloomEnabled(true);
      expect(manager.getBloomEnabled()).toBe(true);

      const callback = vi.fn();
      manager.onBloomChange(callback);

      // Report 29 bad frames - should still be enabled
      for (let i = 0; i < 29; i++) {
        manager.reportFrameDuration(4.0);
      }
      expect(manager.getBloomEnabled()).toBe(true);

      // 30th bad frame - should trigger fallback
      manager.reportFrameDuration(4.0);
      expect(manager.getBloomEnabled()).toBe(false);
      expect(callback).toHaveBeenCalledWith(false);
    });

    it('should reset bad frame counter if a good frame occurs', () => {
      (manager as any).setBloomEnabled(true);
      
      for (let i = 0; i < 20; i++) manager.reportFrameDuration(4.0);
      manager.reportFrameDuration(1.0); // good frame
      for (let i = 0; i < 20; i++) manager.reportFrameDuration(4.0);
      
      expect(manager.getBloomEnabled()).toBe(true);
    });
  });

  describe('ReactiveBloom', () => {
    it('should update --glow-intensity CSS variable in response to RMS', () => {
      let now = 1000;
      vi.spyOn(performance, 'now').mockImplementation(() => now);
      
      const bloom = new ReactiveBloom();
      
      // Enable bloom in manager
      (manager as any).setBloomEnabled(true);
      
      // Update with RMS 0.8. 
      // Initially lastUpdate is 0, now is 1000. 1000 - 0 >= 33ms, so update() calls animate() once.
      bloom.update(0.8);
      
      const intensity = document.documentElement.style.getPropertyValue('--glow-intensity');
      // LERP factor is 0.15, so 0 + (0.8 - 0) * 0.15 = 0.12
      expect(parseFloat(intensity)).toBeCloseTo(0.12, 2);
    });

    it('should reset --glow-intensity when bloom is disabled', () => {
      const bloom = new ReactiveBloom();
      (manager as any).setBloomEnabled(true);
      
      bloom.update(0.5);
      (bloom as any).animate();
      expect(parseFloat(document.documentElement.style.getPropertyValue('--glow-intensity'))).toBeGreaterThan(0);
      
      // Disable bloom
      (manager as any).setBloomEnabled(false);
      
      // Next update should reset
      bloom.update(0.5);
      expect(document.documentElement.style.getPropertyValue('--glow-intensity')).toBe('0');
    });
  });
});