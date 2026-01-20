import { IRenderer, VisualizationPayload, VisualizerConfig } from '../../types/visualizer';

export class VUMeterRenderer implements IRenderer {
  public readonly id = 'vu-meter';

  initialize(ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, config: VisualizerConfig): void {}

  resize(width: number, height: number): void {}

  draw(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    data: VisualizationPayload,
    bounds: { width: number; height: number }
  ): void {
    const { width, height } = bounds;
    const { energy } = data; // energy.rms (0..1)

    ctx.clearRect(0, 0, width, height);

    // Draw background track
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, width, height);

    // Draw RMS Level
    const levelHeight = energy.rms * height;
    
    // Gradient color based on level
    let color = '#10B981'; // Green
    if (energy.rms > 0.7) color = '#F59E0B'; // Amber
    if (energy.rms > 0.9) color = '#EF4444'; // Red

    ctx.fillStyle = color;
    ctx.fillRect(0, height - levelHeight, width, levelHeight);
  }

  destroy(): void {}
}
