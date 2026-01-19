# TypeScript Style Guide - Harmonix Pro Analyzer

## Core Principles
- **Strict Typing:** No `any`. All data shapes (audio buffers, spectral features, ML tensors) must be explicitly typed.
- **No Ambient Typings:** Do not rely on global `window` types for critical audio APIs. Define explicit interfaces for `AudioContext`, `Worklet`, and `Essentia` instances.

## The Golden Rule: Buffer Transfer Safety
**Explicitly distinguish between `ArrayBuffer` (Transferable) and `SharedArrayBuffer` (Shared) in type definitions. Never infer 'any' for buffer transfers.**

### Bad
```typescript
function sendToWorker(data: any) { ... } // ❌ implicit risk of copying huge buffers
```

### Good
```typescript
function sendToWorker(
  data: Float32Array, 
  bufferMode: 'transfer' | 'shared'
) {
  if (bufferMode === 'transfer') {
    // Explicitly validate transferable ownership
    postMessage({ data }, [data.buffer]); 
  }
}
```

## DSP & ML Data Shapes
- Define strict interfaces for Analysis Results (don't return generic JSON).
- Use `Float32Array` over `number[]` for all audio data to ensure performance and type safety.
