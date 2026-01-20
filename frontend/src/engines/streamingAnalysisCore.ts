import { getEssentiaInstance } from '../utils/essentiaInstance';
import type { AudioAnalysisResult } from '../types/audio';
import type { StreamingFeatureToggles } from './StreamingAnalysisEngine';

export interface StreamingChunkConfig {
  analysisFeatures: StreamingFeatureToggles;
  frameSize: number;
  hopSize: number;
}

export async function analyzeChunkData(
  audioData: Float32Array,
  sampleRate: number,
  config: StreamingChunkConfig
): Promise<Partial<AudioAnalysisResult>> {
  const ess = await getEssentiaInstance();
  const frameSize = Math.max(1, Math.floor(config.frameSize || 2048));
  const hopSize = Math.max(1, Math.floor(config.hopSize || 1024));
  const audioVectorFull = ess.arrayToVector(audioData);
  const featureFlags = {
    spectral: config.analysisFeatures.spectral !== false,
    tempo: config.analysisFeatures.tempo !== false,
    key: config.analysisFeatures.key !== false,
    mfcc: config.analysisFeatures.mfcc !== false,
    onset: config.analysisFeatures.onset !== false,
    segments: config.analysisFeatures.segments !== false,
    mlClassification: config.analysisFeatures.mlClassification !== false,
  };

  let spectralCentroidSum = 0;
  let spectralRolloffSum = 0;
  let spectralFluxSum = 0;
  let spectralBrightnessSum = 0;
  let zcrSum = 0;
  let frameCount = 0;

  const mfccAccum: number[] = [];
  let prevSpectrum: number[] | null = null;

  for (let start = 0; start + frameSize <= audioData.length; start += hopSize) {
    const frameSlice = audioData.subarray(start, start + frameSize);
    const frameVec = ess.arrayToVector(frameSlice);
    const windowed = ess.Windowing(frameVec).frame;
    const spectrum = ess.Spectrum(windowed).spectrum;

    if (featureFlags.spectral) {
      const centroid = ess.SpectralCentroidTime(frameVec, sampleRate).spectralCentroid;

      // Manual spectral calculations to avoid missing bindings
      const specArr = Array.from(spectrum as any as number[]);
      const totalEnergy = specArr.reduce((sum, v) => sum + v, 0);

      // Manual rolloff (85% energy)
      const threshold = totalEnergy * 0.85;
      let cumulative = 0;
      let rolloffBin = specArr.length - 1;
      for (let i = 0; i < specArr.length; i++) {
        cumulative += specArr[i];
        if (cumulative >= threshold) {
          rolloffBin = i;
          break;
        }
      }
      const rolloffFreq = (rolloffBin / specArr.length) * (sampleRate / 2);

      // Manual flux (sum of absolute differences from previous frame)
      let flux = 0;
      if (prevSpectrum) {
        for (let i = 0; i < Math.min(specArr.length, prevSpectrum.length); i++) {
          flux += Math.abs(specArr[i] - prevSpectrum[i]);
        }
      }
      prevSpectrum = specArr;

      // Manual brightness (ratio of high-frequency energy to total energy)
      const brightnessCutoff = 1500; // Hz
      const brightnessBin = Math.floor((brightnessCutoff / (sampleRate / 2)) * specArr.length);
      const highFreqEnergy = specArr.slice(brightnessBin).reduce((sum, v) => sum + v, 0);
      const brightness = totalEnergy > 0 ? highFreqEnergy / totalEnergy : 0;

      spectralCentroidSum += centroid;
      spectralRolloffSum += rolloffFreq;
      spectralFluxSum += flux;
      spectralBrightnessSum += brightness;

      const zcr = ess.ZeroCrossingRate(frameVec).zeroCrossingRate;
      zcrSum += zcr;
    }

    if (featureFlags.mfcc) {
      const mfcc = ess.MFCC(spectrum, 13, sampleRate).mfcc;
      mfcc.forEach((val: number, idx: number) => {
        mfccAccum[idx] = (mfccAccum[idx] || 0) + val;
      });
    }

    frameCount += 1;
  }

  const spectral =
    featureFlags.spectral && frameCount > 0
      ? {
          energy: { mean: spectralBrightnessSum / frameCount, std: 0 },
          centroid: { mean: spectralCentroidSum / frameCount, std: 0 },
          rolloff: { mean: spectralRolloffSum / frameCount, std: 0 },
          flux: { mean: spectralFluxSum / frameCount, std: 0 },
          brightness: { mean: spectralBrightnessSum / frameCount, std: 0 },
          zcr: { mean: zcrSum / frameCount, std: 0 },
          roughness: { mean: 0, std: 0 },
          spread: { mean: 0, std: 0 },
        }
      : undefined;

  const mfcc =
    featureFlags.mfcc && mfccAccum.length
      ? mfccAccum.map((val) => val / frameCount)
      : undefined;

  let tempo;
  if (featureFlags.tempo) {
    const tempoRes = ess.RhythmExtractor2013(audioVectorFull, {
      method: 'degara',
      maxTempo: 208,
      minTempo: 40,
    });
    tempo = {
      bpm: tempoRes.bpm,
      confidence: tempoRes.confidence,
      beats: tempoRes.beats,
      ticks: tempoRes.ticks,
    };
  }

  let key;
  if (featureFlags.key) {
    const keyRes = ess.KeyExtractor(audioVectorFull, true, frameSize, hopSize, sampleRate);
    key = {
      key: keyRes.key,
      scale: keyRes.scale,
      confidence: keyRes.strength,
    };
  }

  return {
    spectral,
    mfcc,
    tempo,
    key,
  };
}

