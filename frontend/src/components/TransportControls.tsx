import type { AudioAnalysisResult } from '../types/audio';
import { useTransportController } from './transport/useTransportController';
import { TransportCompactView } from './transport/TransportCompactView';
import { TransportFullView } from './transport/TransportFullView';
import { TransportStyles } from './transport/TransportStyles';

interface TransportControlsProps {
  audioFile: File | null;
  isAnalyzing: boolean;
  analysisData?: AudioAnalysisResult | null;
  onPlaybackProgress?: (currentTime: number, duration: number) => void;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
  enableRealtimeVisualization?: boolean;
  compact?: boolean;
  seekToTime?: number | null;
  onSeekApplied?: () => void;
}

export function TransportControls(props: TransportControlsProps) {
  const { compact = false } = props;

  const controller = useTransportController({
    audioFile: props.audioFile,
    isAnalyzing: props.isAnalyzing,
    analysisData: props.analysisData,
    onPlaybackProgress: props.onPlaybackProgress,
    onPlaybackStateChange: props.onPlaybackStateChange,
    enableRealtimeVisualization: props.enableRealtimeVisualization,
    seekToTime: props.seekToTime,
    onSeekApplied: props.onSeekApplied,
  });

  return (
    <>
      {compact ? (
        <TransportCompactView controller={controller} />
      ) : (
        <TransportFullView controller={controller} analysisData={props.analysisData} />
      )}
      <TransportStyles />
    </>
  );
}
