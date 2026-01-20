import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportFunctionality } from '../components/ExportFunctionality';
import type { AudioAnalysisResult } from '../types/audio';

// Mock sub-components to verify composition
vi.mock('../components/export/FormatSelector', () => ({
  FormatSelector: ({ options, onExport }: any) => (
    <div data-testid="format-selector">
      {options.map((opt: any) => (
        <button key={opt.format} onClick={() => onExport(opt)}>
          {opt.name}
        </button>
      ))}
    </div>
  )
}));

vi.mock('../components/export/AdvancedExportOptions', () => ({
  AdvancedExportOptions: () => <div data-testid="advanced-options">Advanced Options</div>
}));

vi.mock('../components/export/EmptyExportState', () => ({
  EmptyExportState: () => <div data-testid="empty-state">No Data</div>
}));

const mockData = {
  tempo: { bpm: 120 },
  duration: 60
} as unknown as AudioAnalysisResult;

describe('ExportFunctionality Component', () => {
  const defaultProps = {
    analysisData: mockData,
    audioFile: new File([''], 'test.mp3'),
    isAnalyzing: false
  };

  it('renders FormatSelector when data is available', () => {
    render(<ExportFunctionality {...defaultProps} />);
    expect(screen.getByTestId('format-selector')).toBeInTheDocument();
  });

  it('renders EmptyState when no data', () => {
    render(<ExportFunctionality {...defaultProps} analysisData={null} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('toggles AdvancedOptions when settings button clicked', () => {
    render(<ExportFunctionality {...defaultProps} />);
    
    // Settings button (2nd icon button)
    const buttons = screen.getAllByRole('button');
    const settingsBtn = buttons[1]; // Share is 0, Settings is 1
    
    fireEvent.click(settingsBtn);
    expect(screen.getByTestId('advanced-options')).toBeInTheDocument();
    
    fireEvent.click(settingsBtn);
    expect(screen.queryByTestId('advanced-options')).not.toBeInTheDocument();
  });
});
