import { useRef, useEffect, useCallback } from 'react';
import { usePlayback } from '../../contexts/PlaybackContext';
import { useVisualizer } from '../../hooks/useVisualizer';

const EMPTY_FLOAT32 = new Float32Array(0);

interface VUMeterProps {
  width?: number;
  height?: number;
}

export function VUMeter({ width = 80, height = 140 }: VUMeterProps) {
  const { metering } = usePlayback();
  
  const { canvasRef, start, stop, feed } = useVisualizer({
    rendererId: 'vu-meter',
    targetFps: 60
  });

  const handleReset = useCallback(() => {
    // Future: MeteringEngine reset
  }, []);

  useEffect(() => {
    start();
    
    const loop = () => {
      if (!canvasRef.current) return;
      
      const levels = metering.getLevels();
      
      // Truthful payload: No casts, no lies.
      feed({
        sequence: 0,
        timestamp: performance.now(),
        spectrum: EMPTY_FLOAT32,
        waveform: EMPTY_FLOAT32,
        energy: { rms: 0, peak: 0, loudness: 0 },
        levels
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
    <div 
      className="flex flex-col gap-2 group cursor-pointer select-none"
      onClick={handleReset}
      title="Click to Reset Peak Hold"
    >
      <div 
        className="relative rounded-lg overflow-hidden border border-studio-glass-border shadow-inner"
        style={{ width, height, background: 'var(--studio-bg-secondary)' }}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/5 to-transparent opacity-30" />
      </div>
    </div>
  );
}
