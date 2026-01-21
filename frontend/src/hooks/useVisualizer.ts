import { useRef, useEffect, useCallback } from 'react';
import { VisualizerEngine } from '../engines/VisualizerEngine';
import { WaveformRenderer } from '../engines/renderers/WaveformRenderer';
import { SpectrogramRenderer } from '../engines/renderers/SpectrogramRenderer';
import { TiledSpectrogramRenderer } from '../engines/renderers/TiledSpectrogramRenderer';
import { VUMeterRenderer } from '../engines/renderers/VUMeterRenderer';
import { VisualizerConfig, VisualizationPayload } from '../types/visualizer';

export function useVisualizer(config?: Partial<VisualizerConfig> & { rendererId?: string | string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<VisualizerEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize engine
    const engine = new VisualizerEngine(config);
    engineRef.current = engine;

    const rendererId = config?.rendererId || 'waveform';
    
    // Engine.init handles string[] by creating CompositeRenderer in worker
    let initialRenderer: any;
    if (Array.isArray(rendererId)) {
      initialRenderer = rendererId;
    } else {
      switch (rendererId) {
        case 'waveform': initialRenderer = new WaveformRenderer(); break;
        case 'spectrogram': initialRenderer = new SpectrogramRenderer(); break;
        case 'tiled-spectrogram': initialRenderer = new TiledSpectrogramRenderer(); break;
        case 'vu': initialRenderer = new VUMeterRenderer(); break;
        default: initialRenderer = new WaveformRenderer();
      }
    }

    engine.init(canvasRef.current, initialRenderer);

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    engineRef.current?.start();
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.stop();
  }, []);

  const feed = useCallback((packet: VisualizationPayload) => {
    engineRef.current?.feed(packet);
  }, []);

  const connect = useCallback((analyser: AnalyserNode) => {
    engineRef.current?.connect(analyser);
  }, []);

  const setRenderer = useCallback((type: 'waveform' | 'spectrogram' | 'vu' | string[]) => {
    if (!engineRef.current || !canvasRef.current) return;
    
    // We would need a method in engine to switch renderer, or re-init
    // Re-init is safer for now
    let renderer;
    switch (type) {
      case 'spectrogram': renderer = new SpectrogramRenderer(); break;
      case 'vu': renderer = new VUMeterRenderer(); break;
      default: renderer = new WaveformRenderer();
    }
    
    // Engine.init handles re-initialization? 
    // Currently init takes canvas. If canvas is transferred, we can't re-init on main thread easily if we were in worker mode.
    // But updateConfig/switchRenderer might be supported via messages.
    // For MVP, assume one renderer per canvas, or switch BEFORE start.
    
    // TODO: Implement dynamic switching in Engine
  }, []);

  return {
    canvasRef,
    start,
    stop,
    feed,
    connect
  };
}
