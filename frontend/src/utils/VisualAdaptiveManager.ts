/**
 * VisualAdaptiveManager: Manages the performance-heavy visual effects.
 * Implements Opt-Up and Fallback logic based on available frame budget.
 */
export class VisualAdaptiveManager {
  private static instance: VisualAdaptiveManager;
  
  private idleThreshold = 10; // ms
  private budgetThreshold = 3; // ms
  
  private optUpWindow = 60; // frames
  private fallbackWindow = 30; // frames
  
  private consecutiveGoodFrames = 0;
  private consecutiveBadFrames = 0;
  
  private isBloomEnabled = false;
  private isPeakDetected = false;
  private listeners: Set<(enabled: boolean) => void> = new Set();
  private peakListeners: Set<(isPeak: boolean) => void> = new Set();

  private constructor() {
    this.startMonitoring();
  }

  public static getInstance(): VisualAdaptiveManager {
    if (!VisualAdaptiveManager.instance) {
      VisualAdaptiveManager.instance = new VisualAdaptiveManager();
    }
    return VisualAdaptiveManager.instance;
  }

  private startMonitoring() {
    const monitor = (deadline: IdleDeadline) => {
      const remaining = deadline.timeRemaining();
      const start = performance.now();

      // Check if we have good idle time
      if (remaining >= this.idleThreshold) {
        this.consecutiveGoodFrames++;
        this.consecutiveBadFrames = 0;
      } else {
        this.consecutiveGoodFrames = 0;
      }

      // Check if we should Opt-Up
      if (!this.isBloomEnabled && this.consecutiveGoodFrames >= this.optUpWindow) {
        this.setBloomEnabled(true);
      }

      // We need a way to track the actual frame budget (>3ms)
      // This will be fed externally by the VisualizerEngine or TransportEngine
      
      // Schedule next check
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(monitor);
      } else {
        setTimeout(() => monitor({ timeRemaining: () => 10, didTimeout: false } as any), 100);
      }
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(monitor);
    }
  }

  /**
   * Reports a frame's main-thread duration.
   * Used for the Fallback trigger.
   */
  public reportFrameDuration(durationMs: number) {
    if (durationMs > this.budgetThreshold) {
      this.consecutiveBadFrames++;
      this.consecutiveGoodFrames = 0;
    } else {
      this.consecutiveBadFrames = 0;
    }

    if (this.isBloomEnabled && this.consecutiveBadFrames >= this.fallbackWindow) {
      this.setBloomEnabled(false, 'Performance Fallback: Frame budget exceeded');
    }
  }

  /**
   * Reports if a peak has been detected (> -3dB).
   */
  public reportPeak(isPeak: boolean) {
    if (this.isPeakDetected === isPeak) return;
    this.isPeakDetected = isPeak;
    
    // Update Jewel Ruby variable
    if (isPeak && this.isBloomEnabled) {
      document.documentElement.style.setProperty('--peak-glow', '1');
    } else {
      document.documentElement.style.setProperty('--peak-glow', '0');
    }
    
    this.peakListeners.forEach(l => l(isPeak));
  }

  private setBloomEnabled(enabled: boolean, reason?: string) {
    if (this.isBloomEnabled === enabled) return;
    
    this.isBloomEnabled = enabled;
    console.log(`[VisualAdaptiveManager] Bloom ${enabled ? 'ENABLED' : 'DISABLED'}${reason ? ` (${reason})` : ''}`);
    
    // Reset variables on disable
    if (!enabled) {
      document.documentElement.style.setProperty('--glow-intensity', '0');
      document.documentElement.style.setProperty('--peak-glow', '0');
    }

    this.listeners.forEach(l => l(enabled));
  }

  public onBloomChange(listener: (enabled: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public onPeakChange(listener: (isPeak: boolean) => void): () => void {
    this.peakListeners.add(listener);
    return () => this.peakListeners.delete(listener);
  }

  public getBloomEnabled(): boolean {
    return this.isBloomEnabled;
  }

  public getIsPeakDetected(): boolean {
    return this.isPeakDetected;
  }
}
