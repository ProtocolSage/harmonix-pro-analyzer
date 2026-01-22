import { MeterLevels } from '../types/metering';

export class MeteringEngine {
  private context: AudioContext;
  private inputNode: GainNode;
  private analyserL: AnalyserNode;
  private analyserR: AnalyserNode;
  private splitter: ChannelSplitterNode;
  
  private bufferL: Float32Array;
  private bufferR: Float32Array;

  // Ballistics state
  private currentPeak: [number, number] = [-100, -100];
  private currentPeakHold: [number, number] = [-100, -100];
  private peakHoldTimer: [number, number] = [0, 0];
  
  // RMS Rolling Window (300ms)
  private rmsWindowSize: number;
  private rmsSumSq: [number, number] = [0, 0];
  private rmsHistoryL: Float32Array;
  private rmsHistoryR: Float32Array;
  private rmsPtr = 0;

  private lastTime = 0;

  constructor(context: AudioContext) {
    this.context = context;
    this.inputNode = context.createGain();
    
    this.splitter = context.createChannelSplitter(2);
    this.analyserL = context.createAnalyser();
    this.analyserR = context.createAnalyser();

    const fftSize = 2048;
    this.analyserL.fftSize = fftSize;
    this.analyserR.fftSize = fftSize;
    
    this.bufferL = new Float32Array(fftSize);
    this.bufferR = new Float32Array(fftSize);

    this.rmsWindowSize = Math.ceil((0.3 * context.sampleRate) / fftSize);
    this.rmsHistoryL = new Float32Array(this.rmsWindowSize);
    this.rmsHistoryR = new Float32Array(this.rmsWindowSize);

    this.inputNode.connect(this.splitter);
    this.splitter.connect(this.analyserL, 0);
    this.splitter.connect(this.analyserR, 1);
    
    this.lastTime = performance.now();
  }

  getInputNode(): AudioNode {
    return this.inputNode;
  }

  getLevels(): MeterLevels {
    const now = performance.now();
    const deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;

    const bufL: any = this.bufferL;
    const bufR: any = this.bufferR;
    this.analyserL.getFloatTimeDomainData(bufL);
    this.analyserR.getFloatTimeDomainData(bufR);

    let framePeakL = 0;
    let framePeakR = 0;
    let frameSumSqL = 0;
    let frameSumSqR = 0;
    let sumLR = 0;

    const len = this.bufferL.length;

    for (let i = 0; i < len; i++) {
      const l = this.bufferL[i];
      const r = this.bufferR[i];

      const absL = Math.abs(l);
      const absR = Math.abs(r);

      if (absL > framePeakL) framePeakL = absL;
      if (absR > framePeakR) framePeakR = absR;

      frameSumSqL += l * l;
      frameSumSqR += r * r;
      sumLR += l * r;
    }

    const decayFactor = Math.pow(0.001, deltaTime / 1.5);
    
    this.currentPeak[0] = Math.max(framePeakL, this.currentPeak[0] * decayFactor);
    this.currentPeak[1] = Math.max(framePeakR, this.currentPeak[1] * decayFactor);

    for (let ch = 0; ch < 2; ch++) {
        const p = ch === 0 ? framePeakL : framePeakR;
        if (p >= this.currentPeakHold[ch]) {
            this.currentPeakHold[ch] = p;
            this.peakHoldTimer[ch] = 2.0;
        } else {
            this.peakHoldTimer[ch] -= deltaTime;
            if (this.peakHoldTimer[ch] <= 0) {
                this.currentPeakHold[ch] = Math.max(p, this.currentPeakHold[ch] * decayFactor);
            }
        }
    }

    this.rmsSumSq[0] -= this.rmsHistoryL[this.rmsPtr];
    this.rmsSumSq[1] -= this.rmsHistoryR[this.rmsPtr];
    
    this.rmsHistoryL[this.rmsPtr] = frameSumSqL / len;
    this.rmsHistoryR[this.rmsPtr] = frameSumSqR / len;
    
    this.rmsSumSq[0] += this.rmsHistoryL[this.rmsPtr];
    this.rmsSumSq[1] += this.rmsHistoryR[this.rmsPtr];
    
    this.rmsPtr = (this.rmsPtr + 1) % this.rmsWindowSize;
    
    const rollingRMSL = Math.sqrt(this.rmsSumSq[0] / this.rmsWindowSize);
    const rollingRMSR = Math.sqrt(this.rmsSumSq[1] / this.rmsWindowSize);

    const denominator = Math.sqrt(frameSumSqL * frameSumSqR);
    const correlation = denominator < 0.00001 ? 0 : sumLR / denominator;

    return {
      peak: [this.amplitudeToDB(this.currentPeak[0]), this.amplitudeToDB(this.currentPeak[1])],
      rms: [this.amplitudeToDB(rollingRMSL), this.amplitudeToDB(rollingRMSR)],
      peakHold: [this.amplitudeToDB(this.currentPeakHold[0]), this.amplitudeToDB(this.currentPeakHold[1])],
      corr: correlation
    };
  }

  private amplitudeToDB(amplitude: number): number {
    if (amplitude <= 0.00001) return -100;
    return 20 * Math.log10(amplitude);
  }

  getFFT(targetBuffer: Uint8Array): void {
    const buf: any = targetBuffer;
    this.analyserL.getByteFrequencyData(buf);
  }

  dispose() {
    this.inputNode.disconnect();
    this.splitter.disconnect();
    this.analyserL.disconnect();
    this.analyserR.disconnect();
  }
}
