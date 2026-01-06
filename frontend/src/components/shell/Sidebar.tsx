/**
 * Sidebar - Left icon navigation (80px)
 * Phase 0-1: Icon-based vertical navigation with mode switching
 */

import type { SidebarProps, AnalysisMode } from '../../types/layout';

const modes: Array<{ id: AnalysisMode; label: string; icon: string }> = [
  { id: 'waveform', label: 'Waveform', icon: '≋' },
  { id: 'spectrum', label: 'Spectrum', icon: '▬' },
  { id: 'mfcc', label: 'MFCC', icon: '▦' },
  { id: 'tempo', label: 'Tempo', icon: '♪' },
  { id: 'key', label: 'Key', icon: '♫' },
  { id: 'segments', label: 'Segments', icon: '▭' },
  { id: 'meters', label: 'Meters', icon: '▮' },
];

export function Sidebar({ activeMode = 'waveform', onModeChange }: SidebarProps) {
  return (
    <div className="shell-sidebar">
      {/* Logo/Brand (top) */}
      <div className="h-12 flex items-center justify-center border-b border-border">
        <div className="w-10 h-10 bg-accent-brand rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
      </div>

      {/* Navigation Modes */}
      <nav className="flex-1 py-4 flex flex-col gap-1">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onModeChange?.(mode.id)}
            className={`sidebar-nav-item ${activeMode === mode.id ? 'active' : ''}`}
            title={mode.label}
          >
            <span className="text-2xl font-bold">{mode.icon}</span>
          </button>
        ))}
      </nav>

      {/* Settings (bottom) */}
      <div className="p-2 border-t border-border">
        <button className="sidebar-nav-item" title="Settings">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

Sidebar.displayName = 'Sidebar';
