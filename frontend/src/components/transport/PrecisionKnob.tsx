import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MomentumEngine } from '../../utils/MomentumEngine';
import { useUI } from '../../contexts/UIContext';

interface PrecisionKnobProps {
  label: string;
  min: number;
  max: number;
  value: number;
  defaultValue?: number;
  onChange: (value: number) => void;
  unit?: string;
  className?: string;
}

export function PrecisionKnob({
  label,
  min,
  max,
  value,
  defaultValue,
  onChange,
  unit = '',
  className = ''
}: PrecisionKnobProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const engineRef = useRef<MomentumEngine | null>(null);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);

  const { state: uiState } = useUI();

  // Initialize engine
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

  // Sync external value changes
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
      
      // Sensitivity: Shift key for 10x precision
      const sensitivity = moveEvent.shiftKey ? 0.001 : 0.01;
      const range = max - min;
      const change = deltaY * sensitivity * (range / 100);
      
      const newValue = engineRef.current!.getValue() + change;
      engineRef.current!.setValue(newValue);

      // Track velocity for momentum
      if (deltaTime > 0) {
        velocityRef.current = change / (deltaTime / 16.67); // Normalized to 60fps
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
    const step = (max - min) / 100;
    const fineStep = step / 10;
    const currentStep = e.shiftKey ? fineStep : step;

    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      engineRef.current?.setValue(localValue + currentStep);
      e.preventDefault();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      engineRef.current?.setValue(localValue - currentStep);
      e.preventDefault();
    }
  };

  const handleDoubleClick = () => {
    if (defaultValue !== undefined) {
      engineRef.current?.setValue(defaultValue);
    }
  };

  const rotation = ((localValue - min) / (max - min)) * 270 - 135;

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <span className="text-[9px] font-bold uppercase tracking-widest text-text-3 select-none">
        {label}
      </span>
      
      <div 
        className="relative w-12 h-12 cursor-ns-resize group"
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
        {/* Knob Well (Countersunk effect) */}
        <div className="absolute inset-0 rounded-full bg-black/40 shadow-inner border border-white/5" />
        
        {/* Knob Body */}
        <div 
          className="absolute inset-1 rounded-full bg-gradient-to-b from-[#2A2B35] to-[#14151A] shadow-lg border border-white/10 flex items-center justify-center transition-transform duration-75"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {/* Indicator Dot */}
          <div className="absolute top-1 w-1 h-1 rounded-full bg-accent-brand shadow-[0_0_4px_var(--accent-brand)]" />
          
          {/* Machined Texture (Simulated) */}
          <div className="absolute inset-0 rounded-full opacity-10 bg-[radial-gradient(circle,transparent_40%,black_100%)]" />
        </div>

        {/* Focus Ring */}
        <div className="absolute -inset-1 rounded-full border-2 border-accent-brand opacity-0 group-focus:opacity-30 transition-opacity" />
      </div>

      <div className="lab-readout text-[10px] text-text-2 font-medium bg-black/30 px-2 py-0.5 rounded border border-white/5">
        {localValue.toFixed(1)}{unit}
      </div>
    </div>
  );
}
