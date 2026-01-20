import { useEffect, useRef } from 'react';
import { useVisualizer } from '../../hooks/useVisualizer';
import { VisualizerBridge } from '../../utils/VisualizerBridge';
import { usePlayback } from '../../contexts/PlaybackContext';
import { CountersunkWell } from '../shell/CountersunkWell';
import { Activity } from 'lucide-react';

interface SpectralVisualizerProps {
  width?: number;
  height?: number;
}

/**
 * SpectralVisualizer: Integrates real-time Spectrogram and Waveform overlay.
 * Uses OffscreenCanvas and VisualizerBridge for high-performance rendering.
 */
export function SpectralVisualizer({ width = 1000, height = 300 }: SpectralVisualizerProps) {
  const { engine: transport } = usePlayback();
  
  const { canvasRef, start, stop, connect } = useVisualizer({
    fftSize: 1024,
    waveformBins: 1024,
    useWorker: true,
    maxPayloadFps: 60,
    rendererId: ['spectrogram', 'waveform']
  });

  useEffect(() => {
    if (transport) {
      const analyser = transport.getAnalyser();
      connect(analyser);
      start();
    }
    
    return () => stop();
  }, [transport, connect, start, stop]);

  return (
    <CountersunkWell 
      label="Spectral Engine (WASM)" 
      icon={<Activity style={{ width: 14, height: 14 }} />}
      className="spectral-visualizer-well"
    >
      <div style={{ height: `${height}px`, width: '100%' }}>
        <canvas 
          ref={canvasRef} 
          width={width} 
          height={height} 
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </div>
    </CountersunkWell>
  );
}
