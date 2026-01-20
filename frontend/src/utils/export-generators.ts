import type { AudioAnalysisResult } from '../types/audio';

export const formatAnalysisDataAsJSON = (
  analysisData: AudioAnalysisResult | null,
  filename: string
): string | null => {
  if (!analysisData) return null;
  
  return JSON.stringify({
    metadata: {
      filename: filename || 'unknown',
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    },
    analysis: analysisData
  }, null, 2);
};

export const formatAnalysisDataAsCSV = (
  analysisData: AudioAnalysisResult | null
): string | null => {
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
};

export const generateSummaryReport = (
  analysisData: AudioAnalysisResult | null,
  audioFile: File | null
): string | null => {
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
};
