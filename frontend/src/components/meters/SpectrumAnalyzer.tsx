import { useEffect } from 'react';
import { usePlayback } from '../../contexts/PlaybackContext';
import { useVisualizer } from '../../hooks/useVisualizer';

interface SpectrumAnalyzerProps {
  width?: number;
  height?: number;
}

const EMPTY_FLOAT32 = new Float32Array(0);

export function SpectrumAnalyzer({ width = 300, height = 64 }: SpectrumAnalyzerProps) {
  const { metering } = usePlayback();
  
  const { canvasRef, start, stop, feed } = useVisualizer({
    rendererId: 'spectrum',
    targetFps: 60
  });

  useEffect(() => {
    start();
    
    // Internal FFT buffer for fetching from engine
    const fftBuffer = new Uint8Array(1024);

    const loop = () => {
      if (!canvasRef.current) return;
      
      metering.getFFT(fftBuffer);
      
      // Convert to Float32 for the visualizer bridge
      const spectrum = new Float32Array(fftBuffer);

      feed({
        sequence: 0,
        timestamp: performance.now(),
        spectrum,
        waveform: EMPTY_FLOAT32,
        energy: { rms: 0, peak: 0, loudness: 0 }
      });

      requestAnimationFrame(loop);
    };

    const rafId = requestAnimationFrame(loop);
    return () => {
      stop();
      cancelAnimationFrame(rafId);
    };
  }, [feed, start, stop, metering, canvasRef]);

  return (
    <div className="flex flex-col relative group">
      <div 
        className="rounded-lg overflow-hidden border border-white/5 bg-black/20"
        style={{ width, height }}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
      
      {/* Frequency Markers (Static HUD) */}
      <div className="flex justify-between w-full text-[7px] text-studio-text-tertiary mt-1 font-mono px-1 uppercase tracking-tighter opacity-50 group-hover:opacity-100 transition-opacity">
        <span>20Hz</span>
        <span>100Hz</span>
        <span>1kHz</span>
        <span>10kHz</span>
        <span>20kHz</span>
      </div>
    </div>
  );
}