export function mergeStreamingResults(results: Partial<AudioAnalysisResult>[]): Partial<AudioAnalysisResult> {
  if (!results.length) return {};

  const spectralResults = results.map((r) => r.spectral).filter(Boolean) as NonNullable<AudioAnalysisResult['spectral']>[];
  const mfccResults = results.map((r) => r.mfcc).filter(Boolean) as number[][];
  const tempoResults = results.map((r) => r.tempo).filter(Boolean) as NonNullable<AudioAnalysisResult['tempo']>[];
  const keyResults = results.map((r) => r.key).filter(Boolean) as NonNullable<AudioAnalysisResult['key']>[];

  const aggregated: Partial<AudioAnalysisResult> = {};

  if (spectralResults.length) {
    aggregated.spectral = {
      energy: {
        mean: spectralResults.reduce((sum, r) => sum + (r.energy?.mean || 0), 0) / spectralResults.length,
        std: 0,
      },
      centroid: {
        mean: spectralResults.reduce((sum, r) => sum + (r.centroid?.mean || 0), 0) / spectralResults.length,
        std: 0,
      },
      rolloff: {
        mean: spectralResults.reduce((sum, r) => sum + (r.rolloff?.mean || 0), 0) / spectralResults.length,
        std: 0,
      },
      flux: {
        mean: spectralResults.reduce((sum, r) => sum + (r.flux?.mean || 0), 0) / spectralResults.length,
        std: 0,
      },
      brightness: {
        mean: spectralResults.reduce((sum, r) => sum + (r.brightness?.mean || 0), 0) / spectralResults.length,
        std: 0,
      },
      zcr: {
        mean: spectralResults.reduce((sum, r) => sum + (r.zcr?.mean || 0), 0) / spectralResults.length,
        std: 0,
      },
      roughness: { mean: 0, std: 0 },
      spread: { mean: 0, std: 0 },
    };
  }

  if (mfccResults.length) {
    const length = mfccResults[0].length;
    aggregated.mfcc = Array.from({ length }, (_, idx) => {
      return mfccResults.reduce((sum, arr) => sum + (arr[idx] || 0), 0) / mfccResults.length;
    });
  }

  if (tempoResults.length) {
    aggregated.tempo = tempoResults.reduce((best, current) => {
      if (!best) return current;
      return (current.confidence ?? 0) > (best.confidence ?? 0) ? current : best;
    }, tempoResults[0]);
  }

  if (keyResults.length) {
    aggregated.key = keyResults.reduce((best, current) => {
      if (!best) return current;
      return (current.confidence ?? 0) > (best.confidence ?? 0) ? current : best;
    }, keyResults[0]);
  }

  return aggregated;
}
