import { useEffect, useCallback, useRef, useMemo } from 'react';
import { sessionManager } from './services/SessionManager';
import { RealEssentiaAudioEngine } from './engines/RealEssentiaAudioEngine';
import { StreamingAnalysisEngine } from './engines/StreamingAnalysisEngine';
import { FileUpload } from './components/FileUpload';
import { WaveformVisualizer } from './components/WaveformVisualizer';
import { StudioAnalysisResults } from './components/StudioAnalysisResults';
import { TransportControls } from './components/TransportControls';
import { TransportRack } from './components/transport/TransportRack';
import { ExportFunctionality } from './components/ExportFunctionality';
import { ReferenceTrackLoader } from './components/analysis/ReferenceTrackLoader';
import { ComparisonRack } from './components/analysis/ComparisonRack';
// Phase 0-1: New shell components
import { AppShell, TopBar, Sidebar, Inspector, BottomDock, MainStage } from './components/shell';
// Phase 0-1: Keep old components imported but not rendered (for future migration)
// import { DAWTopBar } from './components/DAWTopBar';
// import { DAWSidebar } from './components/DAWSidebar';
import {
  NotificationProvider,
  useNotificationHelpers
} from './components/NotificationSystem';
import {
  ProgressStepper,
  CircularProgress,
  type ProgressStep
} from './components/ProgressIndicators';
import type {
  EngineStatus,
  AudioAnalysisResult,
  AnalysisProgress
} from './types/audio';
import type { InspectorTab, AnalysisMode } from './types/layout';
import { HealthCheck, type SystemHealth } from './utils/HealthCheck';
import { PerformanceMonitor, PerformanceCategory } from './utils/PerformanceMonitor';
import { ErrorHandler, handleFileError, handleAnalysisError } from './utils/ErrorHandler';
import { dbService, TrackRecord } from './services/DBService';
import { HashUtils } from './utils/HashUtils';
import { Settings } from 'lucide-react';

// Context providers
import { AnalysisProvider, useAnalysis } from './contexts/AnalysisContext';
import { LibraryProvider } from './contexts/LibraryContext';
import { ComparisonProvider, useComparison } from './contexts/ComparisonContext';
import { UIProvider, useUI } from './contexts/UIContext';
import { PlaybackProvider, usePlayback, useFormattedTime } from './contexts/PlaybackContext';
import { LibraryPanel } from './components/library/LibraryPanel';
import { MeterBridge } from './components/meters/MeterBridge';

