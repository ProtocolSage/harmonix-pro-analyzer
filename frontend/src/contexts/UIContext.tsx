import { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';
import type { InspectorTab, AnalysisMode } from '../types/layout';

// ============================================================================
// STATE TYPES
// ============================================================================

export interface UIState {
  // Appearance
  theme: 'dark' | 'light';
  precisionOnlyMode: boolean;

  // Sidebar
  sidebarCollapsed: boolean;

  // Modals
  showSettingsModal: boolean;
  showExportModal: boolean;
  showHelpModal: boolean;

  // Tabs
  inspectorTab: InspectorTab;
  analysisMode: AnalysisMode;

  // Notifications
  notifications: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    timestamp: number;
  }>;

  // Loading states
  isLoading: boolean;
  loadingMessage: string | null;
}

// ============================================================================
// ACTION TYPES
// ============================================================================

export type UIAction =
  | { type: 'TOGGLE_THEME' }
  | { type: 'SET_THEME'; payload: 'dark' | 'light' }
  | { type: 'TOGGLE_PRECISION_MODE' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR_COLLAPSED'; payload: boolean }
  | { type: 'SHOW_SETTINGS_MODAL' }
  | { type: 'HIDE_SETTINGS_MODAL' }
  | { type: 'SHOW_EXPORT_MODAL' }
  | { type: 'HIDE_EXPORT_MODAL' }
  | { type: 'SHOW_HELP_MODAL' }
  | { type: 'HIDE_HELP_MODAL' }
  | { type: 'SET_INSPECTOR_TAB'; payload: InspectorTab }
  | { type: 'SET_ANALYSIS_MODE'; payload: AnalysisMode }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<UIState['notifications'][0], 'id' | 'timestamp'> }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'SET_LOADING'; payload: { isLoading: boolean; message?: string | null } };

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: UIState = {
  theme: 'dark',
  precisionOnlyMode: false,
  sidebarCollapsed: false,
  showSettingsModal: false,
  showExportModal: false,
  showHelpModal: false,
  inspectorTab: 'settings',
  analysisMode: 'analyze',
  notifications: [],
  isLoading: false,
  loadingMessage: null,
};

// ============================================================================
// REDUCER
// ============================================================================

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'TOGGLE_THEME':
      return {
        ...state,
        theme: state.theme === 'dark' ? 'light' : 'dark',
      };

    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload,
      };

    case 'TOGGLE_PRECISION_MODE':
      return {
        ...state,
        precisionOnlyMode: !state.precisionOnlyMode,
      };

    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        sidebarCollapsed: !state.sidebarCollapsed,
      };

    case 'SET_SIDEBAR_COLLAPSED':
      return {
        ...state,
        sidebarCollapsed: action.payload,
      };

    case 'SHOW_SETTINGS_MODAL':
      return {
        ...state,
        showSettingsModal: true,
      };

    case 'HIDE_SETTINGS_MODAL':
      return {
        ...state,
        showSettingsModal: false,
      };

    case 'SHOW_EXPORT_MODAL':
      return {
        ...state,
        showExportModal: true,
      };

    case 'HIDE_EXPORT_MODAL':
      return {
        ...state,
        showExportModal: false,
      };

    case 'SHOW_HELP_MODAL':
      return {
        ...state,
        showHelpModal: true,
      };

    case 'HIDE_HELP_MODAL':
      return {
        ...state,
        showHelpModal: false,
      };

    case 'SET_INSPECTOR_TAB':
      return {
        ...state,
        inspectorTab: action.payload,
      };

    case 'SET_ANALYSIS_MODE':
      return {
        ...state,
        analysisMode: action.payload,
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            ...action.payload,
            id: `notification-${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
          },
        ],
      };

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.payload),
      };

    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload.isLoading,
        loadingMessage: action.payload.message ?? null,
      };

    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface UIContextValue {
  state: UIState;
  dispatch: React.Dispatch<UIAction>;

  // Convenience actions
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  togglePrecisionMode: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  showSettingsModal: () => void;
  hideSettingsModal: () => void;
  showExportModal: () => void;
  hideExportModal: () => void;
  showHelpModal: () => void;
  hideHelpModal: () => void;
  setInspectorTab: (tab: InspectorTab) => void;
  setAnalysisMode: (mode: AnalysisMode) => void;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  setLoading: (isLoading: boolean, message?: string | null) => void;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function UIProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(uiReducer, initialState);

  // Convenience action creators
  const toggleTheme = useCallback(() => {
    dispatch({ type: 'TOGGLE_THEME' });
  }, []);

  const setTheme = useCallback((theme: 'dark' | 'light') => {
    dispatch({ type: 'SET_THEME', payload: theme });
  }, []);

  const togglePrecisionMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_PRECISION_MODE' });
  }, []);

  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: collapsed });
  }, []);

  const showSettingsModal = useCallback(() => {
    dispatch({ type: 'SHOW_SETTINGS_MODAL' });
  }, []);

  const hideSettingsModal = useCallback(() => {
    dispatch({ type: 'HIDE_SETTINGS_MODAL' });
  }, []);

  const showExportModal = useCallback(() => {
    dispatch({ type: 'SHOW_EXPORT_MODAL' });
  }, []);

  const hideExportModal = useCallback(() => {
    dispatch({ type: 'HIDE_EXPORT_MODAL' });
  }, []);

  const showHelpModal = useCallback(() => {
    dispatch({ type: 'SHOW_HELP_MODAL' });
  }, []);

  const hideHelpModal = useCallback(() => {
    dispatch({ type: 'HIDE_HELP_MODAL' });
  }, []);

  const setInspectorTab = useCallback((tab: InspectorTab) => {
    dispatch({ type: 'SET_INSPECTOR_TAB', payload: tab });
  }, []);

  const setAnalysisMode = useCallback((mode: AnalysisMode) => {
    dispatch({ type: 'SET_ANALYSIS_MODE', payload: mode });
  }, []);

  const addNotification = useCallback((notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
  }, []);

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  }, []);

  const clearNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  }, []);

  const setLoading = useCallback((isLoading: boolean, message?: string | null) => {
    dispatch({ type: 'SET_LOADING', payload: { isLoading, message } });
  }, []);

  const value: UIContextValue = {
    state,
    dispatch,
    toggleTheme,
    setTheme,
    togglePrecisionMode,
    toggleSidebar,
    setSidebarCollapsed,
    showSettingsModal,
    hideSettingsModal,
    showExportModal,
    hideExportModal,
    showHelpModal,
    hideHelpModal,
    setInspectorTab,
    setAnalysisMode,
    addNotification,
    removeNotification,
    clearNotifications,
    setLoading,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useUI() {
  const context = useContext(UIContext);

  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }

  return context;
}

// ============================================================================
// SELECTORS
// ============================================================================

export function useUISelector<T>(selector: (state: UIState) => T): T {
  const { state } = useUI();
  return selector(state);
}

// Common selectors
export const useTheme = () => useUISelector((s) => s.theme);
export const useSidebarCollapsed = () => useUISelector((s) => s.sidebarCollapsed);
export const useInspectorTab = () => useUISelector((s) => s.inspectorTab);
export const useAnalysisMode = () => useUISelector((s) => s.analysisMode);
export const useNotifications = () => useUISelector((s) => s.notifications);
export const useIsLoading = () => useUISelector((s) => s.isLoading);
