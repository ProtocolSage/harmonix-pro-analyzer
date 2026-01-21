# Memory Management Guide

## Critical: Essentia.js Vector Cleanup

### Problem

Essentia.js uses C++ vectors (via WebAssembly) that are **NOT** automatically garbage collected by JavaScript. Failure to manually free vectors causes memory leaks that accumulate with each analysis.

### Memory Leak Impact

**For a typical 5-minute audio file analysis:**
- Frame vector: 2048 samples × 4 bytes = 8KB per frame
- Windowed vector: 2048 samples × 4 bytes = 8KB per frame
- Spectrum vector: 1024 samples × 4 bytes = 4KB per frame
- **Total per iteration**: ~20KB
- **100 iterations**: 2MB leaked per analysis
- **10 analyses without cleanup**: 20MB+ leaked
- **Result**: Browser tab crashes, performance degradation

### Detection

**Symptoms of memory leak:**
- Browser memory usage grows with each analysis
- Performance degrades over time (slower subsequent analyses)
- Eventually: "Out of memory" errors or tab crashes
- Memory usage doesn't decrease after analysis completes

**Check memory usage in Chrome DevTools:**
```javascript
// Browser console
console.log((performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2), 'MB');

// Monitor over multiple analyses
for (let i = 0; i < 10; i++) {
  await analyzeFile(testFile);
  console.log(`Analysis ${i+1}:`, (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2), 'MB');
}
```

### Solution Pattern

**Rule:** Every Essentia.js vector MUST be `.delete()`'d

#### ❌ MEMORY LEAK - Vector not freed
```typescript
for (let i = 0; i < frames.length; i++) {
  const frameVector = this.essentia.arrayToVector(frame);
  const windowed = this.essentia.Windowing(frameVector, true, 4096, "hann");
  const spectrum = this.essentia.Spectrum(windowed, 4096);

  // Process spectrum...
  const centroid = this.essentia.SpectralCentroid(spectrum);

  // If exception thrown here, vectors leaked!
  frameVector.delete();
  windowed.delete();
  spectrum.delete();
}
```

#### ✅ CORRECT - Vectors explicitly freed in finally block
```typescript
for (let i = 0; i < frames.length; i++) {
  let frameVector = null;
  let windowed = null;
  let spectrum = null;

  try {
    frameVector = this.essentia.arrayToVector(frame);
    windowed = this.essentia.Windowing(frameVector, true, 4096, "hann");
    spectrum = this.essentia.Spectrum(windowed, 4096);

    // Process spectrum...
    const centroid = this.essentia.SpectralCentroid(spectrum);

    // Use results...
  } finally {
    // CRITICAL: Guaranteed cleanup even if exception occurs
    frameVector?.delete();
    windowed?.delete();
    spectrum?.delete();
  }
}
```

### Cleanup Checklist

For every Essentia.js algorithm call, verify:

1. ✅ Does this return a vector? → YES → Must call `.delete()`
2. ✅ Is the vector used in try/catch? → YES → Use `finally` block for cleanup
3. ✅ Are there early returns? → YES → Delete vectors before every return
4. ✅ Are vectors passed to other functions? → YES → Document ownership transfer
5. ✅ Is cleanup order correct? → YES → Delete in reverse order of creation

### Common Algorithms That Return Vectors

**Must cleanup (return vectors):**
- `arrayToVector()` → Returns vector (always cleanup)
- `Windowing()` → Returns `{frame: vector}` (cleanup frame property)
- `Spectrum()` → Returns `{spectrum: vector}` (cleanup spectrum property)
- `SpectralPeaks()` → Returns `{frequencies: vector, magnitudes: vector}` (cleanup both)
- `HPCP()` → Returns vector
- `MelBands()` → Returns vector
- `MFCC()` → Returns vector
- `HighPass()` / `LowPass()` → Returns filtered vector
- `FrameGenerator()` → Returns array of vectors (cleanup each)

**Don't need cleanup (return primitive values):**
- `SpectralCentroid()` → Returns number
- `SpectralRolloff()` → Returns number
- `Energy()` → Returns number
- `ZeroCrossingRate()` → Returns number
- `Key()` → Returns object with strings/numbers
- `BpmHistogram()` → Returns object with primitives

### Recommended Patterns

#### Pattern 1: Try-Finally Block
```typescript
function analyzeSpectrum(audioData: Float32Array): SpectralFeatures {
  let windowed = null;
  let spectrum = null;
  let peaks = null;

  try {
    windowed = this.essentia.Windowing(audioData, true, 4096, "hann");
    spectrum = this.essentia.Spectrum(windowed.frame, 4096);
    peaks = this.essentia.SpectralPeaks(spectrum.spectrum);

    const centroid = this.essentia.SpectralCentroid(spectrum.spectrum, sampleRate);
    const rolloff = this.essentia.SpectralRolloff(spectrum.spectrum, 0.85, sampleRate);

    return {
      centroid,
      rolloff,
      peakFrequencies: Array.from(peaks.frequencies),
      peakMagnitudes: Array.from(peaks.magnitudes),
    };

  } finally {
    // Cleanup in reverse order of creation
    peaks?.magnitudes?.delete();
    peaks?.frequencies?.delete();
    spectrum?.spectrum?.delete();
    windowed?.frame?.delete();
  }
}
```

#### Pattern 2: Immediate Cleanup After Use
```typescript
function extractFeatures(frames: Float32Array[]): Features {
  const features = [];

  for (const frame of frames) {
    const vector = this.essentia.arrayToVector(frame);
    const energy = this.essentia.Energy(vector);
    vector.delete(); // ✅ Delete immediately after use

    features.push(energy);
  }

  return features;
}
```

