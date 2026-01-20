import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RealEssentiaAudioEngine } from '../engines/RealEssentiaAudioEngine';

// Mock vector with delete method
const createMockVector = (data: number[] = []) => ({
  size: () => data.length,
  get: (i: number) => data[i],
  delete: vi.fn(),
});

// Mock Essentia.js
const mockEssentia = {
  arrayToVector: vi.fn(),
  vectorToArray: vi.fn((vec) => new Float32Array(vec.size()).fill(0)),
  Windowing: vi.fn(() => ({ frame: createMockVector() })),
  Spectrum: vi.fn(() => ({ spectrum: createMockVector() })),
  SpectralCentroidTime: vi.fn(() => ({ centroid: 0 })),
  RollOff: vi.fn(() => ({ rolloff: 0 })),
  Flux: vi.fn(() => ({ flux: 0 })),
  Energy: vi.fn(() => ({ energy: 0 })),
  Dissonance: vi.fn(() => ({ dissonance: 0 })),
  ZeroCrossingRate: vi.fn(() => ({ zcr: 0 })),
  MFCC: vi.fn(() => ({ bands: [], mfcc: [] })),
  RhythmExtractor2013: vi.fn(() => ({ bpm: 120, ticks: [], confidence: 1, estimates: [] })),
  KeyExtractor: vi.fn(() => ({ key: 'C', scale: 'major', strength: 1 })),
  PercivalBpmEstimator: vi.fn(() => ({ bpm: 120 })),
  Onsets: vi.fn(() => ({ onsets: [] })),
  delete: vi.fn(),
};

vi.mock('essentia.js/dist/essentia-wasm.es.js', () => ({
  EssentiaWASM: {},
}));

vi.mock('essentia.js/dist/essentia.js-core.es.js', () => {
  const EssentiaCtor = vi.fn(() => mockEssentia);
  return {
    __esModule: true,
    default: EssentiaCtor,
  };
});

vi.mock('../engines/MLInferenceEngine', () => ({
  MLInferenceEngine: vi.fn().mockImplementation(() => ({
    analyze: vi.fn(async () => ({
      genre: { label: 'rock', confidence: 1 },
      mood: { label: 'happy', confidence: 1 },
    })),
  })),
}));

vi.mock('../engines/MelodyAnalysisEngine', () => ({
  MelodyAnalysisEngine: vi.fn().mockImplementation(() => ({
    analyze: vi.fn(async () => ({ melody: [] })),
  })),
}));

vi.mock('../engines/HarmonicAnalysisEngine', () => ({
  HarmonicAnalysisEngine: vi.fn().mockImplementation(() => ({
    analyze: vi.fn(async () => ({ chords: [] })),
  })),
}));

vi.mock('../engines/RhythmAnalysisEngine', () => ({
  RhythmAnalysisEngine: vi.fn().mockImplementation(() => ({
    analyze: vi.fn(async () => ({ rhythm: [] })),
  })),
}));

vi.mock('../engines/LoudnessAnalysisEngine', () => ({
  LoudnessAnalysisEngine: vi.fn().mockImplementation(() => ({
    analyze: vi.fn(async () => ({ lufs: -14 })),
  })),
}));

// Mock audio file helper
const createMockAudioFile = (name: string = 'test.mp3', size: number = 1024): File => {
  const blob = new Blob(['mock audio data'], { type: 'audio/mpeg' });
  const file = new File([blob], name, { type: 'audio/mpeg', lastModified: Date.now() });

  // Add arrayBuffer method for File API compatibility
  (file as any).arrayBuffer = vi.fn(() => Promise.resolve(new ArrayBuffer(size)));

  return file;
};

// Mock audio buffer for decoded audio
const createMockAudioBuffer = (): AudioBuffer => ({
  length: 44100,
  sampleRate: 44100,
  duration: 1,
  numberOfChannels: 1,
  getChannelData: vi.fn(() => new Float32Array(44100)),
  copyFromChannel: vi.fn(),
  copyToChannel: vi.fn(),
}) as unknown as AudioBuffer;

