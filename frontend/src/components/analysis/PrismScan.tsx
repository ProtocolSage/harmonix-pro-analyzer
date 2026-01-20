import React, { useEffect, useRef, useState } from 'react';

interface PrismScanProps {
  isActive: boolean;
  duration?: number; // ms
}

/**
 * PrismScan: A laser-thin "Warm Gold" vertical line that sweeps across the well.
 * Signals active AI analysis (ML inference).
 */
export function PrismScan({ isActive, duration = 2000 }: PrismScanProps) {
  const [position, setProgress] = useState(0);
  const [dataBlips, setDataBlips] = useState<{ id: number; x: number; text: string }[]>([]);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const lastBlipRef = useRef<number>(0);

  const animate = (time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    const elapsed = time - startTimeRef.current;
    const progress = (elapsed % duration) / duration;
    
    setProgress(progress * 100);

    // Random data blips
    if (time - lastBlipRef.current > 300 && Math.random() > 0.7) {
      const newBlip = {
        id: Date.now(),
        x: progress * 100,
        text: `0x${Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase()}`
      };
      setDataBlips(prev => [...prev.slice(-5), newBlip]);
      lastBlipRef.current = time;
    }

    if (elapsed < duration || isActive) {
      requestRef.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    if (isActive) {
      startTimeRef.current = undefined;
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      setProgress(0);
      setDataBlips([]);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden" data-testid="prism-scan">
      {/* Scan Line */}
      <div 
        className="absolute top-0 bottom-0 w-[1px] bg-[#F59E0B] shadow-[0_0_15px_#F59E0B]"
        style={{ left: `${position}%`, transition: 'none' }}
        data-testid="prism-scan-line"
      >
        {/* Glow head */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#F59E0B] blur-[2px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#F59E0B] blur-[2px]" />
      </div>

      {/* Data Blips */}
      {dataBlips.map(blip => (
        <div 
          key={blip.id}
          className="absolute text-[8px] font-mono text-[#F59E0B] opacity-80 animate-pulse"
          style={{ left: `${blip.x}%`, top: `${(blip.id % 80) + 10}%` }}
        >
          {blip.text}
        </div>
      ))}

      {/* Trailing sweep */}
      <div 
        className="absolute top-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-[#F59E0B10]"
        style={{ left: `${position - 20}%`, transition: 'none' }}
      />
    </div>
  );
}
