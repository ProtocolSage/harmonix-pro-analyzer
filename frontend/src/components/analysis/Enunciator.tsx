import { useEffect, useRef } from 'react';
import { AtmosphereState } from '../../utils/AtmosphereManager';

interface EnunciatorProps {
  label: string;
  active: boolean;
  confidence: number; // 0-1
  color?: string;
  state?: AtmosphereState;
}

export function Enunciator({ label, active, confidence, color = 'var(--atmosphere-primary)', state }: EnunciatorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !active) return;
    
    // Apply dynamic flicker if active
    if (state && state.flickerRate > 0) {
      ref.current.style.animationDuration = `${1 / state.flickerRate}s`;
    } else {
      ref.current.style.animationDuration = '0s';
    }
  }, [active, state]);

  return (
    <div 
      className={`enunciator ${active ? 'is-active' : ''}`}
      style={{
        ['--enunciator-color' as string]: color,
        ['--enunciator-confidence' as string]: confidence
      }}
    >
      <div className="enunciator-led" ref={ref} />
      <span className="enunciator-label">{label}</span>
      
      <style>{`
        .enunciator {
          display: flex;
          align-items: center;
          gap: 8px;
          opacity: 0.4;
          transition: opacity 0.3s ease;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid transparent;
        }
        
        .enunciator.is-active {
          opacity: 1;
          border-color: rgba(255,255,255,0.05);
          background: rgba(0,0,0,0.2);
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.4);
        }
        
        .enunciator-led {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #333;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.1);
          transition: all 0.3s ease;
        }
        
        .enunciator.is-active .enunciator-led {
          background: var(--enunciator-color);
          box-shadow: 
            0 0 calc(var(--enunciator-confidence) * 10px) var(--enunciator-color),
            0 0 calc(var(--enunciator-confidence) * 4px) var(--enunciator-color);
          animation: enunciator-flicker linear infinite;
        }
        
        .enunciator-label {
          font-family: var(--font-mono);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-3);
        }
        
        .enunciator.is-active .enunciator-label {
          color: var(--enunciator-color);
          text-shadow: 0 0 8px var(--enunciator-color);
        }
        
        @keyframes enunciator-flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
