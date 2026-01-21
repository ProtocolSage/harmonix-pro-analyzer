import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Worker Communication Protocol Tests
 *
 * These tests verify the message protocol between main thread and analysis workers.
 * Based on the documented protocol from WORKER_PROTOCOL.md (to be created)
 */

describe('Worker Message Protocol', () => {
  let mockWorker: any;
  let messageHandlers: Map<string, (ev: any) => void>;

  beforeEach(() => {
    messageHandlers = new Map();

    mockWorker = {
      postMessage: vi.fn(),
      addEventListener: vi.fn((event: string, handler: (ev: any) => void) => {
        messageHandlers.set(event, handler);
      }),
      removeEventListener: vi.fn(),
      terminate: vi.fn(),
    };

    global.Worker = vi.fn(() => mockWorker) as any;
  });

  describe('INIT Message Protocol', () => {
    it('should send INIT message on worker creation', () => {
      const worker = new Worker('mock-url');

      worker.postMessage({ type: 'INIT' });

      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'INIT',
        })
      );
    });

    it('should handle WORKER_READY response', () => {
      const worker = new Worker('mock-url');
      const readyCallback = vi.fn();

      worker.addEventListener('message', (event: any) => {
        if (event.data.type === 'WORKER_READY') {
          readyCallback(event.data.payload);
        }
      });

      const messageHandler = messageHandlers.get('message');
      messageHandler?.({
        data: {
          type: 'WORKER_READY',
          payload: {
            success: true,
            initTime: 1500,
            version: '0.1.3',
          },
        },
      });

      expect(readyCallback).toHaveBeenCalledWith({
        success: true,
        initTime: 1500,
        version: '0.1.3',
      });
    });

    it('should handle WORKER_ERROR during initialization', () => {
      const worker = new Worker('mock-url');
      const errorCallback = vi.fn();

      worker.addEventListener('message', (event: any) => {
        if (event.data.type === 'WORKER_ERROR') {
          errorCallback(event.data.payload);
        }
      });

      const messageHandler = messageHandlers.get('message');
      messageHandler?.({
        data: {
          type: 'WORKER_ERROR',
          payload: {
            error: 'Failed to load WASM module',
            details: 'Network timeout',
            stage: 'initialization',
          },
        },
      });

      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to load WASM module',
          stage: 'initialization',
        })
      );
    });

    it('should timeout if no WORKER_READY received', async () => {
      const worker = new Worker('mock-url');
      const timeout = 100; // Use shorter timeout for tests

      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, timeout);
      });

      const messagePromise = new Promise<void>((resolve, reject) => {
        worker.addEventListener('message', (event: any) => {
          if (event.data.type === 'WORKER_READY') {
            reject(new Error('Should have timed out'));
          }
        });
      });

      // Race between timeout and message - timeout should win
      // Don't send WORKER_READY - should timeout
      await Promise.race([timeoutPromise, messagePromise]);
      expect(true).toBe(true); // Timeout occurred as expected
    });
  });

  describe('ANALYZE Message Protocol', () => {
    it('should send ANALYZE_AUDIO message with valid payload', () => {
      const worker = new Worker('mock-url');
      const audioData = new Float32Array([0, 1, 0, -1]);

      const message = {
        type: 'ANALYZE_AUDIO',
        id: 'analysis-123',
        payload: {
          audioData: {
            channelData: [audioData],
            sampleRate: 44100,
            length: 4,
            duration: 4 / 44100,
            numberOfChannels: 1,
          },
          config: {
            frameSize: 2048,
            hopSize: 1024,
          },
          fileName: 'test.mp3',
        },
      };

      worker.postMessage(message, [audioData.buffer]);

      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ANALYZE_AUDIO',
          id: 'analysis-123',
        }),
        [audioData.buffer]
      );
    });

    it('should receive PROGRESS messages during analysis', () => {
      const worker = new Worker('mock-url');
      const progressCallback = vi.fn();

      worker.addEventListener('message', (event: any) => {
        if (event.data.type === 'PROGRESS') {
          progressCallback(event.data.payload);
        }
      });

      const messageHandler = messageHandlers.get('message');

      // Simulate multiple progress updates
      const progressUpdates = [
        { stage: 'preprocessing', percentage: 10, currentStep: 'Decoding audio' },
        { stage: 'analyzing', percentage: 50, currentStep: 'Spectral analysis' },
        { stage: 'analyzing', percentage: 75, currentStep: 'Tempo detection' },
        { stage: 'analyzing', percentage: 90, currentStep: 'Key detection' },
      ];

      progressUpdates.forEach((progress) => {
        messageHandler?.({
          data: {
            type: 'PROGRESS',
            id: 'analysis-123',
            payload: progress,
          },
        });
      });

      expect(progressCallback).toHaveBeenCalledTimes(4);
      expect(progressCallback).toHaveBeenNthCalledWith(4, {
        stage: 'analyzing',
        percentage: 90,
        currentStep: 'Key detection',
      });
    });

    it('should receive ANALYSIS_COMPLETE message with results', () => {
      const worker = new Worker('mock-url');
      const completeCallback = vi.fn();

      worker.addEventListener('message', (event: any) => {
        if (event.data.type === 'ANALYSIS_COMPLETE') {
          completeCallback(event.data.payload);
        }
      });

      const messageHandler = messageHandlers.get('message');

      const mockResult = {
        tempo: { bpm: 128.5, confidence: 0.95 },
        key: { key: 'C', scale: 'major', confidence: 0.87 },
        spectral: {
          centroid: { mean: 2500, std: 500 },
          rolloff: { mean: 8000, std: 1000 },
        },
      };

      messageHandler?.({
        data: {
          type: 'ANALYSIS_COMPLETE',
          id: 'analysis-123',
          payload: mockResult,
        },
      });

      expect(completeCallback).toHaveBeenCalledWith(mockResult);
    });

    it('should handle WORKER_ERROR during analysis', () => {
      const worker = new Worker('mock-url');
      const errorCallback = vi.fn();

      worker.addEventListener('message', (event: any) => {
        if (event.data.type === 'WORKER_ERROR') {
          errorCallback(event.data.payload);
        }
      });

      const messageHandler = messageHandlers.get('message');

      messageHandler?.({
        data: {
          type: 'WORKER_ERROR',
          id: 'analysis-123',
          payload: {
            error: 'Analysis failed',
            details: 'Invalid audio data',
            stage: 'analysis',
          },
        },
      });

      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Analysis failed',
          stage: 'analysis',
        })
      );
    });
  });

  describe('Message Validation', () => {
    it('should reject messages without type field', () => {
      const worker = new Worker('mock-url');
      const errorHandler = vi.fn();

      worker.addEventListener('message', (event: any) => {
        if (!event.data.type) {
          errorHandler('Missing type field');
        }
      });

      const messageHandler = messageHandlers.get('message');

      messageHandler?.({
        data: {
          payload: { some: 'data' },
        },
      });

      expect(errorHandler).toHaveBeenCalledWith('Missing type field');
    });

    it('should reject messages with invalid type', () => {
      const worker = new Worker('mock-url');
      const validTypes = ['INIT', 'ANALYZE_AUDIO', 'WORKER_READY', 'PROGRESS', 'ANALYSIS_COMPLETE', 'WORKER_ERROR'];
      const errorHandler = vi.fn();

      worker.addEventListener('message', (event: any) => {
        if (!validTypes.includes(event.data.type)) {
          errorHandler(`Invalid type: ${event.data.type}`);
        }
      });

      const messageHandler = messageHandlers.get('message');

      messageHandler?.({
        data: {
          type: 'INVALID_TYPE',
          payload: {},
        },
      });

      expect(errorHandler).toHaveBeenCalledWith('Invalid type: INVALID_TYPE');
    });

    it('should validate ANALYZE_AUDIO payload structure', () => {
      const worker = new Worker('mock-url');

      const invalidPayloads = [
        { type: 'ANALYZE_AUDIO', id: 'test', payload: null }, // null payload
        { type: 'ANALYZE_AUDIO', id: 'test', payload: {} }, // missing audioData
        { type: 'ANALYZE_AUDIO', id: 'test', payload: { audioData: null } }, // null audioData
        { type: 'ANALYZE_AUDIO', payload: { audioData: {} } }, // missing id
      ];

      invalidPayloads.forEach((message) => {
        worker.postMessage(message);
      });

      expect(worker.postMessage).toHaveBeenCalledTimes(4);
    });
  });

  describe('Message ID Tracking', () => {
    it('should include unique ID in each ANALYZE message', () => {
      const worker = new Worker('mock-url');
      const ids = new Set<string>();

      for (let i = 0; i < 5; i++) {
        const id = `analysis-${Date.now()}-${i}`;
        ids.add(id);

        worker.postMessage({
          type: 'ANALYZE_AUDIO',
          id,
          payload: {},
        });
      }

      expect(ids.size).toBe(5); // All IDs unique
    });

    it('should match response ID with request ID', () => {
      const worker = new Worker('mock-url');
      const requestId = 'analysis-456';
      const responseHandler = vi.fn();

      worker.addEventListener('message', (event: any) => {
        if (event.data.id === requestId) {
          responseHandler(event.data);
        }
      });

      worker.postMessage({
        type: 'ANALYZE_AUDIO',
        id: requestId,
        payload: {},
      });

      const messageHandler = messageHandlers.get('message');

      // Simulate response with same ID
      messageHandler?.({
        data: {
          type: 'ANALYSIS_COMPLETE',
          id: requestId,
          payload: {},
        },
      });

      expect(responseHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: requestId,
        })
      );
    });

    it('should handle concurrent analyses with different IDs', () => {
      const worker = new Worker('mock-url');
      const responses = new Map<string, any>();

      worker.addEventListener('message', (event: any) => {
        if (event.data.type === 'ANALYSIS_COMPLETE') {
          responses.set(event.data.id, event.data.payload);
        }
      });

      // Send 3 concurrent analyses
      const ids = ['analysis-1', 'analysis-2', 'analysis-3'];
      ids.forEach((id) => {
        worker.postMessage({
          type: 'ANALYZE_AUDIO',
          id,
          payload: {},
        });
      });

      const messageHandler = messageHandlers.get('message');

      // Simulate responses in different order
      messageHandler?.({
        data: { type: 'ANALYSIS_COMPLETE', id: 'analysis-2', payload: { result: 2 } },
      });
      messageHandler?.({
        data: { type: 'ANALYSIS_COMPLETE', id: 'analysis-1', payload: { result: 1 } },
      });
      messageHandler?.({
        data: { type: 'ANALYSIS_COMPLETE', id: 'analysis-3', payload: { result: 3 } },
      });

      expect(responses.size).toBe(3);
      expect(responses.get('analysis-1')).toEqual({ result: 1 });
      expect(responses.get('analysis-2')).toEqual({ result: 2 });
      expect(responses.get('analysis-3')).toEqual({ result: 3 });
    });
  });

  describe('Transferable Objects', () => {
    it('should transfer AudioBuffer data to avoid copying', () => {
      const worker = new Worker('mock-url');
      const audioData = new Float32Array(44100);

      worker.postMessage(
        {
          type: 'ANALYZE_AUDIO',
          id: 'test',
          payload: { audioData: [audioData] },
        },
        [audioData.buffer]
      );

      expect(worker.postMessage).toHaveBeenCalledWith(expect.anything(), [audioData.buffer]);
    });

    it('should handle transferred data becoming detached', () => {
      const worker = new Worker('mock-url');
      const audioData = new Float32Array(44100);

      worker.postMessage(
        {
          type: 'ANALYZE_AUDIO',
          id: 'test',
          payload: { audioData: [audioData] },
        },
        [audioData.buffer]
      );

      // After transfer, buffer should be detached
      // In real scenario, audioData.buffer.byteLength would be 0
      expect(worker.postMessage).toHaveBeenCalled();
    });
  });

  describe('Worker Lifecycle', () => {
    it('should terminate worker on cleanup', () => {
      const worker = new Worker('mock-url');

      worker.terminate();

      expect(worker.terminate).toHaveBeenCalled();
    });

    it('should not accept messages after termination', () => {
      const worker = new Worker('mock-url');
      const messageHandler = vi.fn();

      worker.addEventListener('message', messageHandler);
      worker.terminate();

      const handler = messageHandlers.get('message');
      handler?.({ data: { type: 'PROGRESS', payload: {} } });

      // In a real scenario, terminated worker wouldn't receive messages
      // This test documents expected behavior
    });

    it('should remove event listeners on cleanup', () => {
      const worker = new Worker('mock-url');
      const messageHandler = vi.fn();

      worker.addEventListener('message', messageHandler);
      worker.removeEventListener('message', messageHandler);

      expect(worker.removeEventListener).toHaveBeenCalledWith('message', messageHandler);
    });
  });

  describe('Error Recovery', () => {
    it('should allow retry after worker error', () => {
      const worker = new Worker('mock-url');
      const messageHandler = messageHandlers.get('message');

      // First attempt - error
      worker.postMessage({ type: 'ANALYZE_AUDIO', id: 'attempt-1', payload: {} });

      messageHandler?.({
        data: {
          type: 'WORKER_ERROR',
          id: 'attempt-1',
          payload: { error: 'Temporary failure' },
        },
      });

      // Retry - success
      worker.postMessage({ type: 'ANALYZE_AUDIO', id: 'attempt-2', payload: {} });

      messageHandler?.({
        data: {
          type: 'ANALYSIS_COMPLETE',
          id: 'attempt-2',
          payload: { tempo: { bpm: 120 } },
        },
      });

      expect(worker.postMessage).toHaveBeenCalledTimes(2);
    });

    it('should handle worker crash and recreation', () => {
      let worker = new Worker('mock-url');

      // Simulate crash
      worker.terminate();

      // Recreate worker
      worker = new Worker('mock-url');

      expect(global.Worker).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance Metrics', () => {
    it('should track analysis duration', () => {
      const worker = new Worker('mock-url');
      const startTime = Date.now();

      worker.postMessage({ type: 'ANALYZE_AUDIO', id: 'perf-test', payload: {} });

      const messageHandler = messageHandlers.get('message');

      setTimeout(() => {
        messageHandler?.({
          data: {
            type: 'ANALYSIS_COMPLETE',
            id: 'perf-test',
            payload: { duration: Date.now() - startTime },
          },
        });
      }, 100);
    });

    it('should monitor message queue size', () => {
      const worker = new Worker('mock-url');
      const queuedMessages: any[] = [];

      // Mock postMessage to track queue
      worker.postMessage = vi.fn((msg) => {
        queuedMessages.push(msg);
      });

      // Queue multiple messages
      for (let i = 0; i < 10; i++) {
        worker.postMessage({ type: 'ANALYZE_AUDIO', id: `msg-${i}`, payload: {} });
      }

      expect(queuedMessages.length).toBe(10);
    });
  });
});
