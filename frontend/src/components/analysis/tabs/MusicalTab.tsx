import { Mic2, Radio } from 'lucide-react';
import type { AudioAnalysisResult } from '../../../types/audio';

interface Props {
  analysisData: AudioAnalysisResult;
}

export function MusicalTab({ analysisData }: Props) {
  return (
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
  );
}
