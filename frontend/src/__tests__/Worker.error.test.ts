import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RealEssentiaAudioEngine } from '../engines/RealEssentiaAudioEngine';

// Mock dependencies
vi.mock('essentia.js/dist/essentia-wasm.es.js', () => ({
  EssentiaWASM: {},
}));

const mockEssentia = {
  arrayToVector: vi.fn(),
  vectorToArray: vi.fn(),
  delete: vi.fn(),
};

vi.mock('essentia.js/dist/essentia.js-core.es.js', () => {
  return {
    __esModule: true,
    default: vi.fn(() => mockEssentia),
  };
});

vi.mock('../engines/MLInferenceEngine', () => ({
  MLInferenceEngine: vi.fn().mockImplementation(() => ({ analyze: vi.fn() })),
}));
vi.mock('../engines/MelodyAnalysisEngine', () => ({
  MelodyAnalysisEngine: vi.fn().mockImplementation(() => ({ analyze: vi.fn() })),
}));
vi.mock('../engines/HarmonicAnalysisEngine', () => ({
  HarmonicAnalysisEngine: vi.fn().mockImplementation(() => ({ analyze: vi.fn() })),
}));
vi.mock('../engines/RhythmAnalysisEngine', () => ({
  RhythmAnalysisEngine: vi.fn().mockImplementation(() => ({ analyze: vi.fn() })),
}));
vi.mock('../engines/LoudnessAnalysisEngine', () => ({
  LoudnessAnalysisEngine: vi.fn().mockImplementation(() => ({ analyze: vi.fn() })),
}));

// Test helpers
const createMockAudioFile = () => {
  const file = new File([''], 'test.mp3', { type: 'audio/mpeg' });
  (file as any).arrayBuffer = vi.fn(() => Promise.resolve(new ArrayBuffer(1024)));
  return file;
};

const createMockAudioBuffer = () => ({
  length: 44100,
  sampleRate: 44100,
  duration: 1,
  numberOfChannels: 1,
  getChannelData: vi.fn(() => new Float32Array(44100)),
} as unknown as AudioBuffer);

// Mock AudioContext
class MockAudioContext {
  sampleRate = 44100;
  decodeAudioData = vi.fn((buf) => Promise.resolve(createMockAudioBuffer()));
  close = vi.fn();
}
(globalThis as any).AudioContext = MockAudioContext;
(globalThis as any).window = globalThis;
(globalThis as any).window.AudioContext = MockAudioContext;

describe('Worker Stability Regression Tests', () => {
  let engine: RealEssentiaAudioEngine;
  let mockWorker: any;

  beforeEach(() => {
    mockWorker = {
      postMessage: vi.fn(),
      addEventListener: vi.fn((event, handler) => {
        if (event === 'message') {
          mockWorker.messageHandler = handler;
        }
      }),
      removeEventListener: vi.fn(),
      terminate: vi.fn(),
      // Allow onmessage assignment
      set onmessage(handler: any) {
        this._onmessage = handler;
      },
      get onmessage() {
        return this._onmessage;
      }
    };
    (globalThis as any).Worker = vi.fn(() => mockWorker);
    (globalThis as any).URL.createObjectURL = vi.fn(() => 'blob:mock');

    engine = new RealEssentiaAudioEngine();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle WORKER_ERROR during initialization gracefully', async () => {
    // 1. Setup init listener failure
    mockWorker.addEventListener.mockImplementation((event: string, handler: Function) => {
      if (event === 'message') {
        // Trigger initialization error immediately
        handler({
          data: {
            type: 'WORKER_ERROR',
            payload: { error: 'Failed to load WASM' }
          }
        });
      }
    });

    // 2. Expect engine status to reflect error (or fallback if implemented)
    // The engine constructor is async in its init, so we check status after a tick
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Engine might fallback to main thread or stay in error state
    // We want to ensure it doesn't crash
    const status = engine.getEngineStatus();
    expect(status.status).not.toBe('initializing'); 
  });

  it('should cleanup active analysis if worker sends WORKER_ERROR during processing', async () => {
    // 1. Successful init
    mockWorker.addEventListener.mockImplementation((event: string, handler: Function) => {
      if (event === 'message') {
        mockWorker.messageHandler = handler;
        handler({ data: { type: 'WORKER_READY', payload: { success: true } } });
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 50));
    (engine as any).isInitialized = true; // Force ready state
    vi.spyOn(engine as any, 'decodeAudioFile').mockResolvedValue(createMockAudioBuffer());

    // 2. Start analysis
    const analysisPromise = engine.analyzeFile(createMockAudioFile());

    // Wait for analysis to register (postMessage called)
    await new Promise(resolve => setTimeout(resolve, 0));

    // 3. Simulate critical worker error
    // Use onmessage since engine assigns it directly
    if (mockWorker.onmessage) {
      mockWorker.onmessage({
        data: {
          type: 'WORKER_ERROR',
          payload: { error: 'Worker crashed (OOM)' }
        }
      });
    }

    // 4. Expect promise rejection
    await expect(analysisPromise).rejects.toThrow('Worker crashed (OOM)');
  });

  it('should reject analysis promise on specific ANALYSIS_ERROR', async () => {
    // 1. Successful init
    mockWorker.addEventListener.mockImplementation((event: string, handler: Function) => {
      if (event === 'message') {
        // init uses addEventListener
        handler({ data: { type: 'WORKER_READY', payload: { success: true } } });
      }
    });

    await new Promise(resolve => setTimeout(resolve, 50));
    (engine as any).isInitialized = true;
    vi.spyOn(engine as any, 'decodeAudioFile').mockResolvedValue(createMockAudioBuffer());

    // 2. Start analysis
    const analysisPromise = engine.analyzeFile(createMockAudioFile());

    // Wait for next tick to ensure postMessage is called
    await new Promise(resolve => setTimeout(resolve, 0));

    // 3. Capture the ID sent to worker
    const call = mockWorker.postMessage.mock.calls.find((c: any) => c[0].type === 'ANALYZE_AUDIO');
    const analysisId = call[0].id;

    // 4. Simulate specific analysis error
    if (mockWorker.onmessage) {
      mockWorker.onmessage({
        data: {
          type: 'ANALYSIS_ERROR',
          id: analysisId,
          payload: { error: 'Corrupt audio data' }
        }
      });
    }

    // 5. Expect rejection
    await expect(analysisPromise).rejects.toThrow('Corrupt audio data');
  });
});
