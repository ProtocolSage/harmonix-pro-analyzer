import { PerformanceMonitor, PerformanceCategory } from './PerformanceMonitor';

export interface CanvasOptimizationConfig {
  enableOffscreenCanvas: boolean;
  useWebGL: boolean;
  maxFPS: number;
  adaptiveQuality: boolean;
  memoryLimit: number; // MB
  enableCaching: boolean;
  batchOperations: boolean;
}

export interface RenderMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  droppedFrames: number;
  cacheHitRate: number;
}

export class CanvasOptimizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private offscreenCanvas: OffscreenCanvas | null = null;
  private offscreenCtx: OffscreenCanvasRenderingContext2D | null = null;
  
  private config: CanvasOptimizationConfig = {
    enableOffscreenCanvas: true,
    useWebGL: false,
    maxFPS: 60,
    adaptiveQuality: true,
    memoryLimit: 50,
    enableCaching: true,
    batchOperations: true
  };

  private frameCount = 0;
  private lastFrameTime = 0;
  private frameTimer: number | null = null;
  private droppedFrames = 0;
  private renderQueue: Array<() => void> = [];
  private cache = new Map<string, ImageData | HTMLCanvasElement>();
  private cacheStats = { hits: 0, misses: 0 };

  private metrics: RenderMetrics = {
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    droppedFrames: 0,
    cacheHitRate: 0
  };

  constructor(canvas: HTMLCanvasElement, config?: Partial<CanvasOptimizationConfig>) {
    this.canvas = canvas;
    
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.initializeCanvas();
    this.startPerformanceMonitoring();
  }

  private initializeCanvas(): void {
    const timingId = PerformanceMonitor.startTiming(
      'canvas.initialization',
      PerformanceCategory.RENDERING
    );

    try {
      // Setup main canvas context
      this.ctx = this.canvas.getContext('2d', {
        alpha: false,
        desynchronized: true,
        willReadFrequently: false
      });

      if (!this.ctx) {
        throw new Error('Failed to get 2D context');
      }

      // Setup offscreen canvas if supported and enabled
      if (this.config.enableOffscreenCanvas && 'OffscreenCanvas' in window) {
        try {
          this.offscreenCanvas = new OffscreenCanvas(this.canvas.width, this.canvas.height);
          this.offscreenCtx = this.offscreenCanvas.getContext('2d', {
            alpha: false,
            desynchronized: true
          }) as OffscreenCanvasRenderingContext2D;
        } catch (error) {
          console.warn('Offscreen canvas not available, falling back to main canvas');
          this.config.enableOffscreenCanvas = false;
        }
      }

      // Setup high-DPI support
      this.setupHighDPI();

      // Configure context for performance
      this.configureContextForPerformance();

    } finally {
      PerformanceMonitor.endTiming(timingId);
    }
  }

  private setupHighDPI(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    // Set actual canvas size
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    // Scale canvas back down using CSS
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    
    // Scale the drawing context
    this.ctx?.scale(dpr, dpr);
    
    // Update offscreen canvas if needed
    if (this.offscreenCanvas) {
      this.offscreenCanvas.width = this.canvas.width;
      this.offscreenCanvas.height = this.canvas.height;
      this.offscreenCtx?.scale(dpr, dpr);
    }
  }

  private configureContextForPerformance(): void {
    if (!this.ctx) return;

    // Optimize text rendering
    this.ctx.textBaseline = 'alphabetic';
    this.ctx.textAlign = 'start';
    
    // Set default composite operation for performance
    this.ctx.globalCompositeOperation = 'source-over';
    
    // Disable image smoothing for pixel-perfect rendering when needed
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'low';
  }

  private startPerformanceMonitoring(): void {
    let lastTime = performance.now();
    let frameCount = 0;

    const monitor = () => {
      const now = performance.now();
      frameCount++;

      // Update FPS every second
      if (now - lastTime >= 1000) {
        this.metrics.fps = (frameCount * 1000) / (now - lastTime);
        this.metrics.droppedFrames = this.droppedFrames;
        this.metrics.cacheHitRate = this.calculateCacheHitRate();
        this.metrics.memoryUsage = this.getMemoryUsage();
        
        frameCount = 0;
        lastTime = now;
        this.droppedFrames = 0;
      }

      requestAnimationFrame(monitor);
    };

    requestAnimationFrame(monitor);
  }

  private calculateCacheHitRate(): number {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    return total > 0 ? this.cacheStats.hits / total : 0;
  }

  private getMemoryUsage(): number {
    // @ts-expect-error - performance.memory is not in TypeScript lib but exists in Chrome
    if (typeof performance !== 'undefined' && performance.memory) {
      // @ts-expect-error - performance.memory is not in TypeScript lib but exists in Chrome
      return performance.memory.usedJSHeapSize / (1024 * 1024); // MB
    }
    return 0;
  }

  public optimizedClear(x = 0, y = 0, width?: number, height?: number): void {
    const ctx = this.getActiveContext();
    if (!ctx) return;

    const timingId = PerformanceMonitor.startTiming(
      'canvas.clear',
      PerformanceCategory.RENDERING
    );

    try {
      if (width === undefined) width = this.canvas.width;
      if (height === undefined) height = this.canvas.height;

      // Use clearRect for better performance than fillRect
      ctx.clearRect(x, y, width, height);
    } finally {
      PerformanceMonitor.endTiming(timingId);
    }
  }

  public optimizedDrawPath(
    pathFunction: (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => void,
    style: {
      fillStyle?: string | CanvasGradient;
      strokeStyle?: string | CanvasGradient;
      lineWidth?: number;
      globalAlpha?: number;
    },
    cacheKey?: string
  ): void {
    const ctx = this.getActiveContext();
    if (!ctx) return;

    const timingId = PerformanceMonitor.startTiming(
      'canvas.draw_path',
      PerformanceCategory.RENDERING
    );

    try {
      // Check cache first
      if (cacheKey && this.config.enableCaching) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          this.cacheStats.hits++;
          
          if (cached instanceof HTMLCanvasElement) {
            ctx.drawImage(cached, 0, 0);
          } else {
            ctx.putImageData(cached, 0, 0);
          }
          return;
        }
        this.cacheStats.misses++;
      }

      // Save context state
      ctx.save();

      // Apply styles
      if (style.fillStyle) ctx.fillStyle = style.fillStyle;
      if (style.strokeStyle) ctx.strokeStyle = style.strokeStyle;
      if (style.lineWidth) ctx.lineWidth = style.lineWidth;
      if (style.globalAlpha) ctx.globalAlpha = style.globalAlpha;

      // Execute path
      ctx.beginPath();
      pathFunction(ctx);

      // Fill and stroke
      if (style.fillStyle) ctx.fill();
      if (style.strokeStyle) ctx.stroke();

      // Cache result if requested
      if (cacheKey && this.config.enableCaching) {
        this.cacheResult(cacheKey, ctx);
      }

      // Restore context state
      ctx.restore();

    } finally {
      PerformanceMonitor.endTiming(timingId);
    }
  }

  public optimizedDrawImage(
    image: CanvasImageSource,
    dx: number,
    dy: number,
    dw?: number,
    dh?: number,
    sx = 0,
    sy = 0,
    sw?: number,
    sh?: number
  ): void {
    const ctx = this.getActiveContext();
    if (!ctx) return;

    const timingId = PerformanceMonitor.startTiming(
      'canvas.draw_image',
      PerformanceCategory.RENDERING
    );

    try {
      if (sw !== undefined && sh !== undefined && dw !== undefined && dh !== undefined) {
        // Full 9-parameter version
        ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
      } else if (dw !== undefined && dh !== undefined) {
        // 5-parameter version
        ctx.drawImage(image, dx, dy, dw, dh);
      } else {
        // 3-parameter version
        ctx.drawImage(image, dx, dy);
      }
    } finally {
      PerformanceMonitor.endTiming(timingId);
    }
  }

  public batchOperations(operations: Array<() => void>): void {
    if (!this.config.batchOperations) {
      // Execute immediately if batching disabled
      operations.forEach(op => op());
      return;
    }

    const timingId = PerformanceMonitor.startTiming(
      'canvas.batch_operations',
      PerformanceCategory.RENDERING
    );

    try {
      const ctx = this.getActiveContext();
      if (!ctx) return;

      // Save context state once
      ctx.save();

      // Execute all operations
      operations.forEach(operation => {
        try {
          operation();
        } catch (error) {
          console.error('Batch operation failed:', error);
        }
      });

      // Restore context state once
      ctx.restore();

    } finally {
      PerformanceMonitor.endTiming(timingId);
    }
  }

  public throttledRender(renderFunction: () => void): void {
    const now = performance.now();
    const frameInterval = 1000 / this.config.maxFPS;

    if (now - this.lastFrameTime >= frameInterval) {
      const frameStart = performance.now();
      
      try {
        renderFunction();
        this.frameCount++;
        this.lastFrameTime = now;
        
        this.metrics.frameTime = performance.now() - frameStart;
      } catch (error) {
        this.droppedFrames++;
        console.error('Render function failed:', error);
      }
    } else {
      // Frame dropped due to throttling
      this.droppedFrames++;
    }
  }

  public requestAnimationFrame(callback: () => void): void {
    if (this.frameTimer) {
      cancelAnimationFrame(this.frameTimer);
    }

    this.frameTimer = requestAnimationFrame(() => {
      this.throttledRender(callback);
    });
  }

  private cacheResult(key: string, ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    try {
      // Check memory limit
      if (this.metrics.memoryUsage > this.config.memoryLimit) {
        this.clearOldCacheEntries();
      }

      // Create cache entry
      const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      this.cache.set(key, imageData);

    } catch (error) {
      console.warn('Failed to cache render result:', error);
    }
  }

  private clearOldCacheEntries(): void {
    // Simple LRU: remove oldest entries
    const entries = Array.from(this.cache.entries());
    const toRemove = Math.ceil(entries.length * 0.3); // Remove 30%
    
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  private getActiveContext(): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null {
    return this.offscreenCtx || this.ctx;
  }

  public commitOffscreenCanvas(): void {
    if (this.offscreenCanvas && this.ctx) {
      const timingId = PerformanceMonitor.startTiming(
        'canvas.commit_offscreen',
        PerformanceCategory.RENDERING
      );

      try {
        // Transfer offscreen canvas to main canvas
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);
      } finally {
        PerformanceMonitor.endTiming(timingId);
      }
    }
  }

  public resize(width: number, height: number): void {
    const timingId = PerformanceMonitor.startTiming(
      'canvas.resize',
      PerformanceCategory.RENDERING
    );

    try {
      // Clear cache on resize
      if (this.config.enableCaching) {
        this.cache.clear();
        this.cacheStats = { hits: 0, misses: 0 };
      }

      // Update canvas size
      this.canvas.width = width;
      this.canvas.height = height;

      // Update offscreen canvas
      if (this.offscreenCanvas) {
        this.offscreenCanvas.width = width;
        this.offscreenCanvas.height = height;
      }

      // Reconfigure contexts
      this.configureContextForPerformance();

    } finally {
      PerformanceMonitor.endTiming(timingId);
    }
  }

  public getMetrics(): RenderMetrics {
    return { ...this.metrics };
  }

  public updateConfig(newConfig: Partial<CanvasOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize if major settings changed
    if (newConfig.enableOffscreenCanvas !== undefined) {
      this.initializeCanvas();
    }
  }

  public getConfig(): CanvasOptimizationConfig {
    return { ...this.config };
  }

  public clearCache(): void {
    this.cache.clear();
    this.cacheStats = { hits: 0, misses: 0 };
  }

  public destroy(): void {
    if (this.frameTimer) {
      cancelAnimationFrame(this.frameTimer);
      this.frameTimer = null;
    }

    this.clearCache();
    
    // Clean up contexts
    this.ctx = null;
    this.offscreenCtx = null;
    this.offscreenCanvas = null;
  }

  // Utility methods for common optimizations
  public static createOptimizedGradient(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    x0: number, y0: number, x1: number, y1: number,
    colorStops: Array<{ offset: number; color: string }>
  ): CanvasGradient {
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    colorStops.forEach(stop => {
      gradient.addColorStop(stop.offset, stop.color);
    });
    return gradient;
  }

  public static roundRect(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    x: number, y: number, width: number, height: number, radius: number
  ): void {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  public static drawOptimizedText(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    text: string,
    x: number, y: number,
    maxWidth?: number,
    style?: {
      font?: string;
      fillStyle?: string;
      textAlign?: CanvasTextAlign;
      textBaseline?: CanvasTextBaseline;
    }
  ): void {
    if (style?.font) ctx.font = style.font;
    if (style?.fillStyle) ctx.fillStyle = style.fillStyle;
    if (style?.textAlign) ctx.textAlign = style.textAlign;
    if (style?.textBaseline) ctx.textBaseline = style.textBaseline;

    if (maxWidth) {
      ctx.fillText(text, x, y, maxWidth);
    } else {
      ctx.fillText(text, x, y);
    }
  }
}