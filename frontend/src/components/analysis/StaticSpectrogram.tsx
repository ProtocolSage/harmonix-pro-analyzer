import { useEffect, useState } from 'react';
import { useVisualizer } from '../../hooks/useVisualizer';
import { usePlayback } from '../../contexts/PlaybackContext';
import { spectrogramEngine } from '../../engines/SpectrogramAnalysisEngine';
import { Activity, Database, Zap } from 'lucide-react';
import { CountersunkWell } from '../shell/CountersunkWell';

interface StaticSpectrogramProps {
  width?: number;
  height?: number;
}

export function StaticSpectrogram({ width = 1000, height = 300 }: StaticSpectrogramProps) {
  const { state: playbackState } = usePlayback();
  const { audioBuffer, duration } = playbackState;
  const [status, setStatus] = useState<'idle' | 'loading' | 'computing'>('idle');
  
  const { canvasRef, start, stop, feed } = useVisualizer({
    rendererId: 'tiled-spectrogram',
    targetFps: 30 // Static view doesn't need 60fps unless scrubbing
  });

  useEffect(() => {
    if (!audioBuffer || !playbackState.lastTrackId) return;

    start();
    setStatus('loading');

    // Listener for tiles (from cache or worker)
    const handleTile = (e: Event) => {
      const tile = (e as CustomEvent).detail;
      feed({
        sequence: 0,
        timestamp: 0,
        spectrum: new Float32Array(0),
        waveform: new Float32Array(0),
        energy: { rms: 0, peak: 0, loudness: 0 },
        totalDuration: duration,
        spectrogramTile: tile
      });
      setStatus('idle'); // At least one tile loaded
    };

    window.addEventListener('SPECTROGRAM_TILE_READY', handleTile);

    // Trigger Analysis
    spectrogramEngine.analyzeTrack(
      playbackState.lastTrackId, 
      playbackState.lastTrackId, // Using trackId as fingerprint for now
      audioBuffer
    );

    return () => {
      window.removeEventListener('SPECTROGRAM_TILE_READY', handleTile);
      stop();
    };
  }, [audioBuffer, playbackState.lastTrackId, duration, feed, start, stop]);

  return (
    <CountersunkWell 
      label="Spectral Workbench" 
      icon={<Activity style={{ width: 14, height: 14 }} />}
      className="relative"
    >
      <div style={{ height: `${height}px`, width: '100%' }}>
        <canvas 
          ref={canvasRef} 
          width={width} 
          height={height} 
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
        
        {/* Platinum Status Pill */}
        <div className="absolute top-3 right-3 flex gap-2">
          {status === 'loading' && (
            <div className="flex items-center gap-2 px-3 py-1 bg-studio-accent-cyan/10 border border-studio-accent-cyan/30 rounded-full">
              <Database size={10} className="text-studio-accent-cyan animate-pulse" />
              <span className="text-[9px] font-mono text-studio-accent-cyan uppercase tracking-widest">Hydrating Cache</span>
            </div>
          )}
          {status === 'computing' && (
            <div className="flex items-center gap-2 px-3 py-1 bg-studio-accent-gold/10 border border-studio-accent-gold/30 rounded-full">
              <Zap size={10} className="text-studio-accent-gold animate-bounce" />
              <span className="text-[9px] font-mono text-studio-accent-gold uppercase tracking-widest">Computing Tiles</span>
            </div>
          )}
        </div>
      </div>
    </CountersunkWell>
  );
}
