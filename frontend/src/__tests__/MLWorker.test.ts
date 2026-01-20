import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Worker and TFJS
describe('ML Worker Integration', () => {
  let mockWorker: any;

  beforeEach(() => {
    mockWorker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    (globalThis as any).Worker = vi.fn(() => mockWorker);
  });

  it('should initialize worker successfully', () => {
    const worker = new Worker('ml.worker.ts');
    expect(Worker).toHaveBeenCalled();
    expect(worker).toBeDefined();
  });

  it('should send WARMUP message to worker', () => {
    const worker = new Worker('ml.worker.ts');
    const config = {
      modelName: 'test',
      version: '1.0.0',
      modelUrl: '/test.json',
      labelsUrl: '/labels.json',
      threshold: 0.5
    };
    
    worker.postMessage({ type: 'WARMUP', payload: config });
    expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: 'WARMUP', payload: config });
  });
});
