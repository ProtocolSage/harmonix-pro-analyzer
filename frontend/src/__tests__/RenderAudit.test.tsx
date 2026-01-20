import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { useVisualizer } from '../hooks/useVisualizer';
import { VisualizationPayload } from '../types/visualizer';

// Mock Canvas
(globalThis as any).HTMLCanvasElement.prototype.getContext = vi.fn(() => ({}));

// Mock Path2D and OffscreenCanvas
global.Path2D = class Path2D {
  addPath() {}
  moveTo() {}
  lineTo() {}
  closePath() {}
} as any;

global.OffscreenCanvas = class OffscreenCanvas {
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  width: number;
  height: number;
  getContext() { return {}; }
} as any;

// Component that logs renders
let renderCount = 0;
function TestComponent() {
  const { canvasRef, feed } = useVisualizer();
  renderCount++;
  
  // Expose feed for testing
  (globalThis as any).testFeed = feed;

  return <canvas ref={canvasRef} />;
}

const createPayload = (seq: number): VisualizationPayload => ({
  sequence: seq,
  timestamp: 0,
  spectrum: new Float32Array(10),
  waveform: new Float32Array(10),
  energy: { rms: 0, peak: 0, loudness: 0 }
});

describe('Render Audit', () => {
  it('should NOT re-render React component when feeding data', () => {
    renderCount = 0;
    render(<TestComponent />);
    
    expect(renderCount).toBe(1); // Initial render

    const feed = (globalThis as any).testFeed;
    
    // Simulate high-frequency updates
    for (let i = 0; i < 100; i++) {
      feed(createPayload(i));
    }

    // Should still be 1
    expect(renderCount).toBe(1);
  });
});
