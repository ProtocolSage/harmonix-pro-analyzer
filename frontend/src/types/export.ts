export type ExportFormat = 
  | 'json'
  | 'csv'
  | 'txt'
  | 'xml'
  | 'png'
  | 'svg'
  | 'pdf'
  | 'html';

export type ExportType = 
  | 'analysis-data'
  | 'visualization'
  | 'summary-report'
  | 'detailed-report'
  | 'raw-features'
  | 'cinematic';

export interface ExportOption {
  type: ExportType;
  format: ExportFormat;
  name: string;
  description: string;
  icon: React.ReactNode;
  size?: string;
}
