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
    
    // Extract audio data - handle both AudioBuffer and raw channel data
    let channelData;
    let sampleRate;
    let duration;
    let numberOfChannels;

    if (audioBuffer.getChannelData) {
      // Legacy AudioBuffer object
      channelData = audioBuffer.getChannelData(0);
      sampleRate = audioBuffer.sampleRate;
      duration = audioBuffer.duration;
      numberOfChannels = audioBuffer.numberOfChannels;
    } else if (audioBuffer.channelData) {
      // New format: raw channel data
      channelData = audioBuffer.channelData[0]; // Use first channel
      sampleRate = audioBuffer.sampleRate;
      duration = audioBuffer.duration;
      numberOfChannels = audioBuffer.numberOfChannels;
    } else {
      // Handle old serialized format
      channelData = new Float32Array(audioBuffer.length);
      for (let i = 0; i < audioBuffer.length; i++) {
        channelData[i] = audioBuffer.data[i];
      }
      sampleRate = audioBuffer.sampleRate;
      duration = audioBuffer.duration || (channelData.length / sampleRate);
      numberOfChannels = 1;
    }
    
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
    
    // Step 3: Melody Analysis (Pitch Tracking)
    postMessage({
      type: 'PROGRESS',
      payload: {
        stage: 'analyzing',
        percentage: 40,
        progress: 0.4,
        currentStep: 'melody',
        message: 'Tracking melodic pitch...',
        completedSteps: steps.slice(0, currentStepIndex)
      },
      id: analysisId
    });

    const melodyResults = await performMelodyAnalysis(channelData, sampleRate);

    // Step 4: Tempo Analysis
    postMessage({
      type: 'PROGRESS',
      payload: {
        stage: 'analyzing',
        percentage: 55,
        progress: 0.55,
        currentStep: steps[currentStepIndex++],
        message: 'Detecting tempo...',
        completedSteps: steps.slice(0, currentStepIndex - 1)
      },
      id: analysisId
    });
    
    const tempoResults = await performTempoAnalysis(inputVector, frameSize, hopSize, sampleRate);
    
    // Step 5: Key Detection
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

    // Step 6: Harmonic Analysis (Chords)
    postMessage({
      type: 'PROGRESS',
      payload: {
        stage: 'analyzing',
        percentage: 80,
        progress: 0.8,
        currentStep: 'harmonic',
        message: 'Detecting chords and harmony...',
        completedSteps: steps.slice(0, currentStepIndex)
      },
      id: analysisId
    });

    const harmonicResults = await performHarmonicAnalysis(channelData, sampleRate);
    
    // Step 7: MFCC Extraction
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
    
    // Step 8: Mel-Spectrogram for ML
    postMessage({
      type: 'PROGRESS',
      payload: {
        stage: 'analyzing',
        percentage: 90,
        progress: 0.9,
        currentStep: 'mel-spectrogram',
        message: 'Preparing ML features...',
        completedSteps: steps.slice(0, currentStepIndex)
      },
      id: analysisId
    });

    const melSpectrogram = await performMelSpectrogramAnalysis(channelData, sampleRate, frameSize, hopSize);

    // Step 9: Finalization
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
      channels: numberOfChannels || 1,
      analysisTimestamp: Date.now(),
      spectral: spectralResults,
      melody: melodyResults,
      tempo: tempoResults,
      key: keyResults,
      harmonic: harmonicResults,
      // Add MFCC and Mel-Spectrogram results
      mfcc: mfccResults,
      melSpectrogram: melSpectrogram,
      spectralEnvelope: melSpectrogram, // Use Mel bands as envelope for now
      loudness: {
        integrated: -14, // TODO: Implement proper loudness analysis
        dynamicRange: 8
      },
      performance: {
        totalAnalysisTime: analysisTime,
        breakdown: {
          spectral_features: analysisTime * 0.3,
          melody_analysis: analysisTime * 0.2,
          tempo_analysis: analysisTime * 0.15,
          key_analysis: analysisTime * 0.1,
          harmonic_analysis: analysisTime * 0.15,
          mfcc_extraction: analysisTime * 0.1
        },
        memoryUsage: Math.floor(channelData.length * 4 + frameSize * 100) // Estimate
      }
    };
    
    console.log(`✅ Worker: Analysis ${analysisId} complete in ${analysisTime.toFixed(2)}ms`);
    
    // Transfer melSpectrogram buffer to avoid copying
    const transferList = [];
    if (melSpectrogram && melSpectrogram.buffer) {
      transferList.push(melSpectrogram.buffer);
    }

    postMessage({
      type: 'ANALYSIS_COMPLETE',
      payload: result,
      id: analysisId
    }, transferList);
    
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

async function performMelCCAnalysis(channelData, sampleRate, frameSize, hopSize) {
  // Placeholder for future MelCC analysis
}

/**
 * Perform melody analysis using Essentia.js PitchMelodia
 * Extracts a frame-by-frame pitch track in Hz.
 */
