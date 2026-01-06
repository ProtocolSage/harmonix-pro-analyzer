import { VisualizationEngine, type VisualizationOptions } from './VisualizationEngine';
import type { AudioAnalysisResult } from '../types/audio';
import { PerformanceMonitor, PerformanceCategory } from '../utils/PerformanceMonitor';

export interface RealtimeVisualizationConfig {
  fps: number;
  smoothing: number;
  sensitivity: number;
  showWaveform: boolean;
  showSpectrum: boolean;
  showBeats: boolean;
  colorScheme: 'default' | 'neon' | 'warm' | 'cool';
  beatSensitivity: number;
  spectralRange: [number, number]; // Hz range for spectral display
}

export interface AudioVisualizationData {
  waveform: Float32Array;
  spectrum: Float32Array;
  currentTime: number;
  beatDetected: boolean;
  rms: number;
  peak: number;
  currentBeat?: number;
  nextBeat?: number;
}

export class RealtimeVisualizationEngine {
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private realtimeAnimationId: number | null = null;
  private isRunning = false;
  
  private config: RealtimeVisualizationConfig = {
    fps: 60,
    smoothing: 0.8,
    sensitivity: 1.0,
    showWaveform: true,
    showSpectrum: true,
    showBeats: true,
    colorScheme: 'default',
    beatSensitivity: 0.7,
    spectralRange: [20, 20000]
  };
  
  private analysisData: AudioAnalysisResult | null = null;
  private beatTracker: BeatTracker;
  private spectralHistory: Float32Array[] = [];
  private maxHistoryLength = 300; // 5 seconds at 60fps
  
  private visualizationCallbacks: Array<(data: AudioVisualizationData) => void> = [];

