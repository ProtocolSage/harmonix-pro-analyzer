import { createContext, useContext, useReducer, ReactNode, useCallback, useEffect } from 'react';
import type { AudioAnalysisResult } from '../types/audio';
import { PerformanceMonitor, PerformanceCategory } from '../utils/PerformanceMonitor';

// ============================================================================
// STATE TYPES
// ============================================================================

export interface TrackSlot {
  file: File | null;
  audioId: string | null;
  analysisData: AudioAnalysisResult | null;
  status: 'empty' | 'loading' | 'analyzed' | 'error';
  cacheVersion: string | null;
}

export interface ComparisonState {
  source: TrackSlot;
  reference: TrackSlot;
  isComparisonMode: boolean;
  activeSlot: 'source' | 'reference';
  lastSwapTimestamp: number;
}

// ============================================================================
// ACTION TYPES
// ============================================================================

export type ComparisonAction =
  | { type: 'SET_SOURCE_FILE'; payload: { file: File; audioId: string } }
  | { type: 'SET_REFERENCE_FILE'; payload: { file: File; audioId: string } }
  | { type: 'SET_SOURCE_DATA'; payload: { data: AudioAnalysisResult; cacheVersion: string } }
  | { type: 'SET_REFERENCE_DATA'; payload: { data: AudioAnalysisResult; cacheVersion: string } }
  | { type: 'CLEAR_REFERENCE' }
  | { type: 'SWAP_ROLES' }
  | { type: 'TOGGLE_COMPARISON_MODE'; payload?: boolean }
  | { type: 'SET_SLOT_STATUS'; payload: { slot: 'source' | 'reference'; status: TrackSlot['status'] } };

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialSlot: TrackSlot = {
  file: null,
  audioId: null,
  analysisData: null,
  status: 'empty',
  cacheVersion: null,
};

const initialState: ComparisonState = {
  source: { ...initialSlot },
  reference: { ...initialSlot },
  isComparisonMode: false,
  activeSlot: 'source',
  lastSwapTimestamp: 0,
};

// ============================================================================
// REDUCER
// ============================================================================

function comparisonReducer(state: ComparisonState, action: ComparisonAction): ComparisonState {
  switch (action.type) {
    case 'SET_SOURCE_FILE':
      return {
        ...state,
        source: {
          ...state.source,
          file: action.payload.file,
          audioId: action.payload.audioId,
          status: 'loading',
          analysisData: null,
        },
      };

    case 'SET_REFERENCE_FILE':
      return {
        ...state,
        reference: {
          ...state.reference,
          file: action.payload.file,
          audioId: action.payload.audioId,
          status: 'loading',
          analysisData: null,
        },
      };

    case 'SET_SOURCE_DATA':
      return {
        ...state,
        source: {
          ...state.source,
          analysisData: action.payload.data,
          cacheVersion: action.payload.cacheVersion,
          status: 'analyzed',
        },
      };

    case 'SET_REFERENCE_DATA':
      return {
        ...state,
        reference: {
          ...state.reference,
          analysisData: action.payload.data,
          cacheVersion: action.payload.cacheVersion,
          status: 'analyzed',
        },
      };

    case 'CLEAR_REFERENCE':
      return {
        ...state,
        reference: { ...initialSlot },
      };

    case 'SWAP_ROLES': {
      const now = Date.now();
      // 200ms debounce check
      if (now - state.lastSwapTimestamp < 200) return state;

      const timingId = PerformanceMonitor.startTiming('comparison.swap', PerformanceCategory.USER_INTERACTION);
      
      const newState = {
        ...state,
        source: { ...state.reference },
        reference: { ...state.source },
        lastSwapTimestamp: now,
      };

      PerformanceMonitor.endTiming(timingId);
      return newState;
    }

    case 'TOGGLE_COMPARISON_MODE':
      return {
        ...state,
        isComparisonMode: action.payload ?? !state.isComparisonMode,
      };

    case 'SET_SLOT_STATUS':
      return {
        ...state,
        [action.payload.slot]: {
          ...state[action.payload.slot],
          status: action.payload.status,
        },
      };

    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface ComparisonContextValue {
  state: ComparisonState;
  dispatch: React.Dispatch<ComparisonAction>;
  swapRoles: () => void;
  toggleComparisonMode: (enabled?: boolean) => void;
  loadReference: (file: File) => void;
  clearReference: () => void;
}

const ComparisonContext = createContext<ComparisonContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(comparisonReducer, initialState);

  const swapRoles = useCallback(() => {
    dispatch({ type: 'SWAP_ROLES' });
  }, []);

  const toggleComparisonMode = useCallback((enabled?: boolean) => {
    dispatch({ type: 'TOGGLE_COMPARISON_MODE', payload: enabled });
  }, []);

  const loadReference = useCallback((file: File) => {
    const audioId = `${file.name}-${file.size}-${file.lastModified}`;
    dispatch({ type: 'SET_REFERENCE_FILE', payload: { file, audioId } });
  }, []);

  const clearReference = useCallback(() => {
    dispatch({ type: 'CLEAR_REFERENCE' });
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 's' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        swapRoles();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [swapRoles]);

  const value: ComparisonContextValue = {
    state,
    dispatch,
    swapRoles,
    toggleComparisonMode,
    loadReference,
    clearReference,
  };

  return <ComparisonContext.Provider value={value}>{children}</ComparisonContext.Provider>;
}

// ============================================================================
// HOOKS
// ============================================================================

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (context === undefined) {
    throw new Error('useComparison must be used within a ComparisonProvider');
  }
  return context;
}
