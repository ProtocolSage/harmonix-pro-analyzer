import React from 'react';
import { PrecisionKnob } from './PrecisionKnob';
import { PrecisionFader } from './PrecisionFader';
import { CountersunkWell } from '../shell/CountersunkWell';
import { Settings2, Zap, Volume2 } from 'lucide-react';

interface TransportRackProps {
  volume: number;
  onVolumeChange: (v: number) => void;
  playbackRate: number;
  onPlaybackRateChange: (v: number) => void;
  isDisabled: boolean;
}

/**
 * TransportRack: A dedicated panel for high-precision tactile controls.
 */
export function TransportRack({
  volume,
  onVolumeChange,
  playbackRate,
  onPlaybackRateChange,
  isDisabled
}: TransportRackProps) {
  return (
    <CountersunkWell label="Control Rack" icon={<Settings2 style={{ width: 14, height: 14 }} />} className="h-full">
      <div className="flex items-center justify-around p-6 h-full gap-8 bg-black/10">
        {/* Output Volume Fader */}
        <PrecisionFader
          label="Output"
          min={0}
          max={1}
          value={volume}
          defaultValue={0.8}
          onChange={onVolumeChange}
          unit="%"
          className={isDisabled ? 'opacity-50' : ''}
        />

        <div className="flex flex-col gap-8">
          {/* Playback Speed Knob */}
          <PrecisionKnob
            label="Rate"
            min={0.5}
            max={2.0}
            value={playbackRate}
            defaultValue={1.0}
            onChange={onPlaybackRateChange}
            unit="x"
            className={isDisabled ? 'opacity-50' : ''}
          />

          {/* Master Drive (Simulated for aesthetic) */}
          <PrecisionKnob
            label="Drive"
            min={0}
            max={100}
            value={0}
            defaultValue={0}
            onChange={() => {}}
            unit="dB"
            className={isDisabled ? 'opacity-50' : ''}
          />
        </div>

        {/* Global Performance Monitoring (Simplified visualization) */}
        <div className="flex flex-col items-center gap-4">
           <span className="text-[9px] font-bold uppercase tracking-widest text-text-3 select-none">
            Performance
          </span>
          <div className="w-16 h-32 bg-black/40 rounded border border-white/5 p-2 flex flex-col justify-end gap-1">
            <div className="w-full bg-accent-brand/20 h-4 rounded-sm border border-accent-brand/30" />
            <div className="w-full bg-accent-brand/40 h-8 rounded-sm border border-accent-brand/50 shadow-[0_0_8px_var(--accent-brand)]" />
            <div className="w-full bg-accent-brand/20 h-6 rounded-sm border border-accent-brand/30" />
          </div>
        </div>
      </div>
    </CountersunkWell>
  );
}
