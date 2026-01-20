/**
 * Technical Tab Component
 * Displays technical information (duration, sample rate, channels, status)
 */

import { Settings } from 'lucide-react';
import type { AudioAnalysisResult } from '../../types/audio';

interface TechnicalTabProps {
    analysisData: AudioAnalysisResult;
}

export function TechnicalTab({ analysisData }: TechnicalTabProps) {
    return (
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
    );
}
