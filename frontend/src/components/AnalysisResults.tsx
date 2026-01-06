import { useState, useRef, useEffect } from 'react';
import { Music, Activity, BarChart3, Waves, Download, Eye, EyeOff } from 'lucide-react';
// Temporarily disable VisualizationEngine import to fix build
// import { VisualizationEngine, type VisualizationOptions } from '../engines/VisualizationEngine';
import type { AudioAnalysisResult } from '../types/audio';

interface AnalysisResultsProps {
  analysisData: AudioAnalysisResult | null;
  isAnalyzing: boolean;
}

interface VisualizationTab {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

export function AnalysisResults({ analysisData, isAnalyzing }: AnalysisResultsProps) {
  const [activeTab, setActiveTab] = useState('spectral');
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [isAnimated, setIsAnimated] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // const engineRef = useRef<VisualizationEngine | null>(null);

  const tabs: VisualizationTab[] = [
    {
      id: 'spectral',
      name: 'Spectral',
      icon: <BarChart3 className="w-4 h-4" />,
      description: 'Frequency domain analysis'
    },
    {
      id: 'mfcc',
      name: 'MFCC',
      icon: <Waves className="w-4 h-4" />,
      description: 'Mel-frequency cepstral coefficients'
    },
    {
      id: 'tempo',
      name: 'Tempo',
      icon: <Activity className="w-4 h-4" />,
      description: 'Rhythm and beat analysis'
    },
    {
      id: 'key',
      name: 'Key',
      icon: <Music className="w-4 h-4" />,
      description: 'Musical key detection'
    }
  ];

  // Temporarily disable visualization engine
  // useEffect(() => {
  //   if (canvasRef.current && !engineRef.current) {
  //     try {
  //       engineRef.current = new VisualizationEngine(canvasRef.current);
  //     } catch (error) {
  //       console.error('Failed to initialize visualization engine:', error);
  //     }
  //   }

  //   return () => {
  //     if (engineRef.current) {
  //       engineRef.current.destroy();
  //       engineRef.current = null;
  //     }
  //   };
  // }, []);

  // Temporarily disable visualization updates
  // useEffect(() => {
  //   if (!engineRef.current || !analysisData || isAnalyzing) return;

  //   const options: VisualizationOptions = {
  //     width: 800,
  //     height: 400,
  //     theme: 'dark',
  //     animated: isAnimated,
  //     showGrid,
  //     showLabels
  //   };

  //   try {
  //     switch (activeTab) {
  //       case 'spectral':
  //         if (analysisData.spectral) {
  //           engineRef.current.renderSpectralAnalysis(analysisData.spectral, options);
  //         }
  //         break;
  //       case 'mfcc':
  //         if (analysisData.mfcc) {
  //           engineRef.current.renderMFCCHeatmap(analysisData.mfcc, options);
  //         }
  //         break;
  //       case 'tempo':
  //         if (analysisData.tempo) {
  //           engineRef.current.renderTempoVisualization(analysisData.tempo, options);
  //         }
  //         break;
  //       case 'key':
  //         if (analysisData.key) {
  //           engineRef.current.renderKeyVisualization(analysisData.key, options);
  //         }
  //         break;
  //     }
  //   } catch (error) {
  //     console.error('Visualization render error:', error);
  //   }
  // }, [analysisData, activeTab, showGrid, showLabels, isAnimated, isAnalyzing]);

  // Temporarily disable canvas resize
  // useEffect(() => {
  //   const handleResize = () => {
  //     if (engineRef.current) {
  //       engineRef.current.resize();
  //     }
  //   };

  //   window.addEventListener('resize', handleResize);
  //   return () => window.removeEventListener('resize', handleResize);
  // }, []);

  const exportVisualization = () => {
    if (!canvasRef.current) return;
    
    const link = document.createElement('a');
    link.download = `harmonix-${activeTab}-analysis.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  const getAnalysisOverview = () => {
    if (!analysisData) return null;

    const stats = [];
    
    if (analysisData.tempo?.bpm) {
      stats.push({ label: 'Tempo', value: `${analysisData.tempo.bpm} BPM`, color: 'text-blue-400' });
    }
    
    if (analysisData.key?.key) {
      stats.push({ label: 'Key', value: analysisData.key.key, color: 'text-green-400' });
    }
    
    if (analysisData.spectral?.centroid?.mean) {
      stats.push({ 
        label: 'Brightness', 
        value: `${(analysisData.spectral.centroid.mean / 1000).toFixed(1)}k Hz`, 
        color: 'text-yellow-400' 
      });
    }
    
    if (analysisData.duration) {
      const minutes = Math.floor(analysisData.duration / 60);
      const seconds = Math.floor(analysisData.duration % 60);
      stats.push({ 
        label: 'Duration', 
        value: `${minutes}:${seconds.toString().padStart(2, '0')}`, 
        color: 'text-purple-400' 
      });
    }

    return stats;
  };

  if (isAnalyzing) {
    return (
      <div className="glassmorphic-card p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4">
            <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Analyzing Audio</h3>
          <p className="text-white/60">Extracting features and generating insights...</p>
        </div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="glassmorphic-card p-8">
        <div className="text-center text-white/60">
          <Music className="w-16 h-16 mx-auto mb-4 text-white/40" />
          <h3 className="text-xl font-semibold mb-2">No Analysis Data</h3>
          <p>Upload and analyze an audio file to see results here.</p>
        </div>
      </div>
    );
  }

  const stats = getAnalysisOverview();

  return (
    <div className="space-y-6">
      {/* Analysis Overview */}
      {stats && stats.length > 0 && (
        <div className="glassmorphic-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Analysis Overview</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-white/60 text-sm mb-1">{stat.label}</div>
                <div className={`font-semibold text-lg ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visualization Controls */}
      <div className="glassmorphic-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`glassmorphic-button px-4 py-2 flex items-center space-x-2 transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                    : 'hover:bg-white/5'
                }`}
                title={tab.description}
              >
                {tab.icon}
                <span className="font-medium">{tab.name}</span>
              </button>
            ))}
          </div>

          {/* Visualization Settings */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`glassmorphic-button p-2 transition-colors ${
                showGrid ? 'text-green-400' : 'text-white/60'
              }`}
              title="Toggle grid"
            >
              {showGrid ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            
            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`glassmorphic-button p-2 transition-colors ${
                showLabels ? 'text-green-400' : 'text-white/60'
              }`}
              title="Toggle labels"
            >
              <span className="text-sm font-medium">Aa</span>
            </button>

            <button
              onClick={exportVisualization}
              className="glassmorphic-button p-2 hover:bg-blue-500/20 transition-colors"
              title="Export visualization"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Visualization */}
      <div className="glassmorphic-card p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            {tabs.find(t => t.id === activeTab)?.icon}
            <span>{tabs.find(t => t.id === activeTab)?.name} Analysis</span>
          </h3>
          <p className="text-white/60 text-sm">
            {tabs.find(t => t.id === activeTab)?.description}
          </p>
        </div>

        <div className="bg-black/20 rounded-lg p-4 overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-96 max-w-full"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* Detailed Statistics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {activeTab === 'spectral' && analysisData.spectral && (
            <>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/60 mb-1">Spectral Centroid</div>
                <div className="text-white font-medium">
                  {analysisData.spectral.centroid?.mean?.toFixed(1) || 'N/A'} Hz
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/60 mb-1">Spectral Rolloff</div>
                <div className="text-white font-medium">
                  {analysisData.spectral.rolloff?.mean?.toFixed(1) || 'N/A'} Hz
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/60 mb-1">Brightness</div>
                <div className="text-white font-medium">
                  {((analysisData.spectral.brightness?.mean || 0) * 100).toFixed(1)}%
                </div>
              </div>
            </>
          )}

          {activeTab === 'tempo' && analysisData.tempo && (
            <>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/60 mb-1">BPM</div>
                <div className="text-white font-medium">{analysisData.tempo.bpm}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/60 mb-1">Confidence</div>
                <div className="text-white font-medium">
                  {((analysisData.tempo.confidence || 0) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/60 mb-1">Beats Detected</div>
                <div className="text-white font-medium">
                  {analysisData.tempo.beats?.length || 0}
                </div>
              </div>
            </>
          )}

          {activeTab === 'key' && analysisData.key && (
            <>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/60 mb-1">Detected Key</div>
                <div className="text-white font-medium">{analysisData.key.key || 'Unknown'}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/60 mb-1">Scale</div>
                <div className="text-white font-medium">{analysisData.key.scale || 'Unknown'}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/60 mb-1">Confidence</div>
                <div className="text-white font-medium">
                  {((analysisData.key.confidence || 0) * 100).toFixed(1)}%
                </div>
              </div>
            </>
          )}

          {activeTab === 'mfcc' && analysisData.mfcc && (
            <>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/60 mb-1">Coefficients</div>
                <div className="text-white font-medium">{analysisData.mfcc.length}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/60 mb-1">Range</div>
                <div className="text-white font-medium">
                  {Math.min(...analysisData.mfcc).toFixed(2)} to {Math.max(...analysisData.mfcc).toFixed(2)}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/60 mb-1">Mean Energy</div>
                <div className="text-white font-medium">
                  {(analysisData.mfcc.reduce((a, b) => a + b, 0) / analysisData.mfcc.length).toFixed(3)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}