/**
 * Harmonix Pro Analyzer - Studio Edition
 * Professional music analysis for production environments
 */

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Radio } from 'lucide-react';
import { RealEssentiaAudioEngine } from './engines/RealEssentiaAudioEngine';
import { FileUpload } from './components/FileUpload';
import { StudioAnalysisResults } from './components/StudioAnalysisResults';
import { StudioHeader } from './components/StudioHeader';
import type { EngineStatus, AudioAnalysisResult } from './types/audio';

function App() {
  const [engineStatus, setEngineStatus] = useState<EngineStatus>({ status: 'initializing' });
  const [engine] = useState(() => new RealEssentiaAudioEngine());
  const [analysisData, setAnalysisData] = useState<AudioAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  useEffect(() => {
    const checkEngineStatus = () => {
      const status = engine.getEngineStatus();
      setEngineStatus(status);
    };

    // Check status periodically during initialization
    const interval = setInterval(checkEngineStatus, 1000);

    // Initial check
    checkEngineStatus();

    return () => {
      clearInterval(interval);
      engine.terminate();
    };
  }, [engine]);

  const handleFileSelect = useCallback(async (file: File) => {
    setCurrentFile(file);
    setIsAnalyzing(true);
    setAnalysisData(null);

    try {
      console.log('🎵 Starting analysis for:', file.name);

      // Perform analysis
      const result = await engine.analyzeAudio(file, (progress) => {
        console.log('📊 Progress:', progress);
      });

      console.log('✅ Analysis complete:', result);
      setAnalysisData(result);
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      alert(`Analysis Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [engine]);

  const getEngineStatusColor = () => {
    switch (engineStatus.status) {
      case 'ready': return 'var(--studio-success)';
      case 'loading': return 'var(--studio-accent-blue)';
      case 'error': return 'var(--studio-error)';
      default: return 'var(--studio-warning)';
    }
  };

  const getEngineStatusIcon = () => {
    switch (engineStatus.status) {
      case 'ready': return '✅';
      case 'loading': return '⏳';
      case 'error': return '❌';
      default: return '🔄';
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--studio-bg-primary)', padding: '32px' }}>
      <div className="container mx-auto" style={{ maxWidth: '1600px' }}>
        {/* Studio Header */}
        <StudioHeader />

        {/* Engine Status Bar */}
        <div className="studio-card studio-fadeIn" style={{ padding: '16px 24px', marginBottom: '32px' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">{getEngineStatusIcon()}</span>
              <div>
                <div className="flex items-center gap-2">
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: getEngineStatusColor(),
                    animation: engineStatus.status === 'loading' ? 'studio-pulse 2s ease-in-out infinite' : 'none'
                  }} />
                  <span style={{
                    fontWeight: 600,
                    fontSize: '14px',
                    color: getEngineStatusColor(),
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {engineStatus.status}
                  </span>
                </div>
                {engineStatus.modelsLoaded !== undefined && (
                  <div style={{
                    fontSize: '12px',
                    marginTop: '4px',
                    color: 'var(--studio-text-tertiary)'
                  }}>
                    ML Models: {engineStatus.modelsLoaded}/{engineStatus.totalModels}
                  </div>
                )}
              </div>
            </div>
            {engineStatus.message && (
              <div className="flex items-center gap-2">
                <Sparkles style={{ width: '16px', height: '16px', color: 'var(--studio-accent-blue)' }} />
                <span style={{ fontSize: '13px', color: 'var(--studio-text-secondary)' }}>
                  {engineStatus.message}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '32px' }}>
          {/* Left Panel - Upload & Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* File Upload */}
            <div>
              <h2 className="studio-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio style={{ width: '24px', height: '24px', color: 'var(--studio-accent-gold)' }} />
                Audio Input
              </h2>
              <FileUpload
                onFileSelect={handleFileSelect}
                isProcessing={isAnalyzing}
                engineReady={engineStatus.status === 'ready'}
              />
            </div>

            {/* Current File Info */}
            {currentFile && (
              <div className="studio-card studio-fadeIn" style={{ padding: '20px' }}>
                <h3 className="studio-subheader" style={{ marginBottom: '12px' }}>Current File</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--studio-text-tertiary)' }}>Name:</span>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginLeft: '8px',
                      color: 'var(--studio-text-primary)'
                    }}>
                      {currentFile.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--studio-text-tertiary)' }}>Size:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--studio-text-primary)' }}>
                      {(currentFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--studio-text-tertiary)' }}>Type:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--studio-text-primary)' }}>
                      {currentFile.type}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Features List */}
            <div className="studio-card" style={{ padding: '20px' }}>
              <h3 className="studio-subheader" style={{ marginBottom: '16px' }}>Analysis Features</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Tempo & Rhythm', enabled: true },
                  { label: 'Key Detection', enabled: true },
                  { label: 'Spectral Analysis', enabled: true },
                  { label: 'ML Classification', enabled: engineStatus.modelsLoaded === engineStatus.totalModels },
                  { label: 'Melody Analysis', enabled: true },
                  { label: 'Harmonic Analysis', enabled: true }
                ].map((feature, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--studio-text-secondary)' }}>{feature.label}</span>
                    <span className={`studio-badge ${feature.enabled ? 'studio-badge-success' : 'studio-badge-warning'}`}>
                      {feature.enabled ? 'Ready' : 'Loading'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Results */}
          <div>
            <StudioAnalysisResults
              analysisData={analysisData}
              isAnalyzing={isAnalyzing}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid var(--studio-divider)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--studio-text-tertiary)' }}>
              <Sparkles style={{ width: '16px', height: '16px' }} />
              <span>Powered by Essentia.js WASM + TensorFlow.js ML</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--studio-text-muted)' }}>
              Research-grade music analysis for professionals
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
