# Technology Stack

## Frontend Core
- **Framework:** React 18 (TypeScript) - *Strict usage constraints apply (see Performance Strategy).*
- **Build Tool:** Vite
- **Language:** TypeScript (Strict Mode, No `any`).

## Audio & DSP Engine
- **Core Analysis:** Essentia.js (WASM) running in Web Workers.
- **Machine Learning:** TensorFlow.js (WASM backend favored).
- **Audio Context:** Native Web Audio API.

## Visualization & UI
- **Rendering:** Canvas API / OffscreenCanvas (for high-frequency metering).
- **Styling:** Tailwind CSS with custom Glassmorphic/DAW theme.
- **Icons:** Lucide React.

## Performance & Concurrency Strategy (CRITICAL)
### 1. The "No-React" Hot Path
- **Rule:** React State must NEVER drive the audio playhead or high-frequency meters.
- **Implementation:** Use `requestAnimationFrame` + `useRef` to manipulate DOM/Canvas directly.
- **Budget:** Main thread tasks must be <3ms.

### 2. Threading & Offloading
- **DSP/ML:** STRICTLY confined to Web Workers.
- **Visuals:** Use `OffscreenCanvas` where supported.
- **Event Proxying:** Main thread captures DOM events (clicks/hovers) and messages coordinates to workers; workers never touch DOM.

### 3. Concurrency & Data Flow
- **Data Transfer:** Use `Transferable` objects (ArrayBuffers) or `SharedArrayBuffer` (requires COOP/COEP headers) to avoid serialization overhead.
- **Backpressure:** Workers must drop frames if the UI lags. Never queue visual updates. "Latest or nothing."
- **React Scheduling:** Use `startTransition` only for low-priority UI (e.g., sidebar metadata), NOT for playback sync.

### 4. Async Discipline
- **Microtask Management:** Avoid long promise chains. Yield to main thread using `await new Promise(requestAnimationFrame)`.
- **Timeouts:** All async DSP operations must be time-boxed with abort controllers.
