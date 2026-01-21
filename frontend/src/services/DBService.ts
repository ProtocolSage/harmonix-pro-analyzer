import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { TrackMetadata, AnalysisArtifact, SessionState } from '../types/persistence';

export interface TrackRecord {
  id: string; // File Fingerprint
  filename: string;
  dateAdded: number;
  duration: number;
  metadata: TrackMetadata;
}

interface HarmonixDB extends DBSchema {
  tracks: {
    key: string;
    value: TrackRecord;
    indexes: { 'by-date': number };
  };
  artifacts: {
    key: [string, string, string]; // [trackId, type, artifactKey]
    value: AnalysisArtifact;
    indexes: { 'by-track': string };
  };
  sessions: {
    key: string;
    value: SessionState;
  };
}

const DB_NAME = 'harmonix_pro_v2';
const DB_VERSION = 1;

class DBService {
  private dbPromise: Promise<IDBPDatabase<HarmonixDB> | null>;
  private isSupported: boolean = true;

  constructor() {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      this.isSupported = false;
      this.dbPromise = Promise.resolve(null);
      return;
    }
    this.dbPromise = this.init();
  }

  private async init(): Promise<IDBPDatabase<HarmonixDB> | null> {
    try {
      return await openDB<HarmonixDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
          console.log(`[DBService] Upgrading from v${oldVersion} to v${newVersion}`);
          
          // Migration Block: Version 1 (Initial Platinum Schema)
          if (oldVersion < 1) {
            const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
            trackStore.createIndex('by-date', 'dateAdded');

            const artifactStore = db.createObjectStore('artifacts', { 
              keyPath: ['trackId', 'type', 'key'] 
            });
            artifactStore.createIndex('by-track', 'trackId');

            db.createObjectStore('sessions', { keyPath: 'id' });
          }

          // Future migrations: if (oldVersion < 2) { ... }
        },
        blocked() {
          console.warn('[DBService] Upgrade blocked. Please close other tabs.');
        },
        blocking() {
          console.warn('[DBService] Newer version detected elsewhere. Closing connection.');
        }
      });
    } catch (err) {
      console.error('[DBService] Failed to initialize IndexedDB:', err);
      this.isSupported = false;
      return null;
    }
  }

  // --- Tracks API ---

  async saveTrack(track: TrackRecord): Promise<void> {
    const db = await this.dbPromise;
    if (!db) return;
    await db.put('tracks', track);
  }

  async getTrack(id: string): Promise<TrackRecord | undefined> {
    const db = await this.dbPromise;
    return db?.get('tracks', id);
  }

  async getAllTracks(): Promise<TrackRecord[]> {
    const db = await this.dbPromise;
    if (!db) return [];
    return db.getAllFromIndex('tracks', 'by-date');
  }

  async deleteTrack(id: string): Promise<void> {
    const db = await this.dbPromise;
    if (!db) return;
    
    // Cascade delete artifacts first
    const artifactKeys = await db.getAllKeysFromIndex('artifacts', 'by-track', id);
    const tx = db.transaction(['tracks', 'artifacts'], 'readwrite');
    
    await Promise.all([
      ...artifactKeys.map(key => tx.objectStore('artifacts').delete(key)),
      tx.objectStore('tracks').delete(id),
      tx.done
    ]);
    
    console.log(`[DBService] Deleted track ${id} and all associated artifacts.`);
  }

  // --- Artifacts API ---

  async putArtifact(artifact: AnalysisArtifact): Promise<void> {
    const db = await this.dbPromise;
    if (!db) return;
    await db.put('artifacts', artifact);
  }

  async putArtifactsBatch(artifacts: AnalysisArtifact[]): Promise<void> {
    if (artifacts.length === 0) return;

    const db = await this.dbPromise;
    if (!db) return;

    const tx = db.transaction('artifacts', 'readwrite');
    const store = tx.objectStore('artifacts');

    for (const art of artifacts) {
      store.put(art);
    }

    await tx.done;
  }

  async getArtifact(trackId: string, type: AnalysisArtifact['type'], key: string = 'default'): Promise<AnalysisArtifact | undefined> {
    const db = await this.dbPromise;
    if (!db) return undefined;
    return db.get('artifacts', [trackId, type, key]);
  }

  async listArtifactsByType(trackId: string, type: AnalysisArtifact['type']): Promise<AnalysisArtifact[]> {
    const db = await this.dbPromise;
    if (!db) return [];
    
    // We can't use a simple get because key is [trackId, type, key]
    // Use the 'by-track' index and filter
    const artifacts = await db.getAllFromIndex('artifacts', 'by-track', trackId);
    return artifacts.filter(a => a.type === type);
  }

  async deleteArtifactsByType(trackId: string, type: AnalysisArtifact['type']): Promise<void> {
    const db = await this.dbPromise;
    if (!db) return;

    const transaction = db.transaction('artifacts', 'readwrite');
    const index = transaction.store.index('by-track');
    let cursor = await index.openCursor(trackId);

    while (cursor) {
      if (cursor.value.type === type) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }

    await transaction.done;
    console.log(`[DBService] Cleared all '${type}' artifacts for track ${trackId}`);
  }

  // --- Session API ---

  async saveSession(state: Omit<SessionState, 'id' | 'updatedAt'>): Promise<void> {
    const db = await this.dbPromise;
    if (!db) return;
    await db.put('sessions', {
      id: 'current',
      updatedAt: Date.now(),
      ...state
    } as SessionState);
  }

  async getSession(): Promise<SessionState | undefined> {
    const db = await this.dbPromise;
    return db?.get('sessions', 'current');
  }
}

export const dbService = new DBService();
