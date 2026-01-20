import { useEffect, useRef } from 'react';
import type { AudioAnalysisResult } from '../../types/audio';

interface TempoPanelProps {
  analysisData: AudioAnalysisResult | null;
  isAnalyzing?: boolean;
}

export function TempoPanel({ analysisData, isAnalyzing }: TempoPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const tempo = analysisData?.tempo || { bpm: 128, confidence: 0.85 };

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    // Background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, 'rgba(124, 255, 107, 0.05)');
    bgGradient.addColorStop(1, 'rgba(124, 255, 107, 0.0)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw BPM value prominently
    ctx.fillStyle = 'rgba(231, 238, 248, 0.9)';
    ctx.font = '600 48px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(tempo.bpm).toString(), width / 2, height / 2 - 10);

    ctx.fillStyle = 'rgba(169, 183, 201, 0.9)';
    ctx.font = '500 16px Inter, sans-serif';
    ctx.fillText('BPM', width / 2, height / 2 + 20);

    // Draw beat grid visualization
    const beatCount = 8;
    const beatWidth = (width - 40) / beatCount;
    const beatY = height - 60;

    for (let i = 0; i < beatCount; i++) {
      const x = 20 + i * beatWidth;
      const isDownbeat = i % 4 === 0;
      const beatHeight = isDownbeat ? 30 : 20;

      // Animated beat pulse
      const pulse = Math.sin(Date.now() / 500 + i) * 0.5 + 0.5;
      const alpha = 0.4 + pulse * 0.4;

      ctx.fillStyle = isDownbeat
        ? `rgba(124, 255, 107, ${alpha})`
        : `rgba(124, 255, 107, ${alpha * 0.6})`;
      ctx.fillRect(x, beatY - beatHeight / 2, beatWidth - 4, beatHeight);

      // Glow effect
      ctx.shadowColor = 'rgba(124, 255, 107, 0.6)';
      ctx.shadowBlur = 10;
      ctx.fillRect(x, beatY - beatHeight / 2, beatWidth - 4, 2);
      ctx.shadowBlur = 0;
    }

    // Confidence indicator
    if (tempo.confidence !== undefined) {
      const confidenceWidth = 120;
      const confidenceX = width / 2 - confidenceWidth / 2;
      const confidenceY = height - 25;

      ctx.fillStyle = 'rgba(26, 38, 52, 0.6)';
      ctx.fillRect(confidenceX, confidenceY, confidenceWidth, 8);

      const gradient = ctx.createLinearGradient(confidenceX, 0, confidenceX + confidenceWidth, 0);
      gradient.addColorStop(0, 'rgba(124, 255, 107, 0.8)');
      gradient.addColorStop(1, 'rgba(124, 255, 107, 0.4)');
      ctx.fillStyle = gradient;
      ctx.fillRect(confidenceX, confidenceY, confidenceWidth * tempo.confidence, 8);

      ctx.fillStyle = 'rgba(169, 183, 201, 0.8)';
      ctx.font = '500 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${(tempo.confidence * 100).toFixed(0)}% confidence`, width / 2, confidenceY - 8);
    }

  }, [analysisData]);

  // Animate beat visualization
  useEffect(() => {
    const interval = setInterval(() => {
      if (canvasRef.current) {
        // Trigger redraw for animation
        const event = new Event('animationFrame');
        canvasRef.current.dispatchEvent(event);
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  if (isAnalyzing) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-bg-3 border-t-accent-tempo rounded-full animate-spin"></div>
          <p className="text-xs text-text-3">Detecting tempo...</p>
        </div>
      </div>
    );
  }

  // Use demo data if no real data available
  const tempoData = analysisData?.tempo || { bpm: 128, confidence: 0.85 };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
}
