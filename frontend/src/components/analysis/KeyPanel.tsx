import { useEffect, useRef } from 'react';
import type { AudioAnalysisResult } from '../../types/audio';

interface KeyPanelProps {
  analysisData: AudioAnalysisResult | null;
  isAnalyzing?: boolean;
}

export function KeyPanel({ analysisData, isAnalyzing }: KeyPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const key = analysisData?.key || { key: 'C Major', scale: 'Major', confidence: 0.92 };

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
    bgGradient.addColorStop(0, 'rgba(192, 132, 255, 0.05)');
    bgGradient.addColorStop(1, 'rgba(192, 132, 255, 0.0)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw key name prominently
    ctx.fillStyle = 'rgba(231, 238, 248, 0.9)';
    ctx.font = '600 36px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(key.key, width / 2, height / 2 - 20);

    ctx.fillStyle = 'rgba(169, 183, 201, 0.9)';
    ctx.font = '500 18px Inter, sans-serif';
    ctx.fillText(key.scale, width / 2, height / 2 + 10);

    // Draw circle of fifths representation
    const centerX = width / 2;
    const centerY = height / 2 + 60;
    const radius = 50;

    const notes = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F'];
    const detectedNote = key.key.replace(/\s*(major|minor)$/i, '').trim();
    const detectedIndex = notes.findIndex(n => n === detectedNote);

    notes.forEach((note, i) => {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      const isDetected = i === detectedIndex;

      // Draw note circle
      ctx.beginPath();
      ctx.arc(x, y, isDetected ? 8 : 5, 0, Math.PI * 2);
      ctx.fillStyle = isDetected
        ? 'rgba(192, 132, 255, 0.9)'
        : 'rgba(192, 132, 255, 0.3)';
      ctx.fill();

      // Glow for detected note
      if (isDetected) {
        ctx.shadowColor = 'rgba(192, 132, 255, 0.8)';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw note label
      ctx.fillStyle = isDetected
        ? 'rgba(231, 238, 248, 0.9)'
        : 'rgba(111, 130, 155, 0.7)';
      ctx.font = `${isDetected ? '600' : '500'} 10px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const labelX = centerX + Math.cos(angle) * (radius + 15);
      const labelY = centerY + Math.sin(angle) * (radius + 15);
      ctx.fillText(note, labelX, labelY);
    });

    // Draw confidence indicator if available
    if (key.confidence !== undefined) {
      const confidenceWidth = 100;
      const confidenceX = width / 2 - confidenceWidth / 2;
      const confidenceY = height - 20;

      ctx.fillStyle = 'rgba(26, 38, 52, 0.6)';
      ctx.fillRect(confidenceX, confidenceY, confidenceWidth, 6);

      const gradient = ctx.createLinearGradient(confidenceX, 0, confidenceX + confidenceWidth, 0);
      gradient.addColorStop(0, 'rgba(192, 132, 255, 0.8)');
      gradient.addColorStop(1, 'rgba(192, 132, 255, 0.4)');
      ctx.fillStyle = gradient;
      ctx.fillRect(confidenceX, confidenceY, confidenceWidth * key.confidence, 6);
    }

  }, [analysisData]);

  if (isAnalyzing) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-bg-3 border-t-accent-key rounded-full animate-spin"></div>
          <p className="text-xs text-text-3">Detecting key...</p>
        </div>
      </div>
    );
  }

  // Use demo data if no real data available
  const keyData = analysisData?.key || { key: 'C Major', scale: 'Major', confidence: 0.92 };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
}
