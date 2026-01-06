import { useState, useCallback } from 'react';
import { 
  Download, 
  FileText, 
  Image, 
  Music, 
  Database,
  ChevronDown,
  Check,
  Copy,
  Share2,
  Settings
} from 'lucide-react';
import type { AudioAnalysisResult } from '../types/audio';

interface ExportFunctionalityProps {
  analysisData: AudioAnalysisResult | null;
  audioFile: File | null;
  isAnalyzing: boolean;
}

export type ExportFormat = 
  | 'json'
  | 'csv'
  | 'txt'
  | 'xml'
  | 'png'
  | 'svg'
  | 'pdf';

export type ExportType = 
  | 'analysis-data'
  | 'visualization'
  | 'summary-report'
  | 'detailed-report'
  | 'raw-features';

interface ExportOption {
  type: ExportType;
  format: ExportFormat;
  name: string;
  description: string;
  icon: React.ReactNode;
  size?: string;
}

export function ExportFunctionality({ 
  analysisData, 
  audioFile, 
  isAnalyzing 
}: ExportFunctionalityProps) {
  const [selectedExports, setSelectedExports] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const exportOptions: ExportOption[] = [
    {
      type: 'analysis-data',
      format: 'json',
      name: 'Analysis Data (JSON)',
      description: 'Complete analysis results in JSON format',
      icon: <Database className="w-4 h-4" />,
      size: analysisData ? `${Math.round(JSON.stringify(analysisData).length / 1024)}KB` : 'N/A'
    },
    {
      type: 'analysis-data',
      format: 'csv',
      name: 'Analysis Data (CSV)',
      description: 'Structured data in CSV format for spreadsheets',
      icon: <FileText className="w-4 h-4" />,
      size: 'varies'
    },
    {
      type: 'summary-report',
      format: 'txt',
      name: 'Summary Report',
      description: 'Human-readable analysis summary',
      icon: <FileText className="w-4 h-4" />,
      size: '~5KB'
    },
    {
      type: 'detailed-report',
      format: 'pdf',
      name: 'Detailed Report (PDF)',
      description: 'Professional analysis report with visualizations',
      icon: <FileText className="w-4 h-4" />,
      size: '~500KB'
    },
    {
      type: 'visualization',
      format: 'png',
      name: 'Visualizations (PNG)',
      description: 'All analysis charts as high-quality images',
      icon: <Image className="w-4 h-4" />,
      size: '~2MB'
    },
    {
      type: 'visualization',
      format: 'svg',
      name: 'Visualizations (SVG)',
      description: 'Vector graphics for publications',
      icon: <Image className="w-4 h-4" />,
      size: '~200KB'
    }
  ];

  const formatAnalysisDataAsJSON = useCallback(() => {
    if (!analysisData) return null;
    
    return JSON.stringify({
      metadata: {
        filename: audioFile?.name || 'unknown',
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      },
      analysis: analysisData
    }, null, 2);
  }, [analysisData, audioFile]);

  const formatAnalysisDataAsCSV = useCallback(() => {
    if (!analysisData) return null;

    const rows: string[] = [];
    rows.push('Feature,Value,Confidence,Description');

    // Tempo data
    if (analysisData.tempo) {
      rows.push(`Tempo,${analysisData.tempo.bpm},${analysisData.tempo.confidence || 'N/A'},Beats per minute`);
    }

    // Key data
    if (analysisData.key) {
      rows.push(`Musical Key,${analysisData.key.key || 'Unknown'},${analysisData.key.confidence || 'N/A'},Detected musical key`);
      rows.push(`Musical Scale,${analysisData.key.scale || 'Unknown'},,Detected musical scale`);
    }

    // Spectral features
    if (analysisData.spectral) {
      Object.entries(analysisData.spectral).forEach(([feature, data]) => {
        if (data && typeof data === 'object' && 'mean' in data) {
          rows.push(`Spectral ${feature.charAt(0).toUpperCase() + feature.slice(1)},${data.mean},,Spectral feature analysis`);
        }
      });
    }

    // Duration
    if (analysisData.duration) {
      rows.push(`Duration,${analysisData.duration},,Track duration in seconds`);
    }

    return rows.join('\n');
  }, [analysisData]);

  const generateSummaryReport = useCallback(() => {
    if (!analysisData) return null;

    const lines: string[] = [];
    lines.push('HARMONIX PRO ANALYZER - ANALYSIS SUMMARY');
    lines.push('=' .repeat(50));
    lines.push('');
    
    if (audioFile) {
      lines.push(`File: ${audioFile.name}`);
      lines.push(`Size: ${(audioFile.size / 1024 / 1024).toFixed(2)} MB`);
      lines.push(`Type: ${audioFile.type || 'Unknown'}`);
      lines.push('');
    }

    lines.push('ANALYSIS RESULTS');
    lines.push('-' .repeat(20));
    
    if (analysisData.tempo) {
      lines.push(`Tempo: ${analysisData.tempo.bpm} BPM`);
      lines.push(`Tempo Confidence: ${((analysisData.tempo.confidence || 0) * 100).toFixed(1)}%`);
      lines.push('');
    }

    if (analysisData.key) {
      lines.push(`Musical Key: ${analysisData.key.key || 'Unknown'}`);
      lines.push(`Musical Scale: ${analysisData.key.scale || 'Unknown'}`);
      lines.push(`Key Confidence: ${((analysisData.key.confidence || 0) * 100).toFixed(1)}%`);
      lines.push('');
    }

    if (analysisData.spectral) {
      lines.push('SPECTRAL FEATURES');
      lines.push('-' .repeat(20));
      Object.entries(analysisData.spectral).forEach(([feature, data]) => {
        if (data && typeof data === 'object' && 'mean' in data) {
          lines.push(`${feature.charAt(0).toUpperCase() + feature.slice(1)}: ${data.mean?.toFixed(2) || 'N/A'}`);
        }
      });
      lines.push('');
    }

    if (analysisData.duration) {
      const mins = Math.floor(analysisData.duration / 60);
      const secs = Math.floor(analysisData.duration % 60);
      lines.push(`Duration: ${mins}:${secs.toString().padStart(2, '0')}`);
      lines.push('');
    }

    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push(`Harmonix Pro Analyzer v1.0.0`);

    return lines.join('\n');
  }, [analysisData, audioFile]);

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
            const content = formatAnalysisDataAsJSON();
            if (content) {
              downloadFile(content, `${baseFilename}-analysis.json`, 'application/json');
            }
          } else if (option.format === 'csv') {
            const content = formatAnalysisDataAsCSV();
            if (content) {
              downloadFile(content, `${baseFilename}-analysis.csv`, 'text/csv');
            }
          }
          break;

        case 'summary-report': {
          const summary = generateSummaryReport();
          if (summary) {
            downloadFile(summary, `${baseFilename}-summary.txt`, 'text/plain');
          }
          break;
        }

        case 'visualization':
          // This would integrate with the VisualizationEngine
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
  }, [analysisData, audioFile, isExporting, formatAnalysisDataAsJSON, formatAnalysisDataAsCSV, generateSummaryReport, downloadFile]);

  const copyToClipboard = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // You could show a notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, []);

  const shareAnalysis = useCallback(async () => {
    if (!analysisData || !audioFile) return;

    const shareData = {
      title: `Music Analysis: ${audioFile.name}`,
      text: generateSummaryReport() || 'Music analysis results from Harmonix Pro Analyzer',
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      // Fallback to copying URL
      await copyToClipboard(window.location.href);
    }
  }, [analysisData, audioFile, generateSummaryReport, copyToClipboard]);

  const isDisabled = !analysisData || isAnalyzing;

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="glassmorphic-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Export Analysis</h3>
          <div className="flex space-x-2">
            <button
              onClick={shareAnalysis}
              disabled={isDisabled}
              className={`glassmorphic-button p-2 transition-colors ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-500/20'
              }`}
              title="Share analysis"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="glassmorphic-button p-2 hover:bg-white/10 transition-colors"
              title="Advanced options"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Export Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {exportOptions.slice(0, 3).map((option) => (
            <button
              key={`${option.type}-${option.format}`}
              onClick={() => handleExport(option)}
              disabled={isDisabled || isExporting}
              className={`
                glassmorphic-button p-4 text-left transition-all
                ${isDisabled || isExporting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10 hover:scale-105'}
              `}
            >
              <div className="flex items-center space-x-3">
                <div className="text-blue-400">
                  {option.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white text-sm truncate">
                    {option.name}
                  </div>
                  <div className="text-white/60 text-xs">
                    {option.size}
                  </div>
                </div>
                <Download className="w-4 h-4 text-white/60" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Export Options */}
      {showAdvanced && (
        <div className="glassmorphic-card p-4">
          <h4 className="text-md font-semibold text-white mb-4">Advanced Export Options</h4>
          
          <div className="space-y-3">
            {exportOptions.map((option) => (
              <div 
                key={`${option.type}-${option.format}`}
                className="flex items-center justify-between p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div className="text-blue-400">
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white text-sm">
                      {option.name}
                    </div>
                    <div className="text-white/60 text-xs">
                      {option.description}
                    </div>
                  </div>
                  <div className="text-white/60 text-xs">
                    {option.size}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {option.type === 'analysis-data' && (
                    <button
                      onClick={() => {
                        const content = option.format === 'json' 
                          ? formatAnalysisDataAsJSON()
                          : formatAnalysisDataAsCSV();
                        if (content) copyToClipboard(content);
                      }}
                      disabled={isDisabled}
                      className={`glassmorphic-button p-2 ${
                        isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-500/20'
                      }`}
                      title="Copy to clipboard"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleExport(option)}
                    disabled={isDisabled || isExporting}
                    className={`glassmorphic-button p-2 ${
                      isDisabled || isExporting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-500/20'
                    }`}
                    title="Download"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Status */}
      {isExporting && (
        <div className="glassmorphic-card p-4">
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-white/80">Preparing export...</span>
          </div>
        </div>
      )}

      {/* No Data Message */}
      {!analysisData && !isAnalyzing && (
        <div className="glassmorphic-card p-8 text-center">
          <Music className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white/80 mb-2">No Analysis Data</h3>
          <p className="text-white/60">
            Upload and analyze an audio file to enable export functionality.
          </p>
        </div>
      )}
    </div>
  );
}