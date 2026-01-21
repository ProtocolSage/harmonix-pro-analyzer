// src/__tests__/VisualizerEngine.test.ts
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { VisualizerEngine } from '../engines/VisualizerEngine';
import type { IRenderer, VisualizationPayload } from '../types/visualizer';

function createPayload(seq: number): VisualizationPayload {
  return {
    sequence: seq,
    timestamp: Date.now(),
    spectrum: new Float32Array(10),
    waveform: new Float32Array(10),
    energy: { rms: 0, peak: 0, loudness: -14 }
  };
}

type MockWorker = Worker & {
  postMessage: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
  onerror: ((e: any) => any) | null;
};

function makeMockWorker(): MockWorker {
  return {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    onerror: null
  } as unknown as MockWorker;
}

function makeMockRenderer(): IRenderer {
  return {
    id: 'test-renderer',
    initialize: vi.fn(),
    draw: vi.fn(),
    resize: vi.fn(),
    destroy: vi.fn()
  };
}

/**
 * Create a canvas-like object we can mutate freely without fighting DOM typings.
 * We intentionally model `transferControlToOffscreen` as optional so tests can
 * add/remove it without TS2322.
 */
type TestCanvas = {
  width: number;
  height: number;
  getContext: ReturnType<typeof vi.fn<any[], any>>;
  transferControlToOffscreen?: ReturnType<typeof vi.fn>;
};

function makeCanvas(): TestCanvas {
  return {
    width: 100,
    height: 100,
    getContext: vi.fn(() => ({}))
  };
}

describe('VisualizerEngine', () => {
  let engine: VisualizerEngine;
  let mockRenderer: IRenderer;
  let mockWorker: MockWorker;
  let canvas: TestCanvas;

  beforeEach(() => {
    vi.useFakeTimers();

    mockRenderer = makeMockRenderer();
    mockWorker = makeMockWorker();
    canvas = makeCanvas();

    // Environment flags the engine might inspect
    vi.stubGlobal('window', { crossOriginIsolated: false } as any);

    // Some implementations gate "shared" mode on crossOriginIsolated + SharedArrayBuffer existence.
    // If SharedArrayBuffer isn't present in your test runtime, this gives you a consistent baseline.
    vi.stubGlobal('SharedArrayBuffer', ArrayBuffer as any);

    // Worker constructor
    vi.stubGlobal('Worker', vi.fn(() => mockWorker) as any);

    // Make rAF deterministic under fake timers
    vi.stubGlobal(
      'requestAnimationFrame',
      ((cb: FrameRequestCallback) => {
        return setTimeout(() => cb(performance.now()), 16) as unknown as number;
      }) as any
    );
    vi.stubGlobal('cancelAnimationFrame', ((id: number) => clearTimeout(id as any)) as any);

    engine = new VisualizerEngine();
  });

  afterEach(() => {
    engine.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  describe('DataBridge Capabilities', () => {
    it('should default to transferable mode when secure context is missing', () => {
      // window.crossOriginIsolated is false by default in beforeEach
      const e = new VisualizerEngine();
      expect(e.getBridgeMode()).toBe('transferable');
      e.destroy();
    });

    it('should detect shared mode when supported', () => {
      (globalThis as any).window.crossOriginIsolated = true;
      const e = new VisualizerEngine();
      expect(e.getBridgeMode()).toBe('shared');
      e.destroy();
    });
  });

  describe('Worker Offloading', () => {
    it('should use Worker if transferControlToOffscreen is supported', () => {
      // Create a shape that satisfies OffscreenCanvas-ish expectations without relying on DOM types
      const mockOffscreen = {
        width: 100,
        height: 100,
        getContext: vi.fn(() => ({}))
      } as any;

      canvas.transferControlToOffscreen = vi.fn(() => mockOffscreen);

      engine.init(canvas as unknown as HTMLCanvasElement, mockRenderer);

      expect(canvas.transferControlToOffscreen).toHaveBeenCalledTimes(1);
      expect((globalThis as any).Worker).toHaveBeenCalledTimes(1);

      expect(mockWorker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'INIT' }),
        [mockOffscreen]
      );
    });
  });
});