#### Pattern 3: Helper Cleanup Functions
```typescript
class EssentiaAnalyzer {
  private cleanupVectors(...vectors: any[]): void {
    for (const vec of vectors) {
      if (vec && typeof vec.delete === 'function') {
        vec.delete();
      }
      // Handle objects with nested vectors
      if (vec && typeof vec === 'object') {
        for (const key of Object.keys(vec)) {
          if (vec[key] && typeof vec[key].delete === 'function') {
            vec[key].delete();
          }
        }
      }
    }
  }

  analyze(audioBuffer: AudioBuffer): AnalysisResult {
    let vec1 = null, vec2 = null, vec3 = null;

    try {
      vec1 = this.essentia.arrayToVector(audioBuffer.getChannelData(0));
      vec2 = this.essentia.Windowing(vec1, true, 4096, "hann");
      vec3 = this.essentia.Spectrum(vec2.frame, 4096);

      // ... analysis logic

    } finally {
      this.cleanupVectors(vec1, vec2, vec3);
    }
  }
}
```

### Testing for Leaks

#### Manual Test
```javascript
// Run this in browser console
const engine = new RealEssentiaAudioEngine();
await engine.waitUntilReady();

// Load test audio
const response = await fetch('/test-audio.mp3');
const arrayBuffer = await response.arrayBuffer();
const audioContext = new AudioContext();
const testBuffer = await audioContext.decodeAudioData(arrayBuffer);

// Monitor memory over multiple analyses
console.log('Starting memory leak test...');
for (let i = 0; i < 100; i++) {
  await engine.analyze(testBuffer);
  const memMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
  console.log(`Analysis ${i+1}: ${memMB} MB`);

  // Memory should stay relatively stable (±10MB variance)
  // If it grows continuously → memory leak detected!
}
```

#### Automated Test (Vitest)
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { RealEssentiaAudioEngine } from '../engines/RealEssentiaAudioEngine';
import { createTestAudioBuffer } from './test-utils';

describe('Memory Leak Detection', () => {
  let engine: RealEssentiaAudioEngine;

  beforeEach(async () => {
    engine = new RealEssentiaAudioEngine();
    await engine.waitUntilReady();
  });

  it('should not leak memory after 100 analyses', async () => {
    const testBuffer = createTestAudioBuffer();
    const initialMemory = performance.memory.usedJSHeapSize;

    // Run 100 analyses
    for (let i = 0; i < 100; i++) {
      await engine.analyze(testBuffer);
    }

    // Force garbage collection (if available)
    if (global.gc) {
      global.gc();
    }

    const finalMemory = performance.memory.usedJSHeapSize;
    const growthMB = (finalMemory - initialMemory) / 1024 / 1024;

    // Memory growth should be < 50MB for 100 analyses
    expect(growthMB).toBeLessThan(50);
  }, 60000); // 60s timeout
});
```

### Current Status in Codebase

**Files with WASM Memory Management:**

✅ **RealEssentiaAudioEngine.ts** (lines 671-677)
- Has cleanup in finally block for main analysis
- **Gap**: Loop iterations (lines 694-806) don't have per-iteration cleanup
- **Risk**: HIGH - 100 iterations without cleanup = 2MB potential leak

⚠️ **StreamingAnalysisEngine.ts**
- Chunk processing cleanup not verified
- **Risk**: MEDIUM - Large files with many chunks

⚠️ **Workers** (essentia-analysis-worker.js, streaming-analysis-worker.ts)
- Worker message handlers don't have explicit cleanup
- **Risk**: MEDIUM - Workers are long-lived

### Action Items

**Priority 1: Fix RealEssentiaAudioEngine loop cleanup (CRITICAL)**
```typescript
// Location: RealEssentiaAudioEngine.ts lines 694-806
for (let i = 0; i < frames.length && i < 100; i++) {
  let frameVector = null;
  let windowed = null;
  let spectrum = null;

  try {
    // ... existing analysis code
  } finally {
    frameVector?.delete();
    windowed?.frame?.delete();
    if (spectrum && spectrum !== previousSpectrum) {
      spectrum.spectrum?.delete();
    }
  }
}
```

**Priority 2: Add memory monitoring to production**
```typescript
// Add to PerformanceMonitor.ts
export class MemoryLeakDetector {
  private baseline: number = 0;
  private samples: number[] = [];

  recordBaseline(): void {
    this.baseline = performance.memory.usedJSHeapSize;
  }

  checkForLeak(): boolean {
    const current = performance.memory.usedJSHeapSize;
    const growthMB = (current - this.baseline) / 1024 / 1024;

    this.samples.push(growthMB);

    // If memory consistently grows > 100MB, likely leak
    if (this.samples.length >= 5) {
      const avgGrowth = this.samples.slice(-5).reduce((a, b) => a + b) / 5;
      return avgGrowth > 100;
    }

    return false;
  }
}
```

**Priority 3: Add automated leak detection tests**
- Create test suite as shown above
- Run in CI/CD pipeline
- Fail build if memory growth exceeds threshold

### Best Practices Summary

1. ✅ **Always use try-finally** for vector cleanup
2. ✅ **Clean up in reverse order** of creation
3. ✅ **Test for leaks** during development
4. ✅ **Monitor memory** in production
5. ✅ **Document ownership** when passing vectors
6. ✅ **Use helper functions** for cleanup boilerplate
7. ✅ **Verify cleanup** in code reviews

### Resources

- Emscripten Memory Management: https://emscripten.org/docs/porting/emscripten-runtime-environment.html#manual-memory-management
- Essentia.js Documentation: https://mtg.github.io/essentia.js/
- Chrome DevTools Memory Profiler: https://developer.chrome.com/docs/devtools/memory-problems/

---

**Last Updated**: 2026-01-07
**Review Schedule**: Monthly
**Owner**: Frontend Team
