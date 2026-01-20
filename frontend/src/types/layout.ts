/**
 * Layout types for DAW Shell components
 * Phase 0-1: Basic type definitions for shell structure
 */

export type AnalysisMode =
  | 'analyze'
  | 'visualize'
  | 'library'
  | 'history'
  | 'compare';

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
  settingsSlot?: React.ReactNode;
  resultsSlot?: React.ReactNode;
}

export interface BottomDockProps {
  isPlaying?: boolean;
  currentTime?: string;
  duration?: string;
  onPlayPause?: () => void;
  onRewind?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onRepeat?: () => void;
  transportSlot?: React.ReactNode;
}

export interface MainStageProps {
  waveformSlot?: React.ReactNode;
  panelsSlot?: React.ReactNode;
  analysisData?: import('./audio').AudioAnalysisResult | null;
  isAnalyzing?: boolean;
  playbackTime?: number;
  playbackDuration?: number;
  onWaveformSeek?: (time: number) => void;
  featureToggles?: {
    keyDetection: boolean;
    bpmExtraction: boolean;
    segmentAnalysis: boolean;
    mlClassification: boolean;
  };
  activeMode?: AnalysisMode;
  children?: React.ReactNode;
}

export interface AppShellProps {
  children?: React.ReactNode;
}
