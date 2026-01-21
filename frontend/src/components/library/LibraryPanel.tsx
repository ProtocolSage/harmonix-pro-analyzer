import React from 'react';
import { useLibrary, TrackRecord } from '../../contexts/LibraryContext';
import { TrackListItem } from './TrackListItem';
import { Library, FolderOpen, RefreshCw, Trash2 } from 'lucide-react';

interface LibraryPanelProps {
  onLoadTrack: (track: TrackRecord) => void;
}

export const LibraryPanel: React.FC<LibraryPanelProps> = ({ onLoadTrack }) => {
  const { tracks, isLoading, error, refreshLibrary, deleteTrack, clearLibrary } = useLibrary();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span>Loading Library...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-400">
        <p>{error}</p>
        <button onClick={() => refreshLibrary()} className="mt-2 text-sm underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-sm border-r border-slate-800/50">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200 font-medium">
          <Library className="w-4 h-4" />
          <span>Library</span>
          <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full">
            {tracks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => refreshLibrary()}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {tracks.length > 0 && (
            <button 
              onClick={() => clearLibrary()}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
              title="Clear Library"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1 scrollbar-thin">
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-center p-4">
            <FolderOpen className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium text-slate-400">Your library is empty</p>
            <p className="text-xs mt-1">Analyzed tracks will appear here automatically.</p>
          </div>
        ) : (
          tracks.map(track => (
            <TrackListItem 
              key={track.id} 
              track={track} 
              onDelete={deleteTrack}
              onLoad={onLoadTrack}
            />
          ))
        )}
      </div>
    </div>
  );
};
