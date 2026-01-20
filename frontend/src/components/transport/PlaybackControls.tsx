/**
 * Playback Controls Component
 * Handles play/pause, stop, skip, shuffle, and repeat buttons
 */

import {
    Play,
    Pause,
    Square,
    SkipBack,
    SkipForward,
    Repeat,
    Shuffle,
} from 'lucide-react';

interface PlaybackControlsProps {
    isPlaying: boolean;
    isRepeat: boolean;
    isShuffle: boolean;
    isDisabled: boolean;
    onTogglePlay: () => void;
    onStop: () => void;
    onSkipBackward: () => void;
    onSkipForward: () => void;
    onToggleRepeat: () => void;
    onToggleShuffle: () => void;
    compact?: boolean;
}

export function PlaybackControls({
    isPlaying,
    isRepeat,
    isShuffle,
    isDisabled,
    onTogglePlay,
    onStop,
    onSkipBackward,
    onSkipForward,
    onToggleRepeat,
    onToggleShuffle,
    compact = false,
}: PlaybackControlsProps) {
    if (compact) {
        return (
            <div className="hp-transport-buttons">
                <button
                    onClick={onSkipBackward}
                    disabled={isDisabled}
                    className="hp-transport-btn"
                    title="Skip backward 10s"
                >
                    <SkipBack className="hp-transport-icon" />
                </button>

                <button
                    onClick={onTogglePlay}
                    disabled={isDisabled}
                    className="hp-transport-btn hp-transport-btn--primary"
                    title={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? (
                        <Pause className="hp-transport-icon" />
                    ) : (
                        <Play className="hp-transport-icon" />
                    )}
                </button>

                <button
                    onClick={onSkipForward}
                    disabled={isDisabled}
                    className="hp-transport-btn"
                    title="Skip forward 10s"
                >
                    <SkipForward className="hp-transport-icon" />
                </button>

                <button
                    onClick={onToggleRepeat}
                    disabled={isDisabled}
                    className={`hp-transport-btn ${isRepeat ? 'is-active' : ''}`}
                    title="Repeat"
                >
                    <Repeat className="hp-transport-icon" />
                </button>
            </div>
        );
    }

    return (
        <div className="daw-transport-buttons">
            <button
                onClick={onToggleShuffle}
                disabled={isDisabled}
                className={`daw-btn-icon daw-btn-ghost ${isShuffle ? 'daw-btn-active' : ''}`}
                title="Shuffle"
            >
                <Shuffle style={{ width: '20px', height: '20px' }} />
            </button>

            <button
                onClick={onSkipBackward}
                disabled={isDisabled}
                className="daw-btn-icon daw-btn-secondary"
                title="Skip backward 10s"
            >
                <SkipBack style={{ width: '24px', height: '24px' }} />
            </button>

            <button
                onClick={onTogglePlay}
                disabled={isDisabled}
                className="daw-btn-play"
                title={isPlaying ? 'Pause' : 'Play'}
            >
                {isPlaying ? (
                    <Pause className="daw-btn-play-icon" />
                ) : (
                    <Play className="daw-btn-play-icon" />
                )}
            </button>

            <button
                onClick={onStop}
                disabled={isDisabled}
                className="daw-btn-icon daw-btn-secondary"
                title="Stop"
            >
                <Square style={{ width: '24px', height: '24px' }} />
            </button>

            <button
                onClick={onSkipForward}
                disabled={isDisabled}
                className="daw-btn-icon daw-btn-secondary"
                title="Skip forward 10s"
            >
                <SkipForward style={{ width: '24px', height: '24px' }} />
            </button>

            <button
                onClick={onToggleRepeat}
                disabled={isDisabled}
                className={`daw-btn-icon daw-btn-ghost ${isRepeat ? 'daw-btn-active' : ''}`}
                title="Repeat"
            >
                <Repeat style={{ width: '20px', height: '20px' }} />
            </button>
        </div>
    );
}
