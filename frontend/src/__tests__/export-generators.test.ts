import { describe, it, expect } from 'vitest';
import { formatAnalysisDataAsJSON, formatAnalysisDataAsCSV, generateSummaryReport } from '../utils/export-generators';
import type { AudioAnalysisResult } from '../types/audio';

// Mock data
const mockAnalysisData: AudioAnalysisResult = {
  spectral: {
    centroid: { mean: 1000, std: 100 },
    rolloff: { mean: 5000, std: 500 },
    flux: { mean: 0.5, std: 0.1 },
    energy: { mean: 0.8, std: 0.2 },
    brightness: { mean: 0.6, std: 0.1 },
    roughness: { mean: 0.3, std: 0.05 },
    spread: { mean: 2000, std: 300 },
    zcr: { mean: 0.05, std: 0.01 },
  },
  tempo: {
    bpm: 120,
    confidence: 0.9,
  },
  key: {
    key: 'C',
    scale: 'major',
    confidence: 0.85,
  },
  duration: 180,
  sampleRate: 44100,
  channels: 2,
  analysisTimestamp: 1234567890,
} as unknown as AudioAnalysisResult;

const mockFile = new File([''], 'test.mp3', { type: 'audio/mpeg' });

describe('Export Generators', () => {
  describe('formatAnalysisDataAsJSON', () => {
    it('returns null if no data', () => {
      expect(formatAnalysisDataAsJSON(null, 'test')).toBeNull();
    });

    it('generates valid JSON structure', () => {
      const result = formatAnalysisDataAsJSON(mockAnalysisData, 'test-file');
      expect(result).not.toBeNull();
      const parsed = JSON.parse(result!);
      expect(parsed.metadata.filename).toBe('test-file');
      expect(parsed.analysis.tempo.bpm).toBe(120);
    });
  });

  describe('formatAnalysisDataAsCSV', () => {
    it('returns null if no data', () => {
      expect(formatAnalysisDataAsCSV(null)).toBeNull();
    });

    it('generates CSV content', () => {
      const result = formatAnalysisDataAsCSV(mockAnalysisData);
      expect(result).not.toBeNull();
      expect(result).toContain('Feature,Value,Confidence');
      expect(result).toContain('Tempo,120,0.9');
      expect(result).toContain('Musical Key,C,0.85');
    });
  });

  describe('generateSummaryReport', () => {
    it('returns null if no data', () => {
      expect(generateSummaryReport(null, mockFile)).toBeNull();
    });

    it('generates text report', () => {
      const result = generateSummaryReport(mockAnalysisData, mockFile);
      expect(result).not.toBeNull();
      expect(result).toContain('HARMONIX PRO ANALYZER');
      expect(result).toContain('Tempo: 120 BPM');
      expect(result).toContain('Musical Key: C');
    });
  });
});
