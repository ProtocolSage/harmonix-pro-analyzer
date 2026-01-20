import { useEffect, useRef } from 'react';
import type { AudioAnalysisResult } from '../../types/audio';

interface SpectralPanelProps {
  analysisData: AudioAnalysisResult | null;
  isAnalyzing?: boolean;
}

export function SpectralPanel({ analysisData, isAnalyzing }: SpectralPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Demo data for visualization when no real data available
  const demoData = !analysisData ? {
    spectral: {
      centroid: { mean: 2400, std: 500 },
      rolloff: { mean: 3800, std: 600 }
    }
  } : null;

  useEffect(() => {
    if (!canvasRef.current) return;

    const dataToVisualize = analysisData || demoData;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, 'rgba(51, 214, 255, 0.05)');
    bgGradient.addColorStop(1, 'rgba(51, 214, 255, 0.0)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Simulate spectral data visualization
    const barCount = 64;
    const barWidth = width / barCount;
    const maxBarHeight = height - 40;

    // Create gradient for bars
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, 'rgba(51, 214, 255, 0.9)');
    gradient.addColorStop(0.5, 'rgba(51, 214, 255, 0.6)');
    gradient.addColorStop(1, 'rgba(124, 92, 255, 0.3)');

    // Use spectral data if available, otherwise create visualization based on available metrics
    const spectralData = dataToVisualize?.spectral;

    for (let i = 0; i < barCount; i++) {
      // Create frequency-based visualization (higher frequencies = lower bars)
      const frequencyFactor = Math.pow(i / barCount, 2);
      const randomVariation = Math.random() * 0.3 + 0.7;

      // Use spectral metrics to influence visualization
      const baseHeight = spectralData?.centroid?.mean
        ? (spectralData.centroid.mean / 4000) * maxBarHeight * (1 - frequencyFactor) * randomVariation
        : maxBarHeight * (1 - frequencyFactor) * randomVariation;

      const barHeight = Math.max(2, baseHeight);
      const x = i * barWidth;
      const y = height - barHeight - 20;

      // Draw bar
      ctx.fillStyle = gradient;
      ctx.fillRect(x + 1, y, barWidth - 2, barHeight);

      // Add glow effect
      ctx.shadowColor = 'rgba(51, 214, 255, 0.5)';
      ctx.shadowBlur = 8;
      ctx.fillRect(x + 1, y, barWidth - 2, 2);
      ctx.shadowBlur = 0;
    }

    // Draw frequency labels
    ctx.fillStyle = 'rgba(111, 130, 155, 0.8)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('20 Hz', 5, height - 5);
    ctx.textAlign = 'right';
    ctx.fillText('20 kHz', width - 5, height - 5);

    // Draw spectral metrics
    if (spectralData?.centroid) {
      ctx.fillStyle = 'rgba(231, 238, 248, 0.9)';
      ctx.font = '600 12px Inter, sans-serif';
      ctx.textAlign = 'left';

      const metrics = [
        { label: 'Centroid', value: `${Math.round(spectralData.centroid.mean)} Hz` },
        { label: 'Rolloff', value: `${Math.round(spectralData.rolloff?.mean || 0)} Hz` },
      ];

      metrics.forEach((metric, i) => {
        const y = 20 + i * 20;
        ctx.fillStyle = 'rgba(111, 130, 155, 0.9)';
        ctx.fillText(metric.label, 10, y);
        ctx.fillStyle = 'rgba(51, 214, 255, 0.9)';
        ctx.fillText(metric.value, 80, y);
      });
    }

  }, [analysisData, demoData]);

  if (isAnalyzing) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-bg-3 border-t-accent-spectral rounded-full animate-spin"></div>
          <p className="text-xs text-text-3">Analyzing spectrum...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
}
