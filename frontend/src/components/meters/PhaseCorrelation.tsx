import { useEffect } from 'react';
import { usePlayback } from '../../contexts/PlaybackContext';
import { useVisualizer } from '../../hooks/useVisualizer';

interface PhaseCorrelationProps {
  width?: number;
  height?: number;
}

const EMPTY_FLOAT32 = new Float32Array(0);

export function PhaseCorrelation({ width = 200, height = 16 }: PhaseCorrelationProps) {
  const { metering } = usePlayback();
  
  const { canvasRef, start, stop, feed } = useVisualizer({
    rendererId: 'correlation',
    targetFps: 60
  });

  useEffect(() => {
    start();
    
    const loop = () => {
      if (!canvasRef.current) return;
      
      const levels = metering.getLevels();

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
    <div className="flex flex-col relative">
      <div 
        className="rounded-sm overflow-hidden border border-white/5 bg-black/20"
        style={{ width, height }}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
      
      {/* HUD Labels */}
      <div className="flex justify-between w-full text-[6px] text-studio-text-tertiary mt-0.5 font-mono px-0.5 uppercase tracking-[0.2em] opacity-60">
        <span>-1</span>
        <span>Phase</span>
        <span>+1</span>
      </div>
    </div>
  );
}
