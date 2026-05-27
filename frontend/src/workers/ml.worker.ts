import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-wasm';
import { 
  MLWorkerOutboundMessage, 
  MLWorkerInboundMessage,
  MLPredictPayload,
  MLPrediction
} from './mlWorkerProtocol';

let model: tf.GraphModel | null = null;
let labels: string[] = [];
let isWarmingUp = false;
let currentBackend: string = 'unknown';
let currentModelName: string = 'msd-musicnn-1';

// Send message wrapper to ensure type safety
function postReply(message: MLWorkerInboundMessage) {
  self.postMessage(message);
}

// Initialize TensorFlow.js backend with fallback chain
// Favors WASM > WebGL > CPU
async function initBackend(preferredBackend: 'wasm' | 'webgl' | 'cpu' = 'wasm') {
  const backends = [preferredBackend, 'webgl', 'wasm', 'cpu'];
  // Remove duplicates
  const uniqueBackends = [...new Set(backends)];

  for (const backend of uniqueBackends) {
    try {
      console.log(`📡 ML Worker: Attempting to set backend to ${backend}...`);
      
      if (backend === 'wasm') {
        import('@tensorflow/tfjs-backend-wasm').then(wasm => wasm.setWasmPaths('/assets/tfjs-backend-wasm/'));
      }

      await tf.setBackend(backend);
      await tf.ready();
      
      if (backend === 'webgl') {
        // Test WebGL context
        const gl = (tf.backend() as any).getGPGPUContext?.().gl;
        if (gl) {
          gl.canvas.addEventListener('webglcontextlost', () => {
            console.warn('⚠️ ML Worker: WebGL context lost!');
            handleContextLoss();
          }, { once: true });
        }
      }
      
      currentBackend = backend;
      console.log(`✅ ML Worker: Using ${backend} backend`);
      
      postReply({
        type: 'WORKER_READY',
        payload: { backend: currentBackend, version: tf.version.tfjs }
      });
      return;
    } catch (e) {
      console.warn(`⚠️ ML Worker: Backend ${backend} failed:`, e);
    }
  }
  
  postReply({ 
    type: 'WORKER_ERROR', 
    payload: { error: 'All backends failed to initialize' } 
  });
}

function handleContextLoss() {
  postReply({ 
    type: 'WORKER_ERROR', 
    payload: { error: 'WebGL context lost' } 
  });
}

// Model loading and warm-up
async function warmUp(config?: { modelUrl?: string; labelsUrl?: string; modelName?: string; }) {
  if (isWarmingUp || model) return;
  isWarmingUp = true;

  try {
    const modelUrl = config?.modelUrl || '/models/musicnn/model.json';
    const labelsUrl = config?.labelsUrl || '/models/musicnn/msd-vgg-1.json';
    const modelName = config?.modelName || 'msd-musicnn-1';
    currentModelName = modelName;

    postReply({ 
      type: 'MODEL_STATUS', 
      payload: { modelName, loaded: false, progress: 0.1 }
    });

    // Load labels
    const labelsResponse = await fetch(labelsUrl);
    const labelsData = await labelsResponse.json();
    labels = labelsData.classes || [];

    postReply({ 
      type: 'MODEL_STATUS', 
      payload: { modelName, loaded: false, progress: 0.5 }
    });

    // Load model
    model = await tf.loadGraphModel(modelUrl);
    
    // Warm up the model with a dummy tensor
    const dummyInput = tf.zeros([1, 187, 96, 1]);
    model.predict(dummyInput);
    dummyInput.dispose();

    postReply({ 
      type: 'MODEL_STATUS', 
      payload: { modelName, loaded: true, progress: 1.0 }
    });

  } catch (error) {
    console.error('❌ ML Worker: Warm-up failed:', error);
    postReply({ 
      type: 'WORKER_ERROR', 
      payload: { error: error instanceof Error ? error.message : 'Unknown warm-up error' } 
    });
  } finally {
    isWarmingUp = false;
  }
}

// Prediction logic
async function predict(payload: MLPredictPayload) {
  const { audioId, melSpectrogram } = payload;

  if (!model) {
    postReply({ 
      type: 'PREDICTION_ERROR', 
      payload: { audioId, error: 'Model not loaded' } 
    });
    return;
  }

  const startTime = performance.now();
  try {
    const predictions = tf.tidy(() => {
      // Shape check: flattened 187*96 = 17952. 
      // The input melSpectrogram should match this.
      // TODO: Add resizing/padding logic if needed to match model input shape [1, 187, 96, 1]
      
      const tensor = tf.tensor4d(melSpectrogram, [1, 187, 96, 1]);
      const output = model!.predict(tensor) as tf.Tensor;
      return output.dataSync();
    });

    const results: MLPrediction[] = Array.from(predictions)
      .map((prob, idx) => ({
        label: labels[idx] || `Unknown-${idx}`,
        confidence: prob
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .filter(p => p.confidence > 0.1)
      .slice(0, 5); // Top 5

    const processingTime = performance.now() - startTime;
    
    postReply({ 
      type: 'PREDICTION_RESULT', 
      payload: {
        audioId,
        predictions: results,
        modelName: currentModelName,
        processingTime
      }
    });

  } catch (error) {
    console.error('❌ ML Worker: Prediction failed:', error);
    postReply({ 
      type: 'PREDICTION_ERROR', 
      payload: { audioId, error: error instanceof Error ? error.message : 'Unknown prediction error' } 
    });
  }
}

// Lifecycle management
self.onmessage = async (e: MessageEvent<MLWorkerOutboundMessage>) => {
  const { type } = e.data;

  switch (type) {
    case 'INIT':
      await initBackend((e.data as Extract<MLWorkerOutboundMessage, { type: 'INIT' }>).payload.backend);
      break;
    case 'WARMUP':
      await warmUp((e.data as Extract<MLWorkerOutboundMessage, { type: 'WARMUP' }>).payload);
      break;
    case 'PREDICT':
      await predict(e.data.payload);
      break;
  }
};