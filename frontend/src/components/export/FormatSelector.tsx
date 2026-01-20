import { Download } from 'lucide-react';
import type { ExportOption } from '../../types/export';

interface FormatSelectorProps {
  options: ExportOption[];
  onExport: (option: ExportOption) => void;
  disabled?: boolean;
  isExporting: boolean;
}

export function FormatSelector({ options, onExport, disabled, isExporting }: FormatSelectorProps) {
  return (
    <div className="hp-export-grid">
      {options.map((option) => (
        <button
          key={`${option.type}-${option.format}`}
          type="button"
          onClick={() => onExport(option)}
          disabled={disabled || isExporting}
          className="hp-export-tile"
        >
          <div className="hp-export-icon">{option.icon}</div>
          <div className="hp-export-meta">
            <div className="hp-export-name">{option.name}</div>
            <div className="hp-export-size">{option.size}</div>
          </div>
          <Download className="hp-export-chevron" />
        </button>
      ))}
    </div>
  );
}
