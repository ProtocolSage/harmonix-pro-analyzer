/**
 * Progress Bar Component
 * Handles audio progress display, seeking, and time formatting
 */

import React, { useRef, useCallback } from 'react';

interface ProgressBarProps {
    currentTime: number;
    duration: number;
    isDisabled: boolean;
    onSeek: (time: number) => void;
    onDragStart: () => void;
    onDragEnd: () => void;
    onDragUpdate: (time: number) => void;
    compact?: boolean;
    progressFillRef?: React.RefObject<HTMLDivElement>;
    progressHandleRef?: React.RefObject<HTMLDivElement>;
}

export function ProgressBar({
    currentTime,
    duration,
    isDisabled,
    onSeek,
    onDragStart,
    onDragEnd,
    onDragUpdate,
    compact = false,
    progressFillRef,
    progressHandleRef,
}: ProgressBarProps) {
    const internalProgressRef = useRef<HTMLDivElement>(null);
    const progressRef = internalProgressRef;

    const formatTime = (seconds: number): string => {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

    const handleProgressClick = useCallback((e: React.MouseEvent) => {
        if (!progressRef.current || duration === 0 || isDisabled) return;

        const rect = progressRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        const newTime = percentage * duration;

        onSeek(newTime);
    }, [duration, isDisabled, onSeek]);

    const handleProgressDrag = useCallback((e: React.MouseEvent) => {
        if (!progressRef.current || duration === 0 || isDisabled) return;

        onDragStart();

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!progressRef.current) return;

            const rect = progressRef.current.getBoundingClientRect();
            const dragX = Math.max(0, Math.min(moveEvent.clientX - rect.left, rect.width));
            const percentage = dragX / rect.width;
            const newTime = percentage * duration;

            onDragUpdate(newTime);
        };

        const handleMouseUp = () => {
            onDragEnd();
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [duration, isDisabled, onDragStart, onDragEnd, onDragUpdate]);

    if (compact) {
        return (
            <div className="hp-transport-progress">
                <div
                    ref={progressRef}
                    className="hp-transport-track"
                    onClick={handleProgressClick}
                    onMouseDown={handleProgressDrag}
                >
                    <div
                        ref={progressFillRef}
                        className="hp-transport-fill"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
                <div className="hp-transport-time">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="daw-transport-progress-section">
            <div
                ref={progressRef}
                className="daw-transport-progress-track"
                onClick={handleProgressClick}
                onMouseDown={handleProgressDrag}
            >
                <div
                    ref={progressFillRef}
                    className="daw-transport-progress-fill"
                    style={{ width: `${progressPercentage}%` }}
                />
                <div
                    ref={progressHandleRef}
                    className="daw-transport-progress-handle"
                    style={{ left: `calc(${progressPercentage}% - 6px)` }}
                />
            </div>

            <div className="daw-transport-time-display">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
            </div>
        </div>
    );
}
