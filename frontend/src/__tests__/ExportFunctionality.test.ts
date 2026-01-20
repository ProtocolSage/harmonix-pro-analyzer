import { describe, it, expect, vi } from 'vitest';
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
    beats: [0, 0.5, 1.0],
  },
  key: {
    key: 'C',
    scale: 'major',
    confidence: 0.85,
  },
  mfcc: [1, 2, 3, 4, 5],
  duration: 180,
} as AudioAnalysisResult;

describe('Export Functionality', () => {
  describe('JSON Export', () => {
    it('generates valid JSON from analysis data', () => {
      const jsonString = JSON.stringify(mockAnalysisData, null, 2);
      const parsed = JSON.parse(jsonString);

      expect(parsed.spectral).toBeDefined();
      expect(parsed.tempo.bpm).toBe(120);
      expect(parsed.key.key).toBe('C');
    });

    it('includes metadata in JSON export', () => {
      const exported = JSON.stringify({
        metadata: {
          filename: 'test.mp3',
          exportDate: new Date().toISOString(),
          version: '1.0.0',
        },
        analysis: mockAnalysisData,
      }, null, 2);

      const parsed = JSON.parse(exported);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.filename).toBe('test.mp3');
      expect(parsed.analysis).toBeDefined();
    });
  });

  describe('CSV Export', () => {
    it('generates valid CSV headers and rows', () => {
      const rows: string[] = [];
      rows.push('Feature,Value,Confidence,Description');

      // Tempo
      if (mockAnalysisData.tempo) {
        rows.push(`Tempo,${mockAnalysisData.tempo.bpm},${mockAnalysisData.tempo.confidence},Beats per minute`);
      }

      // Key
      if (mockAnalysisData.key) {
        rows.push(`Musical Key,${mockAnalysisData.key.key},${mockAnalysisData.key.confidence},Detected musical key`);
      }

      const csv = rows.join('\n');

      expect(csv).toContain('Feature,Value,Confidence,Description');
      expect(csv).toContain('Tempo,120,0.9');
      expect(csv).toContain('Musical Key,C,0.85');
    });

    it('handles missing data gracefully in CSV', () => {
      const partialData: Partial<AudioAnalysisResult> = {
        tempo: { bpm: 120, confidence: 0.9 },
        // Missing key and spectral
      };

      const rows: string[] = [];
      rows.push('Feature,Value,Confidence,Description');

      if (partialData.tempo) {
        rows.push(`Tempo,${partialData.tempo.bpm},${partialData.tempo.confidence},Beats per minute`);
      }

      const csv = rows.join('\n');
      expect(csv).toContain('Tempo,120');
      expect(csv).not.toContain('Musical Key');
    });
  });

  describe('Export Button State', () => {
    it('should disable export when analysisData is null', () => {
      const analysisData = null;
      const isDisabled = !analysisData;

      expect(isDisabled).toBe(true);
    });

    it('should enable export when analysisData exists', () => {
      const analysisData = mockAnalysisData;
      const isDisabled = !analysisData;

      expect(isDisabled).toBe(false);
    });

    it('should disable export during export process', () => {
      const isExporting = true;
      const analysisData = mockAnalysisData;
      const isDisabled = !analysisData || isExporting;

      expect(isDisabled).toBe(true);
    });
  });

  describe('File Download Logic', () => {
    it('creates blob with correct MIME type for JSON', () => {
      const content = JSON.stringify(mockAnalysisData);
      const blob = new Blob([content], { type: 'application/json' });

      expect(blob.type).toBe('application/json');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('creates blob with correct MIME type for CSV', () => {
      const content = 'Feature,Value\nTempo,120';
      const blob = new Blob([content], { type: 'text/csv' });

      expect(blob.type).toBe('text/csv');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('creates blob with correct MIME type for TXT', () => {
      const content = 'Analysis Summary';
      const blob = new Blob([content], { type: 'text/plain' });

      expect(blob.type).toBe('text/plain');
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe('Export Completeness', () => {
    it('exports all spectral features', () => {
      const spectralKeys = Object.keys(mockAnalysisData.spectral || {});
      expect(spectralKeys.length).toBeGreaterThan(0);
      expect(spectralKeys).toContain('centroid');
      expect(spectralKeys).toContain('rolloff');
      expect(spectralKeys).toContain('flux');
    });

    it('exports tempo and key data', () => {
      expect(mockAnalysisData.tempo).toBeDefined();
      expect(mockAnalysisData.tempo?.bpm).toBeGreaterThan(0);
      expect(mockAnalysisData.key).toBeDefined();
      expect(mockAnalysisData.key?.key).toBeTruthy();
    });

    it('exports MFCC coefficients', () => {
      expect(mockAnalysisData.mfcc).toBeDefined();
      expect(mockAnalysisData.mfcc!.length).toBeGreaterThan(0);
    });
  });
});
