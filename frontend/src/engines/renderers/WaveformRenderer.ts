import { IRenderer, VisualizationPayload, VisualizerConfig } from '../../types/visualizer';

export class WaveformRenderer implements IRenderer {
  public readonly id = 'waveform';

  private backgroundPath: Path2D | null = null;
  private lastWaveformData: Float32Array | null = null;

  private readonly colors = {
    waveDim: 'rgba(14, 165, 233, 0.15)',   // Sky-500 very dim
    waveActive: '#0EA5E9',                 // Sky-500
    playhead: '#FFD700',                   // Gold
    playheadGlow: 'rgba(255, 215, 0, 0.6)',
    activeGlow: 'rgba(14, 165, 233, 0.8)',
    reflection: 'rgba(14, 165, 233, 0.05)',
    gridLine: 'rgba(255, 255, 255, 0.03)',
    tickLine: 'rgba(255, 255, 255, 0.1)'
  };

  initialize(ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, config: VisualizerConfig): void {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  }

  resize(width: number, height: number): void {
    this.backgroundPath = null;
  }

  private generatePaths(data: Float32Array, width: number, height: number): void {
    const path = new Path2D();
    const step = Math.max(1, Math.floor(data.length / width));
    const amp = height / 2;
    const midY = height / 2;

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;

      // Peak-preserving decimation
      for (let j = 0; j < step; j++) {
        const idx = i * step + j;
        if (idx >= data.length) break;
        const v = data[idx];
        if (v < min) min = v;
        if (v > max) max = v;
      }

      const x = i;
      const y1 = midY + min * amp * 0.75;
      const y2 = midY + max * amp * 0.75;

      path.moveTo(x, y1);
      path.lineTo(x, y2);
    }

    this.backgroundPath = path;
    this.lastWaveformData = data;
  }

  draw(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    data: VisualizationPayload,
    bounds: { width: number; height: number }
  ): void {
    const { width, height } = bounds;
    const { waveform } = data;
    const progress = (data as any).progress ?? 0;
    const progressX = progress * width;

    if (!this.backgroundPath || this.lastWaveformData !== waveform) {
      this.generatePaths(waveform, width, height);
    }

    // Clear Stage
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Subtle Grid
    this.drawGrid(ctx, width, height);

    // 2. Draw Reflection (The Glass Floor)
    (ctx as any).save?.();
    ctx.translate(0, height * 1.4); // Position below main wave
    ctx.scale(1, -0.4); // Invert and squash
    ctx.strokeStyle = this.colors.reflection;
    ctx.lineWidth = 1;
    ctx.stroke(this.backgroundPath!);
    (ctx as any).restore?.();

    // 3. Draw Background (Inactive) Waveform
    ctx.beginPath();
    ctx.strokeStyle = this.colors.waveDim;
    ctx.lineWidth = 1;
    ctx.stroke(this.backgroundPath!);

    // 4. Draw Foreground (Active) Waveform with Glow
    if (progressX > 0) {
      (ctx as any).save?.();
      // Clip to progress
      ctx.beginPath();
      ctx.rect(0, 0, progressX, height);
      ctx.clip();

      // Outer Glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.colors.activeGlow;
      ctx.strokeStyle = this.colors.waveActive;
      ctx.lineWidth = 2;
      ctx.stroke(this.backgroundPath!);

      // Inner High-Intensity Core
      ctx.shadowBlur = 4;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 0.5;
      ctx.stroke(this.backgroundPath!);

      (ctx as any).restore?.();
    }

    // 5. Draw Luxury Playhead
    this.drawPlayhead(ctx, progressX, height);
  }

  private drawGrid(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number) {
    (ctx as any).save?.();
    ctx.beginPath();
    ctx.strokeStyle = this.colors.gridLine;
    ctx.lineWidth = 1;

    // Vertical subdivision grid
    for (let i = 1; i < 20; i++) {
      const x = (i / 20) * width;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }

    // Horizontal zero-crossing line
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Stronger ticks every 10%
    ctx.beginPath();
    ctx.strokeStyle = this.colors.tickLine;
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 10);
      ctx.moveTo(x, height - 10);
      ctx.lineTo(x, height);
    }
    ctx.stroke();
    (ctx as any).restore?.();
  }

  private drawPlayhead(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, x: number, height: number) {
    (ctx as any).save?.();

    // Playhead Line
    ctx.beginPath();
    ctx.strokeStyle = this.colors.playhead;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 20;
    ctx.shadowColor = this.colors.playheadGlow;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();

    // "Jewel" Tips
    ctx.fillStyle = this.colors.playhead;
    ctx.shadowBlur = 10;

    // Top diamond
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 4, -6);
    ctx.lineTo(x, -12);
    ctx.lineTo(x + 4, -6);
    ctx.closePath();
    ctx.fill();

    // Bottom diamond
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(x - 4, height + 6);
    ctx.lineTo(x, height + 12);
    ctx.lineTo(x + 4, height + 6);
    ctx.closePath();
    ctx.fill();

    (ctx as any).restore?.();
  }

  destroy(): void { }
}
