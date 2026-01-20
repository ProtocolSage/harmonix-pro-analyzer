import { Activity } from 'lucide-react';
import type { AudioAnalysisResult } from '../../../types/audio';

interface Props {
  analysisData: AudioAnalysisResult;
}

export function RhythmTab({ analysisData }: Props) {
  return (
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
  );
}
