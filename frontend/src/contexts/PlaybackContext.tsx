import { createContext, useContext, useReducer, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { AudioTransportEngine } from '../engines/AudioTransportEngine';
import { MeteringEngine } from '../engines/MeteringEngine';
import { getAudioContext } from '../utils/audioContext';

// ============================================================================
// STATE TYPES
// ============================================================================

export interface PlaybackState {
  // Playback state
  isPlaying: boolean;
  currentTime: number;
  duration: number;

  // Settings
  isRepeatEnabled: boolean;
  volume: number; // 0-1
  playbackRate: number; // 0.5-2.0

  // Audio buffer
  audioBuffer: AudioBuffer | null;

  // Pending operations
  pendingSeek: number | null;
}

// ============================================================================
// ACTION TYPES
// ============================================================================

export type PlaybackAction =
  | { type: 'SET_AUDIO_BUFFER'; payload: AudioBuffer }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'TOGGLE_PLAY_PAUSE' }
  | { type: 'UPDATE_TIME'; payload: number }
  | { type: 'SEEK'; payload: number }
  | { type: 'SET_PENDING_SEEK'; payload: number | null }
  | { type: 'TOGGLE_REPEAT' }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_PLAYBACK_RATE'; payload: number }
  | { type: 'RESET' };

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: PlaybackState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  isRepeatEnabled: false,
  volume: 1.0,
  playbackRate: 1.0,
  audioBuffer: null,
  pendingSeek: null,
};

// ============================================================================
// REDUCER
// ============================================================================

function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case 'SET_AUDIO_BUFFER':
      return {
        ...state,
        audioBuffer: action.payload,
        duration: action.payload.duration,
        currentTime: 0,
        isPlaying: false,
        pendingSeek: null,
      };

    case 'PLAY':
      return {
        ...state,
        isPlaying: true,
      };

    case 'PAUSE':
      return {
        ...state,
        isPlaying: false,
      };

    case 'TOGGLE_PLAY_PAUSE':
      return {
        ...state,
        isPlaying: !state.isPlaying,
      };

    case 'UPDATE_TIME':
      // Only update if time actually changed (avoid unnecessary re-renders)
      if (Math.abs(state.currentTime - action.payload) < 0.016) {
        // Less than 1 frame at 60fps
        return state;
      }
      return {
        ...state,
        currentTime: Math.max(0, Math.min(action.payload, state.duration)),
      };

    case 'SEEK':
      return {
        ...state,
        currentTime: Math.max(0, Math.min(action.payload, state.duration)),
        pendingSeek: null,
      };

    case 'SET_PENDING_SEEK':
      return {
        ...state,
        pendingSeek: action.payload,
      };

    case 'TOGGLE_REPEAT':
      return {
        ...state,
        isRepeatEnabled: !state.isRepeatEnabled,
      };

    case 'SET_VOLUME':
      return {
        ...state,
        volume: Math.max(0, Math.min(action.payload, 1)),
      };

    case 'SET_PLAYBACK_RATE':
      return {
        ...state,
        playbackRate: Math.max(0.5, Math.min(action.payload, 2.0)),
      };

    case 'RESET':
      return {
        ...initialState,
        // Preserve audio buffer and duration
        audioBuffer: state.audioBuffer,
        duration: state.duration,
      };

    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface PlaybackContextValue {
  state: PlaybackState;
  dispatch: React.Dispatch<PlaybackAction>;
  engine: AudioTransportEngine;
  metering: MeteringEngine;

  // Convenience actions
  setAudioBuffer: (buffer: AudioBuffer) => void;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  updateTime: (time: number) => void;
  seek: (time: number) => void;
  setPendingSeek: (time: number | null) => void;
  toggleRepeat: () => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  reset: () => void;
}

const PlaybackContext = createContext<PlaybackContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(playbackReducer, initialState);
  
  const engine = useMemo(() => new AudioTransportEngine(getAudioContext()), []);
  const metering = useMemo(() => new MeteringEngine(getAudioContext()), []);

  // Connect Metering Engine to Transport Output
  useEffect(() => {
    const transportOut = engine.getOutputNode();
    const meterIn = metering.getInputNode();
    
    transportOut.connect(meterIn);
    
    return () => {
      try {
        transportOut.disconnect(meterIn);
      } catch (e) {
        // Ignore disconnection errors on unmount
      }
    };
  }, [engine, metering]);

  // Convenience action creators (memoized to prevent re-renders)
  const setAudioBuffer = useCallback((buffer: AudioBuffer) => {
    engine.setBuffer(buffer);
    dispatch({ type: 'SET_AUDIO_BUFFER', payload: buffer });
  }, [engine]);

  const play = useCallback(() => {
    engine.play(state.currentTime);
    dispatch({ type: 'PLAY' });
  }, [engine, state.currentTime]);

  const pause = useCallback(() => {
    engine.pause();
    dispatch({ type: 'PAUSE' });
  }, [engine]);

  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const updateTime = useCallback((time: number) => {
    dispatch({ type: 'UPDATE_TIME', payload: time });
  }, []);

  const seek = useCallback((time: number) => {
    engine.seek(time);
    dispatch({ type: 'SEEK', payload: time });
  }, [engine]);

  const setPendingSeek = useCallback((time: number | null) => {
    dispatch({ type: 'SET_PENDING_SEEK', payload: time });
  }, []);

  const toggleRepeat = useCallback(() => {
    const nextVal = !state.isRepeatEnabled;
    engine.setLooping(nextVal);
    if (nextVal && state.audioBuffer) {
      engine.setLoop(0, state.audioBuffer.duration);
    }
    dispatch({ type: 'TOGGLE_REPEAT' });
  }, [engine, state.isRepeatEnabled, state.audioBuffer]);

  const setVolume = useCallback((volume: number) => {
    dispatch({ type: 'SET_VOLUME', payload: volume });
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    dispatch({ type: 'SET_PLAYBACK_RATE', payload: rate });
  }, []);

  const reset = useCallback(() => {
    engine.stop();
    dispatch({ type: 'RESET' });
  }, [engine]);

  const value: PlaybackContextValue = {
    state,
    dispatch,
    engine,
    metering,
    setAudioBuffer,
    play,
    pause,
    togglePlayPause,
    updateTime,
    seek,
    setPendingSeek,
    toggleRepeat,
    setVolume,
    setPlaybackRate,
    reset,
  };

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function usePlayback() {
  const context = useContext(PlaybackContext);

  if (context === undefined) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }

  return context;
}

// ============================================================================
// SELECTORS
// ============================================================================

export function usePlaybackSelector<T>(selector: (state: PlaybackState) => T): T {
  const { state } = usePlayback();
  return selector(state);
}

// Common selectors (memoized to prevent unnecessary re-renders)
export const useIsPlaying = () => usePlaybackSelector((s) => s.isPlaying);
export const useCurrentTime = () => usePlaybackSelector((s) => s.currentTime);
export const useDuration = () => usePlaybackSelector((s) => s.duration);
export const useIsRepeatEnabled = () => usePlaybackSelector((s) => s.isRepeatEnabled);
export const useVolume = () => usePlaybackSelector((s) => s.volume);
export const usePlaybackRate = () => usePlaybackSelector((s) => s.playbackRate);
export const useAudioBuffer = () => usePlaybackSelector((s) => s.audioBuffer);

// Derived selectors
export const useProgress = () => {
  const { state } = usePlayback();
  return state.duration > 0 ? state.currentTime / state.duration : 0;
};

export const useFormattedTime = () => {
  const { state } = usePlayback();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    current: formatTime(state.currentTime),
    duration: formatTime(state.duration),
  };
};
