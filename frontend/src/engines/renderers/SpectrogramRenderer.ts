import { IRenderer, VisualizationPayload, VisualizerConfig } from '../../types/visualizer';

export class SpectrogramRenderer implements IRenderer {
  public readonly id = 'spectrogram';
  private tempCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
  private tempCtx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null;
  private colorMap: Uint8ClampedArray | null = null;
  
  // Throttling state
  private lastDrawTime = 0;
  private targetInterval = 1000 / 60; // Start at 60fps
  private frameCount = 0;
  private totalFrameTime = 0;

  initialize(ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, config: VisualizerConfig): void {
    // Generate color map (Heatmap)
    this.colorMap = this.generateColorMap();
    this.targetInterval = 1000 / (config.targetFps || 60);
  }

  resize(width: number, height: number): void {
    // Recreate temp canvas for double buffering if needed
    if (typeof OffscreenCanvas !== 'undefined') {
      this.tempCanvas = new OffscreenCanvas(width, height);
    } else {
      this.tempCanvas = document.createElement('canvas');
      this.tempCanvas.width = width;
      this.tempCanvas.height = height;
    }
    
    // Get context safely handling the union type
    const isOffscreen = typeof OffscreenCanvas !== 'undefined' && this.tempCanvas instanceof OffscreenCanvas;
    if (isOffscreen) {
      this.tempCtx = (this.tempCanvas as OffscreenCanvas).getContext('2d') as OffscreenCanvasRenderingContext2D;
    } else {
      this.tempCtx = (this.tempCanvas as HTMLCanvasElement).getContext('2d');
    }
  }

  draw(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    data: VisualizationPayload,
    bounds: { width: number; height: number }
  ): void {
    const now = performance.now();
    const elapsed = now - this.lastDrawTime;

    // Throttle check
    if (elapsed < this.targetInterval) return;

    const { width, height } = bounds;
    if (!this.tempCanvas || !this.tempCtx || !this.colorMap) {
      this.resize(width, height);
      return;
    }

    // 1. Shift existing image left in back-buffer
    this.tempCtx.drawImage(
      this.tempCanvas as CanvasImageSource,
      -1, 0
    );

    const startCompute = performance.now();

    // 2. Draw new column at right edge of back-buffer
    const { spectrum } = data;
    const sliceWidth = 1;
    const imageData = this.tempCtx.createImageData(sliceWidth, height);
    const buf = imageData.data; // RGBA

    const binCount = spectrum.length;
    
    for (let y = 0; y < height; y++) {
      const binIdx = Math.floor(((height - y) / height) * binCount);
      const val = spectrum[binIdx] || 0; // 0..1 magnitude

      const colorIdx = Math.min(255, Math.floor(val * 255)) * 4;
      const r = this.colorMap[colorIdx];
      const g = this.colorMap[colorIdx + 1];
      const b = this.colorMap[colorIdx + 2];
      const a = 255;

      const px = (y * sliceWidth) * 4;
      buf[px] = r;
      buf[px + 1] = g;
      buf[px + 2] = b;
      buf[px + 3] = a;
    }

    this.tempCtx.putImageData(imageData, width - 1, 0);

    // 3. Blit back to main context
    ctx.drawImage(this.tempCanvas as CanvasImageSource, 0, 0);

    this.lastDrawTime = now;

    // Dynamic Cadence Adjustment
    const computeTime = performance.now() - startCompute;
    this.totalFrameTime += computeTime;
    this.frameCount++;

    if (this.frameCount >= 30) {
      const avgCompute = this.totalFrameTime / this.frameCount;
      // If compute takes more than 10ms, drop to 30fps
      if (avgCompute > 10) {
        this.targetInterval = 1000 / 30;
      } else {
        this.targetInterval = 1000 / 60;
      }
      this.frameCount = 0;
      this.totalFrameTime = 0;
    }
  }

  private generateColorMap(): Uint8ClampedArray {
    // simple magma/inferno style map
    const map = new Uint8ClampedArray(256 * 4);
    for (let i = 0; i < 256; i++) {
      const idx = i * 4;
      map[idx] = i;     // R
      map[idx + 1] = 0; // G
      map[idx + 2] = 255 - i; // B
      map[idx + 3] = 255; // A
    }
    return map;
  }

  destroy(): void {
    this.tempCanvas = null;
    this.tempCtx = null;
  }
}
