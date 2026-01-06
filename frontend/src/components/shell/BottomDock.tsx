/**
 * BottomDock - Footer region (140px)
 * Phase 0-1: Transport controls + timecode + meters + segmentation timeline
 */

import type { BottomDockProps } from '../../types/layout';

export function BottomDock({
  isPlaying = false,
  currentTime = '00:00.000',
  duration = '00:00.000',
  onPlayPause,
}: BottomDockProps) {
  return (
    <div className="shell-bottom">
      {/* Row 1: Transport Controls */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        {/* Transport Buttons */}
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 flex items-center justify-center text-text-2 hover:text-text-1 hover:bg-bg-3 rounded-control transition-all">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          <button
            onClick={onPlayPause}
            className="w-12 h-12 flex items-center justify-center bg-accent-brand hover:bg-opacity-90 text-white rounded-full transition-all shadow-md hover:shadow-lg"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          <button className="w-10 h-10 flex items-center justify-center text-text-2 hover:text-text-1 hover:bg-bg-3 rounded-control transition-all">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
            </svg>
          </button>

          <button className="w-10 h-10 flex items-center justify-center text-text-2 hover:text-text-1 hover:bg-bg-3 rounded-control transition-all">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z"/>
            </svg>
          </button>
        </div>

        {/* Timecode */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-xl font-semibold text-text-1">
            {currentTime}
          </span>
          <span className="text-text-3">/</span>
          <span className="font-mono text-lg text-text-2">
            {duration}
          </span>
        </div>

        {/* Meters Placeholder */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <div className="text-xs font-mono text-text-3">L</div>
            <div className="text-sm font-mono font-semibold text-text-1">-2.5</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-xs font-mono text-text-3">R</div>
            <div className="text-sm font-mono font-semibold text-text-1">-10.2</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-xs font-mono text-text-3">LUFS</div>
            <div className="text-sm font-mono font-semibold text-text-1">-8.6</div>
          </div>
        </div>
      </div>

      {/* Row 2: Segmentation Timeline */}
      <div className="px-6 py-3">
        <div className="flex items-center gap-1 h-12 bg-bg-2 rounded-control overflow-hidden">
          {/* Intro */}
          <div className="h-full px-4 flex items-center justify-center bg-red-900 bg-opacity-40 border-l-2 border-red-500">
            <span className="text-xs font-medium text-text-1">Intro</span>
          </div>

          {/* Verse */}
          <div className="h-full px-6 flex items-center justify-center bg-orange-900 bg-opacity-40 border-l-2 border-orange-500">
            <span className="text-xs font-medium text-text-1">Verse</span>
          </div>

          {/* Chorus */}
          <div className="h-full px-8 flex items-center justify-center bg-blue-900 bg-opacity-50 border-l-2 border-accent-mfcc">
            <span className="text-xs font-medium text-text-1">Chorus</span>
          </div>

          {/* Verse 2 */}
          <div className="h-full px-6 flex items-center justify-center bg-green-900 bg-opacity-40 border-l-2 border-accent-tempo">
            <span className="text-xs font-medium text-text-1">Verse</span>
          </div>

          {/* Chorus 2 */}
          <div className="h-full px-6 flex items-center justify-center bg-blue-900 bg-opacity-50 border-l-2 border-accent-mfcc">
            <span className="text-xs font-medium text-text-1">Chorus</span>
          </div>

          {/* Bridge */}
          <div className="h-full px-6 flex items-center justify-center bg-purple-900 bg-opacity-40 border-l-2 border-accent-key">
            <span className="text-xs font-medium text-text-1">Bridge</span>
          </div>
        </div>
      </div>
    </div>
  );
}

BottomDock.displayName = 'BottomDock';
