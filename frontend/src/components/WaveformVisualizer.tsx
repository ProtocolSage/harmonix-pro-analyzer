import { useEffect, useRef, useState, useCallback } from 'react';
import { useVisualizer } from '../hooks/useVisualizer';
import { usePlayback } from '../contexts/PlaybackContext';
import { Loader2, MousePointer2 } from 'lucide-react';
import gsap from 'gsap';

interface WaveformVisualizerProps {
  onSeek?: (time: number) => void;
  height?: number | string;
}

export function WaveformVisualizer({
  onSeek,
  height = 200
}: WaveformVisualizerProps) {
  const { engine: transport, state: playbackState } = usePlayback();
  const { audioBuffer, duration } = playbackState;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  // GSAP animated progress value for "Liquid Playhead"
  const animProgress = useRef({ value: 0 });
  
  const { canvasRef, feed, start, stop } = useVisualizer({
    rendererId: 'waveform',
    targetFps: 60
  });

  // Sync playhead at 60fps
  useEffect(() => {
    if (!audioBuffer) return;

    start();
    
    const unsubscribe = transport.onTick((time) => {
      const pcm = audioBuffer.getChannelData(0);
      const targetProgress = duration > 0 ? time / duration : 0;
      
      // If we are not seeking (heavy jump), we just follow the clock
      // If a jump just happened, GSAP will catch up
      if (Math.abs(animProgress.current.value - targetProgress) > 0.05) {
          gsap.to(animProgress.current, {
              value: targetProgress,
              duration: 0.4,
              ease: 'power2.out',
              overwrite: 'auto'
          });
      } else {
          animProgress.current.value = targetProgress;
      }

      feed({
        sequence: 0,
        timestamp: time,
        spectrum: new Float32Array(0),
        waveform: pcm,
        energy: { rms: 0, peak: 0, loudness: 0 },
        progress: animProgress.current.value
      } as any);
    });

    return () => {
      unsubscribe();
      stop();
    };
  }, [audioBuffer, duration, feed, start, stop, transport]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!duration || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const normalizedX = Math.max(0, Math.min(1, x / rect.width));
    const time = normalizedX * duration;
    
    setHoverTime(time);
    
    if (tooltipRef.current) {
        gsap.set(tooltipRef.current, { x: x + 10, y: e.clientY - rect.top - 40 });
    }
  }, [duration]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!onSeek || !duration || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const seekTime = (x / rect.width) * duration;
    
    // Immediate local visual feedback jump
    gsap.to(animProgress.current, {
        value: seekTime / duration,
        duration: 0.3,
        ease: 'back.out(1.7)'
    });
    
    onSeek(seekTime);
  }, [duration, onSeek, canvasRef]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  if (!audioBuffer) {
    return (
      <div 
        className="studio-card-glass flex flex-col items-center justify-center gap-4 animate-pulse"
        style={{ height, borderRadius: '12px' }}
      >
        <Loader2 className="w-8 h-8 text-studio-accent-cyan animate-spin" />
        <p className="text-xs font-mono text-studio-text-tertiary uppercase tracking-[0.2em]">Awaiting Master Stream</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative group overflow-visible rounded-xl border border-studio-glass-border shadow-inner"
      style={{ height, background: 'var(--studio-bg-secondary)' }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Waveform Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-none transition-opacity duration-500"
        onClick={handleCanvasClick}
        style={{ display: 'block' }}
      />

      {/* Floating Time Tooltip */}
      <div 
        ref={tooltipRef}
        className={`absolute pointer-events-none z-50 px-3 py-1.5 rounded-md bg-studio-bg-primary/90 border border-studio-accent-gold/30 backdrop-blur-xl shadow-glow transition-opacity duration-200 ${isHovering ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="flex items-center gap-2">
          <MousePointer2 size={10} className="text-studio-accent-gold" />
          <span className="text-[10px] font-mono font-bold text-studio-accent-gold tracking-widest">
            {hoverTime !== null ? formatTime(hoverTime) : '0:00.00'}
          </span>
        </div>
      </div>

      {/* Metadata Badges */}
      <div className="absolute bottom-2 right-3 flex gap-2">
        <div className="studio-badge-glass bg-black/40 px-2 py-0.5 text-[9px] font-mono text-studio-text-muted border border-white/5">
          {audioBuffer.sampleRate} HZ
        </div>
        <div className="studio-badge-glass bg-black/40 px-2 py-0.5 text-[9px] font-mono text-studio-text-muted border border-white/5 uppercase">
          PCM FLOAT32
        </div>
      </div>

      {/* Vignette Effect */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/20 via-transparent to-black/20 rounded-xl"></div>
    </div>
  );
}
