import { Activity } from 'lucide-react';
import type { AudioAnalysisResult } from '../../../types/audio';
import { PrismScan } from '../PrismScan';

interface Props {
  analysisData: AudioAnalysisResult;
  isAnalyzing?: boolean;
}

export function SpectralTab({ analysisData, isAnalyzing }: Props) {
  return (
    <div className="daw-tab-panel">
      {analysisData.spectral ? (
        <div className="daw-panel relative overflow-hidden">
          <h3 className="daw-section-header">
            <Activity style={{ width: '20px', height: '20px', color: 'var(--daw-spectrum-blue)' }} />
            Spectral Analysis
          </h3>

          <PrismScan isActive={!!isAnalyzing} />

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
  );
}
