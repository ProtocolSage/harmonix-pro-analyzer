/**
 * Overview Tab Component
 * Displays hero metrics (BPM, Key, Time Signature, Loudness) and AI classification
 */

import { Activity, Music, Clock, Volume2, Brain } from 'lucide-react';
import type { AudioAnalysisResult } from '../../types/audio';

interface OverviewTabProps {
    analysisData: AudioAnalysisResult;
}

export function OverviewTab({ analysisData }: OverviewTabProps) {
    return (
        <div className="daw-tab-panel">
            {/* Hero Metrics */}
            <div className="daw-hero-metrics-grid">
                {/* Tempo */}
                <div className="daw-hero-metric">
                    <div className="daw-hero-metric-label">
                        <Activity style={{ width: '16px', height: '16px' }} />
                        Tempo (BPM)
                    </div>
                    <div className={`daw-hero-value ${analysisData.tempo ? '' : 'daw-text-muted'}`}>
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
                    <div className={`daw-hero-value ${analysisData.key ? '' : 'daw-text-muted'}`}>
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
                    <div className={`daw-hero-value ${analysisData.rhythm?.timeSignature ? '' : 'daw-text-muted'}`}>
                        {analysisData.rhythm?.timeSignature?.label || 'N/A'}
                    </div>
                </div>

                {/* Loudness */}
                <div className="daw-hero-metric">
                    <div className="daw-hero-metric-label">
                        <Volume2 style={{ width: '16px', height: '16px' }} />
                        Loudness (LUFS)
                    </div>
                    <div className={`daw-hero-value ${analysisData.loudness ? '' : 'daw-text-muted'}`}>
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
    );
}
