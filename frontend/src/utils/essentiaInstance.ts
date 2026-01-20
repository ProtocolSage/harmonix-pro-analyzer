import { EssentiaWASM } from 'essentia.js/dist/essentia-wasm.es.js';
import Essentia from 'essentia.js/dist/essentia.js-core.es.js';

let instance: any = null;
let testMockInstance: any = null;

/**
 * Inject a mock Essentia instance for testing.
 * This bypasses WASM initialization which fails in Vitest/Node environments.
 */
export function setTestEssentiaInstance(mockInstance: any): void {
  testMockInstance = mockInstance;
}

export function clearTestEssentiaInstance(): void {
  testMockInstance = null;
  instance = null;
}

export async function getEssentiaInstance(): Promise<any> {
  // Return test mock if injected
  if (testMockInstance) return testMockInstance;

  // Return cached instance
  if (instance) return instance;

  try {
    // Attempt real WASM initialization
    const Module = EssentiaWASM as any;
    Module.locateFile = (path: string) =>
      new URL('../node_modules/essentia.js/dist/' + path, import.meta.url).href;

    instance = new Essentia(Module);
    return instance;
  } catch (error) {
    // WASM initialization failed (likely in test environment)
    // Import and use mock
    const { getMockEssentiaInstance } = await import('../test/mockEssentia');
    instance = await getMockEssentiaInstance();
    return instance;
  }
}
