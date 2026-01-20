/**
 * Tab visibility utilities
 * Determines which analysis tabs should be visible/enabled based on available data
 */

import type { AudioAnalysisResult } from '../types/audio';

export type TabType = 'overview' | 'spectral' | 'musical' | 'rhythm' | 'technical';

export interface TabVisibility {
  /** Whether the tab should be rendered at all */
  visible: boolean;
  /** Whether the tab should be dimmed/disabled */
  dimmed: boolean;
  /** Tooltip explaining why the tab is unavailable or partial */
  tooltip?: string;
  /** Percentage of expected data present (0-100) */
  dataCompleteness: number;
}

/**
 * Check if a tab has sufficient data to be displayed
 */
export function getTabVisibility(
  tabId: TabType,
  analysisData: AudioAnalysisResult | null
): TabVisibility {
  if (!analysisData) {
    return {
      visible: false,
      dimmed: true,
      tooltip: 'No analysis data available',
      dataCompleteness: 0,
    };
  }

  switch (tabId) {
    case 'overview':
      // Overview always visible if we have any analysis data
      return {
        visible: true,
        dimmed: false,
        dataCompleteness: 100,
      };

    case 'spectral': {
      const hasSpectral = !!analysisData.spectral;
      const hasMfcc = !!analysisData.mfcc;
      const dataPresent = [hasSpectral, hasMfcc].filter(Boolean).length;
      const completeness = (dataPresent / 2) * 100;

      if (completeness === 0) {
        return {
          visible: false,
          dimmed: true,
          tooltip: 'Spectral analysis was not included in this analysis',
          dataCompleteness: 0,
        };
      }

      return {
        visible: true,
        dimmed: completeness < 100,
        tooltip: completeness < 100 ? 'Partial spectral data available' : undefined,
        dataCompleteness: completeness,
      };
    }

    case 'musical': {
      const hasKey = !!analysisData.key;
      const hasMood = !!analysisData.mood;
      const hasGenre = !!analysisData.genre;
      const dataPresent = [hasKey, hasMood, hasGenre].filter(Boolean).length;
      const completeness = (dataPresent / 3) * 100;

      if (completeness === 0) {
        return {
          visible: false,
          dimmed: true,
          tooltip: 'Musical analysis was not included in this analysis',
          dataCompleteness: 0,
        };
      }

      return {
        visible: true,
        dimmed: completeness < 100,
        tooltip: completeness < 100 ? 'Partial musical data available' : undefined,
        dataCompleteness: completeness,
      };
    }

    case 'rhythm': {
      const hasTempo = !!analysisData.tempo;
      const hasRhythm = !!analysisData.rhythm;
      const hasBeats = !!analysisData.tempo?.beats;
      const dataPresent = [hasTempo, hasRhythm, hasBeats].filter(Boolean).length;
      const completeness = (dataPresent / 3) * 100;

      if (completeness === 0) {
        return {
          visible: false,
          dimmed: true,
          tooltip: 'Rhythm analysis was not included in this analysis',
          dataCompleteness: 0,
        };
      }

      return {
        visible: true,
        dimmed: completeness < 100,
        tooltip: completeness < 100 ? 'Partial rhythm data available' : undefined,
        dataCompleteness: completeness,
      };
    }

    case 'technical': {
      const hasLoudness = !!analysisData.loudness;
      const hasSpectral = !!analysisData.spectral;
      const dataPresent = [hasLoudness, hasSpectral].filter(Boolean).length;
      const completeness = (dataPresent / 2) * 100;

      if (completeness === 0) {
        return {
          visible: false,
          dimmed: true,
          tooltip: 'Technical analysis was not included in this analysis',
          dataCompleteness: 0,
        };
      }

      return {
        visible: true,
        dimmed: completeness < 100,
        tooltip: completeness < 100 ? 'Partial technical data available' : undefined,
        dataCompleteness: completeness,
      };
    }

    default:
      return {
        visible: true,
        dimmed: false,
        dataCompleteness: 100,
      };
  }
}

/**
 * Get visibility for all tabs at once
 */
export function getAllTabVisibility(
  analysisData: AudioAnalysisResult | null
): Record<TabType, TabVisibility> {
  const tabs: TabType[] = ['overview', 'spectral', 'musical', 'rhythm', 'technical'];
  const result = {} as Record<TabType, TabVisibility>;

  for (const tab of tabs) {
    result[tab] = getTabVisibility(tab, analysisData);
  }

  return result;
}
