import React, { useState, useEffect } from 'react';

interface DAWMeterBridgeProps {
  leftLevel?: number;   // 0-100
  rightLevel?: number;  // 0-100
  peakLeft?: number;    // dB value
  peakRight?: number;   // dB value
  lufs?: number;        // Loudness value
  dynamicRange?: number; // DR value
}

export const DAWMeterBridge: React.FC<DAWMeterBridgeProps> = ({
  leftLevel = 0,
  rightLevel = 0,
  peakLeft = -Infinity,
  peakRight = -Infinity,
  lufs,
  dynamicRange
}) => {
  const [peakHoldL, setPeakHoldL] = useState(0);
  const [peakHoldR, setPeakHoldR] = useState(0);

  // Peak hold logic
  useEffect(() => {
    if (leftLevel > peakHoldL) {
      setPeakHoldL(leftLevel);
      setTimeout(() => setPeakHoldL(0), 2000); // Reset after 2s
    }
  }, [leftLevel]);

  useEffect(() => {
    if (rightLevel > peakHoldR) {
      setPeakHoldR(rightLevel);
      setTimeout(() => setPeakHoldR(0), 2000);
    }
  }, [rightLevel]);

  const formatPeak = (db: number): string => {
    if (db === -Infinity || !isFinite(db)) return '--';
    return db > 0 ? `+${db.toFixed(1)}` : db.toFixed(1);
  };

  const formatLUFS = (value: number): string => {
    if (!isFinite(value)) return '--';
    return value.toFixed(1);
  };

  const getLUFSColor = (value: number): string => {
    if (!isFinite(value)) return 'var(--daw-metal-steel)';
    if (value >= -12 && value <= -16) return 'var(--daw-success-bright)';
    if (value > -12 && value <= -6) return 'var(--daw-warning-bright)';
    if (value > -6) return 'var(--daw-error-bright)';
    return 'var(--daw-metal-silver)';
  };

  return (
    <div className="daw-meter-bridge">
      {/* L/R VU Meters */}
      <div className="daw-meter-section">
        <div className="daw-meter-group">
          <div className="daw-meter-container">
            <div className="daw-meter-label">L</div>
            <div className="daw-vu-meter">
              <div
                className="daw-vu-fill"
                style={{ height: `${leftLevel}%` }}
              ></div>
              {peakHoldL > 0 && (
                <div
                  className="daw-meter-peak"
                  style={{ top: `${100 - peakHoldL}%` }}
                ></div>
              )}
            </div>
          </div>
          <div className="daw-meter-container">
            <div className="daw-meter-label">R</div>
            <div className="daw-vu-meter">
              <div
                className="daw-vu-fill"
                style={{ height: `${rightLevel}%` }}
              ></div>
              {peakHoldR > 0 && (
                <div
                  className="daw-meter-peak"
                  style={{ top: `${100 - peakHoldR}%` }}
                ></div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Peak Indicators */}
      <div className="daw-meter-section">
        <div className="daw-meter-display">
          <div className="daw-meter-display-label">Peak</div>
          <div className="daw-meter-display-values">
            <span className="daw-meter-display-value">
              L: {formatPeak(peakLeft)} dB
            </span>
            <span className="daw-meter-display-value">
              R: {formatPeak(peakRight)} dB
            </span>
          </div>
        </div>
      </div>

      {/* LUFS Display */}
      {lufs !== undefined && (
        <div className="daw-meter-section">
          <div className="daw-meter-display">
            <div className="daw-meter-display-label">LUFS</div>
            <div
              className="daw-meter-display-value daw-meter-display-large"
              style={{ color: getLUFSColor(lufs) }}
            >
              {formatLUFS(lufs)}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Range Display */}
      {dynamicRange !== undefined && (
        <div className="daw-meter-section">
          <div className="daw-meter-display">
            <div className="daw-meter-display-label">DR</div>
            <div className="daw-meter-display-value daw-meter-display-large">
              {dynamicRange.toFixed(0)}
            </div>
          </div>
        </div>
      )}

      {/* Mini Spectrum Placeholder */}
      <div className="daw-meter-section daw-meter-section-flex">
        <div className="daw-mini-spectrum">
          <div className="daw-mini-spectrum-label">Spectrum</div>
          <div className="daw-mini-spectrum-bars">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="daw-mini-spectrum-bar"
                style={{
                  height: `${Math.random() * 60 + 20}%`,
                  animationDelay: `${i * 0.05}s`
                }}
              ></div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .daw-meter-bridge {
          height: 56px;
          background: var(--daw-bg-deep);
          border-top: var(--border-thin) solid var(--border-default);
          display: flex;
          align-items: center;
          gap: var(--space-6);
          padding: 0 var(--space-6);
          position: sticky;
          bottom: 0;
          z-index: var(--z-sticky);
          box-shadow: var(--shadow-lg);
        }

        .daw-meter-section {
          display: flex;
          align-items: center;
          height: 100%;
          padding: var(--space-2) 0;
        }

        .daw-meter-section-flex {
          flex: 1;
        }

        /* VU Meter Group */
        .daw-meter-group {
          display: flex;
          gap: var(--space-3);
          align-items: flex-end;
          height: 100%;
        }

        /* Meter Display (Peak, LUFS, DR) */
        .daw-meter-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-1);
        }

        .daw-meter-display-label {
          font-size: var(--text-xs);
          font-weight: var(--weight-medium);
          color: var(--daw-metal-steel);
          text-transform: uppercase;
          letter-spacing: var(--tracking-wide);
        }

        .daw-meter-display-values {
          display: flex;
          gap: var(--space-3);
        }

        .daw-meter-display-value {
          font-family: var(--font-mono);
          font-size: var(--text-sm);
          font-weight: var(--weight-bold);
          color: var(--daw-metal-platinum);
        }

        .daw-meter-display-large {
          font-size: var(--text-lg);
        }

        /* Mini Spectrum */
        .daw-mini-spectrum {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        .daw-mini-spectrum-label {
          font-size: var(--text-xs);
          font-weight: var(--weight-medium);
          color: var(--daw-metal-steel);
          text-transform: uppercase;
          letter-spacing: var(--tracking-wide);
        }

        .daw-mini-spectrum-bars {
          flex: 1;
          display: flex;
          align-items: flex-end;
          gap: 2px;
        }

        .daw-mini-spectrum-bar {
          flex: 1;
          background: linear-gradient(to top,
            var(--daw-spectrum-cyan),
            var(--daw-spectrum-blue)
          );
          border-radius: var(--radius-sm) var(--radius-sm) 0 0;
          opacity: 0.6;
          transition: height var(--duration-instant) linear;
          animation: spectrum-pulse 1.5s ease-in-out infinite;
        }

        @keyframes spectrum-pulse {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 0.8;
          }
        }

        @media (max-width: 768px) {
          .daw-meter-bridge {
            gap: var(--space-3);
            padding: 0 var(--space-4);
          }

          .daw-mini-spectrum {
            display: none;
          }

          .daw-meter-display-values {
            flex-direction: column;
            gap: 0;
          }

          .daw-meter-display-value {
            font-size: var(--text-xs);
          }
        }
      `}</style>
    </div>
  );
};
