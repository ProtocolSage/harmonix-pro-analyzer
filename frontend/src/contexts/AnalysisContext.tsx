import { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';
import type {
  AudioAnalysisResult,
  AnalysisProgress,
  EngineStatus,
  AnalysisOptions,
} from '../types/audio';
import type { SystemHealth } from '../utils/HealthCheck';

// ============================================================================
// STATE TYPES
// ============================================================================

export interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress?: number;
}

export interface AnalysisState {
  // Engine status
  engineStatus: EngineStatus;

  // File state
  selectedFile: File | null;

  // Analysis state
  isAnalyzing: boolean;
  analysisData: AudioAnalysisResult | null;
  analysisProgress: AnalysisProgress | null;
  analysisSteps: ProgressStep[];

  // Settings
  useStreamingAnalysis: boolean;
  analysisSettings: {
    keyDetection: boolean;
    bpmExtraction: boolean;
    segmentAnalysis: boolean;
    mlClassification: boolean;
    spectralAnalysis: boolean;
    mfccExtraction: boolean;
    structureAnalysis: boolean;
  };

  // System health
  systemHealth: SystemHealth | null;
}

// ============================================================================
// ACTION TYPES
// ============================================================================

export type AnalysisAction =
  | { type: 'SET_ENGINE_STATUS'; payload: EngineStatus }
  | { type: 'SET_FILE'; payload: File | null }
  | { type: 'START_ANALYSIS' }
  | { type: 'UPDATE_PROGRESS'; payload: AnalysisProgress }
  | { type: 'UPDATE_STEPS'; payload: ProgressStep[] }
  | { type: 'COMPLETE_ANALYSIS'; payload: AudioAnalysisResult }
  | { type: 'ERROR_ANALYSIS'; payload: string }
  | { type: 'RESET_ANALYSIS' }
  | { type: 'TOGGLE_STREAMING_ANALYSIS' }
  | { type: 'UPDATE_SETTING'; payload: { key: keyof AnalysisState['analysisSettings']; value: boolean } }
  | { type: 'UPDATE_SYSTEM_HEALTH'; payload: AnalysisState['systemHealth'] };

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: AnalysisState = {
  engineStatus: { status: 'initializing' },
  selectedFile: null,
  isAnalyzing: false,
  analysisData: null,
  analysisProgress: null,
  analysisSteps: [],
  useStreamingAnalysis: false,
  analysisSettings: {
    keyDetection: true,
    bpmExtraction: true,
    segmentAnalysis: true,
    mlClassification: false,
    spectralAnalysis: true,
    mfccExtraction: true,
    structureAnalysis: true,
  },
  systemHealth: null,
};

// ============================================================================
// REDUCER
// ============================================================================

