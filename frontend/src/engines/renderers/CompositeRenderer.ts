import { IRenderer, VisualizationPayload, VisualizerConfig } from '../../types/visualizer';

/**
 * CompositeRenderer: Orchestrates multiple renderers on a single context.
 * Useful for layering spectrograms and waveform overlays.
 */
export class CompositeRenderer implements IRenderer {
  public readonly id = 'composite';
  private renderers: IRenderer[];

  constructor(renderers: IRenderer[]) {
    this.renderers = renderers;
  }

  initialize(ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, config: VisualizerConfig): void {
    this.renderers.forEach(r => r.initialize(ctx, config));
  }

  resize(width: number, height: number): void {
    this.renderers.forEach(r => r.resize(width, height));
  }

  draw(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    data: VisualizationPayload,
    bounds: { width: number; height: number }
  ): void {
    // Standard drawing order (bottom to top)
    this.renderers.forEach(r => r.draw(ctx, data, bounds));
  }

  destroy(): void {
    this.renderers.forEach(r => r.destroy());
  }
}
