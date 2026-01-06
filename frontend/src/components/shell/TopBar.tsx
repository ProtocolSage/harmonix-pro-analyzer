/**
 * TopBar - Header region (48px)
 * Phase 0-1: Placeholder with project name, timecode, and tab controls
 */

import type { TopBarProps } from '../../types/layout';

export function TopBar({
  projectName = 'Song_Analysis_Project',
  currentTime = '00:00.000',
  duration = '00:00.000',
  activeTab = 'settings',
  onTabChange,
}: TopBarProps) {
  return (
    <div className="shell-topbar">
      {/* Left: Project Info */}
      <div className="flex items-center gap-3 px-4">
        <div className="w-8 h-8 bg-bg-3 rounded-md flex items-center justify-center">
          <svg className="w-4 h-4 text-text-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <span className="text-text-1 text-base font-medium">{projectName}</span>
        <svg className="w-4 h-4 text-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Center: Timecode */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="font-mono text-2xl font-semibold text-text-1 tracking-wide">
          {currentTime}
        </div>
      </div>

      {/* Right: Tab Controls + Icons */}
      <div className="flex items-center gap-4 px-4">
        {/* Inspector Tabs */}
        <div className="flex items-center gap-1 bg-bg-2 rounded-lg p-1">
          <button
            onClick={() => onTabChange?.('settings')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-fast ${
              activeTab === 'settings'
                ? 'bg-bg-3 text-text-1'
                : 'text-text-2 hover:text-text-1'
            }`}
          >
            Analysis Settings
          </button>
          <button
            onClick={() => onTabChange?.('results')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-fast ${
              activeTab === 'results'
                ? 'bg-bg-3 text-text-1'
                : 'text-text-2 hover:text-text-1'
            }`}
          >
            Results
          </button>
        </div>

        {/* Control Icons */}
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center text-text-3 hover:text-text-1 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <button className="w-8 h-8 flex items-center justify-center text-text-3 hover:text-text-1 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

TopBar.displayName = 'TopBar';
