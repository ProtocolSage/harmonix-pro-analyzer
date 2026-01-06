// Test Essentia.js loading
import Essentia from 'essentia.js/dist/essentia.js-core.es.js';
import EssentiaWASM from 'essentia.js/dist/essentia-wasm.es.js';

async function testEssentia() {
  console.log('Testing Essentia.js loading...');
  
  try {
    // Create Essentia instance
    const essentia = new Essentia(EssentiaWASM);
    
    // Wait for WASM to initialize
    if (essentia.module && essentia.module.calledRun === false) {
      await new Promise((resolve) => {
        essentia.module.onRuntimeInitialized = resolve;
      });
    }
    
    console.log('✅ Essentia.js loaded successfully!');
    console.log('Version:', essentia.version);
    console.log('Available algorithms:', essentia.algorithmNames.length);
    
    // Test basic functionality
    const testArray = new Float32Array([0, 0.1, 0.2, 0.3, 0.4, 0.5]);
    const vector = essentia.arrayToVector(testArray);
    console.log('✅ Vector conversion working');
    
    // Clean up
    vector.delete();
    
    console.log('All tests passed!');
  } catch (error) {
    console.error('❌ Error loading Essentia.js:', error);
  }
}

testEssentia();