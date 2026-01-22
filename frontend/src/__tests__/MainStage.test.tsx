import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { MainStage } from '../components/shell/MainStage';

// Mock child components to verify composition
vi.mock('../components/shell/WaveformContainer', () => ({
  WaveformContainer: (props: any) => <div data-testid="waveform-container" data-props={JSON.stringify(props)} />
}));

vi.mock('../components/shell/AnalysisOverlay', () => ({
  AnalysisOverlay: (props: any) => <div data-testid="analysis-overlay" data-props={JSON.stringify(props)} />
}));

vi.mock('../components/analysis/SpectralVisualizer', () => ({
  SpectralVisualizer: () => <div data-testid="spectral-visualizer" />
}));

describe('MainStage Composition', () => {
  const defaultProps = {
    analysisData: undefined,
    playbackTime: 10,
    playbackDuration: 100,
    featureToggles: {
      keyDetection: true,
      bpmExtraction: true,
      segmentAnalysis: true,
      mlClassification: true
    },
    activeMode: 'analyze' as const,
  };

  it('renders WaveformContainer and AnalysisOverlay', () => {
    renderWithProviders(<MainStage {...defaultProps} />);

    expect(screen.getByTestId('waveform-container')).toBeInTheDocument();
    expect(screen.getByTestId('analysis-overlay')).toBeInTheDocument();
  });

  it('passes correct props to sub-components', () => {
    renderWithProviders(<MainStage {...defaultProps} />);

    const waveform = screen.getByTestId('waveform-container');
    const overlay = screen.getByTestId('analysis-overlay');

    const waveformProps = JSON.parse(waveform.getAttribute('data-props') || '{}');
    const overlayProps = JSON.parse(overlay.getAttribute('data-props') || '{}');

    expect(waveformProps.playbackTime).toBe(10);
    expect(waveformProps.playbackDuration).toBe(100);
    expect(overlayProps.activeMode).toBe('analyze');
  });

  it('renders export section', () => {
    renderWithProviders(<MainStage {...defaultProps} />);
    expect(screen.getByText('Export Analysis')).toBeInTheDocument();
  });
});
