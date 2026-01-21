import { useRef, useEffect } from 'react';
import { usePlayback } from '../../contexts/PlaybackContext';

interface PhaseCorrelationProps {
  width?: number;
  height?: number;
}

export function PhaseCorrelation({ width = 200, height = 16 }: PhaseCorrelationProps) {
  const { metering } = usePlayback();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    let animationId: number;

    const draw = () => {
      const data = metering.getLevels();
      const corr = data.correlation; // -1 to 1

      ctx.clearRect(0, 0, width, height);

      // Background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, width, height);

      // Center Line (0)
      const centerX = width / 2;
      
      // Draw Gradient Bar
      // -1 (Red) -> 0 (Yellow) -> +1 (Green)
      // We draw a bar from 0 to current value
      
      const x = (corr + 1) / 2 * width; // Map -1..1 to 0..width
      
      // Draw Zones
      // Red Zone (-1 to 0)
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#ef4444'); // -1
      gradient.addColorStop(0.5, '#eab308'); // 0
      gradient.addColorStop(1, '#22c55e');   // +1

      ctx.fillStyle = gradient;
      
      // Draw simple indicator line or filled bar?
      // Standard is usually a needle or a bar growing from center?
      // Let's do a needle for precision
      
      // Draw colored bar for zones background
      ctx.globalAlpha = 0.3;
      ctx.fillRect(0, 2, width, height - 4);
      ctx.globalAlpha = 1.0;

      // Needle
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - 1, 0, 2, height);

      // Text Labels
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.fillText('-1', 4, height - 4);
      ctx.fillText('+1', width - 14, height - 4);
      ctx.fillText('0', centerX - 3, height - 4);

      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationId);
  }, [metering, width, height]);

  return (
    <div className="flex flex-col">
      <canvas ref={canvasRef} className="rounded border border-slate-700 bg-slate-900" />
      <div className="text-[10px] text-slate-500 text-center font-mono mt-1">PHASE</div>
    </div>
  );
}
