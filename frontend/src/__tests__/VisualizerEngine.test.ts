import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VisualizerEngine } from '../engines/VisualizerEngine';
import { IRenderer, VisualizationPayload } from '../types/visualizer';

// Mock IRenderer
const mockRenderer: IRenderer = {
  id: 'test-renderer',
  initialize: vi.fn(),
  draw: vi.fn(),
  resize: vi.fn(),
  destroy: vi.fn(),
};

// Mock Worker
const mockWorkerInstance = {
  postMessage: vi.fn(),
  terminate: vi.fn(),
  onerror: null as any,
};

// Mock Canvas
const mockCanvas = {
  getContext: vi.fn(() => ({})),
  width: 100,
  height: 100,
  transferControlToOffscreen: undefined as any,
} as unknown as HTMLCanvasElement;

// Helper to create dummy payload
const createPayload = (seq: number): VisualizationPayload => ({
  sequence: seq,
  timestamp: Date.now(),
  spectrum: new Float32Array(10),
  waveform: new Float32Array(10),
  energy: { rms: 0, peak: 0, loudness: -14 }
});

describe('VisualizerEngine', () => {
  let engine: VisualizerEngine;

  beforeEach(() => {
    // Reset global mocks
    (globalThis as any).SharedArrayBuffer = ArrayBuffer; 
    (globalThis as any).window = { crossOriginIsolated: false }; 
    (globalThis as any).Worker = vi.fn(() => mockWorkerInstance);
    
    // Reset canvas capabilities
    mockCanvas.transferControlToOffscreen = undefined;
    
    vi.useFakeTimers();
    
    engine = new VisualizerEngine();
  });

  afterEach(() => {
    engine.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('DataBridge Capabilities', () => {
    it('should default to transferable mode when secure context is missing', () => {
      engine = new VisualizerEngine();
      expect(engine.getBridgeMode()).toBe('transferable');
    });

    it('should detect shared mode when supported', () => {
      (globalThis as any).window.crossOriginIsolated = true;
      engine = new VisualizerEngine();
      expect(engine.getBridgeMode()).toBe('shared');
    });
  });

  describe('Worker Offloading', () => {
    it('should use Worker if OffscreenCanvas is supported', () => {
      const mockOffscreen = {};
      mockCanvas.transferControlToOffscreen = vi.fn(() => mockOffscreen);
      
      engine.init(mockCanvas, mockRenderer);
      
      expect(mockCanvas.transferControlToOffscreen).toHaveBeenCalled();
      expect((globalThis as any).Worker).toHaveBeenCalled();
      expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'INIT' }), 
        [mockOffscreen]
      );
    });

    it('should fallback to Main Thread if OffscreenCanvas throws', () => {
      mockCanvas.transferControlToOffscreen = vi.fn(() => {
        throw new Error('Not supported');
      });
      
      engine.init(mockCanvas, mockRenderer);
      
      // Should have tried worker
      expect(mockCanvas.transferControlToOffscreen).toHaveBeenCalled();
      // Should have fallen back to main context
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d', expect.anything());
      // Renderer should be initialized on main thread
      expect(mockRenderer.initialize).toHaveBeenCalled();
    });
  });

  describe('Backpressure Logic', () => {
    it('should cap queue size at 3 and drop oldest', () => {
      engine.feed(createPayload(1));
      engine.feed(createPayload(2));
      engine.feed(createPayload(3));
      
      expect(engine.getQueueDepth()).toBe(3);
      
      // Push 4th, should drop 1
      engine.feed(createPayload(4));
      expect(engine.getQueueDepth()).toBe(3);
    });
  });

  describe('Adaptive Degradation', () => {
    it('should trigger Lite Mode after consecutive slow frames', () => {
      engine.init(mockCanvas, mockRenderer);
      engine.start();

      // Mock performance.now to simulate slow frames
      let now = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => now);

      // Simulate slow draws
      (mockRenderer.draw as any).mockImplementation(() => {
        now += 10; // 10ms > 3ms budget
      });

      // Frame 1
      engine.feed(createPayload(1));
      vi.advanceTimersByTime(16); // Trigger rAF
      
      // Frame 2
      engine.feed(createPayload(2));
      vi.advanceTimersByTime(16);

      // Frame 3
      engine.feed(createPayload(3));
      vi.advanceTimersByTime(16);

      // Frame 4 (Trigger)
      engine.feed(createPayload(4));
      vi.advanceTimersByTime(16);

      expect(engine.isDegraded()).toBe(true);
      expect(mockRenderer.initialize).toHaveBeenCalledTimes(2); // Initial + Re-init
    });
  });
});