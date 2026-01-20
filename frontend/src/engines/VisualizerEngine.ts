import { 
  VisualizerConfig, 
  VisualizationPayload, 
  VisualizerState, 
  DataBridgeMode, 
  IRenderer 
} from '../types/visualizer';
import { VisualizerBridge } from '../utils/VisualizerBridge';

/**
 * DataBridge: Manages the high-speed data transfer from Worker to Main Thread.
 * Implements the "Zero-Copy Optimistic" strategy with backpressure.
 */
class DataInboundBridge {
  private queue: VisualizationPayload[] = [];
  private readonly MAX_QUEUE_SIZE = 3;
  private mode: DataBridgeMode = 'copy';

  constructor() {
    this.detectCapabilities();
  }

  private detectCapabilities() {
    // Check for SharedArrayBuffer support (requires COOP/COEP headers)
    if (typeof SharedArrayBuffer !== 'undefined' && window.crossOriginIsolated) {
      this.mode = 'shared';
    } else {
      this.mode = 'transferable';
    }
    console.log(`[DataBridge] Initialized in mode: ${this.mode}`);
  }

  public getMode(): DataBridgeMode {
    return this.mode;
  }

  /**
   * Ingest a new data packet.
   * Implements strict backpressure: Drops oldest frame if queue is full.
   */
  public push(packet: VisualizationPayload) {
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      // Drop the oldest frame (Backpressure)
      // In a real ring buffer, we'd overwrite. Here we shift array.
      this.queue.shift();
    }
    this.queue.push(packet);
  }

  /**
   * Retrieve the latest available frame.
   * Returns null if queue is empty.
   */
  public shift(): VisualizationPayload | undefined {
    return this.queue.shift();
  }

  /**
   * Check queue depth for telemetry/degradation logic.
   */
  public getDepth(): number {
    return this.queue.length;
  }

  public clear() {
    this.queue = [];
  }
}

/**
 * VisualizerEngine: The Main Thread Orchestrator.
 * Manages the rAF loop, degradation logic, and renderer delegation.
 */