  constructor(canvas: HTMLCanvasElement, config?: Partial<RealtimeVisualizationConfig>) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to get 2D rendering context');
    }
    this.ctx = context;
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.beatTracker = new BeatTracker(this.config.beatSensitivity);
    this.setupAudioContext();
  }

  private async setupAudioContext(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = this.config.smoothing;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;
      
    } catch (error) {
      console.error('Failed to create audio context:', error);
    }
  }

  public async connectAudioElement(audioElement: HTMLAudioElement): Promise<void> {
    if (!this.audioContext || !this.analyser) {
      throw new Error('Audio context not initialized');
    }

    try {
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Disconnect previous source
      if (this.sourceNode) {
        this.sourceNode.disconnect();
      }

      // Create new source node
      this.sourceNode = this.audioContext.createMediaElementSource(audioElement);
      
      // Connect audio graph: source -> analyser -> destination
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      
    } catch (error) {
      console.error('Failed to connect audio element:', error);
      throw error;
    }
  }

  public setAnalysisData(data: AudioAnalysisResult): void {
    this.analysisData = data;
    
    // Update beat tracker with tempo information
    if (data.tempo) {
      this.beatTracker.setTempo(data.tempo.bpm, data.tempo.beats);
    }
  }

  public updateConfig(newConfig: Partial<RealtimeVisualizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.analyser) {
      this.analyser.smoothingTimeConstant = this.config.smoothing;
    }
    
    this.beatTracker.setSensitivity(this.config.beatSensitivity);
  }

  public startVisualization(audioElement: HTMLAudioElement): void {
    if (this.isRunning) return;

    this.connectAudioElement(audioElement).then(() => {
      this.isRunning = true;
      this.animate();
    }).catch(error => {
      console.error('Failed to start visualization:', error);
    });
  }

  public stopVisualization(): void {
    this.isRunning = false;
    
    if (this.realtimeAnimationId) {
      cancelAnimationFrame(this.realtimeAnimationId);
      this.realtimeAnimationId = null;
    }
  }

  private animate(): void {
    if (!this.isRunning || !this.analyser) return;

    const timingId = PerformanceMonitor.startTiming(
      'realtime.visualization.frame',
      PerformanceCategory.VISUALIZATION,
      { fps: this.config.fps }
    );

    try {
      // Get audio data
      const bufferLength = this.analyser.frequencyBinCount;
      const waveformData = new Float32Array(bufferLength);
      const spectrumData = new Uint8Array(bufferLength);
      
      this.analyser.getFloatTimeDomainData(waveformData);
      this.analyser.getByteFrequencyData(spectrumData);
      
      // Convert spectrum to Float32Array and normalize
      const spectrum = new Float32Array(spectrumData.length);
      for (let i = 0; i < spectrumData.length; i++) {
        spectrum[i] = spectrumData[i] / 255.0;
      }
      
      // Store spectral history for advanced visualizations
      this.spectralHistory.push(new Float32Array(spectrum));
      if (this.spectralHistory.length > this.maxHistoryLength) {
        this.spectralHistory.shift();
      }
      
      // Calculate audio features
      const rms = this.calculateRMS(waveformData);
      const peak = Math.max(...Array.from(waveformData).map(Math.abs));
      
      // Beat detection
      const beatDetected = this.beatTracker.detectBeat(spectrum, rms);
      const currentTime = this.audioContext?.currentTime || 0;
      
      // Create visualization data
      const visualizationData: AudioVisualizationData = {
        waveform: waveformData,
        spectrum,
        currentTime,
        beatDetected,
        rms,
        peak,
        currentBeat: this.beatTracker.getCurrentBeat(),
        nextBeat: this.beatTracker.getNextBeat()
      };
      
      // Render visualizations
      this.renderRealtimeVisualization(visualizationData);
      
      // Notify callbacks
      this.visualizationCallbacks.forEach(callback => {
        try {
          callback(visualizationData);
        } catch (error) {
          console.error('Visualization callback error:', error);
        }
      });
      
    } catch (error) {
      console.error('Animation frame error:', error);
    } finally {
      PerformanceMonitor.endTiming(timingId);
    }

    // Schedule next frame
    this.realtimeAnimationId = requestAnimationFrame(() => this.animate());
  }

  private renderRealtimeVisualization(data: AudioVisualizationData): void {
    this.clearCanvas();
    
    const { width, height } = this.getCanvasSize();
    const ctx = this.getContext();
    
    // Background with beat pulse
    if (data.beatDetected) {
      const pulse = 0.1;
      ctx.fillStyle = `rgba(59, 130, 246, ${pulse})`;
      ctx.fillRect(0, 0, width, height);
    }
    
    if (this.config.showWaveform) {
      this.renderWaveform(data.waveform, { width, height });
    }
    
    if (this.config.showSpectrum) {
      this.renderSpectrum(data.spectrum, { width, height });
    }
    
    if (this.config.showBeats && this.analysisData?.tempo?.beats) {
      this.renderBeatIndicators(data, { width, height });
    }
    
    // Render additional info
    this.renderAudioInfo(data, { width, height });
  }

  private renderWaveform(waveform: Float32Array, dimensions: { width: number; height: number }): void {
    const ctx = this.getContext();
    const { width, height } = dimensions;
    
    ctx.strokeStyle = this.getColor('waveform');
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const sliceWidth = width / waveform.length;
    let x = 0;
    
    for (let i = 0; i < waveform.length; i++) {
      const v = waveform[i] * 0.5;
      const y = (v + 1) * height / 4 + height * 0.1; // Top quarter
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    ctx.stroke();
  }

  private renderSpectrum(spectrum: Float32Array, dimensions: { width: number; height: number }): void {
    const ctx = this.getContext();
    const { width, height } = dimensions;
    
    const startY = height * 0.4; // Start below waveform
    const spectrumHeight = height * 0.5;
    const barWidth = width / spectrum.length;
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, startY, 0, startY + spectrumHeight);
    gradient.addColorStop(0, this.getColor('spectrum-high'));
    gradient.addColorStop(0.5, this.getColor('spectrum-mid'));
    gradient.addColorStop(1, this.getColor('spectrum-low'));
    
    ctx.fillStyle = gradient;
    
    for (let i = 0; i < spectrum.length; i++) {
      const barHeight = spectrum[i] * spectrumHeight;
      const x = i * barWidth;
      const y = startY + spectrumHeight - barHeight;
      
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }
  }

  private renderBeatIndicators(data: AudioVisualizationData, dimensions: { width: number; height: number }): void {
    const ctx = this.getContext();
    const { width, height } = dimensions;
    
    // Beat pulse circle
    if (data.beatDetected) {
      const centerX = width - 60;
      const centerY = 60;
      const radius = 20;
      
      ctx.fillStyle = this.getColor('beat-active');
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();
      
      // Pulse ring
      ctx.strokeStyle = this.getColor('beat-pulse');
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 10, 0, 2 * Math.PI);
      ctx.stroke();
    } else {
      // Inactive beat indicator
      const centerX = width - 60;
      const centerY = 60;
      const radius = 15;
      
      ctx.strokeStyle = this.getColor('beat-inactive');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
    
    // Beat timeline
    if (this.analysisData?.tempo?.beats) {
      this.renderBeatTimeline(data, dimensions);
    }
  }

  private renderBeatTimeline(data: AudioVisualizationData, dimensions: { width: number; height: number }): void {
    const ctx = this.getContext();
    const { width, height } = dimensions;
    const beats = this.analysisData?.tempo?.beats || [];
    
    const timelineY = height - 40;
    const timelineWidth = width - 40;
    const timelineStart = 20;
    
    // Timeline background
    ctx.strokeStyle = this.getColor('timeline-bg');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(timelineStart, timelineY);
    ctx.lineTo(timelineStart + timelineWidth, timelineY);
    ctx.stroke();
    
    // Beat markers
    const currentTime = data.currentTime;
    const visibleRange = 8; // seconds
    const timeScale = timelineWidth / visibleRange;
    
    ctx.fillStyle = this.getColor('beat-marker');
    for (const beatTime of beats) {
      const relativeTime = beatTime - currentTime;
      if (relativeTime >= -2 && relativeTime <= visibleRange - 2) {
        const x = timelineStart + (relativeTime + 2) * timeScale;
        const size = Math.abs(relativeTime) < 0.1 ? 6 : 3; // Larger for current beat
        
        ctx.beginPath();
        ctx.arc(x, timelineY, size, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    
    // Current time indicator
    const currentX = timelineStart + 2 * timeScale;
    ctx.strokeStyle = this.getColor('current-time');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(currentX, timelineY - 15);
    ctx.lineTo(currentX, timelineY + 15);
    ctx.stroke();
  }

  private renderAudioInfo(data: AudioVisualizationData, dimensions: { width: number; height: number }): void {
    const ctx = this.getContext();
    const { width } = dimensions;
    
    ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = this.getColor('text');
    
    // RMS and Peak levels
    const rmsPercent = Math.round(data.rms * 100);
    const peakPercent = Math.round(data.peak * 100);
    
    ctx.fillText(`RMS: ${rmsPercent}%`, 20, 30);
    ctx.fillText(`Peak: ${peakPercent}%`, 20, 50);
    
    // BPM if available
    if (this.analysisData?.tempo?.bpm) {
      ctx.fillText(`BPM: ${this.analysisData.tempo.bpm}`, width - 120, 30);
    }
    
    // Key if available
    if (this.analysisData?.key?.key) {
      ctx.fillText(`Key: ${this.analysisData.key.key}`, width - 120, 50);
    }
  }

  private getColor(element: string): string {
    const schemes: Record<string, Record<string, string>> = {
      default: {
        'waveform': '#60A5FA',
        'spectrum-high': '#F59E0B',
        'spectrum-mid': '#10B981',
        'spectrum-low': '#3B82F6',
        'beat-active': '#10B981',
        'beat-inactive': '#6B7280',
        'beat-pulse': '#34D399',
        'beat-marker': '#F59E0B',
        'timeline-bg': '#374151',
        'current-time': '#EF4444',
        'text': '#F3F4F6'
      },
      neon: {
        'waveform': '#FF00FF',
        'spectrum-high': '#00FFFF',
        'spectrum-mid': '#FF1493',
        'spectrum-low': '#00FF00',
        'beat-active': '#FF00FF',
        'beat-inactive': '#666666',
        'beat-pulse': '#FF69B4',
        'beat-marker': '#00FFFF',
        'timeline-bg': '#333333',
        'current-time': '#FF0000',
        'text': '#FFFFFF'
      },
      warm: {
        'waveform': '#FF6B35',
        'spectrum-high': '#F7931E',
        'spectrum-mid': '#FFD23F',
        'spectrum-low': '#FCAB10',
        'beat-active': '#FF6B35',
        'beat-inactive': '#8B4513',
        'beat-pulse': '#FF8C42',
        'beat-marker': '#F7931E',
        'timeline-bg': '#8B4513',
        'current-time': '#FF4500',
        'text': '#FFF8DC'
      },
      cool: {
        'waveform': '#00CED1',
        'spectrum-high': '#1E90FF',
        'spectrum-mid': '#4169E1',
        'spectrum-low': '#0000FF',
        'beat-active': '#00CED1',
        'beat-inactive': '#696969',
        'beat-pulse': '#87CEEB',
        'beat-marker': '#1E90FF',
        'timeline-bg': '#2F4F4F',
        'current-time': '#FF1493',
        'text': '#F0F8FF'
      }
    };
    
    return schemes[this.config.colorScheme]?.[element] || schemes.default[element] || '#FFFFFF';
  }

  private calculateRMS(waveform: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < waveform.length; i++) {
      sum += waveform[i] * waveform[i];
    }
    return Math.sqrt(sum / waveform.length);
  }

  private getCanvasSize(): { width: number; height: number } {
    return {
      width: this.canvas.width,
      height: this.canvas.height
    };
  }

  private getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  private clearCanvas(): void {
    const { width, height } = this.getCanvasSize();
    this.ctx.clearRect(0, 0, width, height);
  }

  // Public methods for external control
  public onVisualizationData(callback: (data: AudioVisualizationData) => void): () => void {
    this.visualizationCallbacks.push(callback);
    return () => {
      const index = this.visualizationCallbacks.indexOf(callback);
      if (index > -1) {
        this.visualizationCallbacks.splice(index, 1);
      }
    };
  }

  public getSpectralHistory(): Float32Array[] {
    return [...this.spectralHistory];
  }

  public getCurrentAudioData(): AudioVisualizationData | null {
    if (!this.analyser || !this.isRunning) return null;
    
    const bufferLength = this.analyser.frequencyBinCount;
    const waveform = new Float32Array(bufferLength);
    const spectrumData = new Uint8Array(bufferLength);
    
    this.analyser.getFloatTimeDomainData(waveform);
    this.analyser.getByteFrequencyData(spectrumData);
    
    const spectrum = new Float32Array(spectrumData.length);
    for (let i = 0; i < spectrumData.length; i++) {
      spectrum[i] = spectrumData[i] / 255.0;
    }
    
    return {
      waveform,
      spectrum,
      currentTime: this.audioContext?.currentTime || 0,
      beatDetected: false,
      rms: this.calculateRMS(waveform),
      peak: Math.max(...Array.from(waveform).map(Math.abs))
    };
  }

  public destroy(): void {
    this.stopVisualization();
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }
    
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    this.visualizationCallbacks = [];
    this.spectralHistory = [];
  }
}

