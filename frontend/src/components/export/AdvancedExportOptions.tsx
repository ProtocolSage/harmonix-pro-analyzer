import { Copy, Download } from 'lucide-react';
import type { ExportOption } from '../../types/export';

interface AdvancedExportOptionsProps {
  options: ExportOption[];
  onExport: (option: ExportOption) => void;
  onCopy: (option: ExportOption) => void;
  disabled?: boolean;
  isExporting: boolean;
}

export function AdvancedExportOptions({ 
  options, 
  onExport, 
  onCopy, 
  disabled, 
  isExporting 
}: AdvancedExportOptionsProps) {
  return (
    <div className="hp-export-advanced">
      <h4>Advanced Export Options</h4>
      <div className="hp-export-advanced-list">
        {options.map((option) => (
          <div key={`${option.type}-${option.format}`} className="hp-export-advanced-item">
            <div className="hp-export-advanced-left">
              <div className="hp-export-icon">{option.icon}</div>
              <div>
                <div className="hp-export-name">{option.name}</div>
                <div className="hp-export-desc">{option.description}</div>
              </div>
              <div className="hp-export-size">{option.size}</div>
            </div>
            <div className="hp-export-advanced-actions">
              {option.type === 'analysis-data' && (
                <button
                  type="button"
                  onClick={() => onCopy(option)}
                  disabled={disabled}
                  className="hp-icon-btn"
                  title="Copy to clipboard"
                >
                  <Copy className="hp-icon-btn__icon" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onExport(option)}
                disabled={disabled || isExporting}
                className="hp-icon-btn"
                title="Download"
              >
                <Download className="hp-icon-btn__icon" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
