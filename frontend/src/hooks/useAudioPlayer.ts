import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioPlayerOptions {
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
}

/**
 * Custom hook for managing audio playback
 *
 * Handles:
 * - Play/pause control
 * - Seeking
 * - Time updates (throttled to prevent excessive re-renders)
 * - Loop control
 * - Cleanup
 *
 * @param options Callback functions for time updates and playback end
 * @returns Playback state and control functions
 */
export function useAudioPlayer(options: UseAudioPlayerOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isRepeatEnabled, setIsRepeatEnabled] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new AudioContext();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Update time position (throttled via requestAnimationFrame)
  const updateTime = useCallback(() => {
    if (isPlaying && audioContextRef.current && startTimeRef.current > 0) {
      const elapsed = audioContextRef.current.currentTime - startTimeRef.current + pauseTimeRef.current;
      const newTime = Math.min(elapsed, duration);

      setCurrentTime(newTime);
      options.onTimeUpdate?.(newTime);

      // Continue updating while playing
      animationFrameRef.current = requestAnimationFrame(updateTime);
    }
  }, [isPlaying, duration, options]);

  // Start time updates when playing
  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTime);
    } else if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updateTime]);

  const loadAudio = useCallback((buffer: AudioBuffer) => {
    setAudioBuffer(buffer);
    setDuration(buffer.duration);
    setCurrentTime(0);
    pauseTimeRef.current = 0;
  }, []);

  const play = useCallback(() => {
    if (!audioBuffer || !audioContextRef.current) return;

    // Resume audio context if suspended
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    // Stop current playback if any
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {
        // Ignore if already stopped
      }
    }

    // Create new source node
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.loop = isRepeatEnabled;

    // Handle playback end
    source.onended = () => {
      if (!isRepeatEnabled) {
        setIsPlaying(false);
        setCurrentTime(duration);
        pauseTimeRef.current = duration;
        options.onEnded?.();
      }
    };

    // Start playback from current position
    source.start(0, pauseTimeRef.current);
    startTimeRef.current = audioContextRef.current.currentTime;

    sourceNodeRef.current = source;
    setIsPlaying(true);
  }, [audioBuffer, isRepeatEnabled, duration, options]);

  const pause = useCallback(() => {
    if (sourceNodeRef.current && audioContextRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {
        // Ignore if already stopped
      }

      // Store pause position
      pauseTimeRef.current = currentTime;
      sourceNodeRef.current = null;
      setIsPlaying(false);
    }
  }, [currentTime]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback(
    (time: number) => {
      const clampedTime = Math.max(0, Math.min(time, duration));
      pauseTimeRef.current = clampedTime;
      setCurrentTime(clampedTime);

      // If playing, restart from new position
      if (isPlaying) {
        pause();
        // Use setTimeout to ensure pause completes before playing
        setTimeout(() => play(), 10);
      }
    },
    [duration, isPlaying, pause, play]
  );

  const toggleRepeat = useCallback(() => {
    setIsRepeatEnabled((prev) => !prev);

    // Update source node if currently playing
    if (sourceNodeRef.current) {
      sourceNodeRef.current.loop = !isRepeatEnabled;
    }
  }, [isRepeatEnabled]);

  const reset = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {
        // Ignore if already stopped
      }
    }

    setIsPlaying(false);
    setCurrentTime(0);
    pauseTimeRef.current = 0;
    startTimeRef.current = 0;
  }, []);

  return {
    // State
    isPlaying,
    currentTime,
    duration,
    isRepeatEnabled,
    audioBuffer,

    // Actions
    loadAudio,
    play,
    pause,
    togglePlayPause,
    seek,
    toggleRepeat,
    reset,
  };
}
