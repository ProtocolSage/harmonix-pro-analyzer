import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioTransportEngine } from '../engines/AudioTransportEngine';

describe('Looping', () => {
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
    transport.setBuffer({ duration: 10, sampleRate: 44100 } as AudioBuffer);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should restart playback when loop boundary is reached', () => {
    transport.setLoop(2, 5);
    transport.setLooping(true);
    transport.play(2);
    
    // Simulate time passing to loopEnd
    (context as any).currentTime = 3.1; // Total elapsed time since play(2) is 3.1s, so currentTime should be 2 + 3.1 = 5.1s
    
    // Trigger rAF
    vi.advanceTimersByTime(16);
    
    // Should have called play(2) again
    expect(context.createBufferSource).toHaveBeenCalledTimes(2);
    const results = (context.createBufferSource as any).mock.results;
    expect(results[1].value.start).toHaveBeenCalledWith(0, 2);
  });

  it('should respect 1ms epsilon to avoid double-triggering', () => {
    transport.setLoop(0, 10);
    transport.setLooping(true);
    transport.play(9.0); 
    
    (context as any).currentTime = 0.998; // currentTime = 9.998. loopEnd - epsilon = 9.999
    vi.advanceTimersByTime(16);
    expect(context.createBufferSource).toHaveBeenCalledTimes(1);
    
    (context as any).currentTime = 1.0; // currentTime = 10.0. Exactly at/past boundary.
    vi.advanceTimersByTime(16);
    expect(context.createBufferSource).toHaveBeenCalledTimes(2);
  });
});
