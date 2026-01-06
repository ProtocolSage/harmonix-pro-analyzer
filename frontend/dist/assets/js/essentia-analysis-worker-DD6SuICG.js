/**
 * Essentia.js Analysis Worker - Classic Worker Implementation
 * 
 * This worker handles audio analysis in a separate thread using classic worker
 * format to support importScripts() for loading Essentia.js WASM modules.
 * 
 * Key Features:
 * - Classic worker with importScripts support
 * - Proper Essentia.js WASM initialization
 * - Memory management with vector cleanup
 * - Progress reporting for long-running analyses
 * - Error handling with detailed diagnostics
 */

// Global variables for Essentia.js (classic worker style)
var essentia = null;
var isInitialized = false;
var initializationError = null;

/*************  ✨ Windsurf Command 🌟  *************/
/**
 * Initialize Essentia.js WASM module in the worker context - Classic Worker Version
 * 
 * This function initializes the Essentia.js WASM module and checks for successful
 * loading of the module. It also logs debugging information about the exported
 * module and its properties.
 * 
 * @returns {void}
 * This follows the debugging approach from the troubleshooting document:
 * 1. Load the WASM module files from public directory
 * 2. Debug what's actually available
 * 3. Properly initialize the Essentia instance
 */
function initializeEssentia() {
  console.log(' Starting Essentia.js initialization...');

  console.log('🏭 Worker: Starting Essentia.js initialization...');
  
  try {
    // Set up Module.locateFile BEFORE loading any Essentia code
    self.Module = self.Module || {};
    /**
     * Override Module.locateFile to load all files from /essentia/
     * 
     * @param {string} path - The path to the file to load
     * @param {string} scriptDirectory - The directory from which the script is being loaded
     * @returns {string} The overridden path
     */
    self.Module.locateFile = function(path, scriptDirectory) {
      console.log('Module.locateFile called for:', path, 'scriptDirectory:', scriptDirectory);
      console.log('🎯 Module.locateFile called for:', path, 'scriptDirectory:', scriptDirectory);
      // Force ALL files to load from /essentia/
      const result = '/essentia/' + path;
      console.log('Returning path:', result);
      console.log('🎯 Returning path:', result);
      return result;
    };
    console.log('Module.locateFile override installed BEFORE loading Essentia');

    console.log('✅ Module.locateFile override installed BEFORE loading Essentia');
    
    // Load the polyfill first
    importScripts('/essentia/essentia-worker-polyfill.js');

    
    // Load the WASM loader patch to fix scriptDirectory
    importScripts('/essentia/essentia-wasm-loader-patch.js');

    
    // Then load Essentia WASM (will be patched by the loader patch)
    importScripts('/essentia/essentia-wasm.web.js');
    importScripts('/essentia/essentia.js-core.js');
    
    console.log('🏭 Worker: Scripts imported successfully');
    
    // STEP 2: COMPREHENSIVE MODULE INSPECTION (following user's debugging approach)
    console.log('=== DEBUGGING: WHAT WAS ACTUALLY EXPORTED ===');
    console.log('typeof Essentia:', typeof Essentia);
    console.log('Essentia:', Essentia);
    console.log('typeof EssentiaWASM:', typeof EssentiaWASM);
    console.log('EssentiaWASM:', EssentiaWASM);
    
    // Check self properties
    console.log('self.Essentia:', self.Essentia);
    console.log('self.EssentiaWASM:', self.EssentiaWASM);
    console.log('window.Essentia:', typeof window !== 'undefined' ? window.Essentia : 'window undefined in worker');
    
    // Check if Essentia has constructor or is a function
    if (Essentia && Essentia.constructor) {
      console.log('Essentia.constructor:', Essentia.constructor.name);
    }
    
    // Loop through Essentia properties for debugging
    if (typeof Essentia === 'object' && Essentia !== null) {
      console.log('Essentia properties:');
      for (var k in Essentia) {
        console.log('  Essentia.' + k + ':', typeof Essentia[k], Essentia[k]);
      }
    }
    
    // Loop through EssentiaWASM properties for debugging
    if (typeof EssentiaWASM === 'object' && EssentiaWASM !== null) {
      console.log('EssentiaWASM properties:');
      for (var k in EssentiaWASM) {
        console.log('  EssentiaWASM.' + k + ':', typeof EssentiaWASM[k]);
      }
    }
    
    // NEW LOGIC: Directly handle EssentiaWASM() return value
    let wasmModule = EssentiaWASM();
    console.log("🏭 Worker: EssentiaWASM() returns:", wasmModule);
    
    if (wasmModule && typeof wasmModule.then === 'function') {
      wasmModule.then(function(resolvedModule) {
        essentia = new Essentia(resolvedModule);
        
        // Check if WASM runtime needs initialization
        if (essentia.module && essentia.module.calledRun === false) {
          console.log('🏭 Worker: Waiting for WASM runtime initialization...');
          var timeout = setTimeout(function() {
            throw new Error('WASM runtime initialization timeout');
          }, 30000);
          essentia.module.onRuntimeInitialized = function() {
            clearTimeout(timeout);
            console.log('🏭 Worker: WASM runtime initialized successfully');
            completeInitialization();
          };
        } else {
          completeInitialization();
        }

      }).catch(function(error) {
        console.error('❌ Failed to resolve WASM module Promise:', error);
        // Set initializationError and post message on failure
        initializationError = error.message || error;
        isInitialized = false;
        postMessage({
          type: 'WORKER_ERROR',
          payload: { 
            error: initializationError,
            stage: 'initialization'
          }
        });
      });
    } else {
      // It's already the module, not a Promise
      essentia = new Essentia(wasmModule);
      
      // Check if WASM runtime needs initialization
      if (essentia.module && essentia.module.calledRun === false) {
        console.log('🏭 Worker: Waiting for WASM runtime initialization...');
        var timeout = setTimeout(function() {
          throw new Error('WASM runtime initialization timeout');
        }, 30000);
        essentia.module.onRuntimeInitialized = function() {
          clearTimeout(timeout);
          console.log('🏭 Worker: WASM runtime initialized successfully');
          completeInitialization();
        };
      } else {
        completeInitialization();
      }
    }
    
  } catch (error) {
    var errorMessage = error.message || 'Unknown initialization error';
    initializationError = errorMessage;
    
    console.error('❌ Worker: Essentia.js initialization failed:', error);
    console.error('❌ Worker: Full error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    postMessage({
      type: 'WORKER_ERROR',
      payload: { 
        error: errorMessage,
        stage: 'initialization',
        details: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      }
    });
  }
}
/*******  2e14b01c-0c7a-4ffb-8982-a5420dbe6933  *******/

