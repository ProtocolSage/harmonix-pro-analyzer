import React from 'react';
import { Trash2, Music, Clock, Activity } from 'lucide-react';
import { TrackRecord } from '../../contexts/LibraryContext';

interface TrackListItemProps {
  track: TrackRecord;
  onDelete: (id: string) => void;
  onLoad: (track: TrackRecord) => void;
}

export const TrackListItem: React.FC<TrackListItemProps> = ({ track, onDelete, onLoad }) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (ms: number) => {
    return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="hp-track-item group">
      {/* Thumbnail / Icon Placeholder */}
      <div className="hp-track-thumb" onClick={() => onLoad(track)}>
        {/* Future: Render thumbnailBlob if exists */}
        <Music className="w-5 h-5 text-slate-400" />
      </div>

      {/* Metadata */}
      <div className="hp-track-info" onClick={() => onLoad(track)}>
        <div className="hp-track-name" title={track.filename}>
          {track.filename}
        </div>
        <div className="hp-track-meta">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {formatDuration(track.duration)}
          </span>
          <span className="text-slate-600">•</span>
          <span>{formatDate(track.dateAdded)}</span>
        </div>
        
        {/* Analysis Chips */}
        <div className="hp-track-chips">
          {track.metadata.bpm && (
            <span className="hp-chip hp-chip-blue">
              {Math.round(track.metadata.bpm)} BPM
            </span>
          )}
          {track.metadata.key && (
            <span className="hp-chip hp-chip-purple">
              {track.metadata.key}
            </span>
          )}
          {track.metadata.genre && track.metadata.genre.length > 0 && (
             <span className="hp-chip hp-chip-emerald">
               {track.metadata.genre[0]}
             </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <button 
        className="hp-track-action opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(track.id);
        }}
        title="Delete Track"
      >
        <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-400" />
      </button>
    </div>
  );
};
