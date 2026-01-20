import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { AudioAnalysisResult } from '../../types/audio';
import { RealtimeVisualizationEngine, type AudioVisualizationData } from '../../engines/RealtimeVisualizationEngine';
import { AudioTransportEngine } from '../../engines/AudioTransportEngine';
import { getAudioContext, resumeAudioContext } from '../../utils/audioContext';
import { usePlayback } from '../../contexts/PlaybackContext';

export interface UseTransportControllerArgs {
  audioFile: File | null;
  isAnalyzing: boolean;
  analysisData?: AudioAnalysisResult | null;
  onPlaybackProgress?: (currentTime: number, duration: number) => void;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
  enableRealtimeVisualization?: boolean;
  seekToTime?: number | null;
  onSeekApplied?: () => void;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isRepeat: boolean;
  isShuffle: boolean;
}

export function useTransportController(args: UseTransportControllerArgs) {
  const {
    audioFile,
    isAnalyzing,
    analysisData,
    onPlaybackProgress,
    onPlaybackStateChange,
    enableRealtimeVisualization = true,
    seekToTime,
    onSeekApplied,
  } = args;

  const progressRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const progressHandleRef = useRef<HTMLDivElement>(null);
  const visualizationCanvasRef = useRef<HTMLCanvasElement>(null);
  const visualizationEngineRef = useRef<RealtimeVisualizationEngine | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [visualizationData, setVisualizationData] = useState<AudioVisualizationData | null>(null);

  const { engine: transport } = usePlayback();

  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isMuted: false,
    isRepeat: false,
    isShuffle: false
  });

  // Initialize transport listeners
  useEffect(() => {
    const unsubscribe = transport.onTick((time) => {
      const dur = transport.getDuration();
      
      // Light Path: Direct DOM Update
      if (progressFillRef.current) {
        const percent = dur > 0 ? (time / dur) * 100 : 0;
        progressFillRef.current.style.width = `${percent}%`;
        if (progressHandleRef.current) {
          progressHandleRef.current.style.left = `calc(${percent}% - 6px)`;
        }
      }

      if (!isDragging) {
        // We still update React state for time readouts, but throttled?
        // Or just let it be for now since it's only one component.
        // Actually, the spec says "No React render churn".
        // Let's only update state when playing state changes or on seek.
        // For time readouts, we might need a separate "light path" for the text too.
      }
    });

    transport.onHeavySeek((time, signal) => {
      console.log(`🚀 Transport: Heavy seek to ${time.toFixed(2)}s`);
    });

    return unsubscribe;
  }, [transport, isDragging]);

  // Load and decode audio file for transport
  useEffect(() => {
    if (!audioFile) {
      setPlaybackState(prev => ({ ...prev, duration: 0, currentTime: 0, isPlaying: false }));
      return;
    }

    const loadAudio = async () => {
      try {
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = await getAudioContext().decodeAudioData(arrayBuffer);
        transport.setBuffer(buffer);
        setPlaybackState(prev => ({ ...prev, duration: buffer.duration }));
        onPlaybackProgress?.(0, buffer.duration);
      } catch (error) {
        console.error('Failed to load audio for transport:', error);
      }
    };

    loadAudio();
  }, [audioFile, transport, onPlaybackProgress]);

  // Initialize realtime visualization engine
  const visualizationEnabled = enableRealtimeVisualization;

  useEffect(() => {
    if (visualizationEnabled && visualizationCanvasRef.current && !visualizationEngineRef.current) {
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

        // Hook up sync bridge
        const bridge = transport.getSyncBridge();
        // If visualizationEngineRef.current supports it (it will after I update it)
        if ((visualizationEngineRef.current as any).setSyncBridge) {
            (visualizationEngineRef.current as any).setSyncBridge(bridge);
        }

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
  }, [visualizationEnabled, transport]);

  // Update visualization engine with analysis data
  useEffect(() => {
    if (visualizationEngineRef.current && analysisData) {
      visualizationEngineRef.current.setAnalysisData(analysisData);
    }
  }, [analysisData]);

  const togglePlay = useCallback(async () => {
    if (isAnalyzing || !audioFile) return;

    await resumeAudioContext();

    try {
      if (playbackState.isPlaying) {
        transport.pause();
        setPlaybackState(prev => ({ ...prev, isPlaying: false }));
        onPlaybackStateChange?.(false);

        if (visualizationEngineRef.current) {
          visualizationEngineRef.current.stopVisualization();
        }
      } else {
        transport.play();
        setPlaybackState(prev => ({ ...prev, isPlaying: true }));
        onPlaybackStateChange?.(true);

        if (visualizationEngineRef.current && enableRealtimeVisualization) {
          // RealtimeVisualizationEngine currently expects an HTMLAudioElement
          // I will need to update it to use the sync bridge instead
          // For now, we'll just start its internal loop
          visualizationEngineRef.current.startVisualization(null as any);
        }
      }
    } catch (error) {
      console.error('Playback error:', error);
      setPlaybackState(prev => ({ ...prev, isPlaying: false }));
      onPlaybackStateChange?.(false);
    }
  }, [playbackState.isPlaying, isAnalyzing, audioFile, transport, onPlaybackStateChange, enableRealtimeVisualization]);

  const stopPlayback = useCallback(() => {
    transport.stop();
    setPlaybackState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
    onPlaybackStateChange?.(false);

    if (visualizationEngineRef.current) {
      visualizationEngineRef.current.stopVisualization();
    }
  }, [transport, onPlaybackStateChange]);

  const seek = useCallback((time: number) => {
    transport.seek(time);
    setPlaybackState(prev => ({ ...prev, currentTime: time }));
  }, [transport]);

  const skipBackward = useCallback(() => {
    seek(playbackState.currentTime - 10);
  }, [seek, playbackState.currentTime]);

  const skipForward = useCallback(() => {
    seek(playbackState.currentTime + 10);
  }, [seek, playbackState.currentTime]);

  const toggleMute = useCallback(() => {
    const newMuted = !playbackState.isMuted;
    // Handle volume/mute in transport if needed
    setPlaybackState(prev => ({ ...prev, isMuted: newMuted }));
  }, [playbackState.isMuted]);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    // Handle volume in transport if needed
    setPlaybackState(prev => ({
      ...prev,
      volume: clampedVolume,
      isMuted: false
    }));
  }, []);

  const toggleRepeat = useCallback(() => {
    const newVal = !playbackState.isRepeat;
    transport.setLooping(newVal);
    if (newVal) {
        transport.setLoop(0, transport.getDuration());
    }
    setPlaybackState(prev => ({ ...prev, isRepeat: newVal }));
  }, [transport]);

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
      // Direct UI update during drag
      if (args.onPlaybackProgress) args.onPlaybackProgress(newTime, playbackState.duration);
    };

    const handleMouseUp = (moveEvent: MouseEvent) => {
      const rect = progressRef.current!.getBoundingClientRect();
      const dragX = Math.max(0, Math.min(moveEvent.clientX - rect.left, rect.width));
      const percentage = dragX / rect.width;
      const newTime = percentage * playbackState.duration;

      setIsDragging(false);
      transport.seek(newTime);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [playbackState.duration, transport, args]);

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

  // Apply external seek requests (e.g., waveform click)
  useEffect(() => {
    if (seekToTime === null || seekToTime === undefined) return;

    const target = playbackState.duration
      ? Math.max(0, Math.min(seekToTime, playbackState.duration))
      : Math.max(0, seekToTime);

    transport.seek(target);
    setPlaybackState(prev => ({ ...prev, currentTime: target }));
    onPlaybackProgress?.(target, playbackState.duration || transport.getDuration());
    onSeekApplied?.();
  }, [seekToTime, playbackState.duration, transport, onPlaybackProgress, onSeekApplied]);

  return {
    progressRef,
    progressFillRef,
    progressHandleRef,
    visualizationCanvasRef,
    visualizationEngineRef,
    visualizationData,
    setVisualizationData,
    isDragging,
    setIsDragging,
    playbackState,
    setPlaybackState,
    visualizationEnabled,
    isDisabled,
    progressPercentage,
    formatTime,
    togglePlay,
    stopPlayback,
    skipBackward,
    skipForward,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    setVolume,
    handleProgressClick,
    handleProgressDrag,
  };
}

export type TransportController = ReturnType<typeof useTransportController>;
