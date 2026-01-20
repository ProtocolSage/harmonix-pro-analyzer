import { useState, useCallback, useMemo } from 'react';
import { Share2, Settings } from 'lucide-react';
import type { AudioAnalysisResult } from '../types/audio';
import type { ExportOption } from '../types/export';
import { exportToPDF } from '../utils/pdfExport';
import { 
  formatAnalysisDataAsJSON, 
  formatAnalysisDataAsCSV, 
  generateSummaryReport 
} from '../utils/export-generators';
import { getExportOptions } from '../config/exportOptions';
import { FormatSelector } from './export/FormatSelector';
import { AdvancedExportOptions } from './export/AdvancedExportOptions';
import { ExportProgress } from './export/ExportProgress';
import { EmptyExportState } from './export/EmptyExportState';

interface ExportFunctionalityProps {
  analysisData: AudioAnalysisResult | null;
  audioFile: File | null;
  isAnalyzing: boolean;
}

export function ExportFunctionality({ 
  analysisData, 
  audioFile, 
  isAnalyzing 
}: ExportFunctionalityProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const exportOptions = useMemo(() => getExportOptions(analysisData), [analysisData]);

  const downloadFile = useCallback((content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExport = useCallback(async (option: ExportOption) => {
    if (!analysisData || isExporting) return;

    setIsExporting(true);
    
    try {
      const baseFilename = audioFile?.name.replace(/\.[^/.]+$/, '') || 'harmonix-analysis';
      
      switch (option.type) {
        case 'analysis-data':
          if (option.format === 'json') {
            const content = formatAnalysisDataAsJSON(analysisData, baseFilename);
            if (content) {
              downloadFile(content, `${baseFilename}-analysis.json`, 'application/json');
            }
          } else if (option.format === 'csv') {
            const content = formatAnalysisDataAsCSV(analysisData);
            if (content) {
              downloadFile(content, `${baseFilename}-analysis.csv`, 'text/csv');
            }
          }
          break;

        case 'summary-report': {
          const summary = generateSummaryReport(analysisData, audioFile);
          if (summary) {
            downloadFile(summary, `${baseFilename}-summary.txt`, 'text/plain');
          }
          break;
        }

        case 'detailed-report': {
          if (option.format === 'pdf') {
            await exportToPDF(analysisData, audioFile?.name || 'unknown', {
              title: 'Audio Analysis Report',
              filename: `${baseFilename}-report.pdf`,
              includeMetadata: true,
            });
          }
          break;
        }

        case 'visualization':
          console.log('Visualization export not yet implemented');
          break;

        default:
          console.warn('Export type not implemented:', option.type);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [analysisData, audioFile, isExporting, downloadFile]);

  const copyToClipboard = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, []);

  const handleCopy = useCallback((option: ExportOption) => {
    const baseFilename = audioFile?.name || 'unknown';
    const content = option.format === 'json'
      ? formatAnalysisDataAsJSON(analysisData, baseFilename)
      : formatAnalysisDataAsCSV(analysisData);
    if (content) copyToClipboard(content);
  }, [analysisData, audioFile, copyToClipboard]);

  const shareAnalysis = useCallback(async () => {
    if (!analysisData || !audioFile) return;

    const shareData = {
      title: `Music Analysis: ${audioFile.name}`,
      text: generateSummaryReport(analysisData, audioFile) || 'Music analysis results from Harmonix Pro Analyzer',
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      await copyToClipboard(window.location.href);
    }
  }, [analysisData, audioFile, copyToClipboard]);

  const isDisabled = !analysisData || isAnalyzing;

  return (
    <div className="hp-export-stack">
      <div className="hp-export-actions">
        <button
          type="button"
          onClick={shareAnalysis}
          disabled={isDisabled}
          className="hp-icon-btn"
          title="Share analysis"
        >
          <Share2 className="hp-icon-btn__icon" />
        </button>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`hp-icon-btn ${showAdvanced ? 'is-active' : ''}`}
          title="Advanced options"
        >
          <Settings className="hp-icon-btn__icon" />
        </button>
      </div>

      <FormatSelector 
        options={exportOptions.slice(0, 3)} 
        onExport={handleExport} 
        disabled={isDisabled}
        isExporting={isExporting}
      />

      {showAdvanced && (
        <AdvancedExportOptions
          options={exportOptions}
          onExport={handleExport}
          onCopy={handleCopy}
          disabled={isDisabled}
          isExporting={isExporting}
        />
      )}

      {isExporting && <ExportProgress />}

      {!analysisData && !isAnalyzing && <EmptyExportState />}
    </div>
  );
}