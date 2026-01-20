import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat
} from 'lucide-react';
import type { TransportController } from './useTransportController';
import type { AudioAnalysisResult } from '../../types/audio';
import { ProgressBar } from './ProgressBar';

interface Props {
  controller: TransportController;
  analysisData?: AudioAnalysisResult | null;
}

export function TransportFullView({ controller, analysisData }: Props) {
  const {
    progressRef,
    progressFillRef,
    progressHandleRef,
    visualizationCanvasRef,
    visualizationEnabled,
    togglePlay,
    skipBackward,
    skipForward,
    toggleRepeat,
    handleProgressClick,
    handleProgressDrag,
    isDisabled,
    playbackState,
  } = controller;

    return (
      <div className="hp-transport">
        <div className="hp-transport-buttons">
          <button
            onClick={skipBackward}
            disabled={isDisabled}
            className="hp-transport-btn"
            title="Skip backward 10s"
          >
            <SkipBack className="hp-transport-icon" />
          </button>
          <button
            onClick={togglePlay}
            disabled={isDisabled}
            className="hp-transport-btn hp-transport-btn--primary"
            title={playbackState.isPlaying ? 'Pause' : 'Play'}
          >
            {playbackState.isPlaying ? (
              <Pause className="hp-transport-icon" />
            ) : (
              <Play className="hp-transport-icon" />
            )}
          </button>
          <button
            onClick={skipForward}
            disabled={isDisabled}
            className="hp-transport-btn"
            title="Skip forward 10s"
          >
            <SkipForward className="hp-transport-icon" />
          </button>
          <button
            onClick={toggleRepeat}
            disabled={isDisabled}
            className={`hp-transport-btn ${playbackState.isRepeat ? 'is-active' : ''}`}
            title="Repeat"
          >
            <Repeat className="hp-transport-icon" />
          </button>
        </div>
        
        <ProgressBar
          currentTime={playbackState.currentTime}
          duration={playbackState.duration}
          isDisabled={isDisabled}
          onSeek={controller.seek}
          onDragStart={() => {}}
          onDragEnd={() => {}}
          onDragUpdate={() => {}}
          compact={true}
          progressFillRef={progressFillRef}
          progressHandleRef={progressHandleRef}
        />

        {visualizationEnabled && (
          <div className="hp-transport-mini-visual">
            <canvas ref={visualizationCanvasRef} className="hp-transport-mini-meter" />
          </div>
        )}
      </div>
    );
}
