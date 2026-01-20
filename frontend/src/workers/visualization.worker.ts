import { VisualizerConfig, VisualizationPayload, IRenderer } from '../types/visualizer';
import { WaveformRenderer } from '../engines/renderers/WaveformRenderer';
import { SpectrogramRenderer } from '../engines/renderers/SpectrogramRenderer';
import { VUMeterRenderer } from '../engines/renderers/VUMeterRenderer';
import { CompositeRenderer } from '../engines/renderers/CompositeRenderer';

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let activeRenderer: IRenderer | null = null;
let config: VisualizerConfig | null = null;
let renderers: Map<string, IRenderer> = new Map();

// Sync Bridge State
let syncBuffer: SharedArrayBuffer | null = null;
let syncView: Float32Array | null = null;
let syncPort: MessagePort | null = null;
let currentPlaybackTime = 0;

// Initialize renderers
renderers.set('waveform', new WaveformRenderer());
renderers.set('spectrogram', new SpectrogramRenderer());
renderers.set('vu-meter', new VUMeterRenderer());

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'INIT':
      init(payload.canvas, payload.config, payload.rendererId);
      break;
    case 'SET_SYNC_BRIDGE':
      if (payload.type === 'sab') {
        syncBuffer = payload.buffer;
        syncView = new Float32Array(syncBuffer!);
        console.log('🔗 Visualizer Worker: Sync bridge set (SAB)');
      } else {
        syncPort = payload.port;
        syncPort!.onmessage = (event) => {
          if (event.data.type === 'SYNC_TIME') {
            currentPlaybackTime = event.data.time;
          }
        };
        console.log('🔗 Visualizer Worker: Sync bridge set (MessageChannel)');
      }
      break;
    case 'CONFIG':
      updateConfig(payload.config);
      break;
    case 'DATA':
      draw(payload.data);
      break;
    case 'RESIZE':
      resize(payload.width, payload.height);
      break;
  }
};

function init(offscreen: OffscreenCanvas, initialConfig: VisualizerConfig, rendererId: string | string[]) {
  canvas = offscreen;
  ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }) as OffscreenCanvasRenderingContext2D;
  config = initialConfig;
  
  if (Array.isArray(rendererId)) {
    const activeRenderers = rendererId
      .map(id => renderers.get(id))
      .filter((r): r is IRenderer => r !== undefined);
    
    activeRenderer = new CompositeRenderer(activeRenderers);
  } else {
    activeRenderer = renderers.get(rendererId) || null;
  }

  if (activeRenderer && ctx && config) {
    activeRenderer.initialize(ctx, config);
  }
}

function updateConfig(newConfig: VisualizerConfig) {
  config = newConfig;
  if (activeRenderer && ctx && config) {
    activeRenderer.initialize(ctx, config);
  }
}

function resize(width: number, height: number) {
  if (canvas) {
    canvas.width = width;
    canvas.height = height;
  }
  if (activeRenderer) {
    activeRenderer.resize(width, height);
  }
}

function draw(data: VisualizationPayload) {
  if (!ctx || !activeRenderer || !canvas) return;
  
  latestData = data;
  if (!isRunning) {
    isRunning = true;
    requestAnimationFrame(loop);
  }
}

let latestData: VisualizationPayload | null = null;
let isRunning = false;

function loop() {
  if (!isRunning || !ctx || !activeRenderer || !canvas || !latestData) {
    isRunning = false;
    return;
  }

  // Update time from SAB if available
  if (syncView) {
    currentPlaybackTime = syncView[0];
  }

  const bounds = { width: canvas.width, height: canvas.height };
  
  // Create a copy of latest data but with synchronized timestamp
  const synchronizedData: VisualizationPayload = {
    ...latestData,
    timestamp: currentPlaybackTime
  };

  activeRenderer.draw(ctx, synchronizedData, bounds);
  
  requestAnimationFrame(loop);
}
