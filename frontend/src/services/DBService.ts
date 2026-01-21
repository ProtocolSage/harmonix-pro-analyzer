import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { AudioAnalysisResult } from '../types/audio';

interface TrackRecord {
  id: string; // File Fingerprint
  filename: string;
  dateAdded: number;
  duration: number;
  thumbnailBlob?: Blob; // PNG data
  analysis: {
    spectral: {
      bpm?: number;
      key?: string;
      energy?: number;
    };
    tags: {
      genre: string[];
      mood: string[];
    };
    full?: AudioAnalysisResult; // The heavy blob
  };
}

interface SessionState {
  id: 'current'; // Singleton
  updatedAt: number;
  visualizer: {
    mode: string;
    isActive: boolean;
  };
  transport: {
    loop: [number, number] | null;
    volume: number;
  };
  layout: {
    sidebarOpen: boolean;
    activeTab: string;
  };
}

interface HarmonixDB extends DBSchema {
  tracks: {
    key: string;
    value: TrackRecord;
    indexes: { 'by-date': number };
  };
  sessions: {
    key: string;
    value: SessionState;
  };
}

const DB_NAME = 'harmonix_db';
const DB_VERSION = 1;

class DBService {
  private dbPromise: Promise<IDBPDatabase<HarmonixDB>> | null = null;
  private isSupported: boolean = true;

  constructor() {
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB not supported. Session persistence disabled.');
      this.isSupported = false;
      return;
    }
    this.init();
  }

  private init() {
    this.dbPromise = openDB<HarmonixDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Tracks Store
        if (!db.objectStoreNames.contains('tracks')) {
          const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
          trackStore.createIndex('by-date', 'dateAdded');
        }

        // Sessions Store
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }
      },
      blocked() {
        console.warn('DB Upgrade blocked. Close other tabs.');
      },
      blocking() {
        console.warn('DB Upgrade blocking. Closing connection...');
      },
      terminated() {
        console.error('DB Connection terminated unexpectedly.');
      },
    }).catch(err => {
        console.error('Failed to open database:', err);
        this.isSupported = false;
        return null as any; // Allow app to continue without DB
    });
  }

  // --- Tracks API ---

  async saveTrack(track: TrackRecord): Promise<void> {
    if (!this.isSupported || !this.dbPromise) return;
    try {
      const db = await this.dbPromise;
      await db.put('tracks', track);
    } catch (error) {
      this.handleError('saveTrack', error);
    }
  }

  async getTrack(id: string): Promise<TrackRecord | undefined> {
    if (!this.isSupported || !this.dbPromise) return undefined;
    try {
      const db = await this.dbPromise;
      return await db.get('tracks', id);
    } catch (error) {
      this.handleError('getTrack', error);
      return undefined;
    }
  }

  async getAllTracks(): Promise<TrackRecord[]> {
    if (!this.isSupported || !this.dbPromise) return [];
    try {
      const db = await this.dbPromise;
      return await db.getAllFromIndex('tracks', 'by-date');
    } catch (error) {
      this.handleError('getAllTracks', error);
      return [];
    }
  }

  async deleteTrack(id: string): Promise<void> {
    if (!this.isSupported || !this.dbPromise) return;
    try {
      const db = await this.dbPromise;
      await db.delete('tracks', id);
    } catch (error) {
      this.handleError('deleteTrack', error);
    }
  }

  // --- Session API ---

  async saveSession(state: Omit<SessionState, 'id' | 'updatedAt'>): Promise<void> {
    if (!this.isSupported || !this.dbPromise) return;
    try {
      const db = await this.dbPromise;
      await db.put('sessions', {
        id: 'current',
        updatedAt: Date.now(),
        ...state
      });
    } catch (error) {
      this.handleError('saveSession', error);
    }
  }

  async getSession(): Promise<SessionState | undefined> {
    if (!this.isSupported || !this.dbPromise) return undefined;
    try {
      const db = await this.dbPromise;
      return await db.get('sessions', 'current');
    } catch (error) {
      this.handleError('getSession', error);
      return undefined;
    }
  }

  // --- Utilities ---

  private handleError(operation: string, error: any) {
    console.error(`DBService Error [${operation}]:`, error);
    
    // Quota Exceeded Check
    if (error && error.name === 'QuotaExceededError') {
      alert('Storage Quota Exceeded. Please delete some tracks from the Library to save more.');
      // Optionally trigger an event to UI
    }
  }
}

export const dbService = new DBService();
