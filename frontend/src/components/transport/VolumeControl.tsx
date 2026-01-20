/**
 * Volume Control Component
 * Handles volume slider and mute toggle
 */

import { Volume2, VolumeX } from 'lucide-react';
import { PrecisionKnob } from './PrecisionKnob';

interface VolumeControlProps {
    volume: number;
    isMuted: boolean;
    isDisabled: boolean;
    onVolumeChange: (volume: number) => void;
    onToggleMute: () => void;
}

export function VolumeControl({
    volume,
    isMuted,
    isDisabled,
    onVolumeChange,
    onToggleMute,
}: VolumeControlProps) {
    const displayVolume = isMuted ? 0 : volume;

    return (
        <div className="daw-transport-volume flex items-center gap-4">
            <button
                onClick={onToggleMute}
                disabled={isDisabled}
                className="daw-btn-icon daw-btn-ghost"
                title={isMuted ? 'Unmute' : 'Mute'}
            >
                {isMuted || volume === 0 ? (
                    <VolumeX style={{ width: '20px', height: '20px' }} />
                ) : (
                    <Volume2 style={{ width: '20px', height: '20px' }} />
                )}
            </button>

            <PrecisionKnob
                label="VOL"
                min={0}
                max={1}
                value={displayVolume}
                defaultValue={0.8}
                onChange={onVolumeChange}
                unit="%"
                className={isDisabled ? 'opacity-50 pointer-events-none' : ''}
            />
        </div>
    );
}
