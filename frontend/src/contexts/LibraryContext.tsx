import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { dbService, TrackRecord } from '../services/DBService';

export type { TrackRecord };

interface LibraryContextValue {
  tracks: TrackRecord[];
  isLoading: boolean;
  error: string | null;
  refreshLibrary: () => Promise<void>;
  deleteTrack: (id: string) => Promise<void>;
  clearLibrary: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshLibrary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allTracks = await dbService.getAllTracks();
      // Sort by date added (newest first)
      setTracks(allTracks.sort((a, b) => b.dateAdded - a.dateAdded));
    } catch (err) {
      console.error('Library load failed:', err);
      setError('Failed to load library. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  const deleteTrack = useCallback(async (id: string) => {
    try {
      await dbService.deleteTrack(id);
      // Optimistic update
      setTracks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Failed to delete track.');
      // Revert/Refresh on error
      refreshLibrary();
    }
  }, [refreshLibrary]);

  const clearLibrary = useCallback(async () => {
    if (!window.confirm('Are you sure you want to clear your entire library? This cannot be undone.')) return;
    
    try {
      const all = await dbService.getAllTracks();
      await Promise.all(all.map(t => dbService.deleteTrack(t.id)));
      setTracks([]);
    } catch (err) {
      console.error('Clear library failed:', err);
      setError('Failed to clear library.');
    }
  }, []);

  return (
    <LibraryContext.Provider value={{
      tracks,
      isLoading,
      error,
      refreshLibrary,
      deleteTrack,
      clearLibrary
    }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
}