// Simple beat tracking class
class BeatTracker {
  private sensitivity: number;
  private tempo: number = 120;
  private beats: number[] = [];
  private lastBeatTime: number = 0;
  private energyHistory: number[] = [];
  private beatThreshold: number = 0.3;
  
  constructor(sensitivity: number = 0.7) {
    this.sensitivity = sensitivity;
  }
  
  public setTempo(bpm: number, beatTimes?: number[]): void {
    this.tempo = bpm;
    if (beatTimes) {
      this.beats = [...beatTimes];
    }
  }
  
  public setSensitivity(sensitivity: number): void {
    this.sensitivity = sensitivity;
    this.beatThreshold = 0.1 + (1 - sensitivity) * 0.4;
  }
  
  public detectBeat(spectrum: Float32Array, rms: number): boolean {
    // Simple energy-based beat detection
    const energy = this.calculateSpectralEnergy(spectrum);
    this.energyHistory.push(energy);
    
    if (this.energyHistory.length > 43) { // ~1 second at 60fps
      this.energyHistory.shift();
    }
    
    if (this.energyHistory.length < 10) return false;
    
    const averageEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    const variance = this.energyHistory.reduce((sum, e) => sum + Math.pow(e - averageEnergy, 2), 0) / this.energyHistory.length;
    const threshold = averageEnergy + this.sensitivity * Math.sqrt(variance);
    
    const now = performance.now();
    const timeSinceLastBeat = now - this.lastBeatTime;
    const minBeatInterval = (60 / this.tempo) * 1000 * 0.5; // Half beat interval minimum
    
    if (energy > threshold && timeSinceLastBeat > minBeatInterval) {
      this.lastBeatTime = now;
      return true;
    }
    
    return false;
  }
  
  private calculateSpectralEnergy(spectrum: Float32Array): number {
    // Focus on lower frequencies for beat detection
    const lowEnd = Math.floor(spectrum.length * 0.1);
    let energy = 0;
    
    for (let i = 0; i < lowEnd; i++) {
      energy += spectrum[i] * spectrum[i];
    }
    
    return energy / lowEnd;
  }
  
  public getCurrentBeat(): number | undefined {
    // Find closest beat to current time
    const currentTime = performance.now() / 1000;
    let closest = undefined;
    let minDistance = Infinity;
    
    for (let i = 0; i < this.beats.length; i++) {
      const distance = Math.abs(this.beats[i] - currentTime);
      if (distance < minDistance) {
        minDistance = distance;
        closest = i;
      }
    }
    
    return closest;
  }
  
  public getNextBeat(): number | undefined {
    const currentTime = performance.now() / 1000;
    
    for (const beatTime of this.beats) {
      if (beatTime > currentTime) {
        return beatTime;
      }
    }
    
    return undefined;
  }
}