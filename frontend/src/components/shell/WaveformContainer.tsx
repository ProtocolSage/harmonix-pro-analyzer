import { useEffect, useMemo, useState } from 'react';
import { TimelineGrid } from './TimelineGrid';
import { CountersunkWell } from './CountersunkWell';
import { Activity } from 'lucide-react';

interface WaveformContainerProps {
  waveformSlot?: React.ReactNode;
  playbackTime: number;
  playbackDuration: number;
  analysisData?: any; // We'll refine this type later if needed, or import strict type
  featureToggles: {
    segmentAnalysis: boolean;
  };
  sections: Array<{
    id: string;
    label: string;
    color: string;
    flex?: number;
  }>;
}

const formatDuration = (seconds?: number) => {
  if (seconds === undefined || Number.isNaN(seconds)) return '0:00.000';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
};

export function WaveformContainer({
  waveformSlot,
  playbackTime,
  playbackDuration,
  analysisData,
  featureToggles,
  sections,
}: WaveformContainerProps) {
  const [timelineTicks, setTimelineTicks] = useState<string[]>(['0:00', '0:45', '1:30', '2:15', '3:00', '3:45']);

  const waveformBars = useMemo(
    () =>
      Array.from({ length: 100 }, (_, i) => {
        const base = 15 + Math.sin(i * 0.18) * 30;
        const rand = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 25;
        return Math.min(95, Math.max(8, base + rand));
      }),
    []
  );

  // Update timeline ticks based on duration
  useEffect(() => {
    const total = playbackDuration || analysisData?.duration || 0;
    if (!total) return setTimelineTicks(['0:00', '0:45', '1:30', '2:15', '3:00', '3:45']);

    const markers = 6;
    const step = total / (markers - 1);
    const ticks = Array.from({ length: markers }, (_, i) => formatDuration(i * step).split('.')[0]);
    setTimelineTicks(ticks);
  }, [analysisData?.duration, playbackDuration]);

  return (
    <CountersunkWell label="Waveform & Timeline" icon={<Activity style={{ width: 14, height: 14 }} />} className="waveform-region">
      <TimelineGrid ticks={timelineTicks} />

      <div className="hp-waveform">
        {waveformSlot ? (
          <div className="hp-waveform-slot">{waveformSlot}</div>
        ) : (
          <div className="hp-waveform-bars">
            {waveformBars.map((height, index) => {
              const progress = playbackDuration ? Math.min(1, Math.max(0, playbackTime / playbackDuration)) : 0;
              const isPlayed = index / waveformBars.length < progress;
              return (
                <div
                  key={`wave-${index}`}
                  className="hp-waveform-bar"
                  style={{
                    height: `${height}%`,
                    background: isPlayed ? '#0D9488' : '#CBD5E1',
                    opacity: isPlayed ? 1 : 0.4,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {featureToggles.segmentAnalysis && (
        <div className="hp-sections">
          {sections.map((section, index) => (
            <div
              key={section.id}
              className="hp-section-marker"
              style={{
                flex: section.flex ?? 1,
                background: `${section.color}10`,
                color: section.color,
                borderRight: index < sections.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
              }}
            >
              {section.label}
            </div>
          ))}
        </div>
      )}
    </CountersunkWell>
  );
}
