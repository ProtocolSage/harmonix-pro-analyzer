import { PLATINUM_SPECTROGRAM_CONFIG, SPECTROGRAM_SCHEMA_VERSION } from '../config/spectrogramConfig';
import { sessionManager } from '../services/SessionManager';
import { dbService } from '../services/DBService';
import { SpectrogramTileArtifact } from '../types/persistence';

/**
 * SpectrogramAnalysisEngine: Orchestrates the tiled spectrogram generation.
 * Manages the worker, cache validation, and progressive delivery.
 */
export class SpectrogramAnalysisEngine {
  private worker: Worker | null = null;
  private isInitialized = false;

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker() {
    // Vitest/JSDOM (and some SSR contexts) don't provide Worker
    if (typeof Worker === 'undefined') {
      // Mark initialized so callers don't hang; analysis will be a no-op in this env.
      this.isInitialized = true;
      return;
    }

    const workerUrl = new URL('../workers/spectrogram-analysis-worker.js', import.meta.url);
    this.worker = new Worker(workerUrl);
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
    this.worker.postMessage({ type: 'INIT' });
  }

  private handleWorkerMessage(e: MessageEvent) {
    const { type, payload } = e.data;
    if (type === 'READY') {
      this.isInitialized = true;
    } else if (type === 'TILE_COMPLETE') {
      // Direct pass to SessionManager for persistence
      sessionManager.enqueueSpectrogramTile(payload as SpectrogramTileArtifact);

      // Dispatch event for UI rehydration
      window.dispatchEvent(new CustomEvent('SPECTROGRAM_TILE_READY', { detail: payload }));
    }
  }

  public async analyzeTrack(trackId: string, fingerprint: string, audioBuffer: AudioBuffer) {
    if (!this.worker) return;

    // 1. Check Manifest
    const manifest = await sessionManager.readSpectrogramManifest(trackId);
    const isValid = await sessionManager.validateSpectrogramCache(trackId, fingerprint, PLATINUM_SPECTROGRAM_CONFIG);

    if (manifest && isValid) {
      console.log('[SpectrogramEngine] Cache Hit. Hydrating...');
      this.hydrateFromCache(trackId);
      return;
    }

    // 2. Cache Miss or Invalidation
    console.log('[SpectrogramEngine] Cache Miss. Computing Tiles...');
    await sessionManager.invalidateSpectrogramCache(trackId);

    const duration = audioBuffer.duration;
    const totalTiles = Math.ceil(duration / PLATINUM_SPECTROGRAM_CONFIG.tileSeconds);

    await sessionManager.initSpectrogramManifest(trackId, fingerprint, PLATINUM_SPECTROGRAM_CONFIG, totalTiles);

    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // 3. Compute in Chunks (Worker)
    for (let i = 0; i < totalTiles; i++) {
      const startSec = i * PLATINUM_SPECTROGRAM_CONFIG.tileSeconds;
      const durationSec = PLATINUM_SPECTROGRAM_CONFIG.tileSeconds + PLATINUM_SPECTROGRAM_CONFIG.guardSeconds;

      this.worker.postMessage({
        type: 'COMPUTE_TILE',
        payload: {
          channelData,
          sampleRate,
          startSec,
          durationSec,
          config: { ...PLATINUM_SPECTROGRAM_CONFIG, schemaVersion: SPECTROGRAM_SCHEMA_VERSION },
          trackId,
          fingerprint
        }
      });
    }
  }

  private async hydrateFromCache(trackId: string) {
    const tiles = await dbService.listArtifactsByType(trackId, 'spectrogram_tile');
    tiles.forEach(tile => {
      window.dispatchEvent(new CustomEvent('SPECTROGRAM_TILE_READY', { detail: tile }));
    });
  }

  public destroy() {
    this.worker?.terminate();
    this.worker = null;
  }
}

export const spectrogramEngine = new SpectrogramAnalysisEngine();
