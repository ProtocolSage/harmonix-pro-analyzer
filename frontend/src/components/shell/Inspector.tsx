/**
 * Inspector - Right panel (380px)
 * Phase 0-1: Tabbed panel with Settings/Results placeholders
 */

import type { InspectorProps } from '../../types/layout';

export function Inspector({ activeTab = 'settings', onTabChange }: InspectorProps) {
  return (
    <div className="shell-inspector">
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'settings' ? (
          <SettingsPanel />
        ) : (
          <ResultsPanel />
        )}
      </div>
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-text-1 mb-4">Analysis Settings</h3>

      {/* Algorithm Selector */}
      <div>
        <label className="block text-sm font-medium text-text-2 mb-2">
          Algorithm:
        </label>
        <select className="w-full bg-bg-3 border border-border rounded-control px-3 py-2 text-text-1 focus:outline-none focus:ring-2 focus:ring-accent-brand">
          <option>Essentia</option>
          <option>LibROSA</option>
          <option>Custom</option>
        </select>
      </div>

      {/* Window Size */}
      <div>
        <label className="block text-sm font-medium text-text-2 mb-2">
          Window Size:
        </label>
        <select className="w-full bg-bg-3 border border-border rounded-control px-3 py-2 text-text-1 focus:outline-none focus:ring-2 focus:ring-accent-brand">
          <option>1024</option>
          <option selected>2048</option>
          <option>4096</option>
        </select>
      </div>

      {/* Hop Size */}
      <div>
        <label className="block text-sm font-medium text-text-2 mb-2">
          Hop Size:
        </label>
        <select className="w-full bg-bg-3 border border-border rounded-control px-3 py-2 text-text-1 focus:outline-none focus:ring-2 focus:ring-accent-brand">
          <option>256</option>
          <option selected>512</option>
          <option>1024</option>
        </select>
      </div>

      {/* Checkboxes */}
      <div className="space-y-3 pt-4 border-t border-border">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="w-5 h-5 bg-accent-brand rounded flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-sm text-text-1 group-hover:text-text-1">Key Detection</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="w-5 h-5 bg-accent-brand rounded flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-sm text-text-1 group-hover:text-text-1">BPM Extraction</span>
        </label>
      </div>
    </div>
  );
}

function ResultsPanel() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-text-1 mb-4">Results</h3>

      {/* Tempo */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-2">Tempo:</span>
          <span className="text-base font-semibold text-text-1">120.5 BPM</span>
        </div>
        <div className="h-8 flex items-center gap-0.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-accent-tempo rounded-sm"
              style={{ height: `${Math.random() * 60 + 40}%` }}
            />
          ))}
        </div>
      </div>

      {/* Key */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-2">Key:</span>
          <span className="text-base font-semibold text-text-1">C Major</span>
        </div>
        <div className="h-8 flex items-center gap-0.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-accent-dynamics rounded-sm"
              style={{ height: `${Math.random() * 60 + 40}%` }}
            />
          ))}
        </div>
      </div>

      {/* Loudness */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-2">Loudness:</span>
          <span className="text-base font-semibold text-text-1">-14.3 LUFS</span>
        </div>
        <div className="h-8 flex items-center gap-0.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-accent-mfcc rounded-sm"
              style={{ height: `${Math.random() * 60 + 40}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

Inspector.displayName = 'Inspector';
