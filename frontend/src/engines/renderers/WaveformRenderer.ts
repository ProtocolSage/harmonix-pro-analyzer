import { IRenderer, VisualizationPayload, VisualizerConfig } from '../../types/visualizer';

export class WaveformRenderer implements IRenderer {
  public readonly id = 'waveform';
  private path: Path2D = new Path2D();
  private gradient: CanvasGradient | null = null;

  initialize(ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, config: VisualizerConfig): void {
    // Pre-calculate expensive resources like gradients here
    // Note: Canvas dimensions might change, so resize() handles dimension-dependent resources
  }

  resize(width: number, height: number): void {
    // Invalidate cached path if bounds change
    this.path = new Path2D();
    this.gradient = null;
  }

  draw(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    data: VisualizationPayload,
    bounds: { width: number; height: number }
  ): void {
    const { width, height } = bounds;
    const { waveform } = data;
    const len = waveform.length;

    if (len === 0) return;

    ctx.clearRect(0, 0, width, height);

    // Create gradient if needed
    if (!this.gradient) {
      this.gradient = ctx.createLinearGradient(0, 0, 0, height);
      this.gradient.addColorStop(0, '#0D9488'); // Teal
      this.gradient.addColorStop(0.5, '#0EA5E9'); // Sky
      this.gradient.addColorStop(1, '#0D9488');
    }

    ctx.beginPath();
    ctx.strokeStyle = '#0EA5E9'; // Cyan phosphor
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    
    // Cyan Phosphor Glow
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#0EA5E9';

    // Draw waveform
    const sliceWidth = width / len;
    let x = 0;
    const midY = height / 2;

    for (let i = 0; i < len; i++) {
      const v = waveform[i];
      const y = midY + v * (height / 2) * 0.85; // 80% height amplitude for overlay

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();
    
    // Reset shadow for performance
    ctx.shadowBlur = 0;
  }

  destroy(): void {
    // Cleanup if needed
  }
}
