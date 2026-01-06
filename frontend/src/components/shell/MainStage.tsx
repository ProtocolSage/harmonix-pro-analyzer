/**
 * MainStage - Center content area
 * Phase 0-1: Waveform region + 2×2 analysis panels grid (placeholders)
 */

import type { MainStageProps } from '../../types/layout';

export function MainStage({ children }: MainStageProps) {
  return (
    <div className="shell-main">
      {/* Waveform Viewer Region (40% height) */}
      <div className="waveform-region">
        <div className="h-full bg-bg-2 rounded-card border border-border flex flex-col">
          {/* Timeline Ruler */}
          <div className="h-8 border-b border-border px-4 flex items-center justify-between text-xs font-mono text-text-3">
            <span>0:45</span>
            <span>1:30</span>
            <span>1:30</span>
            <span>2:15</span>
            <span>2:30</span>
            <span>3:00</span>
          </div>

          {/* Waveform Canvas Placeholder */}
          <div className="flex-1 relative overflow-hidden">
            {/* Gradient placeholder simulating waveform */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-2/3 bg-gradient-to-r from-accent-spectral via-accent-mfcc to-accent-spectral opacity-30 blur-xl"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-text-3 text-lg font-medium">Waveform Viewer (Placeholder)</span>
            </div>
          </div>

          {/* Segmentation Strip */}
          <div className="h-8 border-t border-border flex items-center">
            <div className="flex-1 h-full bg-red-900 bg-opacity-30 border-l-2 border-red-500 flex items-center justify-center">
              <span className="text-xs text-text-2">Intro</span>
            </div>
            <div className="flex-1 h-full bg-orange-900 bg-opacity-30 border-l-2 border-orange-500 flex items-center justify-center">
              <span className="text-xs text-text-2">Verse</span>
            </div>
            <div className="flex-1 h-full bg-blue-900 bg-opacity-40 border-l-2 border-accent-mfcc flex items-center justify-center">
              <span className="text-xs text-text-1 font-medium">Chorus</span>
            </div>
            <div className="flex-1 h-full bg-purple-900 bg-opacity-30 border-l-2 border-accent-key flex items-center justify-center">
              <span className="text-xs text-text-2">Bridge</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Panels Grid (60% height) */}
      <div className="panels-grid">
        {/* Spectral Analysis Panel */}
        <div className="analysis-panel">
          <div className="panel-header">
            <h3 className="text-sm font-semibold text-text-1">Spectral Analysis</h3>
            <div className="flex items-center gap-2">
              <button className="text-text-3 hover:text-text-1 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
          </div>
          <div className="panel-content">
            <div className="w-full h-full bg-gradient-to-br from-accent-spectral/20 to-transparent flex items-center justify-center">
              <span className="text-text-3">Spectral Panel (Placeholder)</span>
            </div>
          </div>
        </div>

        {/* MFCC Heatmap Panel */}
        <div className="analysis-panel">
          <div className="panel-header">
            <h3 className="text-sm font-semibold text-text-1">MFCC Heatmap</h3>
            <div className="flex items-center gap-2">
              <button className="text-text-3 hover:text-text-1 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
          </div>
          <div className="panel-content">
            <div className="w-full h-full bg-gradient-to-br from-accent-mfcc/20 to-transparent flex items-center justify-center">
              <span className="text-text-3">MFCC Panel (Placeholder)</span>
            </div>
          </div>
        </div>

        {/* Tempo/BPM Panel */}
        <div className="analysis-panel">
          <div className="panel-header">
            <h3 className="text-sm font-semibold text-text-1">Tempo/BPM</h3>
            <div className="flex items-center gap-2">
              <button className="text-text-3 hover:text-text-1 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
          </div>
          <div className="panel-content">
            <div className="w-full h-full bg-gradient-to-br from-accent-tempo/20 to-transparent flex items-center justify-center">
              <span className="text-text-3">Tempo Panel (Placeholder)</span>
            </div>
          </div>
        </div>

        {/* Key Detection Panel */}
        <div className="analysis-panel">
          <div className="panel-header">
            <h3 className="text-sm font-semibold text-text-1">Key Detection</h3>
            <div className="flex items-center gap-2">
              <button className="text-text-3 hover:text-text-1 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
          </div>
          <div className="panel-content">
            <div className="w-full h-full bg-gradient-to-br from-accent-key/20 to-transparent flex items-center justify-center">
              <span className="text-text-3">Key Panel (Placeholder)</span>
            </div>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}

MainStage.displayName = 'MainStage';
