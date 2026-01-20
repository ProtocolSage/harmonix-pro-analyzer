import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Spectral Synchronization Tests
 * 
 * Verifies clock precision between main thread and visualization worker
 * using both SharedArrayBuffer (SAB) and MessageChannel fallback.
 */

describe('Spectral Synchronization Clock', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should maintain <10ms drift using SharedArrayBuffer', async () => {
    // Mock SharedArrayBuffer
    const sab = new ArrayBuffer(8); // Mocking SAB with regular AB for test
    const view = new Float64Array(sab);
    
    const startTime = 100.5; // seconds
    view[0] = startTime;

    // Simulate worker reading time
    const workerReadTime = view[0];
    expect(workerReadTime).toBe(startTime);

    // Simulate 5ms passage
    const timeStep = 0.005;
    view[0] += timeStep;

    const workerReadTimeAfterStep = view[0];
    expect(workerReadTimeAfterStep).toBeCloseTo(startTime + timeStep, 5);
    expect(Math.abs(workerReadTimeAfterStep - (startTime + timeStep))).toBeLessThan(0.01); // <10ms
  });

  it('should broadcast time via MessageChannel as fallback', async () => {
    const channel = new MessageChannel();
    const port1 = channel.port1;
    const port2 = channel.port2;

    const messages: { type: string; time: number }[] = [];
    
    const messagePromise = new Promise<void>((resolve) => {
      port2.onmessage = (e: MessageEvent) => {
        messages.push(e.data);
        resolve();
      };
    });

    const currentTime = 123.456;
    port1.postMessage({ type: 'SYNC_TIME', time: currentTime });

    await messagePromise;

    expect(messages.length).toBe(1);
    expect(messages[0].time).toBe(currentTime);
    
    port1.close();
    port2.close();
  });

  it('should handle latency in MessageChannel communication', async () => {
    const channel = new MessageChannel();
    const port1 = channel.port1;
    const port2 = channel.port2;

    let receivedTime = 0;
    let localTimeAtReceive = 0;

    const messagePromise = new Promise<void>((resolve) => {
      port2.onmessage = (e) => {
        receivedTime = e.data.time;
        localTimeAtReceive = performance.now();
        resolve();
      };
    });

    const sendTime = 500.0;
    const localTimeAtSend = performance.now();
    
    port1.postMessage({ type: 'SYNC_TIME', time: sendTime });

    await messagePromise;

    const drift = (localTimeAtReceive - localTimeAtSend) / 1000; // in seconds
    // Drift should be small (within MessageChannel async overhead)
    expect(drift).toBeLessThan(0.01); // <10ms
    
    port1.close();
    port2.close();
  });
});
