import { useEffect, useRef, useMemo } from 'react';
import { useComparison } from '../../contexts/ComparisonContext';

interface MelodicDNAProps {
  width?: number;
  height?: number;
}

export function MelodicDNA({ width = 800, height = 200 }: MelodicDNAProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state } = useComparison();
  const bloomHoldRef = useRef<number>(0);
  const lastBloomTriggerRef = useRef<number>(0);

  // Range for pitch visualization (log scale)
  const MIN_FREQ = 60; // C2
  const MAX_FREQ = 2000; // B6

  const freqToY = (freq: number) => {
    if (freq <= 0) return height; // Unvoiced
    const logMin = Math.log2(MIN_FREQ);
    const logMax = Math.log2(MAX_FREQ);
    const logFreq = Math.log2(Math.max(MIN_FREQ, Math.min(MAX_FREQ, freq)));
    
    // Invert so higher frequency is higher on canvas (lower Y)
    return height - ((logFreq - logMin) / (logMax - logMin)) * height;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sourceMelody = state.source.analysisData?.melody;
    const refMelody = state.reference.analysisData?.melody;

    ctx.clearRect(0, 0, width, height);

    // Draw background grid (octaves)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let f = MIN_FREQ; f <= MAX_FREQ; f *= 2) {
      const y = freqToY(f);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (!sourceMelody) return;

    const sourceTrack = sourceMelody.pitchTrack;
    const refTrack = refMelody?.pitchTrack;
    
    // Draw Reference (Ghost) Strand first
    if (refTrack && refTrack.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; // Dimmed "Ghost" look
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]); // Dashed line for ghost layer
      
      const step = width / refTrack.length;
      let first = true;
      
      for (let i = 0; i < refTrack.length; i++) {
        if (refTrack[i] > 0) {
          const x = i * step;
          const y = freqToY(refTrack[i]);
          if (first) {
            ctx.moveTo(x, y);
            first = false;
          } else {
            ctx.lineTo(x, y);
          }
        } else {
          first = true;
        }
      }
      ctx.stroke();
      ctx.setLineDash([]); // Reset
    }

    // Draw Source (Live) Strand
    ctx.beginPath();
    ctx.strokeStyle = '#0EA5E9'; // Cyan
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(14, 165, 233, 0.5)';
    
    const step = width / sourceTrack.length;
    let first = true;
    
    for (let i = 0; i < sourceTrack.length; i++) {
      if (sourceTrack[i] > 0) {
        const x = i * step;
        const y = freqToY(sourceTrack[i]);
        if (first) {
          ctx.moveTo(x, y);
          first = false;
        } else {
          ctx.lineTo(x, y);
        }
      } else {
        first = true;
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Divergence Logic & Bloom
    if (refTrack && refTrack.length > 0 && state.isComparisonMode) {
      const minLen = Math.min(sourceTrack.length, refTrack.length);
      const now = performance.now();
      
      let totalDivergence = 0;
      let divergentPoints = 0;

      for (let i = 0; i < minLen; i++) {
        const s = sourceTrack[i];
        const r = refTrack[i];
        
        if (s > 0 && r > 0) {
          const semitoneDiff = Math.abs(12 * Math.log2(s / r));
          
          // Divergence threshold: 1 semitone
          if (semitoneDiff > 1.0) {
            divergentPoints++;
            totalDivergence += semitoneDiff;
            
            // Draw Divergence Bloom (Jewel Ruby)
            const x = i * step;
            const sy = freqToY(s);
            const ry = freqToY(r);
            
            // Render space between strands
            const gradient = ctx.createLinearGradient(x, sy, x, ry);
            gradient.addColorStop(0, 'rgba(225, 29, 72, 0.1)'); // Rose 600
            gradient.addColorStop(0.5, 'rgba(225, 29, 72, 0.3)');
            gradient.addColorStop(1, 'rgba(225, 29, 72, 0.1)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, Math.min(sy, ry), step + 1, Math.abs(sy - ry));
          }
        }
      }

      // 100ms Hold Smoothing for Global Bloom
      const isDivergent = divergentPoints > minLen * 0.05; // 5% of track divergent
      if (isDivergent) {
        lastBloomTriggerRef.current = now;
        bloomHoldRef.current = 1.0;
      } else if (now - lastBloomTriggerRef.current > 100) {
        bloomHoldRef.current = Math.max(0, bloomHoldRef.current - 0.1);
      }

      if (bloomHoldRef.current > 0) {
        // Apply global Jewel Ruby glow to canvas
        ctx.fillStyle = `rgba(225, 29, 72, ${bloomHoldRef.current * 0.1})`;
        ctx.fillRect(0, 0, width, height);
      }
    }

  }, [state.source.analysisData, state.reference.analysisData, state.isComparisonMode, width, height]);

  return (
    <div className="dna-well" style={{
      background: 'rgba(0,0,0,0.2)',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.05)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <canvas 
        ref={canvasRef} 
        width={width} 
        height={height} 
        style={{ width: '100%', height: 'auto', display: 'block' }} 
      />
      <div style={{
        position: 'absolute',
        top: '8px',
        left: '12px',
        fontSize: '10px',
        color: 'rgba(255,255,255,0.3)',
        textTransform: 'uppercase',
        letterSpacing: '1px'
      }}>
        Melodic DNA Well
      </div>
    </div>
  );
}
