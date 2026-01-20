export function TransportStyles() {
  return (
      <style>{`
        .daw-transport-controls {
          background: var(--daw-bg-raised);
          border: var(--border-thin) solid var(--border-default);
          border-radius: var(--radius-xl);
          padding: var(--space-6);
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }

        /* Main Transport Buttons */
        .daw-transport-buttons {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-3);
        }

        .daw-btn-play {
          background: linear-gradient(135deg, var(--daw-gold-bright), var(--daw-gold-deep));
          border: none;
          border-radius: var(--radius-full);
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--duration-normal) var(--ease-out);
          box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .daw-btn-play:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: var(--shadow-glow-gold), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .daw-btn-play:active:not(:disabled) {
          transform: scale(0.98);
        }

        .daw-btn-play:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .daw-btn-play-icon {
          width: 32px;
          height: 32px;
          color: var(--daw-bg-deepest);
        }

        .daw-btn-active {
          color: var(--daw-spectrum-blue) !important;
          background: rgba(33, 150, 243, 0.1) !important;
        }

        /* Progress Bar */
        .daw-transport-progress-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .daw-transport-progress-track {
          position: relative;
          height: 8px;
          background: var(--daw-bg-input);
          border-radius: var(--radius-full);
          cursor: pointer;
          box-shadow: var(--shadow-inset);
        }

        .daw-transport-progress-fill {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background: linear-gradient(90deg, var(--daw-gold-bright), var(--daw-spectrum-cyan));
          border-radius: var(--radius-full);
          transition: width 100ms linear;
        }

        .daw-transport-progress-handle {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 12px;
          height: 12px;
          background: var(--daw-gold-bright);
          border-radius: var(--radius-full);
          box-shadow: var(--shadow-sm);
          opacity: 0;
          transition: opacity var(--duration-fast) var(--ease-out);
          cursor: grab;
        }

        .daw-transport-progress-track:hover .daw-transport-progress-handle {
          opacity: 1;
        }

        .daw-transport-progress-handle:active {
          cursor: grabbing;
        }

        .daw-transport-time-display {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: var(--text-sm);
          font-family: var(--font-mono);
          color: var(--daw-metal-steel);
        }

        /* Volume Control */
        .daw-transport-volume {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-3);
        }

        .daw-transport-volume-slider-container {
          flex: 1;
          max-width: 128px;
        }

        .daw-transport-volume-slider {
          width: 100%;
          height: 6px;
          border-radius: var(--radius-full);
          appearance: none;
          cursor: pointer;
          transition: all var(--duration-fast) var(--ease-out);
        }

        .daw-transport-volume-slider:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .daw-transport-volume-slider::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: var(--radius-full);
          background: var(--daw-gold-bright);
          cursor: pointer;
          box-shadow: var(--shadow-sm);
          transition: all var(--duration-fast) var(--ease-out);
        }

        .daw-transport-volume-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: var(--shadow-md);
        }

        .daw-transport-volume-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: var(--radius-full);
          background: var(--daw-gold-bright);
          border: none;
          cursor: pointer;
          box-shadow: var(--shadow-sm);
          transition: all var(--duration-fast) var(--ease-out);
        }

        .daw-transport-volume-slider::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: var(--shadow-md);
        }

        .daw-transport-volume-value {
          font-size: var(--text-xs);
          font-family: var(--font-mono);
          color: var(--daw-metal-steel);
          min-width: 48px;
          text-align: right;
        }

        /* Visualization */
        .daw-transport-visualization {
          border-top: var(--border-thin) solid var(--border-subtle);
          padding-top: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .daw-transport-visualization-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .daw-transport-visualization-title {
          font-size: var(--text-sm);
          font-weight: var(--weight-medium);
          color: var(--daw-metal-silver);
        }

        .daw-transport-visualization-stats {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .daw-icon-active {
          color: var(--daw-success-bright);
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .daw-icon-inactive {
          color: var(--daw-metal-iron);
        }

        .daw-transport-visualization-metrics {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          font-size: var(--text-xs);
          font-family: var(--font-mono);
          color: var(--daw-metal-steel);
        }

        .daw-beat-indicator {
          color: var(--daw-success-bright);
          font-weight: var(--weight-medium);
        }

        .daw-transport-canvas {
          width: 100%;
          height: 128px;
          background: var(--daw-bg-input);
          border-radius: var(--radius-lg);
          border: var(--border-thin) solid var(--border-subtle);
          box-shadow: var(--shadow-inset);
          image-rendering: pixelated;
        }

        /* File Info */
        .daw-transport-file-info {
          text-align: center;
          border-top: var(--border-thin) solid var(--border-subtle);
          padding-top: var(--space-4);
        }

        .daw-transport-file-name {
          font-weight: var(--weight-medium);
          color: var(--daw-metal-platinum);
          font-size: var(--text-sm);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-bottom: var(--space-1);
        }

        .daw-transport-file-meta {
          font-size: var(--text-xs);
          font-family: var(--font-mono);
          color: var(--daw-metal-steel);
        }

        @media (max-width: 768px) {
          .daw-transport-controls {
            padding: var(--space-4);
          }

          .daw-transport-buttons {
            gap: var(--space-2);
          }

          .daw-btn-play {
            width: 48px;
            height: 48px;
          }

          .daw-btn-play-icon {
            width: 24px;
            height: 24px;
          }

          .daw-transport-visualization-metrics {
            flex-direction: column;
            align-items: flex-end;
            gap: var(--space-1);
          }

          .daw-transport-canvas {
            height: 96px;
          }
        }
      `}</style>
  );
}
