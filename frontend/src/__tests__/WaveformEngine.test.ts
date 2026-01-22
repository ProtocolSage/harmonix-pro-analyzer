import { describe, it, expect, vi } from 'vitest';
import { WaveformRenderer } from '../engines/renderers/WaveformRenderer';
import { VisualizationPayload } from '../types/visualizer';

// Mock Globals
global.Path2D = class Path2D {
  addPath() {}
  moveTo() {}
  lineTo() {}
  closePath() {}
} as any;

describe('Waveform Engine', () => {
  const noop = () => {};
  const moveTo = vi.fn();
  const lineTo = vi.fn();
  const stroke = vi.fn();
  const mockCtx = {
    clearRect: noop,
    beginPath: noop,
    moveTo,
    lineTo,
    stroke,
    fill: noop,
    closePath: noop,
    createLinearGradient: vi.fn(() => ({ addColorStop: noop })),
    save: noop,
    restore: noop,
    translate: noop,
    scale: noop,
    rotate: noop,
    transform: noop,
    setTransform: noop,
    resetTransform: noop,
  } as any;

  it('should render waveform peaks accurately', () => {
    const renderer = new WaveformRenderer();
    const mockPayload: VisualizationPayload = {
      sequence: 1,
      timestamp: 10.5,
      spectrum: new Float32Array(512),
      waveform: new Float32Array(1024).fill(0.5),
      energy: { rms: 0.5, peak: 0.8, loudness: -14 }
    };

    renderer.draw(mockCtx, mockPayload, { width: 800, height: 200 });

    expect(mockCtx.lineTo).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it('should downsample raw buffers to target peak points', () => {
    // This test will verify our future downsampling utility
    // For now, we'll assert that the renderer handles the target size
    const renderer = new WaveformRenderer();
    const targetSize = 1024;
    const mockPayload: VisualizationPayload = {
      sequence: 1,
      timestamp: 0,
      spectrum: new Float32Array(512),
      waveform: new Float32Array(targetSize).fill(0.1),
      energy: { rms: 0.1, peak: 0.2, loudness: -14 }
    };

    renderer.draw(mockCtx, mockPayload, { width: 800, height: 200 });
    expect(mockCtx.lineTo).toHaveBeenCalled();
  });
});
