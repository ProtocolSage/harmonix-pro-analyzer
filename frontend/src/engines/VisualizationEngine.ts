import type { AudioAnalysisResult } from '../types/audio';

export interface VisualizationOptions {
  width: number;
  height: number;
  theme: 'dark' | 'light';
  animated: boolean;
  showGrid: boolean;
  showLabels: boolean;
}

export interface ChartData {
  labels: string[];
  values: number[];
  colors?: string[];
  metadata?: Record<string, any>;
}

/**
 * Professional Audio Visualization Engine
 * High-performance canvas-based visualizations for audio analysis data
 */
export class VisualizationEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private isRunning = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to get 2D context from canvas');
    }
    this.ctx = ctx;
    this.setupCanvas();
  }

  private setupCanvas(): void {
    // Setup high-DPI canvas
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  /**
   * Render spectral analysis as professional bar chart
   */
  renderSpectralAnalysis(spectralData: AudioAnalysisResult['spectral'], options: VisualizationOptions): void {
    if (!spectralData || Object.keys(spectralData).length === 0) return;

    this.clearCanvas();
    
    const { width, height } = options;
    const padding = 60;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);

    // Prepare data
    const features = [
      { name: 'Centroid', value: spectralData.centroid?.mean || 0, color: '#3B82F6', max: 8000 },
      { name: 'Rolloff', value: spectralData.rolloff?.mean || 0, color: '#10B981', max: 12000 },
      { name: 'Brightness', value: spectralData.brightness?.mean || 0, color: '#F59E0B', max: 1.0 },
      { name: 'Roughness', value: spectralData.roughness?.mean || 0, color: '#EF4444', max: 1.0 },
      { name: 'Flux', value: spectralData.flux?.mean || 0, color: '#8B5CF6', max: 100 },
      { name: 'Spread', value: spectralData.spread?.mean || 0, color: '#06B6D4', max: 2000 }
    ];

    const barWidth = chartWidth / features.length;
    const maxBarHeight = chartHeight * 0.8;

    // Draw grid if enabled
    if (options.showGrid) {
      this.drawGrid(padding, padding, chartWidth, chartHeight);
    }

    // Draw bars
    features.forEach((feature, idx) => {
      const normalizedValue = Math.min(feature.value / feature.max, 1);
      const barHeight = normalizedValue * maxBarHeight;
      const x = padding + idx * barWidth + barWidth * 0.1;
      const y = padding + chartHeight - barHeight;
      const width = barWidth * 0.8;

      // Create gradient
      const gradient = this.ctx.createLinearGradient(0, y + barHeight, 0, y);
      gradient.addColorStop(0, feature.color);
      gradient.addColorStop(1, feature.color + '40');

      // Draw bar
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x, y, width, barHeight);

      // Draw border
      this.ctx.strokeStyle = feature.color;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, width, barHeight);

      // Draw labels if enabled
      if (options.showLabels) {
        // Feature name
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(feature.name, x + width/2, padding + chartHeight + 20);

        // Value
        this.ctx.fillStyle = '#ffffff80';
        this.ctx.font = '10px monospace';
        this.ctx.fillText(feature.value.toFixed(1), x + width/2, padding + chartHeight + 35);
      }
    });

    // Draw title
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Spectral Feature Analysis', width/2, 30);
  }

  /**
   * Render MFCC coefficients as heatmap
   */
  renderMFCCHeatmap(mfccData: number[], options: VisualizationOptions): void {
    if (!mfccData || mfccData.length === 0) return;

    this.clearCanvas();
    
    const { width, height } = options;
    const padding = 40;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);

    const cellWidth = chartWidth / mfccData.length;
    const cellHeight = chartHeight;

    // Normalize MFCC values
    const maxVal = Math.max(...mfccData.map(Math.abs));
    const minVal = Math.min(...mfccData);

    mfccData.forEach((coeff, idx) => {
      const normalizedVal = maxVal > 0 ? (coeff - minVal) / (maxVal - minVal) : 0;
      
      // Create color based on value
      const hue = 240 - (normalizedVal * 120); // Blue to red
      const saturation = 70 + (normalizedVal * 30); // 70-100%
      const lightness = 30 + (normalizedVal * 40); // 30-70%
      
      this.ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      this.ctx.fillRect(
        padding + idx * cellWidth,
        padding,
        cellWidth - 1,
        cellHeight
      );

      // Draw coefficient labels if enabled
      if (options.showLabels && cellWidth > 20) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
          `${idx}`, 
          padding + idx * cellWidth + cellWidth/2, 
          padding + cellHeight + 15
        );
      }
    });

    // Draw title
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('MFCC Coefficients Heatmap', width/2, 25);

    // Draw color scale legend
    this.drawColorScale(width - 120, 50, 100, 20, minVal, maxVal);
  }

  /**
   * Render tempo and beat visualization
   */
  renderTempoVisualization(tempoData: AudioAnalysisResult['tempo'], options: VisualizationOptions): void {
    if (!tempoData) return;

    this.clearCanvas();
    
    const { width, height } = options;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.3;

    // Draw tempo circle
    this.ctx.strokeStyle = '#3B82F6';
    this.ctx.lineWidth = 8;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    this.ctx.stroke();

    // Draw confidence arc
    const confidenceAngle = (tempoData.confidence || 0) * 2 * Math.PI;
    this.ctx.strokeStyle = '#10B981';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius + 15, -Math.PI/2, -Math.PI/2 + confidenceAngle);
    this.ctx.stroke();

    // Draw BPM text
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${tempoData.bpm}`, centerX, centerY + 10);

    this.ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.fillText('BPM', centerX, centerY + 35);

    // Draw confidence percentage
    this.ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.fillStyle = '#10B981';
    this.ctx.fillText(
      `${((tempoData.confidence || 0) * 100).toFixed(1)}% confidence`,
      centerX,
      centerY + 55
    );

    // Draw beats if available
    if (tempoData.beats && tempoData.beats.length > 0) {
      const maxBeats = 16; // Show only first 16 beats
      const beats = tempoData.beats.slice(0, maxBeats);
      const beatRadius = radius + 30;
      
      beats.forEach((_, idx) => {
        const angle = (idx / maxBeats) * 2 * Math.PI - Math.PI/2;
        const x = centerX + Math.cos(angle) * beatRadius;
        const y = centerY + Math.sin(angle) * beatRadius;
        
        this.ctx.fillStyle = '#F59E0B';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3, 0, 2 * Math.PI);
        this.ctx.fill();
      });
    }
  }

  /**
   * Render key detection as circle of fifths
   */
  renderKeyVisualization(keyData: AudioAnalysisResult['key'], options: VisualizationOptions): void {
    if (!keyData) return;

    this.clearCanvas();
    
    const { width, height } = options;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.25;

    // Circle of fifths
    const keys = ['C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'D♭', 'A♭', 'E♭', 'B♭', 'F'];
    const keyAngles = keys.map((_, idx) => (idx / 12) * 2 * Math.PI - Math.PI/2);

    // Draw circle
    this.ctx.strokeStyle = '#374151';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    this.ctx.stroke();

    // Draw keys
    keys.forEach((key, idx) => {
      const angle = keyAngles[idx];
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      // Highlight detected key
      const isDetected = keyData.key && (keyData.key.startsWith(key) || keyData.key === key);
      
      this.ctx.fillStyle = isDetected ? '#10B981' : '#6B7280';
      this.ctx.beginPath();
      this.ctx.arc(x, y, isDetected ? 8 : 6, 0, 2 * Math.PI);
      this.ctx.fill();

      // Draw key label
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(key, x, y + 25);
    });

    // Draw detected key in center
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(keyData.key || 'Unknown', centerX, centerY - 10);

    this.ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.fillText(keyData.scale || '', centerX, centerY + 10);

    // Draw confidence
    this.ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.fillStyle = '#10B981';
    this.ctx.fillText(
      `${((keyData.confidence || 0) * 100).toFixed(1)}% confidence`,
      centerX,
      centerY + 30
    );
  }

  private drawGrid(x: number, y: number, width: number, height: number): void {
    this.ctx.strokeStyle = '#ffffff10';
    this.ctx.lineWidth = 1;

    // Horizontal lines
    for (let i = 0; i <= 10; i++) {
      const lineY = y + (height / 10) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(x, lineY);
      this.ctx.lineTo(x + width, lineY);
      this.ctx.stroke();
    }

    // Vertical lines
    for (let i = 0; i <= 10; i++) {
      const lineX = x + (width / 10) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(lineX, y);
      this.ctx.lineTo(lineX, y + height);
      this.ctx.stroke();
    }
  }

  private drawColorScale(x: number, y: number, width: number, height: number, min: number, max: number): void {
    const steps = 50;
    const stepWidth = width / steps;

    for (let i = 0; i < steps; i++) {
      const value = i / (steps - 1);
      const hue = 240 - (value * 120);
      this.ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
      this.ctx.fillRect(x + i * stepWidth, y, stepWidth, height);
    }

    // Draw border
    this.ctx.strokeStyle = '#ffffff40';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, width, height);

    // Draw labels
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '10px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(min.toFixed(1), x, y + height + 12);
    this.ctx.textAlign = 'right';
    this.ctx.fillText(max.toFixed(1), x + width, y + height + 12);
  }

  private clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  startAnimation(callback: () => void): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    const animate = () => {
      if (this.isRunning) {
        callback();
        this.animationId = requestAnimationFrame(animate);
      }
    };
    animate();
  }

  stopAnimation(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resize(): void {
    this.setupCanvas();
  }

  destroy(): void {
    this.stopAnimation();
  }
}