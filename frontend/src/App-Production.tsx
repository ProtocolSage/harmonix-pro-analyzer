import { useState, useEffect, useCallback, useRef } from 'react';
import { RealEssentiaAudioEngine } from './engines/RealEssentiaAudioEngine';
import { StreamingAnalysisEngine } from './engines/StreamingAnalysisEngine';
import { FileUpload } from './components/FileUpload';
import { StudioAnalysisResults } from './components/StudioAnalysisResults';
import { TransportControls } from './components/TransportControls';
import { ExportFunctionality } from './components/ExportFunctionality';
// Phase 0-1: New shell components
import { AppShell, TopBar, Sidebar, Inspector, BottomDock, MainStage } from './components/shell';
// Phase 0-1: Keep old components imported but not rendered (for future migration)
// import { DAWTopBar } from './components/DAWTopBar';
// import { DAWSidebar } from './components/DAWSidebar';
// import { DAWMeterBridge } from './components/DAWMeterBridge';
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
import { Settings } from 'lucide-react';

// Main App Content Component (inside NotificationProvider)
function ProductionAppContent() {
  // Core state
  const [engineStatus, setEngineStatus] = useState<EngineStatus>({ status: 'initializing' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisData, setAnalysisData] = useState<AudioAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [analysisSteps, setAnalysisSteps] = useState<ProgressStep[]>([]);

  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  // Phase 0-1: New shell state
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('settings');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('waveform');

  // System health and monitoring
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [useStreamingAnalysis, setUseStreamingAnalysis] = useState(false);

  // Engine references
  const engineRef = useRef<RealEssentiaAudioEngine | null>(null);
  const streamingEngineRef = useRef<StreamingAnalysisEngine | null>(null);

  const notifications = useNotificationHelpers();

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
        setSystemHealth(health);

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
            setSystemHealth(health);
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
      setEngineStatus(status);

      // Show notification when engine becomes ready
      if (status.status === 'ready' && engineStatus.status !== 'ready') {
        notifications.engineReady();
        HealthCheck.runHealthCheck().then((health) => {
          setSystemHealth(health);
        });
      } else if (status.status === 'error' && engineStatus.status !== 'error') {
        notifications.engineError(status.message || 'Unknown engine error');
      }
    };

    const interval = setInterval(monitorEngine, 1000);
    monitorEngine(); // Initial check

    return () => clearInterval(interval);
  }, [engineStatus.status]);

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
      // Validate file
      if (file.size > 200 * 1024 * 1024) {
        throw new Error('File too large (max 200MB)');
      }

      // Check if streaming analysis is needed
      const shouldUseStreaming = file.size > 50 * 1024 * 1024; // 50MB threshold
      setUseStreamingAnalysis(shouldUseStreaming);

      if (shouldUseStreaming) {
        notifications.info(
          'Large File Detected',
          'Using streaming analysis for optimal performance',
          { duration: 3000 }
        );
      }

      setSelectedFile(file);
      setAnalysisData(null);
      notifications.fileUploaded(file.name);

      // Auto-start analysis
      setTimeout(() => {
        if (engineStatus.status === 'ready') {
          startAnalysis();
        }
      }, 100);

    } catch (error) {
      handleFileError(error as Error, file.name, file.size);
    } finally {
      PerformanceMonitor.endTiming(timingId);
    }
  }, [notifications, engineStatus.status]);

  // Start analysis with appropriate engine
  const startAnalysis = useCallback(async () => {
    if (!selectedFile || engineStatus.status !== 'ready' || isAnalyzing) return;

    const engine = useStreamingAnalysis ? streamingEngineRef.current : engineRef.current;
    if (!engine) {
      notifications.error('Analysis Engine Not Available', 'Please refresh the page and try again.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisData(null);
    setAnalysisProgress(null);
    const steps = initializeAnalysisSteps();
    setAnalysisSteps(steps);

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
        setAnalysisProgress(progress);

        // Update step status based on progress
        setAnalysisSteps(currentSteps =>
          currentSteps.map(step => {
            if (progress.currentStep === step.id) {
              return {
                ...step,
                status: 'active',
                progress: Math.round(progress.progress * 100)
              };
            } else if (progress.completedSteps.includes(step.id)) {
              return { ...step, status: 'completed' };
            }
            return step;
          })
        );
      };

      let result: AudioAnalysisResult;

      if (useStreamingAnalysis && streamingEngineRef.current) {
        // Use streaming analysis for large files
        result = await streamingEngineRef.current.analyzeFile(
          selectedFile,
          progressCallback
        );
      } else if (engineRef.current) {
        // Use standard analysis
        result = await engineRef.current.analyzeAudio(selectedFile, progressCallback);
      } else {
        throw new Error('No analysis engine available');
      }

      // Mark all steps as completed
      setAnalysisSteps(currentSteps =>
        currentSteps.map(step => ({ ...step, status: 'completed' }))
      );

      setAnalysisData(result);
      notifications.analysisComplete(selectedFile.name);

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

      // Mark current step as error
      setAnalysisSteps(currentSteps =>
        currentSteps.map(step =>
          step.status === 'active'
            ? { ...step, status: 'error' }
            : step
        )
      );

      handleAnalysisError(error as Error, 'complete-analysis', {
        fileSize: selectedFile.size,
        streamingMode: useStreamingAnalysis
      });

      notifications.analysisError(
        selectedFile.name,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(null);
      PerformanceMonitor.endTiming(analysisTimingId);
    }
  }, [selectedFile, engineStatus.status, isAnalyzing, useStreamingAnalysis, initializeAnalysisSteps, notifications]);

  // Phase 0-1: Format timecode for display
  const formatTime = (seconds?: number): string => {
    if (!seconds) return '00:00.000';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  };

  const currentTime = formatTime(analysisData?.duration ? analysisData.duration * 0.3 : 0);
  const totalDuration = formatTime(analysisData?.duration);

  return (
    <AppShell>
      {/* TopBar */}
      <TopBar
        projectName={selectedFile?.name || 'Song_Analysis_Project'}
        currentTime={currentTime}
        duration={totalDuration}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
      />

      {/* Sidebar */}
      <Sidebar
        activeMode={analysisMode}
        onModeChange={setAnalysisMode}
      />

      {/* Main Stage */}
      <MainStage>
        {/* Phase 0-1: Placeholders rendered by MainStage component */}
        {/* Future: Real waveform + analysis panels will go here */}
      </MainStage>

      {/* Inspector */}
      <Inspector
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
      />

      {/* Bottom Dock */}
      <BottomDock
        isPlaying={false}
        currentTime={currentTime}
        duration={totalDuration}
        onPlayPause={() => {}}
      />

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="daw-modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="daw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="daw-modal-header">
              <h3 className="daw-modal-title">
                <Settings style={{ width: '20px', height: '20px' }} />
                Advanced Settings
              </h3>
              <button className="daw-btn-icon daw-btn-ghost" onClick={() => setShowSettingsModal(false)}>
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
                    checked={useStreamingAnalysis}
                    onChange={(e) => setUseStreamingAnalysis(e.target.checked)}
                    className="daw-checkbox"
                  />
                  <span>Force streaming analysis (for large files)</span>
                </label>
              </div>

              {/* System Health */}
              {systemHealth && (
                <div className="daw-settings-section">
                  <h4 className="daw-settings-heading">System Health</h4>
                  <div className="daw-health-grid">
                    <div className="daw-health-item">
                      <span className="daw-health-label">Overall Status</span>
                      <span className={`daw-badge daw-badge-${
                        systemHealth.overall === 'healthy' ? 'success' :
                        systemHealth.overall === 'degraded' ? 'warning' : 'error'
                      }`}>
                        {systemHealth.overall} ({systemHealth.score}%)
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
                    onClick={() => HealthCheck.runHealthCheck().then(setSystemHealth)}
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
      <ProductionAppContent />
    </NotificationProvider>
  );
}

export default ProductionApp;
