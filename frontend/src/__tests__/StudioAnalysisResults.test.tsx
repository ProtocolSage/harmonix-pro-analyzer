import { render, screen } from '@testing-library/react';
import { StudioAnalysisResults } from '../components/StudioAnalysisResults';

const mockAnalysis = {
  tempo: { bpm: 120, confidence: 0.94 },
  key: { key: 'C', scale: 'major', confidence: 0.87 },
  rhythm: { timeSignature: { label: '4/4' } },
  loudness: { integrated: -10.2 },
} as any;

describe('StudioAnalysisResults', () => {
  it('renders tempo/key/loudness in overview mode', () => {
    render(<StudioAnalysisResults analysisMode="overview" analysisData={mockAnalysis} isAnalyzing={false} />);
    expect(screen.getByText('120.0')).toBeInTheDocument();
    expect(screen.getAllByText(/C/)[0]).toBeInTheDocument();
    expect(screen.getByText('-10.2')).toBeInTheDocument();
  });

  it('renders fallback content when analysisData is missing', () => {
    render(<StudioAnalysisResults analysisMode="overview" analysisData={null as any} isAnalyzing={false} />);
    expect(screen.getByText(/No analysis data available/)).toBeInTheDocument();
  });
});
