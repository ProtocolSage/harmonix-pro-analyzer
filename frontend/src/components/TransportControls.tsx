import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  Activity
} from 'lucide-react';
import { RealtimeVisualizationEngine, type AudioVisualizationData } from '../engines/RealtimeVisualizationEngine';
import type { AudioAnalysisResult } from '../types/audio';

interface TransportControlsProps {
  audioFile: File | null;
  isAnalyzing: boolean;
  analysisData?: AudioAnalysisResult | null;
  onPlaybackProgress?: (currentTime: number, duration: number) => void;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
  enableRealtimeVisualization?: boolean;
}

interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isRepeat: boolean;
  isShuffle: boolean;
}

export function TransportControls({
  audioFile,
  isAnalyzing,
  analysisData,
  onPlaybackProgress,
  onPlaybackStateChange,
  enableRealtimeVisualization = true
}: TransportControlsProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const visualizationCanvasRef = useRef<HTMLCanvasElement>(null);
  const visualizationEngineRef = useRef<RealtimeVisualizationEngine | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [visualizationData, setVisualizationData] = useState<AudioVisualizationData | null>(null);

  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isMuted: false,
    isRepeat: false,
    isShuffle: false
  });

  // Initialize realtime visualization engine
  useEffect(() => {
    if (enableRealtimeVisualization && visualizationCanvasRef.current && !visualizationEngineRef.current) {
      try {
        visualizationEngineRef.current = new RealtimeVisualizationEngine(visualizationCanvasRef.current, {
          fps: 60,
          showWaveform: true,
          showSpectrum: true,
          showBeats: true,
          colorScheme: 'default'
        });

        // Set up visualization data callback
        const unsubscribe = visualizationEngineRef.current.onVisualizationData((data) => {
          setVisualizationData(data);
        });

        return () => {
          unsubscribe();
          if (visualizationEngineRef.current) {
            visualizationEngineRef.current.destroy();
            visualizationEngineRef.current = null;
          }
        };
      } catch (error) {
        console.error('Failed to initialize realtime visualization:', error);
      }
    }
  }, [enableRealtimeVisualization]);

  // Update visualization engine with analysis data
  useEffect(() => {
    if (visualizationEngineRef.current && analysisData) {
      visualizationEngineRef.current.setAnalysisData(analysisData);
    }
  }, [analysisData]);

  // Load audio file
  useEffect(() => {
    if (!audioFile || !audioRef.current) return;

    const audio = audioRef.current;
    const objectUrl = URL.createObjectURL(audioFile);

    audio.src = objectUrl;
    audio.volume = playbackState.volume;

    const handleLoadedMetadata = () => {
      setPlaybackState(prev => ({ ...prev, duration: audio.duration }));
    };

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setPlaybackState(prev => ({ ...prev, currentTime: audio.currentTime }));
        onPlaybackProgress?.(audio.currentTime, audio.duration);
      }
    };

    const handleEnded = () => {
      if (playbackState.isRepeat) {
        audio.currentTime = 0;
        audio.play();
      } else {
        setPlaybackState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
        onPlaybackStateChange?.(false);
      }
    };

    const handleError = (e: any) => {
      console.error('Audio playback error:', e);
      setPlaybackState(prev => ({ ...prev, isPlaying: false }));
      onPlaybackStateChange?.(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      URL.revokeObjectURL(objectUrl);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioFile, playbackState.isRepeat, playbackState.volume, isDragging, onPlaybackProgress, onPlaybackStateChange]);

  const togglePlay = useCallback(async () => {
    if (!audioRef.current || isAnalyzing) return;

    const audio = audioRef.current;

    try {
      if (playbackState.isPlaying) {
        audio.pause();
        setPlaybackState(prev => ({ ...prev, isPlaying: false }));
        onPlaybackStateChange?.(false);

        // Stop realtime visualization
        if (visualizationEngineRef.current) {
          visualizationEngineRef.current.stopVisualization();
        }
      } else {
        await audio.play();
        setPlaybackState(prev => ({ ...prev, isPlaying: true }));
        onPlaybackStateChange?.(true);

        // Start realtime visualization
        if (visualizationEngineRef.current && enableRealtimeVisualization) {
          visualizationEngineRef.current.startVisualization(audio);
        }
      }
    } catch (error) {
      console.error('Playback error:', error);
      setPlaybackState(prev => ({ ...prev, isPlaying: false }));
      onPlaybackStateChange?.(false);

      // Stop visualization on error
      if (visualizationEngineRef.current) {
        visualizationEngineRef.current.stopVisualization();
      }
    }
  }, [playbackState.isPlaying, isAnalyzing, onPlaybackStateChange, enableRealtimeVisualization]);

  const stop = useCallback(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    audio.pause();
    audio.currentTime = 0;
    setPlaybackState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
    onPlaybackStateChange?.(false);

    // Stop visualization
    if (visualizationEngineRef.current) {
      visualizationEngineRef.current.stopVisualization();
    }
  }, [onPlaybackStateChange]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    audio.currentTime = Math.max(0, Math.min(time, playbackState.duration));
    setPlaybackState(prev => ({ ...prev, currentTime: audio.currentTime }));
  }, [playbackState.duration]);

  const skipBackward = useCallback(() => {
    seek(playbackState.currentTime - 10);
  }, [seek, playbackState.currentTime]);

  const skipForward = useCallback(() => {
    seek(playbackState.currentTime + 10);
  }, [seek, playbackState.currentTime]);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    const newMuted = !playbackState.isMuted;

    audio.muted = newMuted;
    setPlaybackState(prev => ({ ...prev, isMuted: newMuted }));
  }, [playbackState.isMuted]);

  const setVolume = useCallback((volume: number) => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    const clampedVolume = Math.max(0, Math.min(1, volume));

    audio.volume = clampedVolume;
    audio.muted = false;
    setPlaybackState(prev => ({
      ...prev,
      volume: clampedVolume,
      isMuted: false
    }));
  }, []);

  const toggleRepeat = useCallback(() => {
    setPlaybackState(prev => ({ ...prev, isRepeat: !prev.isRepeat }));
  }, []);

  const toggleShuffle = useCallback(() => {
    setPlaybackState(prev => ({ ...prev, isShuffle: !prev.isShuffle }));
  }, []);

  // Progress bar interaction
  const handleProgressClick = useCallback((e: React.MouseEvent) => {
    if (!progressRef.current || playbackState.duration === 0) return;

    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * playbackState.duration;

    seek(newTime);
  }, [seek, playbackState.duration]);

  const handleProgressDrag = useCallback((e: React.MouseEvent) => {
    if (!progressRef.current || playbackState.duration === 0) return;

    setIsDragging(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!progressRef.current) return;

      const rect = progressRef.current.getBoundingClientRect();
      const dragX = Math.max(0, Math.min(moveEvent.clientX - rect.left, rect.width));
      const percentage = dragX / rect.width;
      const newTime = percentage * playbackState.duration;

      setPlaybackState(prev => ({ ...prev, currentTime: newTime }));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (audioRef.current) {
        audioRef.current.currentTime = playbackState.currentTime;
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [playbackState.duration, playbackState.currentTime]);

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = playbackState.duration > 0
    ? (playbackState.currentTime / playbackState.duration) * 100
    : 0;

  const isDisabled = !audioFile || isAnalyzing;

  return (
    <div className="daw-transport-controls">
      <audio ref={audioRef} preload="metadata" />

      {/* Main Controls */}
      <div className="daw-transport-buttons">
        <button
          onClick={toggleShuffle}
          disabled={isDisabled}
          className={`daw-btn-icon daw-btn-ghost ${playbackState.isShuffle ? 'daw-btn-active' : ''}`}
          title="Shuffle"
        >
          <Shuffle style={{ width: '20px', height: '20px' }} />
        </button>

        <button
          onClick={skipBackward}
          disabled={isDisabled}
          className="daw-btn-icon daw-btn-secondary"
          title="Skip backward 10s"
        >
          <SkipBack style={{ width: '24px', height: '24px' }} />
        </button>

        <button
          onClick={togglePlay}
          disabled={isDisabled}
          className="daw-btn-play"
          title={playbackState.isPlaying ? 'Pause' : 'Play'}
        >
          {playbackState.isPlaying ? (
            <Pause className="daw-btn-play-icon" />
          ) : (
            <Play className="daw-btn-play-icon" />
          )}
        </button>

        <button
          onClick={stop}
          disabled={isDisabled}
          className="daw-btn-icon daw-btn-secondary"
          title="Stop"
        >
          <Square style={{ width: '24px', height: '24px' }} />
        </button>

        <button
          onClick={skipForward}
          disabled={isDisabled}
          className="daw-btn-icon daw-btn-secondary"
          title="Skip forward 10s"
        >
          <SkipForward style={{ width: '24px', height: '24px' }} />
        </button>

        <button
          onClick={toggleRepeat}
          disabled={isDisabled}
          className={`daw-btn-icon daw-btn-ghost ${playbackState.isRepeat ? 'daw-btn-active' : ''}`}
          title="Repeat"
        >
          <Repeat style={{ width: '20px', height: '20px' }} />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="daw-transport-progress-section">
        <div
          ref={progressRef}
          className="daw-transport-progress-track"
          onClick={handleProgressClick}
          onMouseDown={handleProgressDrag}
        >
          <div
            className="daw-transport-progress-fill"
            style={{ width: `${progressPercentage}%` }}
          />
          <div
            className="daw-transport-progress-handle"
            style={{ left: `calc(${progressPercentage}% - 6px)` }}
          />
        </div>

        <div className="daw-transport-time-display">
          <span>{formatTime(playbackState.currentTime)}</span>
          <span>{formatTime(playbackState.duration)}</span>
        </div>
      </div>

      {/* Volume Control */}
      <div className="daw-transport-volume">
        <button
          onClick={toggleMute}
          disabled={isDisabled}
          className="daw-btn-icon daw-btn-ghost"
          title={playbackState.isMuted ? 'Unmute' : 'Mute'}
        >
          {playbackState.isMuted || playbackState.volume === 0 ? (
            <VolumeX style={{ width: '20px', height: '20px' }} />
          ) : (
            <Volume2 style={{ width: '20px', height: '20px' }} />
          )}
        </button>

        <div className="daw-transport-volume-slider-container">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={playbackState.isMuted ? 0 : playbackState.volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            disabled={isDisabled}
            className="daw-transport-volume-slider"
            style={{
              background: `linear-gradient(to right, var(--daw-gold-bright) 0%, var(--daw-gold-bright) ${(playbackState.isMuted ? 0 : playbackState.volume) * 100}%, var(--daw-bg-input) ${(playbackState.isMuted ? 0 : playbackState.volume) * 100}%, var(--daw-bg-input) 100%)`
            }}
          />
        </div>

        <span className="daw-transport-volume-value">
          {Math.round((playbackState.isMuted ? 0 : playbackState.volume) * 100)}%
        </span>
      </div>

      {/* Real-time Visualization */}
      {enableRealtimeVisualization && (
        <div className="daw-transport-visualization">
          <div className="daw-transport-visualization-header">
            <span className="daw-transport-visualization-title">Real-time Analysis</span>
            <div className="daw-transport-visualization-stats">
              <Activity className={playbackState.isPlaying ? 'daw-icon-active' : 'daw-icon-inactive'} style={{ width: '16px', height: '16px' }} />
              {visualizationData && (
                <div className="daw-transport-visualization-metrics">
                  <span>RMS: {Math.round(visualizationData.rms * 100)}%</span>
                  <span>Peak: {Math.round(visualizationData.peak * 100)}%</span>
                  {visualizationData.beatDetected && (
                    <span className="daw-beat-indicator">♪ Beat</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <canvas
            ref={visualizationCanvasRef}
            className="daw-transport-canvas"
          />
        </div>
      )}

      {/* File Info */}
      {audioFile && (
        <div className="daw-transport-file-info">
          <div className="daw-transport-file-name">{audioFile.name}</div>
          <div className="daw-transport-file-meta">
            {(audioFile.size / 1024 / 1024).toFixed(1)} MB • {audioFile.type || 'Unknown format'}
          </div>
        </div>
      )}

      <style>{`
        .daw-transport-controls {
          background: var(--daw-bg-raised);
          border: var(--border-thin) solid var(--border-default);
          border-radius: var(--radius-xl);
          padding: var(--space-6);
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }

        /* Main Transport Buttons */
        .daw-transport-buttons {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-3);
        }

        .daw-btn-play {
          background: linear-gradient(135deg, var(--daw-gold-bright), var(--daw-gold-deep));
          border: none;
          border-radius: var(--radius-full);
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--duration-normal) var(--ease-out);
          box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .daw-btn-play:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: var(--shadow-glow-gold), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .daw-btn-play:active:not(:disabled) {
          transform: scale(0.98);
        }

        .daw-btn-play:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .daw-btn-play-icon {
          width: 32px;
          height: 32px;
          color: var(--daw-bg-deepest);
        }

        .daw-btn-active {
          color: var(--daw-spectrum-blue) !important;
          background: rgba(33, 150, 243, 0.1) !important;
        }

        /* Progress Bar */
        .daw-transport-progress-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .daw-transport-progress-track {
          position: relative;
          height: 8px;
          background: var(--daw-bg-input);
          border-radius: var(--radius-full);
          cursor: pointer;
          box-shadow: var(--shadow-inset);
        }

        .daw-transport-progress-fill {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background: linear-gradient(90deg, var(--daw-gold-bright), var(--daw-spectrum-cyan));
          border-radius: var(--radius-full);
          transition: width 100ms linear;
        }

        .daw-transport-progress-handle {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 12px;
          height: 12px;
          background: var(--daw-gold-bright);
          border-radius: var(--radius-full);
          box-shadow: var(--shadow-sm);
          opacity: 0;
          transition: opacity var(--duration-fast) var(--ease-out);
          cursor: grab;
        }

        .daw-transport-progress-track:hover .daw-transport-progress-handle {
          opacity: 1;
        }

        .daw-transport-progress-handle:active {
          cursor: grabbing;
        }

        .daw-transport-time-display {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: var(--text-sm);
          font-family: var(--font-mono);
          color: var(--daw-metal-steel);
        }

        /* Volume Control */
        .daw-transport-volume {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-3);
        }

        .daw-transport-volume-slider-container {
          flex: 1;
          max-width: 128px;
        }

        .daw-transport-volume-slider {
          width: 100%;
          height: 6px;
          border-radius: var(--radius-full);
          appearance: none;
          cursor: pointer;
          transition: all var(--duration-fast) var(--ease-out);
        }

        .daw-transport-volume-slider:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .daw-transport-volume-slider::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: var(--radius-full);
          background: var(--daw-gold-bright);
          cursor: pointer;
          box-shadow: var(--shadow-sm);
          transition: all var(--duration-fast) var(--ease-out);
        }

        .daw-transport-volume-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: var(--shadow-md);
        }

        .daw-transport-volume-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: var(--radius-full);
          background: var(--daw-gold-bright);
          border: none;
          cursor: pointer;
          box-shadow: var(--shadow-sm);
          transition: all var(--duration-fast) var(--ease-out);
        }

        .daw-transport-volume-slider::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: var(--shadow-md);
        }

        .daw-transport-volume-value {
          font-size: var(--text-xs);
          font-family: var(--font-mono);
          color: var(--daw-metal-steel);
          min-width: 48px;
          text-align: right;
        }

        /* Visualization */
        .daw-transport-visualization {
          border-top: var(--border-thin) solid var(--border-subtle);
          padding-top: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .daw-transport-visualization-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .daw-transport-visualization-title {
          font-size: var(--text-sm);
          font-weight: var(--weight-medium);
          color: var(--daw-metal-silver);
        }

        .daw-transport-visualization-stats {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .daw-icon-active {
          color: var(--daw-success-bright);
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .daw-icon-inactive {
          color: var(--daw-metal-iron);
        }

        .daw-transport-visualization-metrics {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          font-size: var(--text-xs);
          font-family: var(--font-mono);
          color: var(--daw-metal-steel);
        }

        .daw-beat-indicator {
          color: var(--daw-success-bright);
          font-weight: var(--weight-medium);
        }

        .daw-transport-canvas {
          width: 100%;
          height: 128px;
          background: var(--daw-bg-input);
          border-radius: var(--radius-lg);
          border: var(--border-thin) solid var(--border-subtle);
          box-shadow: var(--shadow-inset);
          image-rendering: pixelated;
        }

        /* File Info */
        .daw-transport-file-info {
          text-align: center;
          border-top: var(--border-thin) solid var(--border-subtle);
          padding-top: var(--space-4);
        }

        .daw-transport-file-name {
          font-weight: var(--weight-medium);
          color: var(--daw-metal-platinum);
          font-size: var(--text-sm);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-bottom: var(--space-1);
        }

        .daw-transport-file-meta {
          font-size: var(--text-xs);
          font-family: var(--font-mono);
          color: var(--daw-metal-steel);
        }

        @media (max-width: 768px) {
          .daw-transport-controls {
            padding: var(--space-4);
          }

          .daw-transport-buttons {
            gap: var(--space-2);
          }

          .daw-btn-play {
            width: 48px;
            height: 48px;
          }

          .daw-btn-play-icon {
            width: 24px;
            height: 24px;
          }

          .daw-transport-visualization-metrics {
            flex-direction: column;
            align-items: flex-end;
            gap: var(--space-1);
          }

          .daw-transport-canvas {
            height: 96px;
          }
        }
      `}</style>
    </div>
  );
}
