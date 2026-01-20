/**
 * BottomDock - Footer region (140px)
 * Phase 2: Transport controls + timecode + meters + segmentation timeline with transport slot
 */

import type { BottomDockProps } from '../../types/layout';

export function BottomDock({
  isPlaying = false,
  onPlayPause,
  onRewind,
  onPrevious,
  onNext,
  onRepeat,
  transportSlot,
}: BottomDockProps) {
  const sections = [
    { id: 'intro', label: 'Intro', color: '#0D9488' },
    { id: 'verse1', label: 'Verse', color: '#0891B2' },
    { id: 'chorus1', label: 'Chorus', color: '#F59E0B' },
    { id: 'verse2', label: 'Verse', color: '#0891B2' },
    { id: 'chorus2', label: 'Chorus', color: '#F59E0B' },
    { id: 'bridge', label: 'Bridge', color: '#10B981' },
  ];

  return (
    <div className="shell-bottom">
      <div className="hp-bottom">
        <div className="hp-bottom-sections">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className="hp-section-tag"
              style={{ background: `${section.color}10`, color: section.color, borderColor: section.color }}
            >
              {section.label}
            </button>
          ))}
        </div>

        <div className="hp-bottom-transport">
          {transportSlot ?? (
            <div className="hp-transport-controls">
              <button
                type="button"
                className="hp-transport-btn"
                title="Rewind"
                onClick={onRewind}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                </svg>
              </button>
              <button
                type="button"
                className="hp-transport-btn"
                title="Previous"
                onClick={onPrevious}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="17 19 9 12 17 5 17 19" />
                  <line x1="7" y1="18" x2="7" y2="6" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
              <button
                type="button"
                className="hp-transport-btn hp-transport-btn--primary"
                onClick={onPlayPause}
                title="Play/Pause"
              >
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="8 6 17 12 8 18 8 6" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                className="hp-transport-btn"
                title="Next"
                onClick={onNext}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="7 5 15 12 7 19 7 5" />
                  <line x1="17" y1="6" x2="17" y2="18" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
              <button
                type="button"
                className="hp-transport-btn"
                title="Repeat"
                onClick={onRepeat}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 014-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 01-4 4H3" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="hp-bottom-meters">
          {[
            { label: 'L', value: '-2.5', color: '#10B981' },
            { label: 'R', value: '-10.2', color: '#F59E0B' },
            { label: 'LUFS', value: '-8.6', color: '#0D9488' },
          ].map((meter) => (
            <div key={meter.label} className="hp-meter">
              <div className="hp-meter-value" style={{ color: meter.color }}>{meter.value}</div>
              <div className="hp-meter-label">{meter.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

BottomDock.displayName = 'BottomDock';
