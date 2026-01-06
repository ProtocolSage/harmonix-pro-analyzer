/**
 * DAW-Style Analysis Results Component
 * Professional tabbed interface for music analysis display
 */

import { useState } from 'react';
import { Music, Activity, Mic2, Radio, Brain, Volume2, Clock, TrendingUp, Waves, Settings } from 'lucide-react';
import type { AudioAnalysisResult } from '../types/audio';

interface StudioAnalysisResultsProps {
  analysisData: AudioAnalysisResult | null;
  isAnalyzing: boolean;
}

type TabType = 'overview' | 'spectral' | 'musical' | 'rhythm' | 'technical';

export function StudioAnalysisResults({ analysisData, isAnalyzing }: StudioAnalysisResultsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  if (isAnalyzing) {
    return (
      <div className="daw-panel daw-analysis-loading">
        <div className="daw-analysis-loading-content">
          <div className="daw-spinner-large"></div>
          <p className="daw-analysis-loading-text">Analyzing Audio</p>
        </div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="daw-panel daw-analysis-empty">
        <Music className="daw-analysis-empty-icon" />
        <p className="daw-analysis-empty-text">Upload an audio file to begin analysis</p>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp style={{ width: '16px', height: '16px' }} /> },
    { id: 'spectral', label: 'Spectral', icon: <Waves style={{ width: '16px', height: '16px' }} /> },
    { id: 'musical', label: 'Musical', icon: <Music style={{ width: '16px', height: '16px' }} /> },
    { id: 'rhythm', label: 'Rhythm', icon: <Activity style={{ width: '16px', height: '16px' }} /> },
    { id: 'technical', label: 'Technical', icon: <Settings style={{ width: '16px', height: '16px' }} /> },
  ];

  return (
    <div className="daw-analysis-results">
      {/* Tab Navigation */}
      <div className="daw-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`daw-tab ${activeTab === tab.id ? 'daw-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="daw-tab-content">
        {activeTab === 'overview' && (
          <div className="daw-tab-panel">
            {/* Hero Metrics */}
            <div className="daw-hero-metrics-grid">
              {/* Tempo */}
              <div className="daw-hero-metric">
                <div className="daw-hero-metric-label">
                  <Activity style={{ width: '16px', height: '16px' }} />
                  Tempo (BPM)
                </div>
                <div className="daw-hero-value">
                  {analysisData.tempo?.bpm?.toFixed(1) || 'N/A'}
                </div>
                {analysisData.tempo?.confidence && (
                  <div className="daw-hero-metric-detail">
                    Confidence: {(analysisData.tempo.confidence * 100).toFixed(0)}%
                  </div>
                )}
              </div>

              {/* Key */}
              <div className="daw-hero-metric">
                <div className="daw-hero-metric-label">
                  <Music style={{ width: '16px', height: '16px' }} />
                  Musical Key
                </div>
                <div className="daw-hero-value">
                  {analysisData.key?.key || 'N/A'} {analysisData.key?.scale || ''}
                </div>
                {analysisData.key?.confidence && (
                  <div className="daw-hero-metric-detail">
                    Confidence: {(analysisData.key.confidence * 100).toFixed(0)}%
                  </div>
                )}
              </div>

              {/* Time Signature */}
              <div className="daw-hero-metric">
                <div className="daw-hero-metric-label">
                  <Clock style={{ width: '16px', height: '16px' }} />
                  Time Signature
                </div>
                <div className="daw-hero-value">
                  {analysisData.rhythm?.timeSignature?.label || 'N/A'}
                </div>
              </div>

              {/* Loudness */}
              <div className="daw-hero-metric">
                <div className="daw-hero-metric-label">
                  <Volume2 style={{ width: '16px', height: '16px' }} />
                  Loudness (LUFS)
                </div>
                <div className="daw-hero-value">
                  {analysisData.loudness?.integrated?.toFixed(1) || 'N/A'}
                </div>
                {analysisData.loudness?.dynamicRange && (
                  <div className="daw-hero-metric-detail">
                    DR: {analysisData.loudness.dynamicRange.toFixed(1)}
                  </div>
                )}
              </div>
            </div>

            {/* AI Classification */}
            {(analysisData.genre || analysisData.mood) && (
              <div className="daw-panel">
                <h3 className="daw-section-header">
                  <Brain style={{ width: '20px', height: '20px', color: 'var(--daw-spectrum-purple)' }} />
                  AI Classification
                </h3>

                <div className="daw-classification-grid">
                  {/* Genre */}
                  {analysisData.genre && (
                    <div>
                      <div className="daw-classification-title">Genre Detection</div>
                      <div className="daw-classification-list">
                        {analysisData.genre.predictions?.slice(0, 3).map((pred, idx) => (
                          <div key={idx} className="daw-classification-item">
                            <div className="daw-classification-header">
                              <span className="daw-classification-name">{pred.genre}</span>
                              <span className="daw-badge daw-badge-info">
                                {(pred.confidence * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="daw-progress-bar">
                              <div className="daw-progress-fill" style={{ width: `${pred.confidence * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mood */}
                  {analysisData.mood && (
                    <div>
                      <div className="daw-classification-title">Mood Analysis</div>
                      <div className="daw-classification-list">
                        {Object.entries(analysisData.mood)
                          .sort(([, a], [, b]) => (b.confidence || 0) - (a.confidence || 0))
                          .slice(0, 3)
                          .map(([mood, data]) => (
                            <div key={mood} className="daw-classification-item">
                              <div className="daw-classification-header">
                                <span className="daw-classification-name">{mood}</span>
                                <span className="daw-badge daw-badge-info">
                                  {(data.confidence * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="daw-progress-bar">
                                <div className="daw-progress-fill" style={{ width: `${data.confidence * 100}%` }} />
                              </div>
                            </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'spectral' && (
          <div className="daw-tab-panel">
            {analysisData.spectral ? (
              <div className="daw-panel">
                <h3 className="daw-section-header">
                  <Activity style={{ width: '20px', height: '20px', color: 'var(--daw-spectrum-blue)' }} />
                  Spectral Analysis
                </h3>

                <div className="daw-metrics-grid">
                  {analysisData.spectral.centroid && (
                    <div className="daw-metric-card">
                      <div className="daw-metric-card-label">Centroid</div>
                      <div className="daw-metric-card-value">
                        {analysisData.spectral.centroid.mean?.toFixed(0)} Hz
                      </div>
                    </div>
                  )}
                  {analysisData.spectral.brightness && (
                    <div className="daw-metric-card">
                      <div className="daw-metric-card-label">Brightness</div>
                      <div className="daw-metric-card-value">
                        {(analysisData.spectral.brightness.mean * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                  {analysisData.spectral.energy && (
                    <div className="daw-metric-card">
                      <div className="daw-metric-card-label">Energy</div>
                      <div className="daw-metric-card-value">
                        {analysisData.spectral.energy.mean?.toFixed(3)}
                      </div>
                    </div>
                  )}
                  {analysisData.spectral.rolloff && (
                    <div className="daw-metric-card">
                      <div className="daw-metric-card-label">Rolloff</div>
                      <div className="daw-metric-card-value">
                        {analysisData.spectral.rolloff.mean?.toFixed(0)} Hz
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="daw-empty-state">No spectral data available</div>
            )}
          </div>
        )}

        {activeTab === 'musical' && (
          <div className="daw-tab-panel">
            {/* Melody Analysis */}
            {analysisData.melody && (
              <div className="daw-panel">
                <h3 className="daw-section-header">
                  <Mic2 style={{ width: '20px', height: '20px', color: 'var(--daw-gold-bright)' }} />
                  Melody Analysis
                </h3>

                <div className="daw-metrics-grid">
                  {analysisData.melody.range && (
                    <div className="daw-metric-card">
                      <div className="daw-metric-card-label">Pitch Range</div>
                      <div className="daw-metric-card-value">{analysisData.melody.range.span} ST</div>
                      <div className="daw-metric-card-detail">
                        {analysisData.melody.range.min?.toFixed(0)} - {analysisData.melody.range.max?.toFixed(0)} Hz
                      </div>
                    </div>
                  )}
                  {analysisData.melody.complexity !== undefined && (
                    <div className="daw-metric-card">
                      <div className="daw-metric-card-label">Complexity</div>
                      <div className="daw-metric-card-value">
                        {(analysisData.melody.complexity * 100).toFixed(0)}%
                      </div>
                    </div>
                  )}
                  {analysisData.melody.contour && (
                    <div className="daw-metric-card">
                      <div className="daw-metric-card-label">Contour</div>
                      <div className="daw-metric-card-value">{analysisData.melody.contour.direction}</div>
                      <div className="daw-metric-card-detail">
                        Smoothness: {(analysisData.melody.contour.smoothness * 100).toFixed(0)}%
                      </div>
                    </div>
                  )}
                </div>

                {analysisData.melody.motifs && analysisData.melody.motifs.length > 0 && (
                  <div className="daw-motifs-section">
                    <div className="daw-classification-title">Detected Motifs</div>
                    <div className="daw-motifs-list">
                      {analysisData.melody.motifs.slice(0, 3).map((motif, idx) => (
                        <div key={idx} className="daw-motif-item">
                          <span className="daw-motif-label">Pattern #{idx + 1}:</span>
                          <span className="daw-motif-pattern">[{motif.pattern.join(', ')}]</span>
                          <span className="daw-badge daw-badge-info">{motif.occurrences}x</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Harmonic Analysis */}
            {analysisData.harmonic && (
              <div className="daw-panel">
                <h3 className="daw-section-header">
                  <Radio style={{ width: '20px', height: '20px', color: 'var(--daw-spectrum-purple)' }} />
                  Harmonic Analysis
                </h3>

                {/* Functional Analysis */}
                {analysisData.harmonic.functionalAnalysis && (
                  <div className="daw-functional-harmony">
                    <div className="daw-classification-title">Functional Harmony</div>
                    <div className="daw-functional-grid">
                      <div className="daw-functional-item">
                        <div className="daw-functional-label">Tonic</div>
                        <div className="daw-functional-value" style={{ color: 'var(--daw-success-bright)' }}>
                          {(analysisData.harmonic.functionalAnalysis.tonic * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="daw-functional-item">
                        <div className="daw-functional-label">Subdominant</div>
                        <div className="daw-functional-value" style={{ color: 'var(--daw-spectrum-blue)' }}>
                          {(analysisData.harmonic.functionalAnalysis.subdominant * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="daw-functional-item">
                        <div className="daw-functional-label">Dominant</div>
                        <div className="daw-functional-value" style={{ color: 'var(--daw-gold-bright)' }}>
                          {(analysisData.harmonic.functionalAnalysis.dominant * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chord Progressions */}
                {analysisData.harmonic.progressions && analysisData.harmonic.progressions.length > 0 && (
                  <div className="daw-progressions-section">
                    <div className="daw-classification-title">Chord Progressions</div>
                    <div className="daw-progressions-list">
                      {analysisData.harmonic.progressions.slice(0, 3).map((prog, idx) => (
                        <div key={idx} className="daw-progression-item">
                          <div className="daw-progression-content">
                            <div className="daw-progression-chords">{prog.progression.join(' - ')}</div>
                            {prog.type && <div className="daw-progression-type">Type: {prog.type}</div>}
                          </div>
                          <span className="daw-badge daw-badge-success">
                            {(prog.strength * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cadences */}
                {analysisData.harmonic.cadences && analysisData.harmonic.cadences.length > 0 && (
                  <div className="daw-cadences-section">
                    <div className="daw-classification-title">Detected Cadences</div>
                    <div className="daw-cadences-list">
                      {analysisData.harmonic.cadences.slice(0, 5).map((cad, idx) => (
                        <span key={idx} className="daw-badge daw-badge-info">
                          {cad.type} ({(cad.strength * 100).toFixed(0)}%)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'rhythm' && (
          <div className="daw-tab-panel">
            {analysisData.rhythm ? (
              <div className="daw-panel">
                <h3 className="daw-section-header">
                  <Activity style={{ width: '20px', height: '20px', color: 'var(--daw-spectrum-cyan)' }} />
                  Rhythm & Groove
                </h3>

                {analysisData.rhythm.groove && (
                  <div className="daw-metrics-grid">
                    <div className="daw-metric-card">
                      <div className="daw-metric-card-label">Swing</div>
                      <div className="daw-metric-card-value">
                        {(analysisData.rhythm.groove.swing * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="daw-metric-card">
                      <div className="daw-metric-card-label">Syncopation</div>
                      <div className="daw-metric-card-value">
                        {(analysisData.rhythm.groove.syncopation * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="daw-metric-card">
                      <div className="daw-metric-card-label">Quantization</div>
                      <div className="daw-metric-card-value">
                        {(analysisData.rhythm.groove.quantization * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="daw-metric-card">
                      <div className="daw-metric-card-label">Evenness</div>
                      <div className="daw-metric-card-value">
                        {(analysisData.rhythm.groove.evenness * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                )}

                {analysisData.rhythm.downbeats && (
                  <div className="daw-metric-card">
                    <div className="daw-metric-card-label">Beat Information</div>
                    <div className="daw-metric-card-detail">
                      {analysisData.rhythm.downbeats.positions?.length || 0} downbeats detected
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="daw-empty-state">No rhythm data available</div>
            )}
          </div>
        )}

        {activeTab === 'technical' && (
          <div className="daw-tab-panel">
            <div className="daw-panel">
              <h3 className="daw-section-header">
                <Settings style={{ width: '20px', height: '20px', color: 'var(--daw-metal-silver)' }} />
                Technical Information
              </h3>

              <div className="daw-technical-grid">
                <div className="daw-technical-item">
                  <span className="daw-technical-label">Duration</span>
                  <span className="daw-technical-value">{analysisData.duration?.toFixed(2)}s</span>
                </div>
                <div className="daw-technical-item">
                  <span className="daw-technical-label">Sample Rate</span>
                  <span className="daw-technical-value">{analysisData.sampleRate} Hz</span>
                </div>
                <div className="daw-technical-item">
                  <span className="daw-technical-label">Channels</span>
                  <span className="daw-technical-value">{analysisData.channels}</span>
                </div>
                <div className="daw-technical-item">
                  <span className="daw-technical-label">Status</span>
                  <span className="daw-badge daw-badge-success">Analysis Complete</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .daw-analysis-results {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        /* Loading State */
        .daw-analysis-loading {
          padding: var(--space-12);
        }

        .daw-analysis-loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-4);
        }

        .daw-spinner-large {
          width: 48px;
          height: 48px;
          border: 4px solid var(--daw-bg-elevated);
          border-top: 4px solid var(--daw-gold-bright);
          border-radius: var(--radius-full);
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .daw-analysis-loading-text {
          font-size: var(--text-base);
          color: var(--daw-metal-steel);
        }

        /* Empty State */
        .daw-analysis-empty {
          padding: var(--space-12);
          text-align: center;
        }

        .daw-analysis-empty-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto var(--space-4);
          opacity: 0.3;
          color: var(--daw-metal-steel);
        }

        .daw-analysis-empty-text {
          font-size: var(--text-base);
          color: var(--daw-metal-steel);
        }

        .daw-empty-state {
          padding: var(--space-8);
          text-align: center;
          color: var(--daw-metal-steel);
        }

        /* Tabs */
        .daw-tabs {
          display: flex;
          border-bottom: var(--border-thin) solid var(--border-default);
          background: var(--daw-bg-deep);
          border-radius: var(--radius-xl) var(--radius-xl) 0 0;
          padding: 0 var(--space-4);
          gap: var(--space-1);
        }

        .daw-tab {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-4) var(--space-6);
          border: none;
          background: transparent;
          color: var(--daw-metal-steel);
          font-size: var(--text-sm);
          font-weight: var(--weight-medium);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all var(--duration-fast) var(--ease-out);
        }

        .daw-tab:hover {
          color: var(--daw-metal-platinum);
          background: rgba(255, 255, 255, 0.05);
        }

        .daw-tab-active {
          color: var(--daw-gold-bright);
          border-bottom-color: var(--daw-gold-bright);
        }

        /* Tab Content */
        .daw-tab-content {
          background: var(--daw-bg-raised);
          border: var(--border-thin) solid var(--border-default);
          border-top: none;
          border-radius: 0 0 var(--radius-xl) var(--radius-xl);
          min-height: 400px;
        }

        .daw-tab-panel {
          padding: var(--space-6);
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        /* Hero Metrics */
        .daw-hero-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }

        /* Section Header */
        .daw-section-header {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          font-size: var(--text-lg);
          font-weight: var(--weight-semibold);
          color: var(--daw-metal-platinum);
          margin-bottom: var(--space-6);
        }

        /* Classification */
        .daw-classification-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: var(--space-6);
        }

        .daw-classification-title {
          font-size: var(--text-sm);
          font-weight: var(--weight-medium);
          color: var(--daw-metal-silver);
          text-transform: uppercase;
          letter-spacing: var(--tracking-wide);
          margin-bottom: var(--space-4);
        }

        .daw-classification-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .daw-classification-item {
          background: var(--daw-bg-elevated);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
        }

        .daw-classification-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-2);
        }

        .daw-classification-name {
          font-weight: var(--weight-semibold);
          color: var(--daw-metal-platinum);
          text-transform: capitalize;
        }

        .daw-progress-bar {
          height: 6px;
          background: var(--daw-bg-input);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .daw-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--daw-gold-bright), var(--daw-spectrum-cyan));
          border-radius: var(--radius-full);
          transition: width var(--duration-normal) var(--ease-out);
        }

        /* Metrics Grid */
        .daw-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: var(--space-4);
        }

        .daw-metric-card {
          background: var(--daw-bg-elevated);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
        }

        .daw-metric-card-label {
          font-size: var(--text-xs);
          font-weight: var(--weight-medium);
          color: var(--daw-metal-steel);
          text-transform: uppercase;
          letter-spacing: var(--tracking-wide);
          margin-bottom: var(--space-2);
        }

        .daw-metric-card-value {
          font-size: var(--text-xl);
          font-weight: var(--weight-bold);
          font-family: var(--font-mono);
          color: var(--daw-metal-platinum);
          margin-bottom: var(--space-1);
        }

        .daw-metric-card-detail {
          font-size: var(--text-sm);
          color: var(--daw-metal-steel);
        }

        /* Functional Harmony */
        .daw-functional-harmony {
          margin-bottom: var(--space-6);
        }

        .daw-functional-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-4);
        }

        .daw-functional-item {
          background: var(--daw-bg-elevated);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          text-align: center;
        }

        .daw-functional-label {
          font-size: var(--text-xs);
          color: var(--daw-metal-steel);
          text-transform: uppercase;
          letter-spacing: var(--tracking-wide);
          margin-bottom: var(--space-2);
        }

        .daw-functional-value {
          font-size: var(--text-2xl);
          font-weight: var(--weight-bold);
          font-family: var(--font-mono);
        }

        /* Progressions & Motifs */
        .daw-progressions-section,
        .daw-motifs-section,
        .daw-cadences-section {
          margin-top: var(--space-6);
        }

        .daw-progressions-list,
        .daw-motifs-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .daw-progression-item,
        .daw-motif-item {
          background: var(--daw-bg-elevated);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-4);
        }

        .daw-progression-content {
          flex: 1;
        }

        .daw-progression-chords,
        .daw-motif-pattern {
          font-family: var(--font-mono);
          font-size: var(--text-sm);
          color: var(--daw-metal-platinum);
          margin-bottom: var(--space-1);
        }

        .daw-progression-type {
          font-size: var(--text-xs);
          color: var(--daw-metal-steel);
        }

        .daw-motif-label {
          font-size: var(--text-sm);
          color: var(--daw-metal-steel);
          margin-right: var(--space-2);
        }

        .daw-cadences-list {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
        }

        /* Technical Info */
        .daw-technical-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-4);
        }

        .daw-technical-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-4);
          background: var(--daw-bg-elevated);
          border-radius: var(--radius-lg);
        }

        .daw-technical-label {
          font-size: var(--text-sm);
          color: var(--daw-metal-steel);
        }

        .daw-technical-value {
          font-size: var(--text-base);
          font-family: var(--font-mono);
          font-weight: var(--weight-medium);
          color: var(--daw-metal-platinum);
        }

        @media (max-width: 768px) {
          .daw-tabs {
            overflow-x: auto;
            padding: 0 var(--space-2);
          }

          .daw-tab {
            padding: var(--space-3) var(--space-4);
            font-size: var(--text-xs);
            white-space: nowrap;
          }

          .daw-tab-panel {
            padding: var(--space-4);
          }

          .daw-hero-metrics-grid {
            grid-template-columns: 1fr;
          }

          .daw-classification-grid,
          .daw-metrics-grid,
          .daw-functional-grid,
          .daw-technical-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