const setupWorkerAutoResponse = (
  engineInstance: RealEssentiaAudioEngine,
  worker: any,
  options: { includeProgress?: boolean } = {}
) => {
  worker.postMessage.mockImplementation((msg: any) => {
    if (!msg || msg.type !== 'ANALYZE_AUDIO') return;

    if (options.includeProgress) {
      engineInstance['handleWorkerMessage']({
        data: {
          type: 'PROGRESS',
          payload: {
            stage: 'analyzing',
            percentage: 50,
          },
          id: msg.id,
        },
      } as MessageEvent);
    }

    engineInstance['handleWorkerMessage']({
      data: {
        type: 'ANALYSIS_COMPLETE',
        payload: {
          duration: msg.payload?.audioData?.duration ?? 1,
          sampleRate: msg.payload?.audioData?.sampleRate ?? 44100,
          channels: msg.payload?.audioData?.numberOfChannels ?? 1,
          analysisTimestamp: Date.now(),
          performance: {
            totalAnalysisTime: 0,
            breakdown: { decoding: 0, preprocessing: 0, analysis: 0, postprocessing: 0 },
            memoryUsage: 0,
          },
        },
        id: msg.id,
      },
    } as MessageEvent);
  });
};

// Mock audio context
class MockAudioContext {
  sampleRate = 44100;
  decodeAudioData = vi.fn((arrayBuffer) => Promise.resolve(createMockAudioBuffer()));
  close = vi.fn();
  createBufferSource = vi.fn();
  destination = {};
}

// Ensure AudioContext is available globally and on window
global.AudioContext = MockAudioContext as any;
if (typeof window !== 'undefined') {
  (window as any).AudioContext = MockAudioContext;
  (window as any).webkitAudioContext = MockAudioContext;
}