export class VisualizerEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private inboundBridge: DataInboundBridge;
  private outboundBridge: VisualizerBridge | null = null;
  private state: VisualizerState = 'stopped';
  private animationId: number | null = null;
  private activeRenderer: IRenderer | null = null;
  
  // Worker
  private worker: Worker | null = null;
  private mode: 'main' | 'worker' = 'main';

  // Configuration & Degradation
  private config: VisualizerConfig;
  private isLiteMode = false;
  private consecutiveSlowFrames = 0;
  private readonly SLOW_FRAME_THRESHOLD_MS = 3;
  private readonly DEGRADATION_TRIGGER_COUNT = 3; // Degrade after 3 bad frames

  constructor(initialConfig?: Partial<VisualizerConfig>) {
    this.inboundBridge = new DataInboundBridge();
    this.config = {
      targetFps: 60,
      maxPayloadFps: 45,
      fftSize: 2048,
      waveformBins: 1024,
      smoothing: 0.8,
      useWorker: true,
      debug: false,
      ...initialConfig
    };
  }

  public init(canvas: HTMLCanvasElement, renderer: IRenderer | string[]) {
    this.canvas = canvas;
    
    let rendererId: string | string[];
    if (Array.isArray(renderer)) {
      rendererId = renderer;
      this.activeRenderer = null; 
    } else {
      this.activeRenderer = renderer;
      rendererId = renderer.id;
    }

    const supportsOffscreen = !!canvas.transferControlToOffscreen;

    if (this.config.useWorker && supportsOffscreen) {
      try {
        const offscreen = canvas.transferControlToOffscreen();
        this.worker = new Worker(new URL('../workers/visualization.worker.ts', import.meta.url), { type: 'module' });
        
        this.worker.postMessage({ 
          type: 'INIT', 
          payload: { 
            canvas: offscreen, 
            config: this.config, 
            rendererId: rendererId 
          } 
        }, [offscreen]);
        
        this.worker.onerror = (err) => {
          console.error('[VisualizerEngine] Worker crashed:', err);
          this.mode = 'main';
          this.state = 'error';
        };
        
        this.mode = 'worker';
        console.log('[VisualizerEngine] Initialized in WORKER mode');
        
        // Initialize outbound bridge if in worker mode
        this.outboundBridge = new VisualizerBridge(this.worker, this.config);
        
        return;
      } catch (e) {
        console.warn('[VisualizerEngine] Worker init failed, falling back to main thread', e);
      }
    }

    // Fallback to Main Thread
    this.mode = 'main';
    this.ctx = canvas.getContext('2d', { 
      alpha: false,
      desynchronized: true
    }) as CanvasRenderingContext2D;
    
    if (this.activeRenderer) {
      this.activeRenderer.initialize(this.ctx, this.config);
    }
    
    if (this.config.debug) {
      console.log('[VisualizerEngine] Initialized', { 
        bridge: this.inboundBridge.getMode(),
        renderer: rendererId,
        mode: this.mode
      });
    }
  }

  public connect(analyser: AnalyserNode) {
    if (this.outboundBridge) {
      this.outboundBridge.connect(analyser);
    } else {
      // In main thread mode, we'd need a local bridge or just direct tap
      console.warn('[VisualizerEngine] Local analyser tap not yet implemented for main thread');
    }
  }

  public start() {
    if (this.state === 'running') return;
    this.state = 'running';
    this.inboundBridge.clear();
    
    if (this.outboundBridge) {
      this.outboundBridge.start();
    }
    
    if (this.mode === 'main') {
      this.loop();
    }
  }

  public stop() {
    this.state = 'stopped';
    if (this.outboundBridge) {
      this.outboundBridge.stop();
    }
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Ingest data from external source (Worker).
   */
  public feed(packet: VisualizationPayload) {
    if (this.mode === 'worker' && this.worker) {
      this.worker.postMessage({ 
        type: 'DATA', 
        payload: { data: packet } 
      });
    } else {
      this.inboundBridge.push(packet);
    }
  }

  public resize(width: number, height: number) {
    if (this.mode === 'worker' && this.worker) {
      this.worker.postMessage({
        type: 'RESIZE',
        payload: { width, height }
      });
    } else if (this.activeRenderer) {
      this.activeRenderer.resize(width, height);
    }
  }

  private loop = () => {
    if (this.state !== 'running' || !this.ctx || !this.activeRenderer || !this.canvas) return;

    this.animationId = requestAnimationFrame(this.loop);

    // 1. Get Data
    const packet = this.inboundBridge.shift();
    if (!packet) return; 

    // 2. Measure Frame Time
    performance.mark('visualizer-draw-start');
    const start = performance.now();

    // 3. Draw
    const bounds = { width: this.canvas.width, height: this.canvas.height };
    this.activeRenderer.draw(this.ctx, packet, bounds);

    const duration = performance.now() - start;
    performance.mark('visualizer-draw-end');
    performance.measure('visualizer-draw', 'visualizer-draw-start', 'visualizer-draw-end');

    // 4. Adaptive Degradation Logic
    this.checkBudget(duration);
  };

  private checkBudget(duration: number) {
    if (duration > 10) {
      console.warn(`[VisualizerEngine] Critical slow frame: ${duration.toFixed(2)}ms`);
    }

    if (duration > this.SLOW_FRAME_THRESHOLD_MS) {
      this.consecutiveSlowFrames++;
      
      if (this.config.debug) {
        console.warn(`[VisualizerEngine] Slow frame: ${duration.toFixed(2)}ms`);
      }

      if (this.consecutiveSlowFrames > this.DEGRADATION_TRIGGER_COUNT && !this.isLiteMode) {
        this.enableLiteMode();
      }
    } else {
      this.consecutiveSlowFrames = Math.max(0, this.consecutiveSlowFrames - 1);
    }
  }

  private enableLiteMode() {
    console.warn('[VisualizerEngine] Budget exceeded. Engaging Lite Mode.');
    this.isLiteMode = true;
    this.state = 'degraded';
    
    // Apply Lite settings
    this.config.targetFps = 30;
    this.config.fftSize = 512;
    this.config.waveformBins = 256;
    
    // Re-init renderer with new config
    if (this.ctx && this.activeRenderer) {
      this.activeRenderer.initialize(this.ctx, this.config);
    }
  }

  public destroy() {
    this.stop();
    if (this.activeRenderer) {
      this.activeRenderer.destroy();
    }
    this.inboundBridge.clear();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  public setSyncBridge(bridge: { type: 'sab'; buffer: SharedArrayBuffer } | { type: 'channel'; port: MessagePort }) {
    if (this.mode === 'worker' && this.worker) {
      if (bridge.type === 'sab') {
        this.worker.postMessage({
          type: 'SET_SYNC_BRIDGE',
          payload: { type: 'sab', buffer: bridge.buffer }
        });
      } else {
        this.worker.postMessage({
          type: 'SET_SYNC_BRIDGE',
          payload: { type: 'channel', port: bridge.port }
        }, [bridge.port]);
      }
    }
  }
  
  // Test hooks
  public getBridgeMode() { return this.inboundBridge.getMode(); }
  public getQueueDepth() { return this.inboundBridge.getDepth(); }
  public isDegraded() { return this.isLiteMode; }
}
