import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioTransportEngine } from '../engines/AudioTransportEngine';

describe('AudioTransportEngine', () => {
  let context: AudioContext;
  let transport: AudioTransportEngine;
  let mockBuffer: AudioBuffer;

  beforeEach(() => {
    vi.useFakeTimers();
    // Mock AudioContext and related nodes
    const mockGainNode = {
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };

    const mockSourceNode = {
      buffer: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    mockBuffer = {
      duration: 100,
      sampleRate: 44100,
      length: 4410000,
      numberOfChannels: 2,
      getChannelData: vi.fn(),
      copyFromChannel: vi.fn(),
      copyToChannel: vi.fn(),
    } as unknown as AudioBuffer;

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
    transport.setBuffer(mockBuffer);
  });

  it('should play from the beginning by default', () => {
    transport.play();
    const source = (context.createBufferSource as any).mock.results[0].value;
    expect(source.start).toHaveBeenCalledWith(0, 0);
  });

  it('should play from an offset', () => {
    transport.play(50);
    const source = (context.createBufferSource as any).mock.results[0].value;
    expect(source.start).toHaveBeenCalledWith(0, 50);
  });

  it('should pause and resume from the correct offset', () => {
    transport.play(10);
    // Simulate time passing
    (context as any).currentTime = 5; 
    
    transport.pause();
    vi.advanceTimersByTime(20);
    
    expect(transport.getCurrentTime()).toBe(15);
    
    transport.play();
    const source = (context.createBufferSource as any).mock.results[1].value;
    expect(source.start).toHaveBeenCalledWith(0, 15);
  });

  it('should seek to a new time', () => {
    transport.play();
    const source1 = (context.createBufferSource as any).mock.results[0].value;
    transport.seek(80);
    vi.advanceTimersByTime(20);
    expect(source1.stop).toHaveBeenCalled();
    const source2 = (context.createBufferSource as any).mock.results[1].value;
    expect(source2.start).toHaveBeenCalledWith(0, 80);
    expect(transport.getCurrentTime()).toBe(80);
  });

  it('should handle rapid play/stop/start stress test without node overlap', () => {
    for (let i = 0; i < 10; i++) {
      transport.play();
      transport.stop();
    }
    
    vi.advanceTimersByTime(200);
    
    expect(context.createBufferSource).toHaveBeenCalledTimes(10);
    const results = (context.createBufferSource as any).mock.results;
    results.forEach((res: any) => {
      expect(res.value.stop).toHaveBeenCalled();
    });
  });

  it('should correctly report duration', () => {
    expect(transport.getDuration()).toBe(100);
  });
});
