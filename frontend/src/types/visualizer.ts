/**
 * Real-time Visualization Pipeline Types
 * Strict definitions for the <3ms budget visualizer engine.
 */

/**
 * Configuration for the visualizer engine.
 * Controls the adaptive degradation and throttling behavior.
 */
export interface VisualizerConfig {
  /** Target frame rate for the draw loop (default: 60) */
  targetFps: number;
  /** Max rate of data payloads from worker (default: 45) */
  maxPayloadFps: number;
  /** FFT bin count for spectral rendering (default: 2048 for high quality) */
  fftSize: number;
  /** Waveform bin count (default: 1024) */
  waveformBins: number;
  /** Smoothing time constant for meter decay (0-1) */
  smoothing: number;
  /** Whether to use OffscreenCanvas (if supported) */
  useWorker: boolean;
  /** Debug mode: logs telemetry to console */
  debug: boolean;
}

import type { MeterLevels } from './metering';
import type { SpectrogramTileArtifact } from './persistence';

/**
 * Data packet sent from the DSP worker to the Visualizer Engine.
 * Designed for zero-copy transfer (Transferable or SharedArrayBuffer).
 */
export interface VisualizationPayload {
  /** Sequence number for packet loss detection */
  sequence: number;
  /** Timestamp of the audio frame (seconds) */
  timestamp: number;
  /** 
   * Raw frequency data (magnitude spectrum).
   * If using SharedArrayBuffer, this might be an offset/length pointer.
   * If Transferable, this is the Float32Array itself.
   */
  spectrum: Float32Array;
  /** 
   * Downsampled waveform data (min/max pairs or RMS).
   */
  waveform: Float32Array;
  /** 
   * Instantaneous loudness/energy metrics.
   */
  energy: {
    rms: number;
    peak: number;
    loudness: number; // LUFS momentary
  };

  /**
   * High-precision metering data (dBFS, stereo).
   * Optional to allow non-meter visualizers to reuse the payload.
   */
  levels?: MeterLevels;

  /**
   * Platinum: Full track duration for static workstation mapping.
   */
  totalDuration?: number;

  /**
   * Platinum: Inbound spectrogram tile for progressive hydration.
   */
  spectrogramTile?: SpectrogramTileArtifact;
}

/**
 * Interface for all concrete renderers (Strategies).
 * Must be strictly non-blocking.
 */
export interface IRenderer {
  /** 
   * Unique identifier for the renderer strategy 
   */
  readonly id: string;

  /**
   * Initialize resources (buffers, paths, gradients).
   * Called once when the renderer is activated.
   */
  initialize(ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, config: VisualizerConfig): void;

  /**
   * Draw a single frame.
   * STRICT BUDGET: Must complete in < 3ms.
   * @param ctx The rendering context (main or offscreen)
   * @param data The latest data payload
   * @param bounds Current canvas dimensions
   */
  draw(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    data: VisualizationPayload,
    bounds: { width: number; height: number }
  ): void;

  /**
   * Handle resize events (recalculate scales/paths).
   */
  resize(width: number, height: number): void;

  /**
   * Clean up resources (textures, buffers).
   */
  destroy(): void;
}

/**
 * Engine Lifecycle State
 */
export type VisualizerState = 
  | 'stopped' 
  | 'running' 
  | 'degraded' // Running in Lite Mode due to performance pressure
  | 'error';

/**
 * Bridge Capability Mode
 */
export type DataBridgeMode = 'shared' | 'transferable' | 'copy';
