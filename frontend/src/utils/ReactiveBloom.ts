import { VisualAdaptiveManager } from './VisualAdaptiveManager';

/**
 * ReactiveBloom: Converts RMS/Peak audio signals into LERP-smoothed visual glow.
 * Capped at 30fps for performance.
 */
export class ReactiveBloom {
  private lastUpdate = 0;
  private updateInterval = 1000 / 30; // 30fps
  
  private currentIntensity = 0;
  private targetIntensity = 0;
  private lerpFactor = 0.15; // Smoothness factor
  
  private manager: VisualAdaptiveManager;

  constructor() {
    this.manager = VisualAdaptiveManager.getInstance();
  }

  /**
   * Update the target intensity based on RMS signal.
   * Expected input: 0.0 to 1.0
   */
  public update(rms: number) {
    if (!this.manager.getBloomEnabled()) {
      if (this.currentIntensity !== 0) {
        this.currentIntensity = 0;
        document.documentElement.style.setProperty('--glow-intensity', '0');
      }
      return;
    }

    this.targetIntensity = Math.max(0, Math.min(rms, 1.0));
    
    const now = performance.now();
    if (now - this.lastUpdate >= this.updateInterval) {
      this.animate();
      this.lastUpdate = now;
    }
  }

  private animate() {
    // LERP intensity for smoothness (Low-pass filter)
    this.currentIntensity += (this.targetIntensity - this.currentIntensity) * this.lerpFactor;
    
    // Tiny threshold to snap to zero
    if (this.currentIntensity < 0.001) this.currentIntensity = 0;
    
    // Update CSS Custom Property
    document.documentElement.style.setProperty('--glow-intensity', this.currentIntensity.toFixed(3));
  }
}
