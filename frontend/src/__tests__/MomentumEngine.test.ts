import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MomentumEngine } from '../utils/MomentumEngine';

describe('MomentumEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with correct value and clamp it', () => {
    const engine = new MomentumEngine({
      min: 0,
      max: 100,
      initialValue: 50,
      onChange: () => {}
    });
    expect(engine.getValue()).toBe(50);

    engine.setValue(150);
    expect(engine.getValue()).toBe(100);

    engine.setValue(-50);
    expect(engine.getValue()).toBe(0);
  });

  it('should apply impulse and decay with friction', async () => {
    const values: number[] = [];
    const engine = new MomentumEngine({
      min: 0,
      max: 100,
      initialValue: 0,
      friction: 0.9,
      onChange: (v) => values.push(v)
    });

    engine.impulse(10); // Start moving with velocity 10
    
    // Advance 1 frame (simulate requestAnimationFrame)
    vi.advanceTimersByTime(16.67);
    
    expect(values.length).toBeGreaterThan(0);
    const firstVal = values[0];
    expect(firstVal).toBe(10); // value += velocity

    vi.advanceTimersByTime(16.67);
    const secondVal = values[1];
    // velocity became 10 * 0.9 = 9
    // value became 10 + 9 = 19
    expect(secondVal).toBe(19);
  });

  it('should stop when velocity is near zero', () => {
    const onChange = vi.fn();
    const engine = new MomentumEngine({
      min: 0,
      max: 100,
      onChange
    });

    engine.impulse(0.0005);
    vi.advanceTimersByTime(100);
    
    // It should have stopped, so further time advancement shouldn't call onChange
    const callCount = onChange.mock.calls.length;
    vi.advanceTimersByTime(100);
    expect(onChange.mock.calls.length).toBe(callCount);
  });
});
