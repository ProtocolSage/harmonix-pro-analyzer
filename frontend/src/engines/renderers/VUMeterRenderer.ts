import type { IRenderer, VisualizationPayload, VisualizerConfig } from '../../types/visualizer';
import type { MeterLevels } from '../../types/metering';

type MeterPayload = VisualizationPayload & {
  levels?: MeterLevels;
};

export class VUMeterRenderer implements IRenderer {
  public readonly id = 'vu-meter';

  private wellPath: Path2D | null = null;
  private segmentPaths: Path2D[] = [];

  private w = 0;
  private h = 0;

  private meterWidth = 0;
  private meterHeight = 0;
  private meterBottom = 0;
  private segmentH = 0;

  // Platinum Luxe palette
  private readonly colors = {
    well: '#0B0C10',
    border: 'rgba(255, 215, 0, 0.10)',
    segmentOff: 'rgba(255, 255, 255, 0.035)',

    safe: '#10B981',   // emerald
    sweet: '#F59E0B',  // amber
    heat: '#FFD700',   // gold
    clip: '#EF4444',   // ruby

    peak: 'rgba(255, 215, 0, 0.85)',       // thin gold
    peakHold: 'rgba(255, 255, 255, 0.92)', // white filament
    text: '#FFD700',
    textDim: 'rgba(255, 215, 0, 0.55)',

    reflection: 'rgba(255, 255, 255, 0.02)',
    scanline: 'rgba(255,255,255,0.010)',
    corrBg: 'rgba(255,255,255,0.05)',
    corrFill: 'rgba(255, 215, 0, 0.75)',
    corrWarn: 'rgba(239, 68, 68, 0.85)',
  };

  private readonly numSegments = 40;
  private readonly segmentGap = 2;

  // Display mapping (dBFS)
  private readonly dbFloor = -60; // display floor
  private readonly dbCeil = 3;    // allow slight overs
  private readonly dbSpan = 63;   // dbCeil - dbFloor

  // Numeric readout throttle
  private lastTextPaintAt = 0;
  private readonly textPaintEveryMs = 80;

  initialize(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    _config: VisualizerConfig
  ): void {
    ctx.lineJoin = 'bevel';
    ctx.textBaseline = 'alphabetic';
  }

  resize(width: number, height: number): void {
    this.w = width;
    this.h = height;

    this.wellPath = null;
    this.segmentPaths = [];

    // Layout
    this.meterHeight = height * 0.82;
    this.meterBottom = height - 8;

    // Meter width: 60% of a half-channel
    const halfW = width / 2;
    this.meterWidth = halfW * 0.60;

    // Segment geometry
    this.segmentH =
      (this.meterHeight - (this.numSegments - 1) * this.segmentGap) /
      this.numSegments;

    // Precompute segment paths in local meter space:
    for (let i = 0; i < this.numSegments; i++) {
      const p = new Path2D();
      const y =
        this.meterBottom -
        (i + 1) * this.segmentH -
        i * this.segmentGap;
      p.rect(0, y, this.meterWidth, this.segmentH);
      this.segmentPaths.push(p);
    }

    // Cache the well path once
    this.wellPath = new Path2D();
    this.wellPath.rect(0, 0, width, height);
  }

  draw(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    data: VisualizationPayload,
    bounds: { width: number; height: number }
  ): void {
    const { width, height } = bounds;
    if (width !== this.w || height !== this.h) this.resize(width, height);

    const levels = this.extractLevels(data as MeterPayload);
    if (!levels) {
      this.drawWell(ctx, width, height);
      this.drawEmptyChannels(ctx, width, height);
      this.drawCorrelation(ctx, width, height, 1);
      return;
    }

    ctx.clearRect(0, 0, width, height);

    // 1) Well + subtle scanline
    this.drawWell(ctx, width, height);

    // 2) Channels
    const halfW = width / 2;
    this.drawChannel(ctx, levels, 0, 0, halfW, height);
    this.drawChannel(ctx, levels, 1, halfW, halfW, height);

    // 3) Correlation + numeric readouts
    const corr = this.clamp(levels.corr, -1, 1);
    this.drawCorrelation(ctx, width, height, corr);

    const now = performance.now();
    if (now - this.lastTextPaintAt >= this.textPaintEveryMs) {
      this.drawReadouts(ctx, width, height, levels, corr);
      this.lastTextPaintAt = now;
    }
  }

  private extractLevels(data: MeterPayload): MeterLevels | null {
    if (data.levels?.peak && data.levels?.rms && data.levels?.peakHold) {
      return data.levels;
    }

    const energy = data.energy;
    if (energy && typeof energy.rms === 'number') {
      const rmsDb = this.ampToDbfs(this.clamp(energy.rms, 0, 1));
      const peakDb = this.ampToDbfs(this.clamp(energy.peak ?? energy.rms, 0, 1));
      return {
        peak: [peakDb, peakDb],
        rms: [rmsDb, rmsDb],
        peakHold: [peakDb, peakDb],
        corr: 1,
      };
    }

    return null;
  }

  private drawWell(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number) {
    ctx.fillStyle = this.colors.well;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = this.colors.scanline;
    for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1);

