import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MLEngineCoordinator } from '../engines/MLEngineCoordinator';

// Mock Worker
class MockWorker {
  onmessage: ((ev: MessageEvent) => any) | null = null;
  onerror: ((ev: ErrorEvent) => any) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  
  // Helper to simulate messages from worker
  mockOnMessage = (ev: MessageEvent) => this.onmessage?.(ev);
}

// Capture the last created worker
let lastCreatedWorker: MockWorker | null = null;

global.Worker = vi.fn().mockImplementation(() => {
  lastCreatedWorker = new MockWorker();
  return lastCreatedWorker;
}) as any;

// Mock requestIdleCallback
const mockRequestIdleCallback = vi.fn((cb) => {
  cb({ timeRemaining: () => 10, didTimeout: false });
  return 1;
});
(global as any).requestIdleCallback = mockRequestIdleCallback;

describe('MLEngineCoordinator', () => {
  let coordinator: MLEngineCoordinator;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    lastCreatedWorker = null;
    
    // Instantiate coordinator
    coordinator = new MLEngineCoordinator();
    
    // Trigger init manually (simulating Transport Ready event)
    coordinator.init();
    
    // Advance timers to trigger the requestIdleCallback or setTimeout
    vi.runAllTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    coordinator.dispose();
  });

  it('should initialize worker on init()', () => {
    expect(lastCreatedWorker).toBeTruthy();
    expect(lastCreatedWorker).toBeInstanceOf(MockWorker);
  });

  it('should trigger warmup via requestIdleCallback', () => {
    expect(mockRequestIdleCallback).toHaveBeenCalled();
    // Check if worker received INIT message
    expect(lastCreatedWorker?.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'INIT' })
    );
  });

  it('should handle WORKER_READY message from worker', () => {
    // Simulate WORKER_READY response
    lastCreatedWorker?.mockOnMessage({
      data: { type: 'WORKER_READY', payload: { backend: 'wasm', version: '1.0' } }
    } as MessageEvent);

    expect(coordinator.getStatus().isInitialized).toBe(true);
    
    // Should trigger WARMUP
    expect(lastCreatedWorker?.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'WARMUP' })
    );
  });

  it('should handle inference requests', async () => {
    // Set to ready state
    lastCreatedWorker?.mockOnMessage({
      data: { type: 'WORKER_READY', payload: { backend: 'wasm', version: '1.0' } }
    } as MessageEvent);

    const input = {
      melSpectrogram: new Float32Array(100),
      duration: 30,
      sampleRate: 22050,
      audioId: 'test-audio'
    };

    const predictPromise = coordinator.predict(input);

    expect(lastCreatedWorker?.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ 
        type: 'PREDICT',
        payload: expect.objectContaining({ audioId: 'test-audio' })
      }),
      expect.anything()
    );

    // Simulate result
    lastCreatedWorker?.mockOnMessage({
      data: { 
        type: 'PREDICTION_RESULT', 
        payload: { 
          audioId: 'test-audio',
          predictions: [{ label: 'Rock', confidence: 0.9 }],
          processingTime: 100,
          modelName: 'test-model'
        }
      }
    } as MessageEvent);

    const result = await predictPromise;
    expect(result.predictions[0].label).toBe('Rock');
  });

  it('should handle worker crash and restart', () => {
    // Initial state
    lastCreatedWorker?.mockOnMessage({
      data: { type: 'WORKER_READY', payload: {} }
    } as MessageEvent);
    expect(coordinator.getStatus().isInitialized).toBe(true);

    // Simulate crash
    if (lastCreatedWorker?.onerror) {
        lastCreatedWorker.onerror(new ErrorEvent('error', { message: 'WASM OOM' }));
    }

    expect(coordinator.getStatus().isInitialized).toBe(false);
    expect(lastCreatedWorker?.terminate).toHaveBeenCalled();

    // Reset capture
    const oldWorker = lastCreatedWorker;
    lastCreatedWorker = null;

    // Check for restart attempt
    vi.advanceTimersByTime(1500); // 1000ms delay + buffer
    
    // New worker should be created
    expect(lastCreatedWorker).toBeTruthy();
    expect(lastCreatedWorker).not.toBe(oldWorker);
    expect(coordinator.getStatus().restartCount).toBe(1);
  });
});
