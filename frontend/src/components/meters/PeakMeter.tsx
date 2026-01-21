import { useRef, useEffect, useState } from 'react';
import { usePlayback } from '../../contexts/PlaybackContext';

interface PeakMeterProps {
  width?: number;
  height?: number;
}

export function PeakMeter({ width = 40, height = 200 }: PeakMeterProps) {
  const { metering } = usePlayback();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [clips, setClips] = useState<[boolean, boolean]>([false, false]);
  const clipHoldTimer = useRef<[number, number]>([0, 0]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    let animationId: number;

    // Constants
    const BAR_WIDTH = (width - 4) / 2; // 2px gap
    const PEAK_HOLD_TIME = 1000; // ms

    // dB Mapping Helper
    const dbToY = (db: number) => {
      // Map -60dB to 0dB range to height
      // Logarithmic-ish scaling usually done by linear dB map
      const minDb = -60;
      const maxDb = 3;
      const range = maxDb - minDb;
      
      const normalized = (db - minDb) / range;
      const clamped = Math.max(0, Math.min(1, normalized));
      
      return height - (clamped * height); // 0 at top
    };

    const draw = (time: number) => {
      const data = metering.getLevels();
      
      // Update Clips
      const newClips: [boolean, boolean] = [clips[0], clips[1]];
      let clipChanged = false;

      // Check L
      if (data.peak[0] > 0) {
        newClips[0] = true;
        clipHoldTimer.current[0] = time + PEAK_HOLD_TIME;
        clipChanged = true;
      } else if (time > clipHoldTimer.current[0]) {
        if (newClips[0]) {
          newClips[0] = false;
          clipChanged = true;
        }
      }

      // Check R
      if (data.peak[1] > 0) {
        newClips[1] = true;
        clipHoldTimer.current[1] = time + PEAK_HOLD_TIME;
        clipChanged = true;
      } else if (time > clipHoldTimer.current[1]) {
        if (newClips[1]) {
          newClips[1] = false;
          clipChanged = true;
        }
      }

      if (clipChanged) setClips(newClips);

      // --- RENDER ---
      ctx.clearRect(0, 0, width, height);

      // Draw Background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, width, height);

      // Draw Gradients
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, '#22c55e');   // Green (-60)
      gradient.addColorStop(0.7, '#22c55e'); // Green (-12)
      gradient.addColorStop(0.85, '#eab308'); // Yellow (-3)
      gradient.addColorStop(0.95, '#ef4444'); // Red (0)

      // Draw Left Bar
      const yL = dbToY(data.peak[0]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, yL, BAR_WIDTH, height - yL);

      // Draw Right Bar
      const yR = dbToY(data.peak[1]);
      ctx.fillStyle = gradient;
      ctx.fillRect(BAR_WIDTH + 4, yR, BAR_WIDTH, height - yR);

      // Draw Markers (-12, -6, 0)
      ctx.fillStyle = '#475569';
      const markers = [-3, -6, -12, -24, -48];
      markers.forEach(db => {
        const y = dbToY(db);
        ctx.fillRect(0, y, width, 1);
      });

      // Draw Clip Indicators (Top Boxes)
      // Left Clip
      ctx.fillStyle = clips[0] || (data.peak[0] > 0) ? '#ef4444' : '#334155';
      ctx.fillRect(0, 0, BAR_WIDTH, 4);

      // Right Clip
      ctx.fillStyle = clips[1] || (data.peak[1] > 0) ? '#ef4444' : '#334155';
      ctx.fillRect(BAR_WIDTH + 4, 0, BAR_WIDTH, 4);

      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animationId);
  }, [metering, height, width]); // Removed 'clips' from deps to avoid re-binding loop

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} className="rounded-md border border-slate-700 bg-slate-900" />
      <div className="flex justify-between w-full text-[10px] text-slate-500 mt-1 px-1 font-mono">
        <span>L</span>
        <span>R</span>
      </div>
    </div>
  );
}
