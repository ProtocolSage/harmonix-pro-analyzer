/**
 * AtmosphereManager
 * Orchestrates the "Reactive Atmosphere" visual system.
 * Maps ML confidence to lighting parameters and manages visual state transitions.
 */

export interface AtmosphereState {
  glowRadius: number;
  glowIntensity: number;
  flickerRate: number;
  primaryColor: string;
  secondaryColor: string;
  isLocked: boolean;
}

export const MOOD_PALETTES = {
  aggressive: { primary: '225, 29, 72', secondary: '249, 115, 22' }, // Ruby / Orange
  calm: { primary: '139, 92, 246', secondary: '99, 102, 241' },       // Violet / Indigo
  happy: { primary: '16, 185, 129', secondary: '59, 130, 246' },      // Emerald / Blue
  neutral: { primary: '14, 165, 233', secondary: '13, 148, 136' }     // Cyan / Teal
};

function lerp(start: number, end: number, t: number): number {
  return start * (1 - t) + end * t;
}

export function calculateGlow(confidence: number) {
  // 40 -> 12 px
  const radius = lerp(40, 12, confidence);
  // 0.3 -> 1.0 opacity
  const intensity = lerp(0.3, 1.0, confidence);
  return { radius, intensity };
}

export function calculateFlicker(confidence: number) {
  // 8 -> 0 Hz
  return lerp(8, 0, confidence);
}

export function mapMoodToColor(mood: string) {
  const normalized = mood.toLowerCase();
  if (normalized.includes('aggressive') || normalized.includes('rock') || normalized.includes('electronic')) {
    return MOOD_PALETTES.aggressive;
  }
  if (normalized.includes('calm') || normalized.includes('sad') || normalized.includes('ambient')) {
    return MOOD_PALETTES.calm;
  }
  if (normalized.includes('happy') || normalized.includes('dance') || normalized.includes('pop')) {
    return MOOD_PALETTES.happy;
  }
  return MOOD_PALETTES.neutral;
}

export class AtmosphereManager {
  private static instance: AtmosphereManager;
  private isFrozen = false;
  private currentConfidence = 0;
  private currentMood = 'neutral';
  private currentState: AtmosphereState;
  private targetState: AtmosphereState;
  
  // Animation loop
  private animationId: number | null = null;
  private lastUpdate = 0;

  private constructor() {
    this.targetState = this.calculateTargetState();
    this.currentState = { ...this.targetState }; // Start aligned
    this.startLoop();
  }

  // ... (getInstance, update, setFrozen, calculateTargetState methods remain same)

  private applyState(state: AtmosphereState) {
    const root = document.documentElement;
    
    root.style.setProperty('--atmosphere-glow-radius', `${state.glowRadius.toFixed(1)}px`);
    root.style.setProperty('--atmosphere-glow-intensity', state.glowIntensity.toFixed(3));
    root.style.setProperty('--atmosphere-primary', `rgb(${state.primaryColor})`);
    root.style.setProperty('--atmosphere-secondary', `rgb(${state.secondaryColor})`);
    
    if (state.flickerRate > 0) {
       const duration = state.flickerRate > 0 ? 1 / state.flickerRate : 0;
       root.style.setProperty('--atmosphere-flicker-duration', `${duration.toFixed(3)}s`);
    } else {
       root.style.setProperty('--atmosphere-flicker-duration', `0s`);
    }
  }

  // Interpolate RGB string "r,g,b"
  private lerpColor(c1: string, c2: string, t: number): string {
    const rgb1 = c1.split(',').map(Number);
    const rgb2 = c2.split(',').map(Number);
    const r = Math.round(lerp(rgb1[0], rgb2[0], t));
    const g = Math.round(lerp(rgb1[1], rgb2[1], t));
    const b = Math.round(lerp(rgb1[2], rgb2[2], t));
    return `${r},${g},${b}`;
  }

  private startLoop() {
    const loop = (timestamp: number) => {
      // 30fps throttle for update logic, but allow smoother interpolation if needed?
      // Actually, for smoothness, we want to update DOM every frame if we are interpolating.
      // But we throttled applyState in previous design.
      // Let's run full speed but use small lerp factor.
      
      if (!this.lastUpdate) this.lastUpdate = timestamp;
      const delta = timestamp - this.lastUpdate;
      
      // Decay factor for ~300ms transition at 60fps
      // lerp factor alpha = 1 - Math.pow(0.01, delta / duration) ?
      // Simple exp decay: current = lerp(current, target, 0.1)
      const factor = 0.1;

      this.currentState.glowRadius = lerp(this.currentState.glowRadius, this.targetState.glowRadius, factor);
      this.currentState.glowIntensity = lerp(this.currentState.glowIntensity, this.targetState.glowIntensity, factor);
      this.currentState.flickerRate = lerp(this.currentState.flickerRate, this.targetState.flickerRate, factor);
      
      this.currentState.primaryColor = this.lerpColor(this.currentState.primaryColor, this.targetState.primaryColor, factor);
      this.currentState.secondaryColor = this.lerpColor(this.currentState.secondaryColor, this.targetState.secondaryColor, factor);
      this.currentState.isLocked = this.targetState.isLocked; // Instant

      this.applyState(this.currentState);
      this.lastUpdate = timestamp;
      
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }
  
  public dispose() {
      if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}
