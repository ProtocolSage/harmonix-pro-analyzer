import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioTransportEngine } from '../engines/AudioTransportEngine';

describe('Seek Optimization', () => {
  let context: AudioContext;
  let transport: AudioTransportEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    context = {
      currentTime: 0,
      createGain: vi.fn(() => ({
        gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
      })),
      createAnalyser: vi.fn(() => ({
        fftSize: 0,
        connect: vi.fn(),
        getFloatTimeDomainData: vi.fn(),
        getFloatFrequencyData: vi.fn(),
      })),
      createBufferSource: vi.fn(() => ({
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      })),
      destination: {},
    } as unknown as AudioContext;

    transport = new AudioTransportEngine(context);
    transport.setBuffer({ duration: 100, sampleRate: 44100 } as AudioBuffer);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should trigger light path immediately and heavy path throttled', () => {
    const lightSpy = vi.fn();
    const heavySpy = vi.fn();
    
    transport.onTick(lightSpy);
    transport.onHeavySeek(heavySpy);
    
    // Rapid scrubbing
    for (let i = 0; i < 5; i++) {
      transport.seek(i);
      vi.advanceTimersByTime(20);
    }
    
    // Light path should have been called for every seek
    expect(lightSpy).toHaveBeenCalledTimes(5);
    
    // Heavy path should have been throttled (100ms)
    // 0ms: Seek(0) -> Triggered (first call)
    // 20ms: Seek(1) -> Throttled
    // 40ms: Seek(2) -> Throttled
    // 60ms: Seek(3) -> Throttled
    // 80ms: Seek(4) -> Throttled
    expect(heavySpy).toHaveBeenCalledTimes(1);
    
    // After settle (100ms more)
    vi.advanceTimersByTime(100);
    expect(heavySpy).toHaveBeenCalledTimes(2);
    expect(heavySpy).toHaveBeenLastCalledWith(4, expect.any(AbortSignal));
  });

  it('should abort previous signal when a new heavy seek is triggered', () => {
    const heavySpy = vi.fn();
    transport.onHeavySeek(heavySpy);
    
    transport.seek(0);
    const signal1 = heavySpy.mock.calls[0][1];
    expect(signal1.aborted).toBe(false);
    
    vi.advanceTimersByTime(150); // Past throttle
    transport.seek(5);
    
    expect(signal1.aborted).toBe(true);
    const signal2 = heavySpy.mock.calls[1][1];
    expect(signal2.aborted).toBe(false);
  });
});
