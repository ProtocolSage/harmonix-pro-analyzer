import React, { ReactNode } from 'react';

interface DAWSidebarProps {
  children: ReactNode;
  quickStats?: {
    bpm?: number;
    key?: string;
    duration?: string;
    sampleRate?: number;
  };
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const DAWSidebar: React.FC<DAWSidebarProps> = ({
  children,
  quickStats,
  isCollapsed = false,
  onToggleCollapse
}) => {
  return (
    <aside className={`daw-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Collapse Toggle Button */}
      <button
        className="daw-sidebar-toggle"
        onClick={onToggleCollapse}
        title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className={isCollapsed ? 'rotate-180' : ''}
        >
          <path
            d="M10 12L6 8L10 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {!isCollapsed && (
        <>
          {/* Quick Stats Panel */}
          {quickStats && (
            <div className="daw-sidebar-section">
              <div className="daw-sidebar-header">
                <h3 className="daw-sidebar-title">Quick Stats</h3>
              </div>
              <div className="daw-quick-stats">
                {quickStats.bpm && (
                  <div className="daw-quick-stat">
                    <div className="daw-quick-stat-label">BPM</div>
                    <div className="daw-quick-stat-value">{quickStats.bpm.toFixed(1)}</div>
                  </div>
                )}
                {quickStats.key && (
                  <div className="daw-quick-stat">
                    <div className="daw-quick-stat-label">Key</div>
                    <div className="daw-quick-stat-value">{quickStats.key}</div>
                  </div>
                )}
                {quickStats.duration && (
                  <div className="daw-quick-stat">
                    <div className="daw-quick-stat-label">Duration</div>
                    <div className="daw-quick-stat-value">{quickStats.duration}</div>
                  </div>
                )}
                {quickStats.sampleRate && (
                  <div className="daw-quick-stat">
                    <div className="daw-quick-stat-label">Sample Rate</div>
                    <div className="daw-quick-stat-value">
                      {(quickStats.sampleRate / 1000).toFixed(1)}kHz
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Content (FileUpload, Controls, etc.) */}
          <div className="daw-sidebar-content">
            {children}
          </div>

          {/* Sidebar Footer - Could add presets, etc. */}
          <div className="daw-sidebar-footer">
            <div className="daw-text-muted" style={{ fontSize: 'var(--text-xs)', textAlign: 'center' }}>
              v1.0.0 • Essentia.js WASM
            </div>
          </div>
        </>
      )}

      <style>{`
        .daw-sidebar {
          width: 320px;
          height: 100%;
          background: var(--daw-bg-raised);
          border-right: var(--border-thin) solid var(--border-default);
          display: flex;
          flex-direction: column;
          transition: width var(--duration-normal) var(--ease-out);
          position: relative;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .daw-sidebar.collapsed {
          width: 48px;
        }

        /* Custom Scrollbar for Sidebar */
        .daw-sidebar::-webkit-scrollbar {
          width: 6px;
        }

        .daw-sidebar::-webkit-scrollbar-track {
          background: var(--daw-bg-deep);
        }

        .daw-sidebar::-webkit-scrollbar-thumb {
          background: var(--border-default);
          border-radius: var(--radius-full);
        }

        .daw-sidebar::-webkit-scrollbar-thumb:hover {
          background: var(--border-emphasis);
        }

        /* Collapse Toggle */
        .daw-sidebar-toggle {
          position: absolute;
          top: var(--space-4);
          right: var(--space-4);
          width: 32px;
          height: 32px;
          background: var(--daw-bg-elevated);
          border: var(--border-thin) solid var(--border-default);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--daw-metal-silver);
          transition: all var(--duration-fast) var(--ease-out);
          z-index: 10;
        }

        .daw-sidebar-toggle:hover {
          background: var(--daw-bg-deep);
          border-color: var(--border-emphasis);
          color: var(--daw-metal-platinum);
        }

        .daw-sidebar-toggle svg {
          transition: transform var(--duration-normal) var(--ease-out);
        }

        .daw-sidebar-toggle svg.rotate-180 {
          transform: rotate(180deg);
        }

        /* Sidebar Sections */
        .daw-sidebar-section {
          padding: var(--space-6);
          border-bottom: var(--border-thin) solid var(--border-subtle);
        }

        .daw-sidebar-header {
          margin-bottom: var(--space-4);
        }

        .daw-sidebar-title {
          font-size: var(--text-sm);
          font-weight: var(--weight-semibold);
          color: var(--daw-metal-steel);
          text-transform: uppercase;
          letter-spacing: var(--tracking-wider);
        }

        .daw-sidebar-content {
          flex: 1;
          padding: var(--space-6);
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .daw-sidebar-footer {
          padding: var(--space-4);
          border-top: var(--border-thin) solid var(--border-subtle);
          background: var(--daw-bg-deep);
        }

        /* Quick Stats Grid */
        .daw-quick-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-3);
        }

        .daw-quick-stat {
          background: var(--daw-bg-elevated);
          border: var(--border-thin) solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: var(--space-3);
          text-align: center;
        }

        .daw-quick-stat-label {
          font-size: var(--text-xs);
          font-weight: var(--weight-medium);
          color: var(--daw-metal-steel);
          text-transform: uppercase;
          letter-spacing: var(--tracking-wide);
          margin-bottom: var(--space-1);
        }

        .daw-quick-stat-value {
          font-size: var(--text-lg);
          font-weight: var(--weight-bold);
          font-family: var(--font-mono);
          color: var(--daw-gold-bright);
        }

        @media (max-width: 1024px) {
          .daw-sidebar {
            position: fixed;
            left: 0;
            top: 64px; /* Below top bar */
            bottom: 56px; /* Above meter bridge */
            z-index: var(--z-dropdown);
            box-shadow: var(--shadow-xl);
          }

          .daw-sidebar.collapsed {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </aside>
  );
};
