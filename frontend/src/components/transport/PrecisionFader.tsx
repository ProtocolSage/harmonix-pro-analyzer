import React, { useState, useRef, useEffect } from 'react';
import { MomentumEngine } from '../../utils/MomentumEngine';
import { useUI } from '../../contexts/UIContext';

interface PrecisionFaderProps {
  label: string;
  min: number;
  max: number;
  value: number;
  defaultValue?: number;
  onChange: (value: number) => void;
  unit?: string;
  className?: string;
}

export function PrecisionFader({
  label,
  min,
  max,
  value,
  defaultValue,
  onChange,
  unit = '',
  className = ''
}: PrecisionFaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const engineRef = useRef<MomentumEngine | null>(null);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);

  const { state: uiState } = useUI();

  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new MomentumEngine({
        min,
        max,
        initialValue: value,
        onChange: (v) => {
          setLocalValue(v);
          onChange(v);
        }
      });
    }
  }, [min, max]);

  useEffect(() => {
    if (!isDragging && Math.abs(value - localValue) > 0.001) {
      setLocalValue(value);
      engineRef.current?.setValue(value);
    }
  }, [value, isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastYRef.current = e.clientY;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
    engineRef.current?.stop();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const now = performance.now();
      const deltaY = lastYRef.current - moveEvent.clientY;
      const deltaTime = now - lastTimeRef.current;
      
      const sensitivity = moveEvent.shiftKey ? 0.001 : 0.01;
      const range = max - min;
      const change = deltaY * sensitivity * (range / 10); // Faster for faders
      
      const newValue = engineRef.current!.getValue() + change;
      engineRef.current!.setValue(newValue);

      if (deltaTime > 0) {
        velocityRef.current = change / (deltaTime / 16.67);
      }

      lastYRef.current = moveEvent.clientY;
      lastTimeRef.current = now;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Apply momentum if fast enough and not in precision-only mode
      if (!uiState.precisionOnlyMode && Math.abs(velocityRef.current) > 0.05) {
        engineRef.current?.impulse(velocityRef.current);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = (max - min) / 50;
    const fineStep = step / 10;
    const currentStep = e.shiftKey ? fineStep : step;

    if (e.key === 'ArrowUp') {
      engineRef.current?.setValue(localValue + currentStep);
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      engineRef.current?.setValue(localValue - currentStep);
      e.preventDefault();
    }
  };

  const handleDoubleClick = () => {
    if (defaultValue !== undefined) {
      engineRef.current?.setValue(defaultValue);
    }
  };

  const percent = ((localValue - min) / (max - min)) * 100;

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <span className="text-[9px] font-bold uppercase tracking-widest text-text-3 select-none">
        {label}
      </span>

      <div 
        className="relative w-10 h-32 cursor-ns-resize group"
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        onDoubleClick={handleDoubleClick}
        tabIndex={0}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={localValue}
        aria-label={label}
      >
        {/* Track Well */}
        <div className="absolute inset-x-4 inset-y-0 bg-black/40 shadow-inner rounded-full border border-white/5" />
        
        {/* Fader Handle */}
        <div 
          className="absolute left-0 w-10 h-6 bg-gradient-to-b from-[#3A3B45] to-[#1A1B20] shadow-xl border border-white/10 rounded-sm flex flex-col items-center justify-center gap-0.5 pointer-events-none"
          style={{ bottom: `calc(${percent}% - 12px)` }}
        >
          {/* Grip Lines */}
          <div className="w-6 h-0.5 bg-white/5" />
          <div className="w-6 h-0.5 bg-accent-brand shadow-[0_0_4px_var(--accent-brand)]" />
          <div className="w-6 h-0.5 bg-white/5" />
        </div>

        {/* Focus Indicator */}
        <div className="absolute -inset-1 rounded-md border-2 border-accent-brand opacity-0 group-focus:opacity-30 transition-opacity" />
      </div>

      <div className="lab-readout text-[10px] text-text-2 font-medium bg-black/30 px-2 py-0.5 rounded border border-white/5 min-w-[40px] text-center">
        {localValue.toFixed(1)}{unit}
      </div>
    </div>
  );
}
