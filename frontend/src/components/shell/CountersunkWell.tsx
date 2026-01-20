import React, { type ReactNode } from 'react';

interface CountersunkWellProps {
  children: ReactNode;
  className?: string;
  label?: string;
  icon?: ReactNode;
}

/**
 * CountersunkWell: A "precision-milled" container sunk into the obsidian chassis.
 * Implements inner shadows and top-edge rim highlights for structural depth.
 */
export function CountersunkWell({ children, className = '', label, icon }: CountersunkWellProps) {
  return (
    <div className={`countersunk-well flex flex-col ${className}`}>
      {(label || icon) && (
        <div className="px-4 py-2 border-b border-white/5 bg-black/20 flex items-center gap-2">
          {icon && <span className="text-text-3 opacity-70">{icon}</span>}
          {label && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-3 select-none">
              {label}
            </span>
          )}
        </div>
      )}
      <div className="flex-1 relative overflow-hidden">
        <div className="peak-bloom" />
        {children}
      </div>
    </div>
  );
}
