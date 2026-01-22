import { IRenderer, VisualizationPayload, VisualizerConfig } from '../../types/visualizer';

export class SpectrumRenderer implements IRenderer {
  public readonly id = 'spectrum';
  
  private readonly colors = {
    fill: 'rgba(56, 189, 248, 0.15)', // Sky-400
    stroke: '#38BDF8',
    glow: 'rgba(56, 189, 248, 0.5)',
    grid: 'rgba(255, 255, 255, 0.03)'
  };

  initialize(ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, config: VisualizerConfig): void {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  }

  resize(width: number, height: number): void {}

  draw(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    data: VisualizationPayload,
    bounds: { width: number; height: number }
  ): void {
    const { width, height } = bounds;
    const { spectrum } = data;
    if (spectrum.length === 0) return;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Logarithmic Grid
    this.drawGrid(ctx, width, height);

    // 2. Draw Spectrum Path
    ctx.beginPath();
    ctx.fillStyle = this.colors.fill;
    ctx.strokeStyle = this.colors.stroke;
    ctx.lineWidth = 1.5;
    
    // Logarithmic Mapping
    const minFreq = 20;
    const maxFreq = 20000;
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    const scale = logMax - logMin;
    
    // Sample Rate (Assumed 44.1k, ideally passed in config)
    const nyquist = 22050;
    const bins = spectrum.length;

    ctx.moveTo(0, height);

    for (let x = 0; x < width; x++) {
      const percent = x / width;
      const freq = Math.pow(10, percent * scale + logMin);
      const binIndex = Math.floor(freq * (bins / nyquist));
      const safeIndex = Math.min(Math.max(0, binIndex), bins - 1);
      
      // Magnitude is usually 0-255 from AnalyserNode
      const value = spectrum[safeIndex];
      const y = height - (value / 255) * height;
      
      ctx.lineTo(x, y);
    }

    ctx.lineTo(width, height);
    ctx.closePath();
    
    // Draw Glow
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.colors.glow;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number) {
    ctx.beginPath();
    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = 1;

    const markers = [100, 1000, 10000];
    const logMin = Math.log10(20);
    const logMax = Math.log10(20000);
    const scale = logMax - logMin;

    markers.forEach(freq => {
      const x = ((Math.log10(freq) - logMin) / scale) * width;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    });

    // Horizontal -12, -24, -48 dB lines
    [0.25, 0.5, 0.75].forEach(p => {
      ctx.moveTo(0, p * height);
      ctx.lineTo(width, p * height);
    });

    ctx.stroke();
  }

  destroy(): void {}
}
