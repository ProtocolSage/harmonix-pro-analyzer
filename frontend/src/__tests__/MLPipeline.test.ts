// src/__tests__/MLPipeline.test.ts
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { MLEngineCoordinator } from '../engines/MLEngineCoordinator';

type MockWorker = Worker & {
  onmessage: ((ev: MessageEvent) => any) | null;
  postMessage: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
  addEventListener: (type: string, cb: EventListener) => void;
  removeEventListener: (type: string, cb: EventListener) => void;
  mockOnMessage: (data: any) => void;
};

let lastCreatedWorker: MockWorker | null = null;

function makeMessageEvent(data: any): MessageEvent {
  // Vitest with jsdom has MessageEvent. If not, fall back to a compatible shape.
  try {
    return new MessageEvent('message', { data });
  } catch {
    return { data } as unknown as MessageEvent;
  }
}

function installWorkerMock() {
  vi.stubGlobal(
    'Worker',
    vi.fn((..._args: any[]) => {
      const listeners = new Map<string, Set<EventListener>>();

      const worker = {
        onmessage: null,

        postMessage: vi.fn(),
        terminate: vi.fn(),

        addEventListener: (type: string, cb: EventListener) => {
          if (!listeners.has(type)) listeners.set(type, new Set());
          listeners.get(type)!.add(cb);
        },

        removeEventListener: (type: string, cb: EventListener) => {
          listeners.get(type)?.delete(cb);
        },

        mockOnMessage: (data: any) => {
          const ev = makeMessageEvent(data);

          // Support both APIs: `worker.onmessage = ...` and `addEventListener('message', ...)`
          worker.onmessage?.(ev);
          listeners.get('message')?.forEach((cb) => cb(ev));
        }
      } as unknown as MockWorker;

      lastCreatedWorker = worker;
      return worker;
    }) as unknown as typeof Worker
  );
}

function installRequestIdleCallbackMock() {
  // Some codebases call requestIdleCallback during warmup.
  vi.stubGlobal(
    'requestIdleCallback',
    vi.fn((cb: any) => cb({ timeRemaining: () => 10, didTimeout: false }))
  );
}

installWorkerMock();
installRequestIdleCallbackMock();

describe('ML Pipeline Data Transfer', () => {
  let coordinator: MLEngineCoordinator;

  beforeEach(() => {
    vi.clearAllMocks();
    lastCreatedWorker = null;

    coordinator = new MLEngineCoordinator();
    coordinator.init();

    // Simulate Worker Ready (match your coordinator’s expected envelope)
    (lastCreatedWorker as any)?.mockOnMessage({
      type: 'WORKER_READY',
      payload: { backend: 'wasm', version: '1.0' }
    });
  });

  afterEach(() => {
    coordinator.dispose();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('should transfer MelSpectrogram buffer to worker', async () => {
    const melSpectrogram = new Float32Array(187 * 96).fill(0.5);
    const buffer = melSpectrogram.buffer;

    // Don’t await unless you also simulate the worker response your code expects.
    // Also suppress potential unhandled rejections if dispose() races the promise.
    void coordinator
      .predict({
        melSpectrogram,
        duration: 30,
        sampleRate: 22050,
        audioId: 'transfer-test'
      })
      .catch(() => undefined);

    const w = lastCreatedWorker;
    expect(w).not.toBeNull();
    expect(w!.postMessage).toHaveBeenCalled();

    // Find the PREDICT message call (don’t assume it’s call[0])
    const calls = (w!.postMessage as any).mock.calls as any[][];
    const predictCall = calls.find((c) => c?.[0]?.type === 'PREDICT');

    expect(predictCall, 'Expected a postMessage call with { type: "PREDICT" }').toBeTruthy();

    const [msg, transferList] = predictCall!;

    expect(msg).toEqual(
      expect.objectContaining({
        type: 'PREDICT',
        payload: expect.objectContaining({ audioId: 'transfer-test' })
      })
    );

    // Transfer list should include the underlying ArrayBuffer
    expect(Array.isArray(transferList)).toBe(true);
    expect(transferList).toEqual(expect.arrayContaining([buffer]));
  });
});
