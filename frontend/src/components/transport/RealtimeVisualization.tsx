/**
 * Realtime Visualization Component
 * Displays real-time audio visualization with RMS, peak, and beat indicators
 */

import { useRef, useEffect, forwardRef } from 'react';
import { Activity } from 'lucide-react';
import type { AudioVisualizationData } from '../../engines/RealtimeVisualizationEngine';

interface RealtimeVisualizationProps {
    isPlaying: boolean;
    visualizationData: AudioVisualizationData | null;
    compact?: boolean;
}

export const RealtimeVisualization = forwardRef<HTMLCanvasElement, RealtimeVisualizationProps>(
    function RealtimeVisualization({ isPlaying, visualizationData, compact = false }, ref) {
        if (compact) {
            return (
                <div className="hp-transport-mini-visual bloom-effect">
                    <canvas ref={ref} className="hp-transport-mini-meter" />
                </div>
            );
        }

        return (
            <div className="daw-transport-visualization">
                <div className="daw-transport-visualization-header">
                    <span className="daw-transport-visualization-title">Real-time Analysis</span>
                    <div className="daw-transport-visualization-stats bloom-effect">
                        <Activity
                            className={isPlaying ? 'daw-icon-active' : 'daw-icon-inactive'}
                            style={{ width: '16px', height: '16px' }}
                        />
                        {visualizationData && (
                            <div className="daw-transport-visualization-metrics">
                                <span>RMS: {Math.round(visualizationData.rms * 100)}%</span>
                                <span>Peak: {Math.round(visualizationData.peak * 100)}%</span>
                                {visualizationData.beatDetected && (
                                    <span className="daw-beat-indicator">♪ Beat</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <canvas ref={ref} className="daw-transport-canvas bloom-effect" />
            </div>
        );
    }
);