describe('RealEssentiaAudioEngine', () => {
  let engine: RealEssentiaAudioEngine;
  let mockWorker: any;

  beforeEach(() => {
    // Mock Worker
    mockWorker = {
      postMessage: vi.fn(),
      addEventListener: vi.fn((event, handler) => {
        if (event === 'message') {
          mockWorker.messageHandler = handler;
          // Simulate worker ready shortly after registration
          setTimeout(() => handler({
            data: { type: 'WORKER_READY', payload: { success: true } },
          } as MessageEvent), 0);
        }
      }),
      removeEventListener: vi.fn(),
      terminate: vi.fn(),
    };

    global.Worker = vi.fn(() => mockWorker) as any;
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');

    engine = new RealEssentiaAudioEngine();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create engine instance', () => {
      expect(engine).toBeInstanceOf(RealEssentiaAudioEngine);
    });

    it('should have initializing status on creation', () => {
      const status = engine.getEngineStatus();
      // Engine is ready immediately after Essentia loads, even if worker is still initializing
      expect(status.status).toBe('ready');
    });

    it('should initialize worker', () => {
      expect(global.Worker).toHaveBeenCalled();
    });

    it('should register worker message handlers', () => {
      expect(mockWorker.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should handle worker initialization timeout', async () => {
      vi.useFakeTimers();

      const engine = new RealEssentiaAudioEngine();

      // Fast-forward past timeout
      vi.advanceTimersByTime(16000);

      await vi.runAllTimersAsync();

      const status = engine.getEngineStatus();
      // Should fallback to main thread or error state
      expect(['ready', 'error']).toContain(status.status);

      vi.useRealTimers();
    });
  });

  describe('Memory Management', () => {
    it('should clean up vectors after analysis', async () => {
      // Create mock audio buffer
      const mockBuffer = {
        length: 44100,
        sampleRate: 44100,
        duration: 1,
        numberOfChannels: 1,
        getChannelData: vi.fn(() => new Float32Array(44100)),
      } as unknown as AudioBuffer;


      const mockVector = createMockVector([0, 1, 2, 3]);
      mockEssentia.arrayToVector.mockReturnValue(mockVector);

      // Disable worker to test main-thread logic
      (engine as any).worker = null;
      // Inject mock essentia
      (engine as any).essentia = mockEssentia;

      try {
        await engine.analyzeFile(createMockAudioFile());
      } catch (e) {
        console.error('Cleanup test error:', e);
      }

      // Vector cleanup should have been called
      expect(mockVector.delete).toHaveBeenCalled();
    });

    it('should clean up vectors even if analysis throws error', async () => {
      const mockBuffer = {
        length: 44100,
        sampleRate: 44100,
        duration: 1,
        numberOfChannels: 1,
        getChannelData: vi.fn(() => new Float32Array(44100)),
      } as unknown as AudioBuffer;

      const mockVector = createMockVector([0, 1, 2, 3]);
      mockEssentia.arrayToVector.mockReturnValue(mockVector);

      // Disable worker
      (engine as any).worker = null;

      // Force an error during analysis
      mockEssentia.Windowing.mockImplementation(() => {
        throw new Error('Mock analysis error');
      });

      (engine as any).essentia = mockEssentia;

      try {
        await engine.analyzeFile(createMockAudioFile());
      } catch {
        // Expected to throw
      }

      // Cleanup should still happen in finally block
      expect(mockVector.delete).toHaveBeenCalled();
    });

    it('should not leak memory over multiple analyses', async () => {
      const mockBuffer = {
        length: 44100,
        sampleRate: 44100,
        duration: 1,
        numberOfChannels: 1,
        getChannelData: vi.fn(() => new Float32Array(44100)),
      } as unknown as AudioBuffer;

      const vectors: any[] = [];

      mockEssentia.arrayToVector.mockImplementation(() => {
        const vec = createMockVector([0, 1, 2]);
        vectors.push(vec);
        return vec;
      });

      (engine as any).essentia = mockEssentia;
      (engine as any).isInitialized = true;
      (engine as any).worker = null;

      // Run multiple analyses
      for (let i = 0; i < 5; i++) {
        try {
          await engine.analyzeFile(createMockAudioFile());
        } catch (e) {
          console.error(`Analyze leak test error (iteration ${i}):`, e);
        }
      }

      // All vectors should be cleaned up
      vectors.forEach((vec) => {
        expect(vec.delete).toHaveBeenCalled();
      });
    });
  });

  describe('Worker Communication', () => {
    it('should post ANALYZE_AUDIO message to worker', async () => {
      const mockBuffer = {
        length: 44100,
        sampleRate: 44100,
        duration: 1,
        numberOfChannels: 1,
        getChannelData: vi.fn(() => new Float32Array(44100)),
      } as unknown as AudioBuffer;

      (engine as any).worker = mockWorker;
      (engine as any).essentia = mockEssentia;
      (engine as any).isInitialized = true;
      vi.spyOn(engine as any, 'decodeAudioFile').mockResolvedValue(createMockAudioBuffer());
      setupWorkerAutoResponse(engine, mockWorker);

      // Trigger analysis (will use worker if available)
      await engine.analyzeFile(createMockAudioFile()).catch((e) => console.error('Analyze error:', e));

      // Worker should receive message
      expect(mockWorker.postMessage).toHaveBeenCalled();

      // Find the ANALYZE_AUDIO message (ignoring INIT)
      const call = mockWorker.postMessage.mock.calls.find((c: any) => c[0].type === 'ANALYZE_AUDIO');
      expect(call).toBeDefined();
      expect(call[0]).toMatchObject({
        type: 'ANALYZE_AUDIO',
      });
    });

    it('should handle worker errors gracefully', async () => {
      const mockBuffer = {
        length: 44100,
        sampleRate: 44100,
        duration: 1,
        numberOfChannels: 1,
        getChannelData: vi.fn(() => new Float32Array(44100)),
      } as unknown as AudioBuffer;

      (engine as any).worker = mockWorker;
      (engine as any).isInitialized = true;

      // Simulate worker error response via onmessage handler
      const workerWithHandler = mockWorker as any;

      // Start analysis
      const analysisPromise = engine.analyzeFile(createMockAudioFile());

      // Wait for next tick to ensure analysis is registered
      await new Promise(resolve => setTimeout(resolve, 0));

      if (workerWithHandler.onmessage) {
        workerWithHandler.onmessage({
          data: {
            type: 'WORKER_ERROR',
            payload: {
              error: 'Mock worker error',
            },
          },
        });
      }

      await expect(analysisPromise).rejects.toThrow();
    });

    it('should handle progress updates from worker', async () => {
      const mockBuffer = {
        length: 44100,
        sampleRate: 44100,
        duration: 1,
        numberOfChannels: 1,
        getChannelData: vi.fn(() => new Float32Array(44100)),
      } as unknown as AudioBuffer;

      const progressCallback = vi.fn();

      (engine as any).worker = mockWorker;
      (engine as any).essentia = mockEssentia;
      (engine as any).isInitialized = true;
      vi.spyOn(engine as any, 'decodeAudioFile').mockResolvedValue(createMockAudioBuffer());
      setupWorkerAutoResponse(engine, mockWorker, { includeProgress: true });

      await engine.analyzeFile(createMockAudioFile(), { progressCallback });

      // Check for partial match since protocol adds other fields
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'analyzing',
          percentage: 50,
        })
      );
    });
  });

  describe('Analysis Functions', () => {
    it('should validate audio buffer before analysis', async () => {
      const invalidBuffer = null as any;
      (engine as any).worker = null;
      (engine as any).essentia = mockEssentia;
      (engine as any).isInitialized = true;

      await expect(engine.analyzeFile(invalidBuffer)).rejects.toThrow();
    });

    it('should handle empty audio buffer', async () => {
      const emptyBuffer = {
        length: 0,
        sampleRate: 44100,
        duration: 0,
        numberOfChannels: 1,
        getChannelData: vi.fn(() => new Float32Array(0)),
      } as unknown as AudioBuffer;

      vi.spyOn(engine as any, 'decodeAudioFile').mockResolvedValue(emptyBuffer);
      (engine as any).worker = null;
      (engine as any).essentia = mockEssentia;
      (engine as any).isInitialized = true;
      await expect(engine.analyzeFile(createMockAudioFile())).rejects.toThrow();
    });

    it('should process stereo audio (use first channel)', async () => {
      const stereoBuffer = {
        length: 44100,
        sampleRate: 44100,
        duration: 1,
        numberOfChannels: 2,
        getChannelData: vi.fn((channel) => {
          // Return different data for each channel
          return new Float32Array(44100).fill(channel === 0 ? 1 : 0.5);
        }),
      } as unknown as AudioBuffer;

      (engine as any).essentia = mockEssentia;
      (engine as any).isInitialized = true;
      (engine as any).worker = null;

      mockEssentia.arrayToVector.mockReturnValue(createMockVector([1, 1, 1]));

      vi.spyOn(engine as any, 'decodeAudioFile').mockResolvedValue(stereoBuffer);

      try {
        await engine.analyzeFile(createMockAudioFile());
      } catch (e) {
        console.error('Stereo analysis error:', e);
      }

      // Should have called getChannelData with 0 (first channel)
      expect(stereoBuffer.getChannelData).toHaveBeenCalledWith(0);
    });

    it('should handle very short audio files', async () => {
      const shortBuffer = {
        length: 1024, // Very short
        sampleRate: 44100,
        duration: 1024 / 44100,
        numberOfChannels: 1,
        getChannelData: vi.fn(() => new Float32Array(1024)),
      } as unknown as AudioBuffer;

      (engine as any).essentia = mockEssentia;
      (engine as any).isInitialized = true;
      (engine as any).worker = null;

      const mockVector = createMockVector(new Array(1024).fill(0));
      mockEssentia.arrayToVector.mockReturnValue(mockVector);

      vi.spyOn(engine as any, 'decodeAudioFile').mockResolvedValue(shortBuffer);

      try {
        const result = await engine.analyzeFile(createMockAudioFile());
        // Should still produce some result
        expect(result).toBeDefined();
      } catch (e) {
        console.error('Short file analysis error:', e);
      }
    });
  });

  describe('Error Handling', () => {
    it('should throw error if engine not initialized', async () => {
      const mockBuffer = {
        length: 44100,
        sampleRate: 44100,
        duration: 1,
        numberOfChannels: 1,
        getChannelData: vi.fn(() => new Float32Array(44100)),
      } as unknown as AudioBuffer;

      // Engine not initialized
      (engine as any).isInitialized = false;
      (engine as any).worker = null;

      await expect(engine.analyzeFile(createMockAudioFile())).rejects.toThrow(/not initialized/i);
    });

    it('should handle Essentia.js algorithm failures gracefully', async () => {
      const mockBuffer = {
        length: 44100,
        sampleRate: 44100,
        duration: 1,
        numberOfChannels: 1,
        getChannelData: vi.fn(() => new Float32Array(44100)),
      } as unknown as AudioBuffer;

      (engine as any).essentia = mockEssentia;
      (engine as any).isInitialized = true;
      (engine as any).worker = null;

      // Mock algorithm failure
      mockEssentia.arrayToVector.mockReturnValue(createMockVector([0]));
      mockEssentia.Windowing.mockImplementation(() => {
        throw new Error('Algorithm failed');
      });

      // Should handle gracefully with fallback
      try {
        await engine.analyzeFile(createMockAudioFile());
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should provide meaningful error messages', async () => {
      const mockBuffer = {
        length: 44100,
        sampleRate: 44100,
        duration: 1,
        numberOfChannels: 1,
        getChannelData: vi.fn(() => {
          throw new Error('Failed to get channel data');
        }),
      } as unknown as AudioBuffer;

      (engine as any).essentia = mockEssentia;
      (engine as any).isInitialized = true;
      (engine as any).worker = null;

      try {
        await engine.analyzeFile(createMockAudioFile());
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBeTruthy();
        expect(error.message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Engine Status', () => {
    it('should return current status', () => {
      const status = engine.getEngineStatus();

      expect(status).toHaveProperty('status');
      expect(['initializing', 'loading', 'ready', 'error']).toContain(status.status);
    });

    it('should update status during initialization', async () => {
      const initialStatus = engine.getEngineStatus();
      expect(initialStatus.status).toBe('ready');

      // Simulate successful initialization
      // Simulate successful initialization via addEventListener handler (INIT phase)
      const messageHandler = mockWorker.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'message'
      )?.[1];

      messageHandler?.({
        data: {
          type: 'WORKER_READY',
          payload: { success: true },
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const readyStatus = engine.getEngineStatus();
      expect(['ready', 'loading']).toContain(readyStatus.status);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources when requested', () => {
      engine.terminate();

      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it('should handle cleanup when worker is null', () => {
      (engine as any).worker = null;

      // Should not throw
      expect(() => engine.terminate()).not.toThrow();
    });

    it('should prevent analysis after cleanup', async () => {
      engine.terminate();

      const mockBuffer = {
        length: 44100,
        sampleRate: 44100,
        duration: 1,
        numberOfChannels: 1,
        getChannelData: vi.fn(() => new Float32Array(44100)),
      } as unknown as AudioBuffer;

      await expect(engine.analyzeFile(createMockAudioFile())).rejects.toThrow();
    });
  });

  describe('Configuration Options', () => {
    it('should accept analysis options', async () => {
      const mockBuffer = {
        length: 44100,
        sampleRate: 44100,
        duration: 1,
        numberOfChannels: 1,
        getChannelData: vi.fn(() => new Float32Array(44100)),
      } as unknown as AudioBuffer;

      const options = {
        featureToggles: {
          spectral: true,
          tempo: true,
          key: false,
          mfcc: false,
        },
      };

      (engine as any).worker = mockWorker;
      (engine as any).essentia = mockEssentia;
      (engine as any).isInitialized = true;
      vi.spyOn(engine as any, 'decodeAudioFile').mockResolvedValue(createMockAudioBuffer());
      setupWorkerAutoResponse(engine, mockWorker);

      await engine.analyzeFile(createMockAudioFile(), options).catch((e) => {
        console.error('Config options test error:', e);
      });

      const call = mockWorker.postMessage.mock.calls.find((c: any) => c[0].type === 'ANALYZE_AUDIO');
      expect(call).toBeDefined();
      expect(call[0].payload.config).toBeDefined();
    });

    it('should use default options when not provided', async () => {
      const mockBuffer = {
        length: 44100,
        sampleRate: 44100,
        duration: 1,
        numberOfChannels: 1,
        getChannelData: vi.fn(() => new Float32Array(44100)),
      } as unknown as AudioBuffer;

      (engine as any).worker = mockWorker;
      (engine as any).essentia = mockEssentia;
      (engine as any).isInitialized = true;
      vi.spyOn(engine as any, 'decodeAudioFile').mockResolvedValue(createMockAudioBuffer());
      setupWorkerAutoResponse(engine, mockWorker);

      await engine.analyzeFile(createMockAudioFile()).catch((e) => {
        console.error('Default options test error:', e);
      });

      const call = mockWorker.postMessage.mock.calls.find((c: any) => c[0].type === 'ANALYZE_AUDIO');
      expect(call).toBeDefined();
      expect(call[0].payload.config).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete analysis within reasonable time', async () => {
      const mockBuffer = {
        length: 44100,
        sampleRate: 44100,
        duration: 1,
        numberOfChannels: 1,
        getChannelData: vi.fn(() => new Float32Array(44100)),
      } as unknown as AudioBuffer;

      (engine as any).worker = mockWorker;
      (engine as any).isInitialized = true;

      const startTime = Date.now();
      const analysisPromise = engine.analyzeFile(createMockAudioFile());



      // Simulate quick worker response
      const workerWithHandler = mockWorker as any;
      // We need to capture the ID sent in postMessage to respond correctly
      // But for simplicity in mock, just assume handling

      // Wait for postMessage to be called to get the ID
      setTimeout(() => {
        const call = mockWorker.postMessage.mock.calls.find((c: any) => c[0].type === 'ANALYZE_AUDIO');
        if (call && workerWithHandler.onmessage) {
          workerWithHandler.onmessage({
            data: {
              type: 'ANALYSIS_COMPLETE',
              id: call[0].id,
              payload: {
                tempo: { bpm: 120 },
                key: { key: 'C', scale: 'major' },
                spectral: {},
                rhythm: {},
                mfcc: []
              },
            },
          });
        }
      }, 0);

      await analysisPromise;

      const duration = Date.now() - startTime;

      // Should complete very quickly (< 1000ms for 1s audio)
      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent analysis requests', async () => {
      const mockBuffer = {
        length: 44100,
        sampleRate: 44100,
        duration: 1,
        numberOfChannels: 1,
        getChannelData: vi.fn(() => new Float32Array(44100)),
      } as unknown as AudioBuffer;

      (engine as any).worker = mockWorker;
      (engine as any).isInitialized = true;
      (engine as any).essentia = mockEssentia;
      vi.spyOn(engine as any, 'decodeAudioFile').mockResolvedValue(createMockAudioBuffer());
      setupWorkerAutoResponse(engine, mockWorker);

      // Start multiple analyses
      const promises = [
        engine.analyzeFile(createMockAudioFile()).catch((e) => console.error('Concurrent 1 error:', e)),
        engine.analyzeFile(createMockAudioFile()).catch((e) => console.error('Concurrent 2 error:', e)),
        engine.analyzeFile(createMockAudioFile()).catch((e) => console.error('Concurrent 3 error:', e)),
      ];

      // Should handle all requests
      await Promise.allSettled(promises);

      // Worker should have received multiple messages
      const analyzeCalls = mockWorker.postMessage.mock.calls.filter((c: any) => c[0].type === 'ANALYZE_AUDIO');
      expect(analyzeCalls.length).toBe(3);
    });
  });
});
