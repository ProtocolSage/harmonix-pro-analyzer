import { useMemo, useState, type ReactNode } from 'react';
import { TrendingUp, Waves, Music, Activity, Settings } from 'lucide-react';
import type { AudioAnalysisResult, AnalysisProgress } from '../types/audio';
import { getAllTabVisibility, type TabType } from '../utils/tabVisibility';

import { OverviewTab } from './analysis/tabs/OverviewTab';
import { SpectralTab } from './analysis/tabs/SpectralTab';
import { MusicalTab } from './analysis/tabs/MusicalTab';
import { RhythmTab } from './analysis/tabs/RhythmTab';
import { TechnicalTab } from './analysis/tabs/TechnicalTab';
import { StudioAnalysisResultsStyles } from './analysis/StudioAnalysisResultsStyles';

interface StudioAnalysisResultsProps {
  analysisData: AudioAnalysisResult | null;
  isAnalyzing: boolean;
  analysisProgress?: AnalysisProgress | null;
  analysisMode?: 'overview' | 'spectral' | 'musical' | 'rhythm' | 'technical';
}

export function StudioAnalysisResults({ analysisData, isAnalyzing, analysisProgress, analysisMode }: StudioAnalysisResultsProps) {
  const [activeTab, setActiveTab] = useState<TabType>((analysisMode as TabType) || 'overview');

  const tabVisibility = useMemo(() => getAllTabVisibility(analysisData), [analysisData]);

  const tabs: { id: TabType; label: string; icon: ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp style={{ width: 16, height: 16 }} /> },
    { id: 'spectral', label: 'Spectral', icon: <Waves style={{ width: 16, height: 16 }} /> },
    { id: 'musical', label: 'Musical', icon: <Music style={{ width: 16, height: 16 }} /> },
    { id: 'rhythm', label: 'Rhythm', icon: <Activity style={{ width: 16, height: 16 }} /> },
    { id: 'technical', label: 'Technical', icon: <Settings style={{ width: 16, height: 16 }} /> },
  ];

  const visibleTabs = tabs.filter((t) => tabVisibility[t.id].visible);

  return (
    <div className="daw-analysis-results">
      <div className="daw-tabs">
        {visibleTabs.map((tab) => {
          const visibility = tabVisibility[tab.id];
          return (
            <button
              key={tab.id}
              className={`daw-tab ${activeTab === tab.id ? 'daw-tab-active' : ''} ${visibility.dimmed ? 'daw-tab-dimmed' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              title={visibility.tooltip}
              disabled={visibility.dimmed}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {visibility.dimmed && (
                <span className="daw-tab-badge" title={visibility.tooltip}>
                  !
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="daw-tab-content">
        {!analysisData ? (
          <div className="daw-empty-state">{isAnalyzing ? 'Analyzing…' : 'No analysis data available'}</div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab analysisData={analysisData} analysisProgress={analysisProgress} />}
            {activeTab === 'spectral' && <SpectralTab analysisData={analysisData} isAnalyzing={isAnalyzing} />}
            {activeTab === 'musical' && <MusicalTab analysisData={analysisData} />}
            {activeTab === 'rhythm' && <RhythmTab analysisData={analysisData} />}
            {activeTab === 'technical' && <TechnicalTab analysisData={analysisData} />}
          </>
        )}
      </div>

      <StudioAnalysisResultsStyles />
    </div>
  );
}
