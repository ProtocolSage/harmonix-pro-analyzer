import { useEffect, useRef, useState } from 'react';

interface WaveformVisualizerProps {
  audioFile: File | null;
  currentTime?: number;
  isPlaying?: boolean;
  onSeek?: (time: number) => void;
}

export function WaveformVisualizer({
  audioFile,
  currentTime = 0,
  isPlaying = false,
  onSeek
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);

  // Load and decode audio file
  useEffect(() => {
    if (!audioFile) {
      setAudioBuffer(null);
      return;
    }

    const loadAudio = async () => {
      setIsLoading(true);
      try {
        const arrayBuffer = await audioFile.arrayBuffer();
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const buffer = await audioContext.decodeAudioData(arrayBuffer);
        setAudioBuffer(buffer);
        setDuration(buffer.duration);
      } catch (error) {
        console.error('Failed to load audio:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAudio();
  }, [audioFile]);

  // Draw waveform
  useEffect(() => {
    if (!audioBuffer || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Get audio data (mono)
    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    // Create gradient for waveform
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(13, 148, 136, 0.85)');
    gradient.addColorStop(0.5, 'rgba(14, 165, 233, 0.5)');
    gradient.addColorStop(1, 'rgba(13, 148, 136, 0.85)');

    // Draw waveform
    ctx.fillStyle = gradient;
    ctx.beginPath();

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;

      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      const x = i;
      const y1 = (1 + min) * amp;
      const y2 = (1 + max) * amp;
      const barHeight = Math.max(1, y2 - y1);

      ctx.fillRect(x, y1, 1, barHeight);
    }

    // Draw progress overlay
    if (duration > 0) {
      const progressX = (currentTime / duration) * width;

      // Dim the waveform after playhead
      ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.fillRect(progressX, 0, width - progressX, height);

      // Draw playhead line
      ctx.strokeStyle = 'rgba(13, 148, 136, 1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();

      // Draw playhead glow
      const glowGradient = ctx.createLinearGradient(progressX - 20, 0, progressX + 20, 0);
      glowGradient.addColorStop(0, 'rgba(13, 148, 136, 0)');
      glowGradient.addColorStop(0.5, 'rgba(13, 148, 136, 0.35)');
      glowGradient.addColorStop(1, 'rgba(13, 148, 136, 0)');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(progressX - 20, 0, 40, height);
    }

  }, [audioBuffer, currentTime, duration]);

  // Handle canvas click for seeking
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek || !duration || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const seekTime = (x / rect.width) * duration;
    onSeek(seekTime);
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-bg-3 border-t-accent-brand rounded-full animate-spin"></div>
          <p className="text-sm text-text-2">Loading waveform...</p>
        </div>
      </div>
    );
  }

  if (!audioFile) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-text-3 text-sm">No audio loaded</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative group">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onClick={handleCanvasClick}
        style={{ display: 'block' }}
      />

      {/* Hover overlay with time tooltip */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="w-full h-full relative">
          {/* Grid lines */}
          <div className="absolute inset-0 flex justify-between px-4 opacity-30">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="w-px h-full bg-gridline"
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        canvas {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
      `}</style>
    </div>
  );
}
