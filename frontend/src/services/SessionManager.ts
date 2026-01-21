import { dbService, TrackRecord } from './DBService';
import { HashUtils } from '../utils/HashUtils';
import { AudioAnalysisResult } from '../types/audio';
import { 
  AnalysisArtifact, 
  FullAnalysisArtifact, 
  SessionState, 
  SpectrogramManifestArtifact, 
  SpectrogramTileSpec 
} from '../types/persistence';

/**
 * SessionManager: The authoritative orchestrator for the "Stateful Workbench".
 * Handles track deduplication, background persistence, and state rehydration.
 * 
 * IMPLEMENTS: Platinum Write Coalescing & Type-Safe Rehydration.
 */
export class SessionManager {
  private static instance: SessionManager;
  private currentTrackId: string | null = null;
  
  // Write Queue for high-frequency artifacts (e.g., Spectrogram tiles)
  private writeQueue = new Map<string, AnalysisArtifact>();
  private isProcessingQueue = false;
  private readonly BATCH_SIZE = 50;

  private constructor() {}

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private artifactCompositeKey(artifact: AnalysisArtifact): string {
    return `${artifact.trackId}:${artifact.type}:${artifact.key}`;
  }

  /**
   * Identifies a file and checks if it already exists in the library.
   * If it exists, returns the previous analysis.
   */
  public async ingestFile(file: File): Promise<{ trackId: string; existingAnalysis?: AudioAnalysisResult }> {
    const trackId = await HashUtils.computeFingerprint(file);
    this.currentTrackId = trackId;

    const [existingTrack, artifact] = await Promise.all([
      dbService.getTrack(trackId),
      dbService.getArtifact(trackId, 'full_analysis', 'default')
    ]);

    if (existingTrack && artifact && artifact.type === 'full_analysis') {
      // Runtime Schema Validation (Minimal)
      if (artifact.schemaVersion >= 1 && artifact.data && artifact.audioFingerprint === trackId) {
        console.log(`[SessionManager] Platinum Match: ${trackId}. Rehydrating v${artifact.schemaVersion} analysis.`);
        return { 
          trackId, 
          existingAnalysis: artifact.data
        };
      }
    }

    return { trackId };
  }

  /**
   * Persists a complete track analysis to the library.
   */
  public async saveAnalysis(file: File, result: AudioAnalysisResult): Promise<void> {
    const trackId = await HashUtils.computeFingerprint(file);
    
    const track: TrackRecord = {
      id: trackId,
      filename: file.name,
      dateAdded: Date.now(),
      duration: result.duration,
      metadata: {
        bpm: result.tempo?.bpm,
        key: result.key?.key && result.key?.scale ? `${result.key.key} ${result.key.scale}` : undefined,
        energy: result.spectral?.energy?.mean,
        genre: result.genre?.genre ? [result.genre.genre] : [],
        mood: result.mood ? Object.keys(result.mood) : []
      }
    };

    const artifact: FullAnalysisArtifact = {
      trackId,
      type: 'full_analysis',
      key: 'default',
      schemaVersion: 1,
      codec: 'json',
      data: result,
      updatedAt: Date.now(),
      audioFingerprint: trackId
    };

    await Promise.all([
      dbService.saveTrack(track),
      dbService.putArtifact(artifact)
    ]);

    console.log(`[SessionManager] Persisted analysis for ${file.name}`);
  }

  // --- Spectrogram Manifest Logic ---

  /**
   * Initializes or retrieves a spectrogram manifest.
   */
  public async initSpectrogramManifest(
    trackId: string, 
    fingerprint: string, 
    spec: SpectrogramTileSpec,
    totalTiles: number
  ): Promise<void> {
    const artifact: SpectrogramManifestArtifact = {
      trackId,
      type: 'spectrogram_manifest',
      key: 'default',
      schemaVersion: 1,
      codec: 'json',
      audioFingerprint: fingerprint,
      updatedAt: Date.now(),
      data: {
        tileSpec: spec,
        completedTiles: [],
        totalTiles
      }
    };
    await dbService.putArtifact(artifact);
  }

  public async readSpectrogramManifest(trackId: string): Promise<SpectrogramManifestArtifact['data'] | undefined> {
    const artifact = await dbService.getArtifact(trackId, 'spectrogram_manifest', 'default');
    if (artifact && artifact.type === 'spectrogram_manifest') {
      return artifact.data;
    }
    return undefined;
  }

  public async updateManifestCompletion(trackId: string, tileIndex: number): Promise<void> {
    const artifact = await dbService.getArtifact(trackId, 'spectrogram_manifest', 'default');
    if (artifact && artifact.type === 'spectrogram_manifest') {
      if (!artifact.data.completedTiles.includes(tileIndex)) {
        artifact.data.completedTiles.push(tileIndex);
        artifact.updatedAt = Date.now();
        await dbService.putArtifact(artifact);
      }
    }
  }

  /**
   * High-frequency write path for artifacts (tiles, segments).
   * Enqueues for batched processing to avoid IDB congestion.
   */
  public enqueueArtifact(artifact: AnalysisArtifact): void {
    this.writeQueue.set(this.artifactCompositeKey(artifact), artifact);

    if (!this.isProcessingQueue) {
      void this.processWriteQueue();
    }
  }

  private async processWriteQueue(): Promise<void> {
    if (this.writeQueue.size === 0) {
      this.isProcessingQueue = false;
      return;
    }

    this.isProcessingQueue = true;

    // Drain up to BATCH_SIZE from the Map (coalesced)
    const batch: AnalysisArtifact[] = [];
    for (const [k, v] of this.writeQueue) {
      batch.push(v);
      this.writeQueue.delete(k);
      if (batch.length >= this.BATCH_SIZE) break;
    }

    try {
      await dbService.putArtifactsBatch(batch);
    } catch (err) {
      console.error('[SessionManager] Coalesced batch write failed:', err);
    }

    // Keep draining without hammering the main thread
    setTimeout(() => void this.processWriteQueue(), 25);
  }

  /**
   * Saves the UI and Engine state for the current session.
   */
  public async updateSession(state: Omit<SessionState, 'id' | 'updatedAt' | 'lastTrackId'>): Promise<void> {
    await dbService.saveSession({
      lastTrackId: this.currentTrackId,
      ...state
    });
  }

  /**
   * Rehydrates the last session state.
   */
  public async restoreSession(): Promise<SessionState | undefined> {
    const session = await dbService.getSession();
    if (session) {
      this.currentTrackId = session.lastTrackId;
    }
    return session;
  }

  public getCurrentTrackId(): string | null {
    return this.currentTrackId;
  }
}

export const sessionManager = SessionManager.getInstance();