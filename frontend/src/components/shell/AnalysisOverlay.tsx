import { useState, useEffect, useMemo } from 'react';
import { formatNumber, formatPercent, formatDuration } from '../../utils/formatters';
import type { AudioAnalysisResult } from '../../types/audio';
import { CountersunkWell } from './CountersunkWell';
import { BarChart3 } from 'lucide-react';
import { Enunciator } from '../analysis/Enunciator';

export type AnalysisTab = 'overview' | 'spectral' | 'musical' | 'rhythm' | 'technical';

const analysisTabs: Array<{ id: AnalysisTab; label: string; desc: string }> = [
  { id: 'overview', label: 'Overview', desc: 'Key metrics at a glance' },
  { id: 'spectral', label: 'Spectral', desc: 'Frequency analysis' },
  { id: 'musical', label: 'Musical', desc: 'Melody & harmony' },
  { id: 'rhythm', label: 'Rhythm', desc: 'Tempo & groove' },
  { id: 'technical', label: 'Technical', desc: 'File info' },
];

interface AnalysisOverlayProps {
  analysisData?: AudioAnalysisResult | null;
  featureToggles: {
    keyDetection: boolean;
    bpmExtraction: boolean;
  };
  activeMode: import('../../types/layout').AnalysisMode;
}

export function AnalysisOverlay({
  analysisData,
  featureToggles,
  activeMode
}: AnalysisOverlayProps) {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('overview');

  const frequencyBars = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const shape = 90 - Math.pow(i - 6, 2) * 0.8;
        const rand = Math.abs(Math.sin(i * 4.13) * 17) % 10;
        return Math.max(12, shape + rand);
      }),
    []
  );

  useEffect(() => {
    const modeToTab: Record<import('../../types/layout').AnalysisMode, AnalysisTab> = {
      analyze: 'overview',
      visualize: 'spectral',
      library: 'technical',
      history: 'rhythm',
      compare: 'musical',
    };
    const nextTab = modeToTab[activeMode] ?? 'overview';
    setActiveTab(nextTab);
  }, [activeMode]);

  const tempoValue = analysisData?.tempo?.bpm ?? 120;
  const tempoConfidence = formatPercent(analysisData?.tempo?.confidence, 0.94);

  const keyValue = analysisData?.key?.key ?? 'C';
  const keyScale = analysisData?.key?.scale ?? 'Major';
  const keyConfidence = formatPercent(analysisData?.key?.confidence, 0.87);

  const timeSignatureLabel = analysisData?.rhythm?.timeSignature?.label ?? '4/4';
  const timeSignatureDesc = analysisData?.rhythm?.timeSignature?.compound ? 'Compound time' : 'Common time';

  const loudnessValue = analysisData?.loudness?.integrated ?? -8.6;

  const genre = analysisData?.genre;
  const topGenre = genre?.genre ?? 'Unknown';
  const genreConfidence = formatPercent(genre?.confidence, 0);

  const spectral = analysisData?.spectral;
  const melody = analysisData?.melody;
  const harmonic = analysisData?.harmonic;
  const groove = analysisData?.rhythm?.groove;

  const melodyRangeSpan = melody?.range?.span ?? 24;
  const melodyMin = melody?.range?.min ?? 220;
  const melodyMax = melody?.range?.max ?? 880;
  const melodyComplexity = formatPercent(melody?.complexity, 0.68);
  const contourDirection = melody?.contour?.direction ?? 'ascending';
  const contourSmoothness = formatPercent(melody?.contour?.smoothness, 0.82);

  const progression = harmonic?.progressions?.[0];
  const progressionText = progression?.progression?.length
    ? progression.progression.join(' -> ')
    : 'I -> IV -> V -> I';
  const progressionType = progression?.type ?? 'Cadential';
  const progressionStrength = formatPercent(progression?.strength, 0.89);

  const rhythmMetrics = [
    { label: 'Swing', value: formatPercent(groove?.swing, 0.23), color: '#0D9488' },
    { label: 'Syncopation', value: formatPercent(groove?.syncopation, 0.45), color: '#0891B2' },
    { label: 'Quantization', value: formatPercent(groove?.quantization, 0.78), color: '#10B981' },
    { label: 'Evenness', value: formatPercent(groove?.evenness, 0.82), color: '#F59E0B' },
  ];

  const technicalData = [
    { label: 'Duration', value: formatDuration(analysisData?.duration ?? 235) },
    {
      label: 'Sample Rate',
      value: analysisData?.sampleRate
        ? `${analysisData.sampleRate.toLocaleString('en-US')} Hz`
        : '44,100 Hz',
    },
    {
      label: 'Channels',
      value: analysisData?.channels
        ? (analysisData.channels === 1 ? 'Mono' : 'Stereo')
        : 'Stereo',
    },
    { label: 'Bit Depth', value: '16-bit' },
    { label: 'File Size', value: analysisData?.fileSize ?? '38.2 MB' },
    { label: 'Format', value: analysisData?.format?.toUpperCase() ?? 'WAV' },
  ];

  return (
    <CountersunkWell label="Analysis Reports" icon={<BarChart3 style={{ width: 14, height: 14 }} />} className="hp-tabs-card flex-1">
      <div className="hp-tabs">
        {analysisTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`hp-tab ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="hp-tabs-content">
        {activeTab === 'overview' && (
          <div className="hp-metric-grid hp-metric-grid--four">
            <div className={`hp-metric-card ${!featureToggles.bpmExtraction ? 'is-disabled' : ''}`} style={{ ['--metric-color' as string]: '#0D9488' }}>
              <div className="hp-metric-label">Tempo</div>
              <div className="hp-metric-value">{formatNumber(tempoValue)}</div>
              <div className="hp-metric-sub">BPM | {tempoConfidence}% conf</div>
            </div>

            <div className={`hp-metric-card ${!featureToggles.keyDetection ? 'is-disabled' : ''}`} style={{ ['--metric-color' as string]: '#F59E0B' }}>
              <div className="hp-metric-label">Key</div>
              <div className="hp-metric-value">
                {keyValue}
                <span>{keyScale}</span>
              </div>
              <div className="hp-metric-sub">{keyConfidence}% confidence</div>
            </div>

            <div className="hp-metric-card" style={{ ['--metric-color' as string]: '#0891B2' }}>
              <div className="hp-metric-label">Time Sig</div>
              <div className="hp-metric-value">{timeSignatureLabel}</div>
              <div className="hp-metric-sub">{timeSignatureDesc}</div>
            </div>

            <div className="hp-metric-card" style={{ ['--metric-color' as string]: '#10B981' }}>
              <div className="hp-metric-label">Loudness</div>
              <div className="hp-metric-value">{formatNumber(loudnessValue, 1)}</div>
              <div className="hp-metric-sub">LUFS integrated</div>
            </div>

            <div className="hp-metric-card" style={{ gridColumn: 'span 4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Neural Status</div>
                <div style={{ height: '16px', width: '1px', background: 'var(--border)' }}></div>
                <Enunciator 
                  label={topGenre} 
                  active={!!genre} 
                  confidence={genre?.confidence || 0}
                  color={genre ? 'var(--atmosphere-primary)' : undefined}
                />
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                {genre ? `${(genre.confidence * 100).toFixed(0)}% MATCH` : 'AWAITING SIGNAL'}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'spectral' && (
          <div className="hp-spectral-grid">
            <div>
              <h4 className="hp-section-title">Spectral Features</h4>
              <div className="hp-metric-grid">
                <div className="hp-metric-card">
                  <div className="hp-metric-label">Centroid</div>
                  <div
                    className="hp-metric-value hp-metric-value--small"
                    style={{ ['--metric-color' as string]: '#0891B2' }}
                  >
                    {formatNumber(spectral?.centroid?.mean, 0, '2,400')}
                    <span>Hz</span>
                  </div>
                </div>
                <div className="hp-metric-card">
                  <div className="hp-metric-label">Rolloff</div>
                  <div
                    className="hp-metric-value hp-metric-value--small"
                    style={{ ['--metric-color' as string]: '#0891B2' }}
                  >
                    {formatNumber(spectral?.rolloff?.mean, 0, '3,800')}
                    <span>Hz</span>
                  </div>
                </div>
                <div className="hp-metric-card">
                  <div className="hp-metric-label">Brightness</div>
                  <div
                    className="hp-metric-value hp-metric-value--small"
                    style={{ ['--metric-color' as string]: '#0891B2' }}
                  >
                    {formatNumber(
                      spectral?.brightness?.mean ? spectral.brightness.mean * 100 : undefined,
                      1,
                      '67.2'
                    )}
                    <span>%</span>
                  </div>
                </div>
                <div className="hp-metric-card">
                  <div className="hp-metric-label">Energy</div>
                  <div
                    className="hp-metric-value hp-metric-value--small"
                    style={{ ['--metric-color' as string]: '#0891B2' }}
                  >
                    {formatNumber(spectral?.energy?.mean, 3, '0.842')}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="hp-section-title">Frequency Distribution</h4>
              <div className="hp-frequency-chart">
                {frequencyBars.map((height, index) => (
                  <div
                    key={`freq-${index}`}
                    className="hp-frequency-bar"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'musical' && (
          <div className="hp-musical-grid">
            <div>
              <h4 className="hp-section-title">Melody Analysis</h4>
              <div className="hp-stack">
                <div className="hp-metric-card hp-metric-card--row">
                  <div>
                    <div className="hp-metric-label">Pitch Range</div>
                    <div
                      className="hp-metric-value hp-metric-value--small"
                      style={{ ['--metric-color' as string]: '#F59E0B' }}
                    >
                      {formatNumber(melodyRangeSpan, 0, '24')}
                      <span>ST</span>
                    </div>
                  </div>
                  <div className="hp-metric-sub">
                    {formatNumber(melodyMin, 0)} - {formatNumber(melodyMax, 0)} Hz
                  </div>
                </div>

                <div className="hp-metric-card hp-metric-card--row">
                  <div>
                    <div className="hp-metric-label">Complexity</div>
                    <div
                      className="hp-metric-value hp-metric-value--small"
                      style={{ ['--metric-color' as string]: '#F59E0B' }}
                    >
                      {melodyComplexity}%
                    </div>
                  </div>
                  <div className="hp-progress">
                    <div
                      className="hp-progress-fill"
                      style={{ width: `${melodyComplexity}%`, background: '#F59E0B' }}
                    />
                  </div>
                </div>

                <div className="hp-metric-card">
                  <div className="hp-metric-label">Contour</div>
                  <div className="hp-metric-sub hp-metric-sub--strong">
                    {contourDirection.charAt(0).toUpperCase() + contourDirection.slice(1)} | {contourSmoothness}% smooth
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="hp-section-title">Harmonic Analysis</h4>
              <div className="hp-stack">
                <div className="hp-metric-card">
                  <div className="hp-metric-label">Functional Harmony</div>
                  <div className="hp-harmony-grid">
                    <div>
                      <div className="hp-harmony-value" style={{ color: '#10B981' }}>45%</div>
                      <div className="hp-harmony-label">Tonic</div>
                    </div>
                    <div>
                      <div className="hp-harmony-value" style={{ color: '#0891B2' }}>30%</div>
                      <div className="hp-harmony-label">Subdominant</div>
                    </div>
                    <div>
                      <div className="hp-harmony-value" style={{ color: '#F59E0B' }}>25%</div>
                      <div className="hp-harmony-label">Dominant</div>
                    </div>
                  </div>
                </div>

                <div className="hp-metric-card">
                  <div className="hp-metric-label">Detected Progressions</div>
                  <div className="hp-metric-sub hp-metric-sub--mono">{progressionText}</div>
                  <div className="hp-metric-sub">{progressionType} | {progressionStrength}% strength</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rhythm' && (
          <div>
            <h4 className="hp-section-title">Groove Analysis</h4>
            <div className="hp-metric-grid hp-metric-grid--four">
              {rhythmMetrics.map((item) => (
                <div key={item.label} className="hp-metric-card">
                  <div className="hp-metric-label">{item.label}</div>
                  <div className="hp-metric-value" style={{ ['--metric-color' as string]: item.color }}>
                    {item.value}%
                  </div>
                  <div className="hp-progress">
                    <div className="hp-progress-fill" style={{ width: `${item.value}%`, background: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'technical' && (
          <div className="hp-metric-grid hp-metric-grid--three">
            {technicalData.map((item) => (
              <div key={item.label} className="hp-metric-card hp-metric-card--row">
                <span className="hp-technical-label">{item.label}</span>
                <span className="hp-technical-value">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </CountersunkWell>
  );
}
