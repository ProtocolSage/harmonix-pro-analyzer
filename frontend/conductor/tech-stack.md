# Technology Stack

## Frontend Core
- **Framework:** React 18 (TypeScript) - *Strict usage constraints apply (see Performance Strategy).*
- **Build Tool:** Vite
- **Language:** TypeScript (Strict Mode, No `any`).

## Audio & DSP Engine
- **Core Analysis:** Essentia.js (WASM) running in Web Workers.
- **Machine Learning:** TensorFlow.js (WASM backend favored).
- **Transport:** Custom `AudioBufferSourceNode` manager with `SharedArrayBuffer` sync bridge.
- **Audio Context:** Native Web Audio API.

## Visualization & UI
- **Rendering:** Multi-threaded pipeline using OffscreenCanvas and dedicated Visualization Worker.
- **Persistent Artifacts:** Tiled spectrogram architecture backed by IndexedDB caching and dual-trigger batch writes for cache-first rehydration.
- **Styling:** Tailwind CSS with custom Glassmorphic/DAW theme.
- **Data Bridge:** VisualizerBridge for zero-copy Transferable data flow from DSP workers to the rendering thread.
- **Lighting Model:** "Reactive Atmosphere" engine using CSS Custom Properties to modulate glow, flicker, and color palette based on ML confidence.
- **Icons:** Lucide React.

## Performance & Concurrency Strategy (CRITICAL)
### 1. The "No-React" Hot Path
- **Rule:** React State must NEVER drive the audio playhead or high-frequency meters.
- **Implementation:** Use `requestAnimationFrame` + `useRef` to manipulate DOM/Canvas directly.
- **Budget:** Main thread tasks must be <3ms. Inference completes in <1.5s (mid-tier) / <800ms (high-end).
- **Seek Strategy:** Hybrid path - immediate UI playhead update (light) vs throttled worker reset (heavy).
- **Visual Opt-Up:** Performance-aware visual manager enabling advanced effects only when system resources permit (>10ms idle).

### 2. Threading & Offloading
- **DSP/ML:** STRICTLY confined to dedicated Web Workers (`EssentiaWorker`, `MLWorker`).
- **Visuals:** Use `OffscreenCanvas` where supported.
- **Event Proxying:** Main thread captures DOM events (clicks/hovers) and messages coordinates to workers; workers never touch DOM.
- **ML Backend:** WebGL (with 1 retry on context loss) -> WASM -> CPU fallback chain.

### 3. Concurrency & Data Flow
- **Data Transfer:** Use Transferable objects (ArrayBuffers) for zero-copy communication.
- **A/B State Management:** ComparisonContext serves as the single source of truth for Source/Reference data, preventing circular dependencies and ensuring state integrity during swaps.
- **Backpressure:** Single in-flight inference; queue depth = 1 (drop oldest). Match results by ID to ignore stale responses.
- **Payload Guard:** Enforce 5MB limit on transferable data; implement frame decimation if oversized to preserve bandwidth.
- **React Scheduling:** Use `startTransition` only for low-priority UI (e.g., sidebar metadata), NOT for playback sync.

### 4. Async Discipline
- **Microtask Management:** Avoid long promise chains. Yield to main thread using `await new Promise(requestAnimationFrame)`.
- **Timeouts:** All async DSP operations must be time-boxed with abort controllers.
