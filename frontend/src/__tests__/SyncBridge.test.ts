import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioTransportEngine } from '../engines/AudioTransportEngine';

describe('Sync Bridge', () => {
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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should broadcast time via SharedArrayBuffer when available', async () => {
    // Force crossOriginIsolated and SharedArrayBuffer for this test
    (window as any).crossOriginIsolated = true;
    (global as any).SharedArrayBuffer = ArrayBuffer; // Mock SAB as ArrayBuffer for tests
    
    const t = new AudioTransportEngine(context);
    const bridge = t.getSyncBridge();
    
    expect(bridge.type).toBe('sab');
    
    const buffer = (bridge as any).buffer;
    const view = new Float32Array(buffer);
    
    t.setBuffer({ duration: 100 } as AudioBuffer);
    t.play();
    
    (context as any).currentTime = 1.5;
    // Trigger rAF
    vi.advanceTimersByTime(16);
    
    // We expect the view to have updated
    expect(view[0]).toBeCloseTo(1.5, 2);
  });

  it('should broadcast time via MessageChannel as fallback', async () => {
    vi.useRealTimers();
    (window as any).crossOriginIsolated = false;
    (global as any).SharedArrayBuffer = undefined;
    
    // Polyfill requestAnimationFrame for Node environment
    const originalRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = (cb) => {
      return setTimeout(() => cb(performance.now()), 16) as any;
    };
    
    try {
      const t = new AudioTransportEngine(context);
      const bridge = t.getSyncBridge();
      
      expect(bridge.type).toBe('channel');
      const port = (bridge as any).port;
      
      const messages: any[] = [];
      const messagePromise = new Promise<void>((resolve) => {
        port.onmessage = (e: any) => {
          messages.push(e.data);
          if (messages.length >= 1) resolve();
        };
      });
      
      t.setBuffer({ duration: 100 } as AudioBuffer);
      t.play();
      
      (context as any).currentTime = 2.0;
      
      // Wait for up to 1 second for the message to arrive
      await Promise.race([
        messagePromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Message never arrived')), 1000))
      ]);
      
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[messages.length-1].time).toBeCloseTo(2.0, 2);
    } finally {
      window.requestAnimationFrame = originalRAF;
    }
  });
});