    ctx.strokeStyle = this.colors.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    ctx.fillStyle = this.colors.reflection;
    ctx.fillRect(0, 0, width, height * 0.25);
  }

  private drawEmptyChannels(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number) {
    const halfW = width / 2;
    for (let ch = 0; ch < 2; ch++) {
      this.drawChannelCore(ctx, 0, 0, 0, ch * halfW, halfW, height, true);
    }
  }

  private drawChannel(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    levels: MeterLevels,
    channelIndex: 0 | 1,
    offsetX: number,
    channelW: number,
    height: number
  ) {
    this.drawChannelCore(
      ctx, 
      levels.peak[channelIndex], 
      levels.rms[channelIndex], 
      levels.peakHold[channelIndex], 
      offsetX, channelW, height, false
    );
  }

  private drawChannelCore(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    peakDb: number,
    rmsDb: number,
    holdDb: number,
    offsetX: number,
    channelW: number,
    height: number,
    empty: boolean
  ) {
    const meterX = offsetX + channelW * 0.20;
    const rmsIdx = empty ? -1 : this.dbToIdx(rmsDb);
    const peakIdx = empty ? -1 : this.dbToIdx(peakDb);
    const holdIdx = empty ? -1 : this.dbToIdx(holdDb);

    ctx.save();
    ctx.translate(meterX, 0);

    ctx.fillStyle = this.colors.segmentOff;
    for (let i = 0; i < this.numSegments; i++) ctx.fill(this.segmentPaths[i]);

    if (!empty) {
      const maxIdx = this.clampInt(rmsIdx, 0, this.numSegments - 1);

      for (let i = 0; i <= maxIdx; i++) {
        const color = this.getSegmentColor(i);
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.fill(this.segmentPaths[i]);
      }

      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i <= maxIdx; i++) ctx.fill(this.segmentPaths[i]);
      ctx.globalCompositeOperation = 'source-over';

      if (peakIdx >= 0 && peakIdx < this.numSegments) {
        const y = this.segmentCenterY(peakIdx);
        ctx.save();
        ctx.strokeStyle = this.colors.peak;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.colors.peak;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.meterWidth, y);
        ctx.stroke();
        ctx.restore();
      }

      if (holdIdx >= 0 && holdIdx < this.numSegments) {
        ctx.save();
        ctx.fillStyle = this.colors.peakHold;
        ctx.shadowBlur = 16;
        ctx.shadowColor = this.colors.peakHold;
        ctx.globalAlpha = 0.85;
        ctx.fill(this.segmentPaths[holdIdx]);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  private drawCorrelation(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number, corr: number) {
    const barH = Math.max(10, Math.floor(height * 0.08));
    const y = height - barH - 6;
    const x = Math.floor(width * 0.12);
    const w = Math.floor(width * 0.76);
    const mid = x + w / 2;

    ctx.save();
    ctx.fillStyle = this.colors.corrBg;
    ctx.fillRect(x, y, w, barH);

    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mid, y);
    ctx.lineTo(mid, y + barH);
    ctx.stroke();

    const fillW = (w / 2) * Math.abs(corr);
    ctx.fillStyle = corr < 0 ? this.colors.corrWarn : this.colors.corrFill;
    ctx.shadowBlur = 10;
    ctx.shadowColor = ctx.fillStyle as string;

    if (corr >= 0) ctx.fillRect(mid, y, fillW, barH);
    else ctx.fillRect(mid - fillW, y, fillW, barH);

    ctx.restore();
  }

  private drawReadouts(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number, levels: MeterLevels, corr: number) {
    const padX = Math.floor(width * 0.08);
    const y = Math.floor(height * 0.16);
    const peakMax = Math.max(levels.peak[0], levels.peak[1]);
    const rmsAvg = (levels.rms[0] + levels.rms[1]) / 2;

    ctx.save();
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    ctx.fillStyle = this.colors.text;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.colors.heat;

    ctx.fillText(`PEAK ${this.formatDb(peakMax)}`, padX, y);
    ctx.fillText(`RMS ${this.formatDb(rmsAvg)}`, padX, y + 16);

    ctx.fillStyle = this.colors.textDim;
    ctx.shadowBlur = 0;
    ctx.fillText(`CORR ${corr.toFixed(2)}`, padX, y + 32);
    ctx.restore();
  }

  private getSegmentColor(idx: number): string {
    const db = this.idxToDb(idx);
    if (db >= 0) return this.colors.clip;
    if (db >= -6) return this.colors.heat;
    if (db >= -18) return this.colors.sweet;
    return this.colors.safe;
  }

  private idxToDb(idx: number): number {
    const t = idx / (this.numSegments - 1);
    return this.dbFloor + t * this.dbSpan;
  }

  private dbToIdx(db: number): number {
    const clamped = this.clamp(db, this.dbFloor, this.dbCeil);
    const t = (clamped - this.dbFloor) / this.dbSpan;
    return this.clampInt(Math.floor(t * (this.numSegments - 1)), 0, this.numSegments - 1);
  }

  private segmentCenterY(idx: number): number {
    return this.meterBottom - idx * (this.segmentH + this.segmentGap) - this.segmentH / 2;
  }

  private ampToDbfs(amp: number): number {
    return 20 * Math.log10(Math.max(1e-8, amp));
  }

  private formatDb(db: number): string {
    if (!isFinite(db)) return '-inf dB';
    const v = Math.max(-99, Math.min(9, db));
    return `${v >= 0 ? '+' : ''}${v.toFixed(1)} dB`;
  }

  private clamp(v: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, v));
  }

    private clampInt(v: number, lo: number, hi: number): number {

      return Math.min(hi, Math.max(lo, v | 0));

    }

  

    destroy(): void {

      this.wellPath = null;

      this.segmentPaths = [];

    }

  }

  