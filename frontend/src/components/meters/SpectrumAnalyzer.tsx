import { useRef, useEffect } from 'react';
import { usePlayback } from '../../contexts/PlaybackContext';

interface SpectrumAnalyzerProps {
  width?: number;
  height?: number;
  color?: string;
}

export function SpectrumAnalyzer({ width = 300, height = 64, color = '#38bdf8' }: SpectrumAnalyzerProps) {
  const { metering } = usePlayback();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle High DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // FFT Config
    const bufferSize = 1024; // Half of fftSize (2048)
    const dataArray = new Uint8Array(bufferSize);
    
    // Logarithmic Scale Helpers
    const minFreq = 20;
    const maxFreq = 20000;
    const sampleRate = 44100; // Assumed, ideally get from context
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    const scale = (logMax - logMin);

    const getX = (freq: number) => {
      const logFreq = Math.log10(Math.max(freq, 1));
      return ((logFreq - logMin) / scale) * width;
    };

    let animationId: number;

    const draw = () => {
      metering.getFFT(dataArray);

      ctx.clearRect(0, 0, width, height);

      // Gradient
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, `${color}10`); // Low opacity at bottom
      gradient.addColorStop(1, `${color}aa`); // High opacity at top

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, height);

      // Draw Curve (Logarithmic)
      // We iterate pixels (0 to width) and find corresponding freq bin
      // This is smoother than iterating bins and drawing bars
      
      for (let x = 0; x < width; x++) {
        // Inverse Log Map: Pixel X -> Frequency
        // x / width = (logFreq - logMin) / scale
        // logFreq = (x / width) * scale + logMin
        // freq = 10^logFreq
        const percent = x / width;
        const freq = Math.pow(10, percent * scale + logMin);
        
        // Map Freq -> Bin Index
        // binIndex = freq * (bufferSize / (sampleRate / 2))
        const nyquist = sampleRate / 2;
        const binIndex = Math.floor(freq * (bufferSize / nyquist));
        
        // Safety
        const safeIndex = Math.min(Math.max(0, binIndex), bufferSize - 1);
        const value = dataArray[safeIndex]; // 0-255
        
        // Normalize Height
        const barHeight = (value / 255) * height;
        const y = height - barHeight;

        ctx.lineTo(x, y);
      }

      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Top Line
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationId);
  }, [metering, width, height, color]);

  return (
    <div className="flex flex-col">
      <canvas ref={canvasRef} className="rounded border border-slate-700 bg-slate-900/80" />
      <div className="flex justify-between w-full text-[9px] text-slate-600 mt-1 font-mono px-1">
        <span>20</span>
        <span>100</span>
        <span>1k</span>
        <span>10k</span>
      </div>
    </div>
  );
}
