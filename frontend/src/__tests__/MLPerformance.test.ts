import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MLEngineCoordinator } from '../engines/MLEngineCoordinator';

describe('ML Performance & Stability', () => {
  let coordinator: MLEngineCoordinator;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    
    // Mock worker
    (global as any).Worker = class MockWorker {
        onmessage = null;
        onerror = null;
        postMessage = vi.fn();
        terminate = vi.fn();
    };
    
    (global as any).requestIdleCallback = vi.fn((cb) => cb({ timeRemaining: () => 10, didTimeout: false }));
  });

  it('should enable Low Memory Mode when device memory is low', () => {
    // Mock navigator.deviceMemory
    Object.defineProperty(navigator, 'deviceMemory', {
      value: 2,
      configurable: true
    });

    coordinator = new MLEngineCoordinator();
    expect(coordinator.getStatus().isLowMemoryMode).toBe(true);
  });

  it('should enable Low Memory Mode when hardware concurrency is low', () => {
    Object.defineProperty(navigator, 'deviceMemory', { value: 8, configurable: true });
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      value: 2,
      configurable: true
    });

    coordinator = new MLEngineCoordinator();
    expect(coordinator.getStatus().isLowMemoryMode).toBe(true);
  });

  it('should NOT enable Low Memory Mode on capable hardware', () => {
    Object.defineProperty(navigator, 'deviceMemory', { value: 8, configurable: true });
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8, configurable: true });
    
    coordinator = new MLEngineCoordinator();
    expect(coordinator.getStatus().isLowMemoryMode).toBe(false);
  });

  it('should prevent inference when in Low Memory Mode', async () => {
    Object.defineProperty(navigator, 'deviceMemory', { value: 2, configurable: true });
    coordinator = new MLEngineCoordinator();
    
    const input = {
      melSpectrogram: new Float32Array(100),
      duration: 30,
      sampleRate: 22050,
      audioId: 'test'
    };

    await expect(coordinator.predict(input)).rejects.toThrow('Low Memory Mode');
  });
});
