import { analyzeChunkData } from '../engines/streamingAnalysisCore';
import type { StreamingFeatureToggles } from '../engines/StreamingAnalysisEngine';

interface AnalyzeChunkMessage {
  type: 'ANALYZE_CHUNK';
  payload: {
    audioData: Float32Array;
    sampleRate: number;
    chunkIndex: number;
    totalChunks: number;
    analysisFeatures: StreamingFeatureToggles;
    frameSize: number;
    hopSize: number;
  };
  id: string;
}

interface ResetMessage {
  type: 'RESET';
}

type WorkerMessage = AnalyzeChunkMessage | ResetMessage;

const chunkResults = new Map<number, any>();

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type } = event.data;

  switch (type) {
    case 'ANALYZE_CHUNK': {
      const { audioData, sampleRate, chunkIndex, totalChunks, analysisFeatures, frameSize, hopSize } =
        event.data.payload;

      try {
        const partialResult = await analyzeChunkData(audioData, sampleRate, {
          analysisFeatures,
          frameSize,
          hopSize,
        });

        chunkResults.set(chunkIndex, partialResult);

        const aggregated = aggregateResults(chunkResults);

        self.postMessage({
          type: 'CHUNK_COMPLETE',
          payload: {
            chunkIndex,
            totalChunks,
            partialResult,
            aggregatedResult: aggregated,
            isComplete: chunkResults.size === totalChunks,
            processingTime: 0,
          },
          id: event.data.id,
        });
      } catch (error: any) {
        self.postMessage({
          type: 'ERROR',
          payload: { error: error?.message || 'Chunk analysis failed', chunkIndex },
          id: event.data.id,
        });
      }
      break;
    }

    case 'RESET':
      chunkResults.clear();
      break;
  }
};

function aggregateResults(results: Map<number, any>) {
  const ordered = Array.from(results.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => value);

  const spectral = aggregateSpectral(ordered);
  const mfcc = aggregateMfcc(ordered);
  const tempo = pickBest(ordered.map((r) => r.tempo).filter(Boolean));
  const key = pickBest(ordered.map((r) => r.key).filter(Boolean));

  return {
    spectral,
    mfcc,
    tempo,
    key,
  };
}

function aggregateSpectral(results: any[]) {
  const spectralResults = results.map((r) => r.spectral).filter(Boolean);
  if (!spectralResults.length) return undefined;

  const len = spectralResults.length;
  return {
    centroid: { mean: spectralResults.reduce((sum: number, r: any) => sum + (r.centroid?.mean || 0), 0) / len },
    rolloff: { mean: spectralResults.reduce((sum: number, r: any) => sum + (r.rolloff?.mean || 0), 0) / len },
    flux: { mean: spectralResults.reduce((sum: number, r: any) => sum + (r.flux?.mean || 0), 0) / len },
    brightness: { mean: spectralResults.reduce((sum: number, r: any) => sum + (r.brightness?.mean || 0), 0) / len },
    zcr: { mean: spectralResults.reduce((sum: number, r: any) => sum + (r.zcr?.mean || 0), 0) / len },
  };
}

function aggregateMfcc(results: any[]) {
  const mfccResults = results.map((r) => r.mfcc).filter(Boolean);
  if (!mfccResults.length) return undefined;
  const length = mfccResults[0].length;
  return Array.from({ length }, (_, idx) => {
    return mfccResults.reduce((sum: number, arr: number[]) => sum + (arr[idx] || 0), 0) / mfccResults.length;
  });
}

function pickBest<T extends { confidence?: number }>(items: T[]) {
  if (!items.length) return undefined;
  return items.reduce((best, current) => {
    if (!best) return current;
    return (current.confidence ?? 0) > (best.confidence ?? 0) ? current : best;
  }, items[0]);
}
