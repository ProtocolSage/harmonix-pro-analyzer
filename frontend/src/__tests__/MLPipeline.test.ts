import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MLEngineCoordinator } from '../engines/MLEngineCoordinator';

// Mock Worker
class MockWorker {
  onmessage: ((ev: MessageEvent) => any) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  mockOnMessage = (ev: MessageEvent) => this.onmessage?.(ev);
}

// Capture the last created worker
let lastCreatedWorker: MockWorker | null = null;

global.Worker = vi.fn().mockImplementation(() => {
  lastCreatedWorker = new MockWorker();
  return lastCreatedWorker;
}) as any;

(global as any).requestIdleCallback = vi.fn((cb) => cb({ timeRemaining: () => 10, didTimeout: false }));

describe('ML Pipeline Data Transfer', () => {
  let coordinator: MLEngineCoordinator;

  beforeEach(() => {
    vi.clearAllMocks();
    lastCreatedWorker = null;
    coordinator = new MLEngineCoordinator();
    coordinator.init();
    
    // Simulate Ready
    if (lastCreatedWorker) {
        lastCreatedWorker.mockOnMessage({
            data: { type: 'WORKER_READY', payload: { backend: 'wasm', version: '1.0' } }
        } as MessageEvent);
    }
  });

  afterEach(() => {
    coordinator.dispose();
  });

  it('should transfer MelSpectrogram buffer to worker', async () => {
    // 1. Simulate Essentia Output (Float32Array)
    const melSpectrogram = new Float32Array(187 * 96).fill(0.5);
    const buffer = melSpectrogram.buffer;
    
    // 2. Pass to Coordinator
    const predictPromise = coordinator.predict({
      melSpectrogram: melSpectrogram,
      duration: 30,
      sampleRate: 22050,
      audioId: 'transfer-test'
    });

    // 3. Verify postMessage used transfer list
    expect(lastCreatedWorker?.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ 
        type: 'PREDICT',
        payload: expect.objectContaining({ audioId: 'transfer-test' })
      }),
      // The second argument is the transfer list. 
      // It should contain the buffer.
      expect.arrayContaining([buffer])
    );
    
    // Note: In a real environment, the buffer would be detached here.
    // In JSDOM/Vitest, it might not be automatically detached unless we use real Workers,
    // but checking the call arguments validates our implementation intent.
  });
});