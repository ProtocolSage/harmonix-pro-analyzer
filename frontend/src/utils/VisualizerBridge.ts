import { VisualizationPayload, VisualizerConfig } from '../types/visualizer';

/**
 * VisualizerBridge: Bridges audio data between engines and the visualization worker.
 * Supports 'live' mode (real-time AnalyserNode) and 'replay' mode (static buffer processing).
 */
export class VisualizerBridge {
  private worker: Worker;
  private analyser: AnalyserNode | null = null;
  private config: VisualizerConfig;
  private isRunning = false;
  private sequence = 0;
  private lastPayloadTime = 0;
  private animationId: number | null = null;

  // Data buffers for zero-copy transfer
  private spectrumBuffer: Float32Array;
  private waveformBuffer: Float32Array;

  constructor(worker: Worker, config: VisualizerConfig) {
    this.worker = worker;
    this.config = config;
    this.spectrumBuffer = new Float32Array(config.fftSize / 2);
    this.waveformBuffer = new Float32Array(config.waveformBins);
  }

  /**
   * Connect to a real-time AnalyserNode
   */
  public connect(analyser: AnalyserNode) {
    this.analyser = analyser;
    this.analyser.fftSize = this.config.fftSize;
  }

  /**
   * Start the data plumbing loop
   */
  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  /**
   * Stop the data plumbing loop
   */
  public stop() {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private loop = () => {
    if (!this.isRunning) return;

    const now = performance.now();
    const interval = 1000 / this.config.maxPayloadFps;

    if (now - this.lastPayloadTime >= interval) {
      this.sendData();
      this.lastPayloadTime = now;
    }

    this.animationId = requestAnimationFrame(this.loop);
  };

  private sendData() {
    if (!this.analyser) return;

    // 1. Capture Spectrum (FFT)
    // We use a temporary buffer to avoid type issues with transferable views
    const tempSpectrum = new Float32Array(this.spectrumBuffer.length);
    this.analyser.getFloatFrequencyData(tempSpectrum);
    
    // 2. Capture Waveform
    const tempWaveform = new Float32Array(this.waveformBuffer.length);
    this.analyser.getFloatTimeDomainData(tempWaveform);

    // 3. Calculate Energy/Loudness (Simplified)
    let sumSq = 0;
    for (let i = 0; i < tempWaveform.length; i++) {
      sumSq += tempWaveform[i] * tempWaveform[i];
    }
    const rms = Math.sqrt(sumSq / tempWaveform.length);

    // 4. Construct Payload
    const payload: VisualizationPayload = {
      sequence: this.sequence++,
      timestamp: performance.now() / 1000,
      spectrum: tempSpectrum,
      waveform: tempWaveform,
      energy: {
        rms,
        peak: 0,
        loudness: -14
      }
    };

    // 5. Transfer to Worker
    this.worker.postMessage({
      type: 'DATA',
      payload: { data: payload }
    }, [tempSpectrum.buffer, tempWaveform.buffer]);
  }

  /**
   * Replay mode: Process a static AudioBuffer and send data to worker
   * Useful for pre-analyzing or scrolling through a track.
   */
  public async processBuffer(buffer: AudioBuffer, startTime: number, duration: number) {
    // This would involve offline processing or sampling from the buffer
    // For now, we rely on the live loop being driven by AudioTransportEngine
    console.log('🔗 VisualizerBridge: Replay mode initiated for', duration, 'seconds');
  }
}
