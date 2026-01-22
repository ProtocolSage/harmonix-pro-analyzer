export type StereoPair = [number, number];

export interface MeterLevels {
  /** Instantaneous digital peak, dBFS */
  peak: StereoPair;

  /** Integrated RMS / VU-style level, dBFS (~300ms) */
  rms: StereoPair;

  /** Peak-hold value, dBFS */
  peakHold: StereoPair;

  /** Stereo correlation, -1..+1 */
  corr: number;
}
