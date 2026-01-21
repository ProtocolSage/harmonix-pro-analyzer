export interface MeterData {
  peak: [number, number]; // L, R in dBFS
  rms: [number, number];  // L, R in dBFS
  correlation: number;    // -1 to 1
}

export class MeteringEngine {
  private context: AudioContext;
  private inputNode: GainNode;
  private analyserL: AnalyserNode;
  private analyserR: AnalyserNode;
  private splitter: ChannelSplitterNode;
  
  private bufferL: Float32Array;
  private bufferR: Float32Array;

  constructor(context: AudioContext) {
    this.context = context;
    this.inputNode = context.createGain();
    
    // Stereo metering requires splitting channels
    this.splitter = context.createChannelSplitter(2);
    this.analyserL = context.createAnalyser();
    this.analyserR = context.createAnalyser();

    // Config
    this.analyserL.fftSize = 2048;
    this.analyserR.fftSize = 2048;
    
    // Buffers
    this.bufferL = new Float32Array(2048);
    this.bufferR = new Float32Array(2048);

    // Graph
    this.inputNode.connect(this.splitter);
    this.splitter.connect(this.analyserL, 0);
    this.splitter.connect(this.analyserR, 1);
  }

  getInputNode(): AudioNode {
    return this.inputNode;
  }

  /**
   * Main polling loop for UI
   * Efficiently calculates Peak, RMS, and Correlation
   */
  getLevels(): MeterData {
    this.analyserL.getFloatTimeDomainData(this.bufferL);
    this.analyserR.getFloatTimeDomainData(this.bufferR);

    let sumSqL = 0;
    let sumSqR = 0;
    let peakL = 0;
    let peakR = 0;
    let sumLR = 0; // Cross-product for correlation

    const len = this.bufferL.length;

    for (let i = 0; i < len; i++) {
      const l = this.bufferL[i];
      const r = this.bufferR[i];

      // Peak
      if (Math.abs(l) > peakL) peakL = Math.abs(l);
      if (Math.abs(r) > peakR) peakR = Math.abs(r);

      // RMS
      sumSqL += l * l;
      sumSqR += r * r;

      // Correlation
      sumLR += l * r;
    }

    const rmsL = Math.sqrt(sumSqL / len);
    const rmsR = Math.sqrt(sumSqR / len);

    // Pearson Correlation Coefficient
    const denominator = Math.sqrt(sumSqL * sumSqR);
    const correlation = denominator === 0 ? 0 : sumLR / denominator;

    return {
      peak: [this.amplitudeToDB(peakL), this.amplitudeToDB(peakR)],
      rms: [this.amplitudeToDB(rmsL), this.amplitudeToDB(rmsR)],
      correlation
    };
  }

  private amplitudeToDB(amplitude: number): number {
    if (amplitude <= 0.00001) return -100;
    return 20 * Math.log10(amplitude);
  }

  /**
   * Get raw FFT data for Spectrum Analyzer (Mono sum)
   */
  getFFT(targetBuffer: Uint8Array): void {
    // For RTA, we can just grab one channel or average. 
    // Usually easier to grab Left for now or merge.
    // AnalyserNode.getByteFrequencyData fills the buffer.
    this.analyserL.getByteFrequencyData(targetBuffer);
  }

  dispose() {
    this.inputNode.disconnect();
    this.splitter.disconnect();
    this.analyserL.disconnect();
    this.analyserR.disconnect();
  }
}