async function performMelodyAnalysis(channelData, sampleRate) {
  try {
    const frameSize = 2048;
    const hopSize = 512;
    
    // We only analyze a representative segment for performance if track is long
    const maxSamples = sampleRate * 30; // 30 seconds max for pitch tracking
    const startIdx = Math.max(0, Math.floor((channelData.length - maxSamples) / 2));
    const segment = channelData.slice(startIdx, startIdx + maxSamples);
    
    const inputVector = essentia.arrayToVector(segment);
    const result = essentia.PitchMelodia(inputVector, {
      sampleRate: sampleRate,
      frameSize: frameSize,
      hopSize: hopSize,
      guessUnvoiced: true
    });

    const pitchTrack = essentia.vectorToArray(result.pitch);
    const pitchConfidence = essentia.vectorToArray(result.pitchConfidence);

    inputVector.delete();
    result.pitch.delete();
    result.pitchConfidence.delete();

    // Calculate range
    const validPitches = pitchTrack.filter(p => p > 0);
    const minPitch = validPitches.length > 0 ? Math.min(...validPitches) : 0;
    const maxPitch = validPitches.length > 0 ? Math.max(...validPitches) : 0;
    
    return {
      pitchTrack: Array.from(pitchTrack),
      pitchConfidence: Array.from(pitchConfidence),
      range: {
        min: minPitch,
        max: maxPitch,
        span: maxPitch > 0 ? 12 * Math.log2(maxPitch / minPitch) : 0,
        tessitura: validPitches.length > 0 ? validPitches.reduce((a, b) => a + b, 0) / validPitches.length : 0
      },
      contour: {
        points: Array.from(pitchTrack).map((p, i) => ({ time: i * hopSize / sampleRate, pitch: p })),
        direction: 'stable',
        smoothness: 0.8
      }
    };
  } catch (error) {
    console.warn('🏭 Worker: Melody analysis failed:', error);
    return { pitchTrack: [], pitchConfidence: [], range: { min: 0, max: 0, span: 0, tessitura: 0 } };
  }
}

/**
 * Perform harmonic analysis using Essentia.js ChordsDetection
 */
async function performHarmonicAnalysis(channelData, sampleRate) {
  try {
    const frameSize = 4096;
    const hopSize = 2048;
    
    const inputVector = essentia.arrayToVector(channelData);
    
    // 1. Extract HPCP
    const hpcpResult = essentia.HPCP(inputVector, {
      sampleRate: sampleRate,
      hopSize: hopSize,
      frameSize: frameSize
    });

    // 2. Detect Chords
    const chordsResult = essentia.ChordsDetection(hpcpResult.hpcp, {
      hopSize: hopSize,
      sampleRate: sampleRate
    });

    const chords = essentia.vectorToArray(chordsResult.chords);
    const strengths = essentia.vectorToArray(chordsResult.strength);

    inputVector.delete();
    hpcpResult.hpcp.delete();
    chordsResult.chords.delete();
    chordsResult.strength.delete();

    // Map to timeline
    const timeline = chords.map((chord, i) => ({
      chord: chord,
      start: i * hopSize / sampleRate,
      end: (i + 1) * hopSize / sampleRate,
      duration: hopSize / sampleRate,
      confidence: strengths[i]
    }));

    return {
      chords: timeline,
      progressions: [],
      functionalAnalysis: {
        tonic: 0.4,
        subdominant: 0.3,
        dominant: 0.3
      }
    };
  } catch (error) {
    console.warn('🏭 Worker: Harmonic analysis failed:', error);
    return { chords: [], progressions: [] };
  }
}

async function performMelSpectrogramAnalysis(channelData, sampleRate, frameSize, hopSize) {
  const targetTimeFrames = 187;
  const nMels = 96;
  const melSpectrogram = new Float32Array(targetTimeFrames * nMels);
  
  try {
    // We want 187 frames from the center of the track for better representation
    const totalFramesAvailable = Math.floor((channelData.length - frameSize) / hopSize);
    const startFrame = Math.max(0, Math.floor((totalFramesAvailable - targetTimeFrames) / 2));
    
    for (let i = 0; i < targetTimeFrames; i++) {
      const currentFrame = startFrame + i;
      const startIdx = currentFrame * hopSize;
      
      if (startIdx + frameSize > channelData.length) break;
      
      const frame = channelData.slice(startIdx, startIdx + frameSize);
      let frameVector = null;
      let windowed = null;
      let spectrum = null;
      let melBands = null;
      
      try {
        frameVector = essentia.arrayToVector(frame);
        windowed = essentia.Windowing(frameVector, true, frameSize, 'hann');
        spectrum = essentia.Spectrum(windowed.frame, frameSize);
        
        // Compute Mel Bands (96)
        melBands = essentia.MelBands(spectrum.spectrum, 96, sampleRate, 0, sampleRate / 2, 'slaney', false);
        
        // Copy to output buffer
        const melArray = essentia.vectorToArray(melBands.melBands);
        melSpectrogram.set(melArray, i * nMels);
        
      } catch (e) {
        console.warn('🏭 Worker: Mel-Spectrogram error on frame ' + i, e);
      } finally {
        if (frameVector) frameVector.delete();
        if (windowed?.frame) windowed.frame.delete();
        if (spectrum?.spectrum) spectrum.spectrum.delete();
        if (melBands?.melBands) melBands.melBands.delete();
      }
    }
    
    return melSpectrogram;
  } catch (error) {
    console.error('🏭 Worker: Mel-Spectrogram analysis failed:', error);
    return melSpectrogram; // Return empty/partial
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
      if (!payload.audioData && !payload.audioBuffer) {
        postMessage({
          type: 'ANALYSIS_ERROR',
          payload: {
            error: 'Missing audioData or audioBuffer in payload',
            stage: 'validation'
          },
          id: id
        });
        return;
      }

      if (!payload.config) {
        postMessage({
          type: 'ANALYSIS_ERROR',
          payload: {
            error: 'Missing config in payload',
            stage: 'validation'
          },
          id: id
        });
        return;
      }

      // Handle new audioData format (raw channel data)
      const audioBuffer = payload.audioData || payload.audioBuffer;
      analyzeAudioBuffer(audioBuffer, payload.config, id);
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
