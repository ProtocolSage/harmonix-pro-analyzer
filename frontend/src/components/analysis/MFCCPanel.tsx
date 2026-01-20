import { useEffect, useRef } from 'react';
import type { AudioAnalysisResult } from '../../types/audio';

interface MFCCPanelProps {
  analysisData: AudioAnalysisResult | null;
  isAnalyzing?: boolean;
}

export function MFCCPanel({ analysisData, isAnalyzing }: MFCCPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const demoMFCC = Array.from({ length: 13 }, (_, i) => Math.random() * 3 + (i * 0.2));
    const mfccDataToUse = analysisData?.mfcc || demoMFCC;

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

    // Create heatmap visualization
    const timeSteps = 40;
    const coeffCount = Math.min(mfccDataToUse.length, 13);

    const cellWidth = width / timeSteps;
    const cellHeight = (height - 40) / coeffCount;

    // Draw heatmap cells
    for (let t = 0; t < timeSteps; t++) {
      for (let c = 0; c < coeffCount; c++) {
        // Use MFCC data or create smooth visualization
        const value = mfccDataToUse[c] !== undefined
          ? Math.abs(mfccDataToUse[c])
          : Math.random() * 0.7 + 0.3;

        // Normalize and create color
        const normalized = Math.min(1, value / 5); // Assuming MFCC values range 0-5

        // Create gradient color based on value
        const hue = 240 - (normalized * 60); // Blue to cyan
        const saturation = 80 + (normalized * 20);
        const lightness = 40 + (normalized * 30);

        const x = t * cellWidth;
        const y = 20 + c * cellHeight;

        // Draw cell
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        ctx.fillRect(x, y, cellWidth - 1, cellHeight - 1);

        // Add subtle glow to brighter cells
        if (normalized > 0.6) {
          ctx.shadowColor = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.5)`;
          ctx.shadowBlur = 4;
          ctx.fillRect(x, y, cellWidth - 1, 2);
          ctx.shadowBlur = 0;
        }
      }
    }

    // Draw labels
    ctx.fillStyle = 'rgba(169, 183, 201, 0.9)';
    ctx.font = '500 10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Y-axis labels (MFCC coefficients)
    ctx.fillText('MFCC 1', 5, 20 + cellHeight / 2);
    if (coeffCount > 6) {
      ctx.fillText(`MFCC ${Math.floor(coeffCount / 2)}`, 5, 20 + (coeffCount / 2) * cellHeight);
    }
    ctx.fillText(`MFCC ${coeffCount}`, 5, 20 + (coeffCount - 1) * cellHeight + cellHeight / 2);

    // X-axis label
    ctx.textAlign = 'center';
    ctx.fillText('Time →', width / 2, height - 10);

    // Add color scale legend
    const legendX = width - 100;
    const legendY = 25;
    const legendWidth = 80;
    const legendHeight = 12;

    const scaleGradient = ctx.createLinearGradient(legendX, 0, legendX + legendWidth, 0);
    scaleGradient.addColorStop(0, 'hsl(240, 80%, 40%)');
    scaleGradient.addColorStop(0.5, 'hsl(210, 90%, 55%)');
    scaleGradient.addColorStop(1, 'hsl(180, 100%, 70%)');

    ctx.fillStyle = scaleGradient;
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);

    ctx.strokeStyle = 'rgba(111, 130, 155, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

    ctx.fillStyle = 'rgba(169, 183, 201, 0.8)';
    ctx.font = '500 9px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Low', legendX, legendY - 5);
    ctx.textAlign = 'right';
    ctx.fillText('High', legendX + legendWidth, legendY - 5);

  }, [analysisData]);

  if (isAnalyzing) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-bg-3 border-t-accent-mfcc rounded-full animate-spin"></div>
          <p className="text-xs text-text-3">Computing MFCC...</p>
        </div>
      </div>
    );
  }

  // Generate demo MFCC data if none available
  const demoMFCC = Array.from({ length: 13 }, (_, i) => Math.random() * 3 + (i * 0.2));
  const mfccData = analysisData?.mfcc || demoMFCC;

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
}
