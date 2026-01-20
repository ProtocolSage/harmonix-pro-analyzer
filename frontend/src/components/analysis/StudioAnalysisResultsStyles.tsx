export function StudioAnalysisResultsStyles() {
  return (
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
  );
}
