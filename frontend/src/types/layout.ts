/**
 * Layout types for DAW Shell components
 * Phase 0-1: Basic type definitions for shell structure
 */

export type AnalysisMode =
  | 'waveform'
  | 'spectrum'
  | 'mfcc'
  | 'tempo'
  | 'key'
  | 'segments'
  | 'meters';

export type InspectorTab = 'settings' | 'results';

export interface TopBarProps {
  projectName?: string;
  currentTime?: string;
  duration?: string;
  activeTab?: InspectorTab;
  onTabChange?: (tab: InspectorTab) => void;
}

export interface SidebarProps {
  activeMode?: AnalysisMode;
  onModeChange?: (mode: AnalysisMode) => void;
}

export interface InspectorProps {
  activeTab?: InspectorTab;
  onTabChange?: (tab: InspectorTab) => void;
}

export interface BottomDockProps {
  isPlaying?: boolean;
  currentTime?: string;
  duration?: string;
  onPlayPause?: () => void;
}

export interface MainStageProps {
  children?: React.ReactNode;
}

export interface AppShellProps {
  children?: React.ReactNode;
}
