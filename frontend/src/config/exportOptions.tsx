import { Database, FileText, Image, Star } from 'lucide-react';
import type { ExportOption } from '../types/export';
import type { AudioAnalysisResult } from '../types/audio';

export const getExportOptions = (analysisData: AudioAnalysisResult | null): ExportOption[] => [
  {
    type: 'cinematic',
    format: 'html',
    name: 'Cinematic 3D Experience',
    description: 'Standalone interactive 3D workstation (Mind-Blow Stack)',
    icon: <Star className="w-4 h-4 text-amber-400" />,
    size: '~2MB'
  },
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
