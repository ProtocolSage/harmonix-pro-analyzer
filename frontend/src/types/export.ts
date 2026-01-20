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

export interface ExportOption {
  type: ExportType;
  format: ExportFormat;
  name: string;
  description: string;
  icon: React.ReactNode;
  size?: string;
}
