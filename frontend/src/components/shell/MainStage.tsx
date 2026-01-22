import { useMemo } from 'react';
import type { MainStageProps } from '../../types/layout';
import { WaveformContainer } from './WaveformContainer';
import { AnalysisOverlay } from './AnalysisOverlay';
import { StaticSpectrogram } from '../analysis/StaticSpectrogram';

type SectionData = {
  id: string;
  label: string;
  color: string;
  flex?: number;
};

const fallbackSections: SectionData[] = [
  { id: 'intro', label: 'Intro', color: '#0D9488' },
  { id: 'verse1', label: 'Verse', color: '#0891B2' },
  { id: 'chorus1', label: 'Chorus', color: '#F59E0B' },
  { id: 'verse2', label: 'Verse', color: '#0891B2' },
  { id: 'chorus2', label: 'Chorus', color: '#F59E0B' },
  { id: 'bridge', label: 'Bridge', color: '#10B981' },
];

const sectionPalette = ['#0D9488', '#0891B2', '#F59E0B', '#0EA5E9', '#10B981', '#F97316', '#6366F1'];

export function MainStage({
  waveformSlot,
  panelsSlot,
  analysisData,
  playbackTime = 0,
  playbackDuration = 0,
  onWaveformSeek,
  featureToggles = {
    keyDetection: true,
    bpmExtraction: true,
    segmentAnalysis: true,
    mlClassification: true
  },
  activeMode = 'analyze',
  children
}: MainStageProps) {

  const sections = useMemo<SectionData[]>(() => {
    const structure = analysisData?.structure?.structure;
    if (structure && structure.length && analysisData?.duration) {
      const total = analysisData.duration || 1;
      return structure.map((section, index) => ({
        id: `${section.label}-${index}`,
        label: section.label,
        color: sectionPalette[index % sectionPalette.length],
        flex: Math.max(0.5, (section.end - section.start) / total),
      }));
    }
    return fallbackSections;
  }, [analysisData]);

  return (
    <div className="shell-main">
      <WaveformContainer
        waveformSlot={waveformSlot}
        playbackTime={playbackTime}
        playbackDuration={playbackDuration}
        analysisData={analysisData}
        featureToggles={featureToggles}
        sections={sections}
      />

      <StaticSpectrogram height={200} />

      <AnalysisOverlay
        analysisData={analysisData}
        featureToggles={featureToggles}
        activeMode={activeMode}
      />

      <div className="hp-card hp-export-card">
        <div className="hp-export-header">
          <div>
            <span className="hp-export-title">Export Analysis</span>
            <span className="hp-export-subtitle">Download in multiple formats</span>
          </div>
          <div className="hp-export-actions">
            {['JSON', 'CSV', 'PDF Report'].map((format) => (
              <button key={format} type="button" className="hp-export-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <path d="M7 10l5 5 5-5" />
                  <path d="M12 15V3" />
                </svg>
                {format}
              </button>
            ))}
          </div>
        </div>
        {panelsSlot && <div className="hp-export-advanced">{panelsSlot}</div>}
      </div>

      {children}
    </div>
  );
}

MainStage.displayName = 'MainStage';