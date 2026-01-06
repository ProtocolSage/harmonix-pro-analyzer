import { useState, useEffect, useCallback } from 'react';
import { EssentiaAudioEngine } from './engines/EssentiaAudioEngine';
import { FileUpload } from './components/FileUpload';
import { AnalysisResults } from './components/AnalysisResults';
import { TransportControls } from './components/TransportControls';
import { ExportFunctionality } from './components/ExportFunctionality';
import { 
  NotificationProvider, 
  useNotificationHelpers 
} from './components/NotificationSystem';
import { 
  ProgressStepper, 
  StatusBadge, 
  type ProgressStep 
} from './components/ProgressIndicators';
import type { 
  EngineStatus, 
  AudioAnalysisResult, 
  AnalysisProgress 
} from './types/audio';

function AdvancedAppContent() {
  const [engineStatus, setEngineStatus] = useState<EngineStatus>({ status: 'initializing' });
  const [engine] = useState(() => new EssentiaAudioEngine());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisData, setAnalysisData] = useState<AudioAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [analysisSteps, setAnalysisSteps] = useState<ProgressStep[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'results' | 'export'>('upload');
  
  const notifications = useNotificationHelpers();

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

  // Monitor engine status
  useEffect(() => {
    const checkEngineStatus = () => {
      const status = engine.getEngineStatus();
      setEngineStatus(status);

      // Show notification when engine becomes ready
      if (status.status === 'ready' && engineStatus.status !== 'ready') {
        notifications.engineReady();
      } else if (status.status === 'error') {
        notifications.engineError(status.message || 'Unknown error');
      }
    };

    const interval = setInterval(checkEngineStatus, 1000);
    checkEngineStatus(); // Initial check

    return () => {
      clearInterval(interval);
      engine.terminate();
    };
  }, [engine, engineStatus.status, notifications]);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setAnalysisData(null);
    setActiveTab('upload');
    notifications.fileUploaded(file.name);
  }, [notifications]);

  // Handle analysis start
  const startAnalysis = useCallback(async () => {
    if (!selectedFile || engineStatus.status !== 'ready' || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisData(null);
    setAnalysisProgress(null);
    const steps = initializeAnalysisSteps();
    setAnalysisSteps(steps);
    setActiveTab('results');

    try {
      // Set up progress monitoring
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

      // Start analysis
      const result = await engine.analyzeFile(selectedFile, { progressCallback });
      
      // Mark all steps as completed
      setAnalysisSteps(currentSteps =>
        currentSteps.map(step => ({ ...step, status: 'completed' }))
      );

      setAnalysisData(result);
      notifications.analysisComplete(selectedFile.name);
      
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

      notifications.analysisError(
        selectedFile.name, 
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(null);
    }
  }, [selectedFile, engineStatus.status, isAnalyzing, engine, initializeAnalysisSteps, notifications]);

  // Handle playback events
  const handlePlaybackProgress = useCallback((currentTime: number, duration: number) => {
    // Could update visualizations based on playback position
  }, []);

  const handlePlaybackStateChange = useCallback((isPlaying: boolean) => {
    // Could pause/resume real-time visualizations
  }, []);

  const getStatusColor = () => {
    switch (engineStatus.status) {
      case 'ready': return 'success';
      case 'loading': return 'loading';
      case 'error': return 'error';
      default: return 'warning';
    }
  };

  const getStatusText = () => {
    switch (engineStatus.status) {
      case 'ready': return 'Engine Ready';
      case 'loading': return 'Loading Engine';
      case 'error': return 'Engine Error';
      default: return 'Initializing';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 text-white">
            Harmonix Pro Analyzer
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto mb-4">
            Professional-grade music analysis powered by Essentia.js WASM and ML models
          </p>
          
          {/* Engine Status */}
          <div className="glassmorphic-card p-4 max-w-md mx-auto mb-6">
            <div className="flex items-center justify-center space-x-3">
              <StatusBadge 
                status={getStatusColor() as any} 
                text={getStatusText()}
                showIcon={true}
                size="md"
              />
              {engineStatus.message && (
                <div className="text-white/60 text-sm ml-3">
                  {engineStatus.message}
                </div>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center space-x-2 mb-6">
            {[
              { id: 'upload', label: 'Upload & Controls', disabled: false },
              { id: 'results', label: 'Analysis Results', disabled: !selectedFile },
              { id: 'export', label: 'Export', disabled: !analysisData }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                disabled={tab.disabled}
                className={`glassmorphic-button px-6 py-2 transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                    : tab.disabled 
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="max-w-6xl mx-auto">
          {activeTab === 'upload' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* File Upload */}
              <div className="space-y-6">
                <FileUpload
                  onFileSelect={handleFileSelect}
                  isProcessing={isAnalyzing}
                  engineReady={engineStatus.status === 'ready'}
                />
                
                {/* Start Analysis Button */}
                {selectedFile && !isAnalyzing && (
                  <div className="glassmorphic-card p-6">
                    <button
                      onClick={startAnalysis}
                      disabled={engineStatus.status !== 'ready'}
                      className={`w-full glassmorphic-button p-4 text-lg font-semibold transition-all ${
                        engineStatus.status === 'ready'
                          ? 'bg-green-500/20 border-green-400/50 text-green-300 hover:bg-green-500/30'
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      🚀 Start Professional Analysis
                    </button>
                  </div>
                )}
              </div>

              {/* Transport Controls */}
              <div>
                <TransportControls
                  audioFile={selectedFile}
                  isAnalyzing={isAnalyzing}
                  onPlaybackProgress={handlePlaybackProgress}
                  onPlaybackStateChange={handlePlaybackStateChange}
                />
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="space-y-6">
              {/* Analysis Progress */}
              {isAnalyzing && analysisSteps.length > 0 && (
                <ProgressStepper
                  steps={analysisSteps}
                  orientation="horizontal"
                  showProgress={true}
                  showTimers={false}
                />
              )}

              {/* Analysis Results */}
              <AnalysisResults
                analysisData={analysisData}
                isAnalyzing={isAnalyzing}
              />
            </div>
          )}

          {activeTab === 'export' && (
            <ExportFunctionality
              analysisData={analysisData}
              audioFile={selectedFile}
              isAnalyzing={isAnalyzing}
            />
          )}
        </div>

        {/* Technical Specs Footer */}
        <div className="mt-12">
          <div className="glassmorphic-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">
              Technical Specifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="text-center">
                <h4 className="font-medium text-white/80 mb-2">Audio Processing</h4>
                <ul className="text-white/60 space-y-1">
                  <li>• Essentia.js WASM Backend</li>
                  <li>• 44.1kHz Sample Rate</li>
                  <li>• Multi-resolution Analysis</li>
                  <li>• Real-time Feature Extraction</li>
                </ul>
              </div>
              <div className="text-center">
                <h4 className="font-medium text-white/80 mb-2">ML Models</h4>
                <ul className="text-white/60 space-y-1">
                  <li>• MusiCNN Genre Classification</li>
                  <li>• TempoCNN Rhythm Analysis</li>
                  <li>• Research-backed Algorithms</li>
                  <li>• Pre-trained Model Inference</li>
                </ul>
              </div>
              <div className="text-center">
                <h4 className="font-medium text-white/80 mb-2">Analysis Features</h4>
                <ul className="text-white/60 space-y-1">
                  <li>• HPCP Key Detection</li>
                  <li>• Onset & Beat Tracking</li>
                  <li>• Spectral Feature Suite</li>
                  <li>• MFCC Timbre Analysis</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdvancedApp() {
  return (
    <NotificationProvider maxNotifications={5}>
      <AdvancedAppContent />
    </NotificationProvider>
  );
}

export default AdvancedApp;