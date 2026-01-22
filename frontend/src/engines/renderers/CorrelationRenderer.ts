import { IRenderer, VisualizationPayload, VisualizerConfig } from '../../types/visualizer';

export class CorrelationRenderer implements IRenderer {
  public readonly id = 'correlation';
  
  private readonly colors = {
    bg: 'rgba(255, 255, 255, 0.03)',
    fill: '#FFD700',      // Gold
    warn: '#EF4444',      // Red
    center: 'rgba(255, 255, 255, 0.1)'
  };

  initialize(ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, config: VisualizerConfig): void {}

  resize(width: number, height: number): void {}

  draw(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    data: VisualizationPayload,
    bounds: { width: number; height: number }
  ): void {
    const { width, height } = bounds;
    const corr = data.levels?.corr ?? 0;

    ctx.clearRect(0, 0, width, height);

    // 1. Background
    ctx.fillStyle = this.colors.bg;
    ctx.fillRect(0, 0, width, height);

    // 2. Center Line
    const midX = width / 2;
    ctx.strokeStyle = this.colors.center;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, height);
    ctx.stroke();

    // 3. Correlation Fill
    const fillWidth = (width / 2) * Math.abs(corr);
    const isWarn = corr < 0;
    
    ctx.save();
    ctx.fillStyle = isWarn ? this.colors.warn : this.colors.fill;
    ctx.shadowBlur = 8;
    ctx.shadowColor = ctx.fillStyle as string;

    if (corr >= 0) {
      ctx.fillRect(midX, 0, fillWidth, height);
    } else {
      ctx.fillRect(midX - fillWidth, 0, fillWidth, height);
    }
    
    ctx.restore();
  }

  destroy(): void {}
}
