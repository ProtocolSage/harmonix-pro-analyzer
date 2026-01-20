/**
 * Sidebar - Left icon navigation (80px)
 * Phase 0-1: Icon-based vertical navigation with mode switching
 */

import type { SidebarProps, AnalysisMode } from '../../types/layout';

const navItems: Array<{ id: AnalysisMode; label: string; icon: string }> = [
  { id: 'analyze', label: 'Analyze', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { id: 'visualize', label: 'Visualize', icon: 'M3 3v18h18M9 17V9m4 8v-5m4 5v-8' },
  { id: 'library', label: 'Library', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { id: 'history', label: 'History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'compare', label: 'Compare', icon: 'M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01' },
];

const actionItems = [
  {
    id: 'record',
    label: 'Record',
    icon: (
      <>
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
      </>
    )
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
      </>
    )
  }
];

export function Sidebar({ activeMode = 'analyze', onModeChange }: SidebarProps) {
  return (
    <div className="shell-sidebar">
      <div className="hp-sidebar-logo">
        <div className="hp-logo-badge">
          <svg className="hp-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
      </div>

      <nav className="hp-sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onModeChange?.(item.id)}
            className={`hp-nav-item ${activeMode === item.id ? 'is-active' : ''}`}
            title={item.label}
            aria-label={item.label}
          >
            <svg
              className="hp-nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={item.icon} />
            </svg>
            <span className="hp-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="hp-sidebar-actions">
        {actionItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className="hp-nav-item"
            title={item.label}
            aria-label={item.label}
          >
            <svg
              className="hp-nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {item.icon}
            </svg>
            <span className="hp-nav-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

Sidebar.displayName = 'Sidebar';
