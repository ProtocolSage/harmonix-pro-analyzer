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
import { ComparisonProvider, useComparison } from './contexts/ComparisonContext';
import { ReferenceTrackLoader } from './components/analysis/ReferenceTrackLoader';
import { ComparisonRack } from './components/analysis/ComparisonRack';
import type { EngineStatus, AnalysisProgress } from './types/audio';

function AppContent() {
  const { state: compState, dispatch: compDispatch, toggleComparisonMode } = useComparison();
  const [engineStatus, setEngineStatus] = useState<EngineStatus>({ status: 'initializing' });
  const [engine] = useState(() => new RealEssentiaAudioEngine());
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
    const audioId = `${file.name}-${file.size}-${file.lastModified}`;
    compDispatch({ type: 'SET_SOURCE_FILE', payload: { file, audioId } });
    
    setIsAnalyzing(true);
    setAnalysisProgress(null);

    try {
      console.log('🎵 Starting analysis for:', file.name);

      // Perform analysis
      const result = await engine.analyzeAudio(file, (progress) => {
        console.log('📊 Progress:', progress);
        setAnalysisProgress(progress);
      });

      console.log('✅ Analysis complete:', result);
      const cacheVersion = `${audioId}-${Date.now()}`;
      compDispatch({ type: 'SET_SOURCE_DATA', payload: { data: result, cacheVersion } });
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      alert(`Analysis Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      compDispatch({ type: 'SET_SLOT_STATUS', payload: { slot: 'source', status: 'error' } });
    } finally {
      setIsAnalyzing(false);
    }
  }, [engine, compDispatch]);

  const handleReferenceSelect = useCallback(async (file: File) => {
    const audioId = `${file.name}-${file.size}-${file.lastModified}`;
    compDispatch({ type: 'SET_REFERENCE_FILE', payload: { file, audioId } });

    try {
      const result = await engine.analyzeAudio(file, (progress) => {
        console.log('📊 Reference Progress:', progress);
      });

      const cacheVersion = `${audioId}-${Date.now()}`;
      compDispatch({ type: 'SET_REFERENCE_DATA', payload: { data: result, cacheVersion } });
    } catch (error) {
      console.error('❌ Reference analysis failed:', error);
      compDispatch({ type: 'SET_SLOT_STATUS', payload: { slot: 'reference', status: 'error' } });
    }
  }, [engine, compDispatch]);

  const handleRetryML = useCallback(() => {
    engine.retryML();
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
                {engineStatus.mlStatus?.isUnavailable && (
                  <button 
                    onClick={handleRetryML}
                    className="studio-badge studio-badge-warning"
                    style={{ marginTop: '8px', cursor: 'pointer', border: 'none' }}
                  >
                    ML Unavailable - Retry
                  </button>
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

        {/* Comparison Rack - Appears when mode is active */}
        <ComparisonRack />

        {/* Main Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '32px' }}>
          {/* Left Panel - Upload & Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* File Upload */}
            <div>
              <h2 className="studio-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio style={{ width: '24px', height: '24px', color: 'var(--studio-accent-gold)' }} />
                Source Audio
              </h2>
              <FileUpload
                onFileSelect={handleFileSelect}
                isProcessing={isAnalyzing}
                engineReady={engineStatus.status === 'ready'}
              />
            </div>

            {/* Reference Track Panel */}
            <ReferenceTrackLoader 
              engineReady={engineStatus.status === 'ready'}
              onReferenceSelect={handleReferenceSelect}
            />

            {/* Comparison Mode Toggle */}
            <div className="studio-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 className="studio-subheader" style={{ margin: 0 }}>Comparison Mode</h3>
                  <p style={{ fontSize: '11px', color: 'var(--studio-text-tertiary)', marginTop: '4px' }}>
                    Press &apos;S&apos; to swap roles
                  </p>
                </div>
                <button 
                  onClick={() => toggleComparisonMode()}
                  className={`studio-badge ${compState.isComparisonMode ? 'studio-badge-success' : 'studio-badge-info'}`}
                  style={{ cursor: 'pointer', border: 'none' }}
                >
                  {compState.isComparisonMode ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            </div>

            {/* Current File Info */}
            {compState.source.file && (
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
                      {compState.source.file.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--studio-text-tertiary)' }}>Size:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--studio-text-primary)' }}>
                      {(compState.source.file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--studio-text-tertiary)' }}>Type:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--studio-text-primary)' }}>
                      {compState.source.file.type}
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
              analysisData={compState.source.analysisData}
              isAnalyzing={isAnalyzing}
              analysisProgress={analysisProgress}
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

function App() {
  return (
    <ComparisonProvider>
      <AppContent />
    </ComparisonProvider>
  );
}

export default App;