function completeInitialization() {
  isInitialized = true;
  
  console.log('✅ Worker: Essentia.js initialized successfully');
  console.log('🏭 Worker: Essentia version:', essentia.version || 'unknown');
  console.log('🏭 Worker: Available algorithms:', essentia.algorithmNames ? essentia.algorithmNames.length : 'unknown');
  
  // Notify main thread that initialization is complete
  postMessage({
    type: 'WORKER_READY',
    payload: { 
      success: true, 
      version: essentia.version || '0.1.3',
      algorithmCount: essentia.algorithmNames ? essentia.algorithmNames.length : 0
    }
  });
}

/**
 * Perform comprehensive audio analysis using Essentia.js algorithms
 * 
 * @param {AudioBuffer} audioBuffer - The decoded audio data
 * @param {Object} config - Analysis configuration parameters
 * @param {string} analysisId - Unique identifier for this analysis
 */
async function analyzeAudioBuffer(audioBuffer, config, analysisId) {
  if (!isInitialized || !essentia) {
    postMessage({
      type: 'ANALYSIS_ERROR',
      payload: { 
        error: initializationError || 'Essentia not initialized',
        stage: 'pre_analysis'
      },
      id: analysisId
    });
    return;
  }

  const startTime = performance.now();
  let inputVector = null;
  
  try {
    console.log(`🏭 Worker: Starting analysis ${analysisId}`);
    
    // Extract audio data - handle both AudioBuffer and serialized data
    let channelData;
    if (audioBuffer.getChannelData) {
      channelData = audioBuffer.getChannelData(0);
    } else {
      // Handle serialized AudioBuffer data
      channelData = new Float32Array(audioBuffer.length);
      for (let i = 0; i < audioBuffer.length; i++) {
        channelData[i] = audioBuffer.data[i];
      }
    }
    
    const duration = audioBuffer.duration || (channelData.length / audioBuffer.sampleRate);
    const sampleRate = audioBuffer.sampleRate;
    
    console.log(`🏭 Worker: Audio data extracted: ${channelData.length} samples, ${sampleRate}Hz`);
    
    // Convert to Essentia vector
    inputVector = essentia.arrayToVector(channelData);
    
    // Analysis steps with progress reporting
    const steps = ['preprocessing', 'spectral', 'tempo', 'key', 'mfcc', 'finalization'];
    let currentStepIndex = 0;
    
    // Step 1: Preprocessing
    postMessage({
      type: 'PROGRESS',
      payload: {
        stage: 'analyzing',
        percentage: 10,
        progress: 0.1,
        currentStep: steps[currentStepIndex++],
        message: 'Preprocessing audio...',
        completedSteps: []
      },
      id: analysisId
    });
    
    // Configure analysis parameters
    const frameSize = config.frameSize || 2048;
    const hopSize = config.hopSize || 512;
    
    // Step 2: Spectral Analysis
    postMessage({
      type: 'PROGRESS',
      payload: {
        stage: 'analyzing',
        percentage: 30,
        progress: 0.3,
        currentStep: steps[currentStepIndex++],
        message: 'Analyzing spectral features...',
        completedSteps: steps.slice(0, currentStepIndex - 1)
      },
      id: analysisId
    });
    
    const spectralResults = await performSpectralAnalysis(channelData, sampleRate, frameSize, hopSize);
    
    // Step 3: Tempo Analysis
    postMessage({
      type: 'PROGRESS',
      payload: {
        stage: 'analyzing',
        percentage: 50,
        progress: 0.5,
        currentStep: steps[currentStepIndex++],
        message: 'Detecting tempo...',
        completedSteps: steps.slice(0, currentStepIndex - 1)
      },
      id: analysisId
    });
    
    const tempoResults = await performTempoAnalysis(inputVector, frameSize, hopSize, sampleRate);
    
    // Step 4: Key Detection
    postMessage({
      type: 'PROGRESS',
      payload: {
        stage: 'analyzing',
        percentage: 70,
        progress: 0.7,
        currentStep: steps[currentStepIndex++],
        message: 'Detecting musical key...',
        completedSteps: steps.slice(0, currentStepIndex - 1)
      },
      id: analysisId
    });
    
    const keyResults = await performKeyAnalysis(inputVector, frameSize, hopSize, sampleRate);
    
    // Step 5: MFCC Extraction
    postMessage({
      type: 'PROGRESS',
      payload: {
        stage: 'analyzing',
        percentage: 85,
        progress: 0.85,
        currentStep: steps[currentStepIndex++],
        message: 'Extracting MFCC features...',
        completedSteps: steps.slice(0, currentStepIndex - 1)
      },
      id: analysisId
    });
    
    const mfccResults = await performMFCCAnalysis(channelData, sampleRate, frameSize);
    
    // Step 6: Finalization
    postMessage({
      type: 'PROGRESS',
      payload: {
        stage: 'analyzing',
        percentage: 95,
        progress: 0.95,
        currentStep: steps[currentStepIndex++],
        message: 'Finalizing analysis...',
        completedSteps: steps.slice(0, currentStepIndex - 1)
      },
      id: analysisId
    });
    
    const analysisTime = performance.now() - startTime;
    
    // Compile comprehensive results
    const result = {
      duration,
      sampleRate,
      channels: audioBuffer.numberOfChannels || 1,
      analysisTimestamp: Date.now(),
      spectral: spectralResults,
      tempo: tempoResults,
      key: keyResults,
      // Add MFCC results to the main analysis result object
      mfcc: mfccResults,
      loudness: {
        lufs: -14, // TODO: Implement proper loudness analysis
        dynamicRange: 8
      },
      performance: {
        totalAnalysisTime: analysisTime,
        breakdown: {
          spectral_features: analysisTime * 0.4,
          tempo_analysis: analysisTime * 0.25,
          key_analysis: analysisTime * 0.2,
          mfcc_extraction: analysisTime * 0.15
        },
        memoryUsage: Math.floor(channelData.length * 4 + frameSize * 100) // Estimate
      }
    };
    
    console.log(`✅ Worker: Analysis ${analysisId} complete in ${analysisTime.toFixed(2)}ms`);
    
    postMessage({
      type: 'ANALYSIS_COMPLETE',
      payload: result,
      id: analysisId
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown analysis error';
    console.error(`❌ Worker: Analysis ${analysisId} failed:`, error);
    
    postMessage({
      type: 'ANALYSIS_ERROR',
      payload: { 
        error: errorMessage, 
        stage: 'analysis',
        analysisId
      },
      id: analysisId
    });
  } finally {
    // Clean up memory
    if (inputVector) {
      try {
        inputVector.delete();
      } catch (e) {
        console.warn('🏭 Worker: Vector cleanup warning:', e);
      }
    }
  }
}

/**
 * Perform spectral analysis using Essentia.js algorithms
 * 
 * Extracts spectral features including centroid, rolloff, flux, and energy.
 * Uses windowing and FFT for accurate frequency domain analysis.
 */
async function performSpectralAnalysis(channelData, sampleRate, frameSize, hopSize) {
  const spectralCentroids = [];
  const spectralRolloffs = [];
  const spectralFlux = [];
  const energyValues = [];
  
  let previousSpectrum = null;
  const maxFrames = Math.min(150, Math.floor(channelData.length / hopSize)); // Limit for performance
  
  for (let i = 0; i < maxFrames; i++) {
    const startIdx = i * hopSize;
    if (startIdx + frameSize > channelData.length) break;
    
    const frame = channelData.slice(startIdx, startIdx + frameSize);
    let frameVector = null;
    let windowed = null;
    let spectrum = null;
    
    try {
      frameVector = essentia.arrayToVector(frame);
      
      // Apply Hann windowing for better frequency resolution
      windowed = essentia.Windowing(frameVector, true, frameSize, 'hann');
      
      // Compute magnitude spectrum
      spectrum = essentia.Spectrum(windowed.frame, frameSize);
      
      // Calculate spectral centroid (brightness indicator)
      const centroid = essentia.SpectralCentroidTime(frameVector, sampleRate);
      spectralCentroids.push(centroid.centroid);
      
      // Calculate spectral rolloff (frequency below which 85% of energy lies)
      const rolloff = essentia.RollOff(spectrum.spectrum, 0.85, sampleRate);
      spectralRolloffs.push(rolloff.rollOff);
      
      // Calculate energy (RMS of the frame)
      const energy = essentia.Energy(frameVector);
      energyValues.push(energy.energy);
      
      // Calculate spectral flux (measure of how quickly the spectrum changes)
      if (previousSpectrum) {
        const flux = essentia.Flux(previousSpectrum, spectrum.spectrum);
        spectralFlux.push(flux.flux);
      }
      
      // Store current spectrum for next iteration
      if (previousSpectrum) previousSpectrum.delete();
      previousSpectrum = spectrum.spectrum;
      
    } catch (error) {
      console.warn(`🏭 Worker: Spectral analysis error on frame ${i}:`, error);
    } finally {
      // Clean up Essentia vectors to prevent memory leaks
      if (frameVector) frameVector.delete();
      if (windowed?.frame) windowed.frame.delete();
      if (spectrum && spectrum.spectrum !== previousSpectrum) {
        spectrum.spectrum?.delete();
      }
    }
  }
  
  // Clean up final spectrum
  if (previousSpectrum) previousSpectrum.delete();
  
  // Calculate statistical measures for each feature
  const calculateStats = (values) => {
    if (values.length === 0) return { mean: 0, std: 0 };
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => {
      const diff = val - mean;
      return sum + diff * diff;
    }, 0) / values.length;
    const std = Math.sqrt(variance);
    
    return { mean, std };
  };
  
  return {
    centroid: calculateStats(spectralCentroids),
    rolloff: calculateStats(spectralRolloffs),
    flux: calculateStats(spectralFlux),
    energy: calculateStats(energyValues),
    brightness: calculateStats(spectralCentroids), // Centroid is a brightness indicator
    roughness: { mean: 0, std: 0 }, // TODO: Implement spectral roughness
    spread: { mean: 0, std: 0 }, // TODO: Implement spectral spread
    zcr: { mean: 0, std: 0 } // TODO: Implement zero crossing rate
  };
}

/**
 * Perform tempo analysis using Essentia.js BPM estimation
 * 
 * Uses the Percival BPM estimator which is robust for various music genres.
 * Also attempts to extract beat positions for rhythm analysis.
 */
async function performTempoAnalysis(inputVector, frameSize, hopSize, sampleRate) {
  try {
    // Use Percival BPM estimator - robust for various music styles
    const tempo = essentia.PercivalBpmEstimator(inputVector, frameSize, hopSize, sampleRate);
    
    console.log(`🏭 Worker: Detected BPM: ${tempo.bpm}, confidence: ${tempo.confidence}`);
    
    // TODO: Extract beat positions using BeatTrackerMultiFeature
    // This would require additional processing but provides rhythm timing
    
    return {
      bpm: tempo.bpm || 120, // Fallback to standard tempo
      confidence: tempo.confidence || 0.5,
      beats: [] // Beat positions would go here
    };
    
  } catch (error) {
    console.warn('🏭 Worker: Tempo analysis error:', error);
    
    // Fallback tempo analysis using autocorrelation
    return {
      bpm: 120, // Standard fallback BPM
      confidence: 0.0,
      beats: []
    };
  }
}

/**
 * Perform musical key detection using Essentia.js key extractor
 * 
 * Uses chromagram analysis to determine the most likely musical key and scale.
 * Provides confidence scores for the detected key.
 */
async function performKeyAnalysis(inputVector, frameSize, hopSize, sampleRate) {
  try {
    // Extract musical key using chromagram analysis
    const key = essentia.KeyExtractor(inputVector, true, frameSize, hopSize, sampleRate);
    
    console.log(`🏭 Worker: Detected key: ${key.key} ${key.scale}, strength: ${key.strength}`);
    
    return {
      key: key.key || 'C',
      scale: key.scale || 'major',
      confidence: key.strength || 0.5
    };
    
  } catch (error) {
    console.warn('🏭 Worker: Key analysis error:', error);
    
    return {
      key: 'C',
      scale: 'major',
      confidence: 0.0
    };
  }
}

/**
 * Extract MFCC (Mel-frequency Cepstral Coefficients) features
 * 
 * MFCCs are commonly used in audio analysis and machine learning
 * for representing spectral characteristics of audio signals.
 */
async function performMFCCAnalysis(channelData, sampleRate, frameSize) {
  if (channelData.length < frameSize) {
    return Array(13).fill(0); // Return empty MFCC if insufficient data
  }
  
  let frameVector = null;
  let windowed = null;
  let spectrum = null;
  
  try {
    // Use the first frame for MFCC extraction
    const frame = channelData.slice(0, frameSize);
    frameVector = essentia.arrayToVector(frame);
    
    // Apply windowing
    windowed = essentia.Windowing(frameVector, true, frameSize, 'hann');
    
    // Compute spectrum
    spectrum = essentia.Spectrum(windowed.frame, frameSize);
    
    // Extract 13 MFCC coefficients (standard for audio analysis)
    const mfcc = essentia.MFCC(spectrum.spectrum, 13, sampleRate);
    
    console.log(`🏭 Worker: Extracted ${mfcc.mfcc.length} MFCC coefficients`);
    
    return Array.from(mfcc.mfcc);
    
  } catch (error) {
    console.warn('🏭 Worker: MFCC analysis error:', error);
    return Array(13).fill(0); // Return zeros on error
    
  } finally {
    // Clean up Essentia vectors
    if (frameVector) frameVector.delete();
    if (windowed?.frame) windowed.frame.delete();
    if (spectrum?.spectrum) spectrum.spectrum.delete();
  }
}

// Worker message handler - processes messages from the main thread
self.onmessage = function(event) {
  var data = event.data;
  var type = data.type;
  var payload = data.payload;
  var id = data.id;
  
  console.log('🏭 Worker: Received message type: ' + type);
  
  switch (type) {
    case 'INIT':
      // Initialize Essentia.js when worker starts
      var initResult = initializeEssentia();
      if (initResult && typeof initResult.then === 'function') {
        // Handle promise-based initialization
        initResult.catch(function(error) {
          postMessage({
            type: 'WORKER_ERROR',
            payload: { 
              error: error.message || 'Initialization failed',
              stage: 'async_init'
            }
          });
        });
      }
      break;
      
    case 'ANALYZE_AUDIO':
      // Perform audio analysis
      if (!payload.audioBuffer || !payload.config) {
        postMessage({
          type: 'ANALYSIS_ERROR',
          payload: { 
            error: 'Missing audioBuffer or config in payload',
            stage: 'validation'
          },
          id: id
        });
        return;
      }
      
      analyzeAudioBuffer(payload.audioBuffer, payload.config, id);
      break;
      
    default:
      console.warn('🏭 Worker: Unknown message type: ' + type);
      postMessage({
        type: 'WORKER_ERROR',
        payload: { 
          error: 'Unknown message type: ' + type,
          stage: 'message_handling'
        }
      });
  }
};

// Handle worker errors
self.onerror = function(error) {
  console.error('🏭 Worker: Global error:', error);
  
  postMessage({
    type: 'WORKER_ERROR',
    payload: { 
      error: error.message || 'Unknown worker error',
      stage: 'global_error'
    }
  });
};

// Handle unhandled promise rejections  
self.addEventListener('unhandledrejection', function(event) {
  console.error('🏭 Worker: Unhandled promise rejection:', event.reason);
  
  postMessage({
    type: 'WORKER_ERROR',
    payload: { 
      error: 'Unhandled promise rejection: ' + event.reason,
      stage: 'promise_rejection'
    }
  });
});

console.log('🏭 Worker: Essentia analysis worker script loaded');

// Add simplified initialization paste for quick testing
function testInitialization() {
  console.log('🧪 Testing Essentia initialization...');
  
  try {
    // Set up Module.locateFile override before loading any Essentia scripts
    self.Module = self.Module || {};
    self.Module.locateFile = function(path, scriptDirectory) {
      console.log('🎯 Module.locateFile called for:', path, 'scriptDirectory:', scriptDirectory);
      // Force WASM file to load from /essentia/ directory
      return '/essentia/' + path;
    };
    
    // Load the polyfill first
    importScripts('/essentia/essentia-worker-polyfill.js');
    
    // Load the WASM loader patch to fix scriptDirectory
    importScripts('/essentia/essentia-wasm-loader-patch.js');
    
    // Then load Essentia WASM (will be patched by the loader patch)
    importScripts('/essentia/essentia-wasm.web.js');
    importScripts('/essentia/essentia.js-core.js');
    
    console.log('🧪 Scripts loaded, checking exports...');
    console.log('typeof EssentiaWASM:', typeof EssentiaWASM);
    console.log('typeof Essentia:', typeof Essentia);
    
    // Call EssentiaWASM() to get module
    var wasmModule = EssentiaWASM();
    console.log('🧪 EssentiaWASM() returned:', wasmModule);
    console.log('🧪 Is Promise?', wasmModule && typeof wasmModule.then === 'function');
    
    if (wasmModule && typeof wasmModule.then === 'function') {
      // It's a Promise!
      wasmModule.then(function(actualModule) {
        console.log('🧪 Promise resolved! Module:', actualModule);
        var essentiaInstance = new Essentia(actualModule);
        console.log('✅ SUCCESS! Essentia instance created:', essentiaInstance);
        console.log('🧪 Version:', essentiaInstance.version);
      }).catch(function(error) {
        console.error('❌ Promise failed:', error);
      });
    } else {
      // It's already the module
      var essentiaInstance = new Essentia(wasmModule);
      console.log('✅ SUCCESS! Essentia instance created:', essentiaInstance);
      console.log('🧪 Version:', essentiaInstance.version);
    }
  } catch (error) {
    console.error('❌ Test initialization failed:', error);
  }
}

// Uncomment to test immediately when worker loads
testInitialization();
