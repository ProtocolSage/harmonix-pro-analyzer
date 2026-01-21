/**
 * Spectrogram Analysis Worker
 * 
 * Computes full-track tiled spectrograms using Essentia.js (WASM).
 * Implements Platinum Status: Uint8 quantization, guard bands, and zero-copy transfer.
 */

// Global variables for Essentia.js (classic worker style)
var essentia = null;
var isInitialized = false;

function initializeEssentia() {
  try {
    self.Module = self.Module || {};
    self.Module.locateFile = function(path) {
      return '/essentia/' + path;
    };
    
    importScripts('/essentia/essentia-worker-polyfill.js');
    importScripts('/essentia/essentia-wasm-loader-patch.js');
    importScripts('/essentia/essentia-wasm.web.js');
    importScripts('/essentia/essentia.js-core.js');
    
    let wasmModule = EssentiaWASM();
    if (wasmModule && typeof wasmModule.then === 'function') {
      wasmModule.then(function(resolvedModule) {
        essentia = new Essentia(resolvedModule);
        if (essentia.module && essentia.module.calledRun === false) {
          essentia.module.onRuntimeInitialized = function() {
            completeInitialization();
          };
        } else {
          completeInitialization();
        }
      });
    } else {
      essentia = new Essentia(wasmModule);
      completeInitialization();
    }
  } catch (error) {
    postMessage({ type: 'ERROR', payload: { error: error.message } });
  }
}

function completeInitialization() {
  isInitialized = true;
  postMessage({ type: 'READY' });
}

/**
 * Normalizes and quantizes Float32 magnitude to Uint8 (0-255).
 * Uses dB scaling: clamp([-100, 0]) -> [0, 255]
 */
function quantize(val, dbMin, dbMax) {
  // val is magnitude. Convert to dB first.
  let db = 20 * Math.log10(Math.max(val, 1e-10));
  let norm = (db - dbMin) / (dbMax - dbMin);
  return Math.max(0, Math.min(255, Math.floor(norm * 255)));
}

async function computeTile(channelData, sampleRate, startSec, durationSec, config, trackId, fingerprint) {
  const { windowSize, hopSize, freqBins, dbMin, dbMax, schemaVersion } = config;
  
  const startSample = Math.floor(startSec * sampleRate);
  const lengthSamples = Math.floor(durationSec * sampleRate);
  const endSample = startSample + lengthSamples;
  
  // Slice segment (including guard bands)
  const segment = channelData.slice(
    Math.max(0, startSample), 
    Math.min(channelData.length, endSample)
  );
  
  const vector = essentia.arrayToVector(segment);
  const frames = essentia.FrameGenerator(vector, windowSize, hopSize);
  
  const numFramesAvailable = frames.size();
  const tileData = new Uint8Array(numFramesAvailable * freqBins);
  
  for (let i = 0; i < numFramesAvailable; i++) {
    const frame = frames.get(i);
    const windowed = essentia.Windowing(frame, true, windowSize, 'hann');
    const spectrum = essentia.Spectrum(windowed.frame, windowSize);
    
    // We only take freqBins (usually 1024)
    for (let j = 0; j < freqBins; j++) {
      const mag = spectrum.spectrum.get(j);
      tileData[i * freqBins + j] = quantize(mag, dbMin, dbMax);
    }
    
    // Cleanup frame-specific vectors
    windowed.frame.delete();
    spectrum.spectrum.delete();
  }
  
  // Cleanup segment vectors
  vector.delete();
  // Note: FrameGenerator usually doesn't need explicit delete if we delete the source vector? 
  // Actually Essentia FrameGenerator might need it.
  
  const tileIndex = Math.round(startSec / 30); // 30s visible tiles
  
  const payload = {
    trackId,
    type: 'spectrogram_tile',
    key: 't:' + tileIndex,
    schemaVersion,
    audioFingerprint: fingerprint,
    updatedAt: Date.now(),
    codec: 'raw',
    data: tileData.buffer, // Transferable
    meta: {
      fftSize: windowSize,
      hopSize,
      sampleRate,
      windowFunction: 'hann',
      freqBins,
      timeFrames: numFramesAvailable,
      dbMin,
      dbMax,
      gamma: 1.0,
      tileStartSec: startSec,
      tileDurationSec: durationSec
    }
  };
  
  postMessage({ type: 'TILE_COMPLETE', payload }, [tileData.buffer]);
}

self.onmessage = function(e) {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'INIT':
      initializeEssentia();
      break;
    case 'COMPUTE_TILE':
      if (!isInitialized) return;
      const { channelData, sampleRate, startSec, durationSec, config, trackId, fingerprint } = payload;
      computeTile(channelData, sampleRate, startSec, durationSec, config, trackId, fingerprint);
      break;
  }
};

initializeEssentia();
