/**
 * MomentumEngine: Simulates physical inertia and friction for UI controls.
 * Used to give knobs and faders an "expensive" weighted feel.
 */
export class MomentumEngine {
  private velocity = 0;
  private value = 0;
  private friction = 0.95; // Decay constant per frame
  private min: number;
  private max: number;
  
  private animationId: number | null = null;
  private onChange: (value: number) => void;

  constructor(options: { 
    min: number; 
    max: number; 
    initialValue?: number;
    friction?: number;
    onChange: (value: number) => void;
  }) {
    this.min = options.min;
    this.max = options.max;
    this.value = options.initialValue ?? options.min;
    if (options.friction !== undefined) this.friction = options.friction;
    this.onChange = options.onChange;
  }

  /**
   * Apply an impulse (flick) to the engine.
   */
  public impulse(velocity: number) {
    this.velocity = velocity;
    this.start();
  }

  /**
   * Stop momentum immediately (e.g. on user grab).
   */
  public stop() {
    this.velocity = 0;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public setValue(value: number) {
    this.value = Math.max(this.min, Math.min(this.max, value));
    this.onChange(this.value);
  }

  public getValue(): number {
    return this.value;
  }

  private start() {
    if (this.animationId !== null) return;
    
    const tick = () => {
      if (Math.abs(this.velocity) < 0.001) {
        this.stop();
        return;
      }

      this.value += this.velocity;
      
      // Boundary check
      if (this.value <= this.min || this.value >= this.max) {
        this.value = Math.max(this.min, Math.min(this.max, this.value));
        this.stop();
        this.onChange(this.value);
        return;
      }

      this.onChange(this.value);
      this.velocity *= this.friction;
      this.animationId = requestAnimationFrame(tick);
    };

    this.animationId = requestAnimationFrame(tick);
  }
}