// Main App Content Component (inside Providers)
function ProductionAppContent() {
  // Use context hooks instead of useState
  const analysis = useAnalysis();
  const comparison = useComparison();
  const ui = useUI();
  const playback = usePlayback();
  const formattedTime = useFormattedTime();

  // Local refs for system health (not in context)
  const systemHealth = useRef<SystemHealth | null>(null);

  // Engine references
  const engineRef = useRef<RealEssentiaAudioEngine | null>(null);
  const streamingEngineRef = useRef<StreamingAnalysisEngine | null>(null);

  const notifications = useNotificationHelpers();

  const handleLoadFromLibrary = useCallback(async (track: TrackRecord) => {
    // 1. Fetch full analysis artifact
    const artifact = await dbService.getArtifact(track.id, 'full_analysis');
    
    if (artifact && artifact.type === 'full_analysis') {
      analysis.completeAnalysis(artifact.data);
      notifications.success('Loaded from Library', `Loaded analysis for ${track.filename}`);
      playback.reset();
      ui.setAnalysisMode('analyze');
    } else {
      notifications.error('Load Failed', 'Could not retrieve analysis data for this track.');
    }
  }, [analysis, notifications, playback, ui]);

  // Keep streaming engine config in sync with feature toggles
  useEffect(() => {
    if (streamingEngineRef.current) {
      streamingEngineRef.current.updateConfig({
        analysisFeatures: {
          key: analysis.state.analysisSettings.keyDetection,
          tempo: analysis.state.analysisSettings.bpmExtraction,
          segments: analysis.state.analysisSettings.segmentAnalysis,
          spectral: true,
          mfcc: true,
          onset: true,
          mlClassification: analysis.state.analysisSettings.mlClassification,
        },
      });
    }
  }, [
    analysis.state.analysisSettings.keyDetection,
    analysis.state.analysisSettings.bpmExtraction,
    analysis.state.analysisSettings.segmentAnalysis,
    analysis.state.analysisSettings.mlClassification
  ]);

  // Initialize engines and health monitoring
  useEffect(() => {
    const initializeSystem = async () => {
      const timingId = PerformanceMonitor.startTiming(
        'app.initialization',
        PerformanceCategory.INITIALIZATION
      );

      try {
        // Initialize main engine
        engineRef.current = new RealEssentiaAudioEngine();

        // Initialize streaming engine
        streamingEngineRef.current = new StreamingAnalysisEngine({
          chunkSize: 44100 * 5, // 5 seconds
          maxFileSize: 200 * 1024 * 1024, // 200MB
          enableProgressiveResults: true
        });

        // Run initial health check
        const health = await HealthCheck.runHealthCheck();
        systemHealth.current = health;
        analysis.updateSystemHealth(health);

        // Start auto health monitoring
        HealthCheck.startAutoCheck(300000); // Every 5 minutes

        // Register custom health checks
        HealthCheck.registerCustomCheck('audio-engine', async () => {
          const engine = engineRef.current;
          if (!engine) {
            return {
              component: 'audio-engine',
              status: 'error',
              message: 'Audio engine not initialized',
              timestamp: new Date()
            };
          }

          const status = engine.getEngineStatus();
          return {
            component: 'audio-engine',
            status: status.status === 'ready' ? 'healthy' :
                   status.status === 'error' ? 'error' : 'warning',
            message: status.message || `Engine status: ${status.status}`,
            details: {
              status: status.status,
              modelsLoaded: status.modelsLoaded,
              totalModels: status.totalModels
            },
            timestamp: new Date()
          };
        });

        // Set up error monitoring
        ErrorHandler.onError((error) => {
          console.warn('Application error detected:', error);
          HealthCheck.runHealthCheck().then((health) => {
            systemHealth.current = health;
            analysis.updateSystemHealth(health);
          });
        });

      } catch (error) {
        console.error('System initialization failed:', error);
        notifications.error(
          'System Initialization Failed',
          'Failed to initialize audio analysis system. Please refresh the page.',
          { persistent: true }
        );
      } finally {
        PerformanceMonitor.endTiming(timingId);
      }
    };

    initializeSystem();

    return () => {
      HealthCheck.stopAutoCheck();
      engineRef.current?.terminate();
      streamingEngineRef.current?.destroy();
      PerformanceMonitor.destroy();
    };
  }, []);

  // Monitor engine status
  useEffect(() => {
    const monitorEngine = () => {
      if (!engineRef.current) return;

      const status = engineRef.current.getEngineStatus();
      analysis.setEngineStatus(status);

      // Show notification when engine becomes ready
      if (status.status === 'ready' && analysis.state.engineStatus.status !== 'ready') {
        notifications.engineReady();
        HealthCheck.runHealthCheck().then((health) => {
          systemHealth.current = health;
          analysis.updateSystemHealth(health);
        });
      } else if (status.status === 'error' && analysis.state.engineStatus.status !== 'error') {
        notifications.engineError(status.message || 'Unknown engine error');
      }
    };

    const interval = setInterval(monitorEngine, 1000);
    monitorEngine(); // Initial check

    return () => clearInterval(interval);
  }, [analysis.state.engineStatus.status]);

  // Initialize analysis steps
  const initializeAnalysisSteps = useCallback((): ProgressStep[] => [
    {
      id: 'preprocessing',
      label: 'Preprocessing',
      description: 'Preparing audio data for analysis',
      status: 'pending'
    },
    {
      id: 'spectral',
      label: 'Spectral Analysis',
      description: 'Extracting frequency domain features',
      status: 'pending'
    },
    {
      id: 'tempo',
      label: 'Tempo Detection',
      description: 'Analyzing rhythm and beat patterns',
      status: 'pending'
    },
    {
      id: 'key',
      label: 'Key Detection',
      description: 'Identifying musical key and scale',
      status: 'pending'
    },
    {
      id: 'mfcc',
      label: 'MFCC Extraction',
      description: 'Computing timbre characteristics',
      status: 'pending'
    },
    {
      id: 'finalization',
      label: 'Finalization',
      description: 'Compiling analysis results',
      status: 'pending'
    }
  ], []);

  // Handle file selection with validation
  const handleFileSelect = useCallback(async (file: File) => {
    const timingId = PerformanceMonitor.startTiming(
      'file.selection',
      PerformanceCategory.FILE_OPERATIONS
    );

    try {
      // 1. Ingest through SessionManager (Deduplication Check)
      const { trackId, existingAnalysis } = await sessionManager.ingestFile(file);
      
      comparison.dispatch({ type: 'SET_SOURCE_FILE', payload: { file, audioId: trackId } });

      // Check if streaming analysis is needed
      const shouldUseStreaming = file.size > 50 * 1024 * 1024; // 50MB threshold
      if (shouldUseStreaming !== analysis.state.useStreamingAnalysis) {
        analysis.toggleStreamingAnalysis();
      }

      if (shouldUseStreaming) {
        notifications.info(
          'Large File Detected',
          'Using streaming analysis for optimal performance',
          { duration: 3000 }
        );
      }

      analysis.setFile(file);
      playback.reset();
      notifications.fileUploaded(file.name);

      // 2. If analysis exists, rehydrate instantly. Otherwise, auto-start.
      if (existingAnalysis) {
        analysis.completeAnalysis(existingAnalysis);
        const cacheVersion = `${trackId}-${Date.now()}`;
        comparison.dispatch({ type: 'SET_SOURCE_DATA', payload: { data: existingAnalysis, cacheVersion } });
        notifications.success('Analysis Recovered', 'Loaded previous analysis from library.');
      } else {
        setTimeout(() => {
          if (analysis.state.engineStatus.status === 'ready') {
            startAnalysis();
          }
        }, 100);
      }

    } catch (error) {
      handleFileError(error as Error, file.name, file.size);
    } finally {
      PerformanceMonitor.endTiming(timingId);
    }
  }, [notifications, analysis, playback, comparison]);

  // Handle reference file selection
  const handleReferenceSelect = useCallback(async (file: File) => {
    const audioId = `${file.name}-${file.size}-${file.lastModified}`;
    comparison.dispatch({ type: 'SET_REFERENCE_FILE', payload: { file, audioId } });

    const engine = engineRef.current;
    if (!engine) return;

    try {
      const result = await engine.analyzeFile(file, {
        includeAdvanced: true,
        featureToggles: {
          key: true,
          tempo: true,
          segments: true,
          spectral: true,
        }
      });

      const cacheVersion = `${audioId}-${Date.now()}`;
      comparison.dispatch({ type: 'SET_REFERENCE_DATA', payload: { data: result, cacheVersion } });
      notifications.success('Reference Track Ready', `Analyzed ${file.name}`);
    } catch (error) {
      console.error('Reference analysis failed:', error);
      comparison.dispatch({ type: 'SET_SLOT_STATUS', payload: { slot: 'reference', status: 'error' } });
      notifications.error('Reference Analysis Failed', (error as Error).message);
    }
  }, [comparison, notifications]);

  // Start analysis with appropriate engine
  const startAnalysis = useCallback(async () => {
    const { selectedFile, engineStatus, isAnalyzing, useStreamingAnalysis, analysisSettings } = analysis.state;

    if (!selectedFile || engineStatus.status !== 'ready' || isAnalyzing) return;

    const engine = useStreamingAnalysis ? streamingEngineRef.current : engineRef.current;
    if (!engine) {
      notifications.error('Analysis Engine Not Available', 'Please refresh the page and try again.');
      return;
    }

    analysis.startAnalysis();

    const audioId = `${selectedFile.name}-${selectedFile.size}-${selectedFile.lastModified}`;

    const analysisTimingId = PerformanceMonitor.startTiming(
      'analysis.complete',
      PerformanceCategory.ANALYSIS,
      {
        fileSize: selectedFile.size,
        fileName: selectedFile.name,
        streamingMode: useStreamingAnalysis
      }
    );

    try {
      // Progress callback
      const progressCallback = (progress: AnalysisProgress) => {
        analysis.updateProgress(progress);
      };

      let result: AudioAnalysisResult;

      const featureToggles = {
        key: analysisSettings.keyDetection,
        tempo: analysisSettings.bpmExtraction,
        segments: analysisSettings.segmentAnalysis,
        mlClassification: analysisSettings.mlClassification,
        spectral: true,
        mfcc: true,
        onset: true,
      };

      if (useStreamingAnalysis && streamingEngineRef.current) {
        // Use streaming analysis for large files
        result = await streamingEngineRef.current.analyzeFile(
          selectedFile,
          progressCallback,
          undefined,
          featureToggles
        );
      } else if (engineRef.current) {
        // Use standard analysis (Essentia)
        result = await engineRef.current.analyzeFile(selectedFile, {
          progressCallback,
          includeAdvanced: analysisSettings.mlClassification || analysisSettings.segmentAnalysis,
          featureToggles,
        });
      } else {
        throw new Error('No analysis engine available');
      }

      analysis.completeAnalysis(result);
      const cacheVersion = `${audioId}-${Date.now()}`;
      comparison.dispatch({ type: 'SET_SOURCE_DATA', payload: { data: result, cacheVersion } });
      notifications.analysisComplete(selectedFile.name);

      // Persist through SessionManager
      try {
        await sessionManager.saveAnalysis(selectedFile, result);
        notifications.success('Saved to Library', 'Track analyzed and saved.');
      } catch (dbErr) {
        console.error('Persistence failed:', dbErr);
      }

      // Record successful analysis
      PerformanceMonitor.recordInstantMetric(
        'analysis.success',
        1,
        PerformanceCategory.ANALYSIS,
        {
          fileSize: selectedFile.size,
          duration: result.duration,
          streamingMode: useStreamingAnalysis
        }
      );

    } catch (error) {
      console.error('Analysis failed:', error);

      analysis.errorAnalysis(error instanceof Error ? error.message : 'Unknown error');

      handleAnalysisError(error as Error, 'complete-analysis', {
        length: selectedFile.size,
      });

      notifications.analysisError(
        selectedFile.name,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      PerformanceMonitor.endTiming(analysisTimingId);
    }
  }, [analysis, notifications]);

  const handlePlayPause = useCallback(() => {
    playback.togglePlayPause();
  }, [playback]);

  const handleSeekRelative = useCallback((deltaSeconds: number) => {
    const newTime = Math.max(0, (playback.state.pendingSeek ?? playback.state.currentTime) + deltaSeconds);
    playback.setPendingSeek(newTime);
  }, [playback]);

  const handleRepeatToggle = useCallback(() => {
    playback.toggleRepeat();
  }, [playback]);

  const settingsSlot = (
    <div className="hp-inspector-stack">
      {/* Reference Track Loader */}
      <ReferenceTrackLoader 
        engineReady={analysis.state.engineStatus.status === 'ready'}
        onReferenceSelect={handleReferenceSelect}
      />

      <div className="hp-field">
        <label className="hp-label" htmlFor="hp-algorithm">Algorithm</label>
        <select
          id="hp-algorithm"
          className="hp-select"
          value="Essentia"
          disabled={analysis.state.isAnalyzing}
        >
          <option value="Essentia">Essentia</option>
          <option value="Librosa">Librosa (coming soon)</option>
        </select>
      </div>

      <div className="hp-field">
        <label className="hp-label" htmlFor="hp-window">Window Size</label>
        <select
          id="hp-window"
          className="hp-select"
          value={2048}
          disabled={analysis.state.isAnalyzing}
        >
          <option value={2048}>2048</option>
          <option value={4096}>4096</option>
        </select>
      </div>

      <div className="hp-field">
        <label className="hp-label" htmlFor="hp-hop">Hop Size</label>
        <select
          id="hp-hop"
          className="hp-select"
          value={512}
          disabled={analysis.state.isAnalyzing}
        >
          <option value={512}>512</option>
          <option value={1024}>1024</option>
        </select>
      </div>

      <div className="hp-toggle-list">
        {[
          { key: 'keyDetection' as const, label: 'Key Detection' },
          { key: 'bpmExtraction' as const, label: 'BPM Extraction' },
          { key: 'segmentAnalysis' as const, label: 'Segment Analysis' },
          { key: 'mlClassification' as const, label: 'ML Classification' },
        ].map((item) => (
          <div key={item.key} className="hp-toggle-row">
            <span className="hp-toggle-label">{item.label}</span>
            <button
              type="button"
              className={`hp-toggle ${analysis.state.analysisSettings[item.key] ? 'is-on' : ''}`}
              aria-pressed={!!analysis.state.analysisSettings[item.key]}
              disabled={analysis.state.isAnalyzing}
              onClick={() => analysis.updateSetting(item.key, !analysis.state.analysisSettings[item.key])}
            >
              <span className="hp-toggle-knob" />
            </button>
          </div>
        ))}
        
        {/* Appearance Settings */}
        <div className="daw-divider opacity-20" />
        
        <div className="hp-toggle-row">
          <span className="hp-toggle-label">Precision Mode</span>
          <button
            type="button"
            className={`hp-toggle ${ui.state.precisionOnlyMode ? 'is-on' : ''}`}
            aria-pressed={ui.state.precisionOnlyMode}
            onClick={() => ui.togglePrecisionMode()}
            title="Disables inertial momentum for controls"
          >
            <span className="hp-toggle-knob" />
          </button>
        </div>
      </div>

      <div className="hp-status-card">
        <div className="hp-status-title">
          <span className="hp-status-dot" />
          {analysis.state.engineStatus.status === 'ready' ? 'Engine Ready' : 'Initializing...'}
        </div>
        <div className="hp-status-subtitle">
          {analysis.state.engineStatus.status === 'ready'
            ? `Models: ${analysis.state.engineStatus.modelsLoaded ?? 4}/${analysis.state.engineStatus.totalModels ?? 4} loaded`
            : 'Loading Essentia models'}
        </div>
      </div>
    </div>
  );

  return (
    <AppShell>
      {/* TopBar */}
      <TopBar
        projectName={analysis.state.selectedFile?.name || 'Song_Analysis_Project'}
        currentTime={formattedTime.current}
        duration={formattedTime.duration}
        activeTab={ui.state.inspectorTab}
        onTabChange={ui.setInspectorTab}
      />

      {/* Sidebar */}
      <Sidebar
        activeMode={ui.state.analysisMode}
        onModeChange={ui.setAnalysisMode}
      />

      {/* Main Stage */}
      <MainStage
        waveformSlot={
          analysis.state.selectedFile ? (
            <WaveformVisualizer
              onSeek={(time) => playback.setPendingSeek(time)}
            />
          ) : (
            <FileUpload
              onFileSelect={handleFileSelect}
              isProcessing={analysis.state.isAnalyzing}
              engineReady={analysis.state.engineStatus.status === 'ready'}
            />
          )
        }
        panelsSlot={useMemo(() => {
          const renderPanelsForMode = (mode: AnalysisMode) => {
            switch (mode) {
              case 'visualize':
                return (
                  <div className="flex flex-col gap-6">
                    <ComparisonRack />
                    <StudioAnalysisResults
                      analysisData={analysis.state.analysisData}
                      isAnalyzing={analysis.state.isAnalyzing}
                    />
                  </div>
                );
              case 'library':
                return (
                  <div className="h-full">
                    <LibraryPanel onLoadTrack={handleLoadFromLibrary} />
                  </div>
                );
              case 'analyze':
              default:
                return (
                  <div className="flex flex-col gap-6">
                    <ComparisonRack />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
                      <ExportFunctionality
                        analysisData={analysis.state.analysisData}
                        audioFile={analysis.state.selectedFile}
                        isAnalyzing={analysis.state.isAnalyzing}
                      />
                      <TransportRack 
                        volume={playback.state.volume}
                        onVolumeChange={playback.setVolume}
                        playbackRate={playback.state.playbackRate}
                        onPlaybackRateChange={playback.setPlaybackRate}
                        isDisabled={!analysis.state.selectedFile}
                      />
                    </div>
                  </div>
                );
            }
          };

          return (
            <div key={ui.state.analysisMode} className="hp-panels hp-fade-in">
              {renderPanelsForMode(ui.state.analysisMode)}
            </div>
          );
        }, [ui.state.analysisMode, analysis.state.analysisData, analysis.state.isAnalyzing, analysis.state.selectedFile])}
        analysisData={analysis.state.analysisData}
        isAnalyzing={analysis.state.isAnalyzing}
        playbackTime={playback.state.currentTime}
        playbackDuration={playback.state.duration || analysis.state.analysisData?.duration || 0}
        onWaveformSeek={(time) => playback.setPendingSeek(time)}
        featureToggles={{
          keyDetection: analysis.state.analysisSettings.keyDetection,
          bpmExtraction: analysis.state.analysisSettings.bpmExtraction,
          segmentAnalysis: analysis.state.analysisSettings.segmentAnalysis,
          mlClassification: analysis.state.analysisSettings.mlClassification,
        }}
      />

      {/* Inspector */}
      <Inspector
        activeTab={ui.state.inspectorTab}
        onTabChange={ui.setInspectorTab}
        settingsSlot={settingsSlot}
        resultsSlot={
          <StudioAnalysisResults
            analysisData={analysis.state.analysisData}
            isAnalyzing={analysis.state.isAnalyzing}
          />
        }
      />

      {/* Bottom Dock */}
      <BottomDock
        isPlaying={playback.state.isPlaying}
        currentTime={formattedTime.current}
        duration={formattedTime.duration}
        onPlayPause={handlePlayPause}
        onRewind={() => handleSeekRelative(-10)}
        onPrevious={() => handleSeekRelative(-10)}
        onNext={() => handleSeekRelative(10)}
        onRepeat={handleRepeatToggle}
        meterSlot={<MeterBridge />}
        transportSlot={
          analysis.state.selectedFile ? (
            <TransportControls
              audioFile={analysis.state.selectedFile}
              isAnalyzing={analysis.state.isAnalyzing}
              analysisData={analysis.state.analysisData}
              compact
              enableRealtimeVisualization
              onPlaybackProgress={(time, duration) => {
                playback.updateTime(time);
                // Duration is managed by PlaybackContext via audioBuffer
              }}
              onPlaybackStateChange={(playing) => {
                if (playing && !playback.state.isPlaying) {
                  playback.play();
                } else if (!playing && playback.state.isPlaying) {
                  playback.pause();
                }
              }}
              seekToTime={playback.state.pendingSeek}
              onSeekApplied={() => playback.setPendingSeek(null)}
            />
          ) : undefined
        }
      />

      {/* Settings Modal */}
      {ui.state.showSettingsModal && (
        <div className="daw-modal-overlay" onClick={() => ui.hideSettingsModal()}>
          <div className="daw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="daw-modal-header">
              <h3 className="daw-modal-title">
                <Settings style={{ width: '20px', height: '20px' }} />
                Advanced Settings
              </h3>
              <button className="daw-btn-icon daw-btn-ghost" onClick={() => ui.hideSettingsModal()}>
                ×
              </button>
            </div>

            <div className="daw-modal-content">
              {/* Performance Mode */}
              <div className="daw-settings-section">
                <h4 className="daw-settings-heading">Performance Mode</h4>
                <label className="daw-checkbox-label">
                  <input
                    type="checkbox"
                    checked={analysis.state.useStreamingAnalysis}
                    onChange={() => analysis.toggleStreamingAnalysis()}
                    className="daw-checkbox"
                  />
                  <span>Force streaming analysis (for large files)</span>
                </label>
              </div>

              {/* System Health */}
              {analysis.state.systemHealth && (
                <div className="daw-settings-section">
                  <h4 className="daw-settings-heading">System Health</h4>
                  <div className="daw-health-grid">
                    <div className="daw-health-item">
                      <span className="daw-health-label">Overall Status</span>
                      <span className={`daw-badge daw-badge-${
                        analysis.state.systemHealth.overall === 'healthy' ? 'success' :
                        analysis.state.systemHealth.overall === 'degraded' ? 'warning' : 'error'
                      }`}>
                        {analysis.state.systemHealth.overall} ({analysis.state.systemHealth.score}%)
                      </span>
                    </div>
                    <div className="daw-health-item">
                      <span className="daw-health-label">Errors</span>
                      <span className="daw-health-value">{ErrorHandler.getErrorStats().total}</span>
                    </div>
                    <div className="daw-health-item">
                      <span className="daw-health-label">Metrics</span>
                      <span className="daw-health-value">{PerformanceMonitor.getReport().summary.totalMetrics}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="daw-settings-section">
                <h4 className="daw-settings-heading">Quick Actions</h4>
                <div className="daw-settings-actions">
                  <button
                    onClick={() => HealthCheck.runHealthCheck().then((health) => {
                      systemHealth.current = health;
                      analysis.updateSystemHealth(health);
                    })}
                    className="daw-btn-secondary"
                  >
                    Refresh Health Check
                  </button>
                  <button
                    onClick={() => PerformanceMonitor.clearMetrics()}
                    className="daw-btn-secondary"
                  >
                    Clear Metrics
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// Main App Component with Providers
function ProductionApp() {
  return (
    <NotificationProvider maxNotifications={5}>
      <AnalysisProvider>
        <LibraryProvider>
          <ComparisonProvider>
            <UIProvider>
              <PlaybackProvider>
                <ProductionAppContent />
              </PlaybackProvider>
            </UIProvider>
          </ComparisonProvider>
        </LibraryProvider>
      </AnalysisProvider>
    </NotificationProvider>
  );
}

export default ProductionApp;