function analysisReducer(state: AnalysisState, action: AnalysisAction): AnalysisState {
  switch (action.type) {
    case 'SET_ENGINE_STATUS':
      return {
        ...state,
        engineStatus: action.payload,
      };

    case 'SET_FILE':
      return {
        ...state,
        selectedFile: action.payload,
        // Reset analysis data when new file selected
        analysisData: null,
        analysisProgress: null,
        analysisSteps: [],
      };

    case 'START_ANALYSIS':
      return {
        ...state,
        isAnalyzing: true,
        analysisData: null,
        analysisProgress: { stage: 'decoding', percentage: 0, progress: 0, currentStep: 'Starting analysis...', completedSteps: [] },
        analysisSteps: [
          { id: 'preprocessing', label: 'Preprocessing', status: 'in_progress' },
          { id: 'spectral', label: 'Spectral Analysis', status: 'pending' },
          { id: 'tempo', label: 'Tempo Detection', status: 'pending' },
          { id: 'key', label: 'Key Detection', status: 'pending' },
          { id: 'finalize', label: 'Finalizing', status: 'pending' },
        ],
      };

    case 'UPDATE_PROGRESS':
      return {
        ...state,
        analysisProgress: action.payload,
        // Update step status based on progress
        analysisSteps: state.analysisSteps.map((step) => {
          if (action.payload.currentStep === step.id) {
            return { ...step, status: 'in_progress' as const, progress: action.payload.percentage };
          }
          if (action.payload.completedSteps?.includes(step.id)) {
            return { ...step, status: 'completed' as const, progress: 100 };
          }
          return step;
        }),
      };

    case 'UPDATE_STEPS':
      return {
        ...state,
        analysisSteps: action.payload,
      };

    case 'COMPLETE_ANALYSIS':
      return {
        ...state,
        isAnalyzing: false,
        analysisData: action.payload,
        analysisProgress: {
          stage: 'complete',
          percentage: 100,
          progress: 1,
          currentStep: 'Analysis complete',
          completedSteps: state.analysisSteps.map((s) => s.id),
        },
        analysisSteps: state.analysisSteps.map((step) => ({
          ...step,
          status: 'completed' as const,
          progress: 100,
        })),
      };

    case 'ERROR_ANALYSIS':
      return {
        ...state,
        isAnalyzing: false,
        analysisProgress: {
          stage: 'error' as any,
          percentage: 0,
          progress: 0,
          currentStep: `Error: ${action.payload}`,
          completedSteps: [],
        },
        analysisSteps: state.analysisSteps.map((step) =>
          step.status === 'in_progress'
            ? { ...step, status: 'error' as const }
            : step
        ),
      };

    case 'RESET_ANALYSIS':
      return {
        ...state,
        isAnalyzing: false,
        analysisData: null,
        analysisProgress: null,
        analysisSteps: [],
      };

    case 'TOGGLE_STREAMING_ANALYSIS':
      return {
        ...state,
        useStreamingAnalysis: !state.useStreamingAnalysis,
      };

    case 'UPDATE_SETTING':
      return {
        ...state,
        analysisSettings: {
          ...state.analysisSettings,
          [action.payload.key]: action.payload.value,
        },
      };

    case 'UPDATE_SYSTEM_HEALTH':
      return {
        ...state,
        systemHealth: action.payload,
      };

    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface AnalysisContextValue {
  state: AnalysisState;
  dispatch: React.Dispatch<AnalysisAction>;

  // Convenience actions
  setEngineStatus: (status: EngineStatus) => void;
  setFile: (file: File | null) => void;
  startAnalysis: () => void;
  updateProgress: (progress: AnalysisProgress) => void;
  completeAnalysis: (result: AudioAnalysisResult) => void;
  errorAnalysis: (error: string) => void;
  resetAnalysis: () => void;
  toggleStreamingAnalysis: () => void;
  updateSetting: (key: keyof AnalysisState['analysisSettings'], value: boolean) => void;
  updateSystemHealth: (health: AnalysisState['systemHealth']) => void;
}

const AnalysisContext = createContext<AnalysisContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(analysisReducer, initialState);

  // Convenience action creators
  const setEngineStatus = useCallback((status: EngineStatus) => {
    dispatch({ type: 'SET_ENGINE_STATUS', payload: status });
  }, []);

  const setFile = useCallback((file: File | null) => {
    dispatch({ type: 'SET_FILE', payload: file });
  }, []);

  const startAnalysis = useCallback(() => {
    dispatch({ type: 'START_ANALYSIS' });
  }, []);

  const updateProgress = useCallback((progress: AnalysisProgress) => {
    dispatch({ type: 'UPDATE_PROGRESS', payload: progress });
  }, []);

  const completeAnalysis = useCallback((result: AudioAnalysisResult) => {
    dispatch({ type: 'COMPLETE_ANALYSIS', payload: result });
  }, []);

  const errorAnalysis = useCallback((error: string) => {
    dispatch({ type: 'ERROR_ANALYSIS', payload: error });
  }, []);

  const resetAnalysis = useCallback(() => {
    dispatch({ type: 'RESET_ANALYSIS' });
  }, []);

  const toggleStreamingAnalysis = useCallback(() => {
    dispatch({ type: 'TOGGLE_STREAMING_ANALYSIS' });
  }, []);

  const updateSetting = useCallback((key: keyof AnalysisState['analysisSettings'], value: boolean) => {
    dispatch({ type: 'UPDATE_SETTING', payload: { key, value } });
  }, []);

  const updateSystemHealth = useCallback((health: AnalysisState['systemHealth']) => {
    dispatch({ type: 'UPDATE_SYSTEM_HEALTH', payload: health });
  }, []);

  const value: AnalysisContextValue = {
    state,
    dispatch,
    setEngineStatus,
    setFile,
    startAnalysis,
    updateProgress,
    completeAnalysis,
    errorAnalysis,
    resetAnalysis,
    toggleStreamingAnalysis,
    updateSetting,
    updateSystemHealth,
  };

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useAnalysis() {
  const context = useContext(AnalysisContext);

  if (context === undefined) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }

  return context;
}

// ============================================================================
// SELECTORS (for optimized re-renders)
// ============================================================================

export function useAnalysisSelector<T>(selector: (state: AnalysisState) => T): T {
  const { state } = useAnalysis();
  return selector(state);
}

// Common selectors
export const useEngineStatus = () => useAnalysisSelector((s) => s.engineStatus);
export const useSelectedFile = () => useAnalysisSelector((s) => s.selectedFile);
export const useIsAnalyzing = () => useAnalysisSelector((s) => s.isAnalyzing);
export const useAnalysisData = () => useAnalysisSelector((s) => s.analysisData);
export const useAnalysisProgress = () => useAnalysisSelector((s) => s.analysisProgress);
export const useAnalysisSteps = () => useAnalysisSelector((s) => s.analysisSteps);
export const useAnalysisSettings = () => useAnalysisSelector((s) => s.analysisSettings);
