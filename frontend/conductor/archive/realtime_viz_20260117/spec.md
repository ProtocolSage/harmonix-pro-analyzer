# Track Specification: Real-time Visualization Pipeline

## 1. Goal
To implement a high-performance, non-blocking visualization engine capable of rendering real-time audio data (waveform, spectrogram, meters) while strictly adhering to a <3ms main-thread frame budget.

## 2. Architecture & Technical Approach

### 2.1 Visualizer Engine (Compositional)
- **Host:** A single `VisualizerEngine` class manages the `requestAnimationFrame` loop, canvas context, and buffer management.
- **Strategies:** Concrete renderers (`WaveformRenderer`, `SpectrogramRenderer`) implement a shared `IRenderer` interface.
- **Context:** Favors `OffscreenCanvas` in a Web Worker. Falls back to Main Thread canvas if unavailable or if the worker crashes.

### 2.2 Data Bridge (Zero-Copy Optimistic)
- **Primary Path:** `SharedArrayBuffer` (Ring Buffer) when `crossOriginIsolated` is true.
- **Fallback Path:** `Transferable` ArrayBuffers (ping-pong messaging) when `SharedArrayBuffer` is unavailable.
- **Throttling:** Data emission from the DSP worker is capped at a default of **45 FPS** (configurable 30-60 FPS) to prevent backpressure.
- **Backpressure:** The bridge caps the queue at **3 frames**. New frames overwrite the oldest. It always renders the *latest* available data pointer.

### 2.3 Performance Guardrails & Adaptive Degradation
- **Main Thread Budget:** <3ms per frame.
- **Lite Mode Trigger:** Engages if:
  - More than 2 consecutive frames exceed 3ms draw time.
  - OR Queue size exceeds 3 frames consistently.
  - OR Running on Main Thread fallback.
- **Lite Mode Behavior:**
  - Caps FPS at 30.
  - Reduces FFT resolution (e.g., 2048 -> 512 bins).
  - Reduces Waveform resolution (e.g., 1024 -> 256 bins).

## 3. Scope & Outcomes

### 3.1 Core Components
- **`src/engines/VisualizerEngine.ts`:** The orchestrator class.
- **`src/engines/renderers/`:** Directory for `WaveformRenderer.ts`, `SpectrogramRenderer.ts`.
- **`src/workers/visualization.worker.ts`:** The dedicated worker for OffscreenCanvas.
- **`src/types/visualizer.ts`:** Strict type definitions.

### 3.2 Deliverables
- **Data Bridge:** Validated `SharedArrayBuffer` implementation with correct fallback detection.
- **Engine Logic:** A working loop that accepts data and calls the active renderer.
- **Smoke Tests:** Unit tests verifying the engine initializes, detects capabilities, and degrades configuration correctly.
- **Performance Telemetry:** Logs warnings if frame time >10ms or drop rate >5%.

## 4. Acceptance Criteria
- **Smoothness:** Visuals run at 60fps on reference hardware (using `SharedArrayBuffer`).
- **Resilience:** Engine successfully initializes on environments without `SharedArrayBuffer` (using Transferables).
- **Budget:** No main-thread task related to visualization exceeds 10ms (3ms target, 10ms hard limit).
- **React Isolation:** React components (`MainStage`) only handle start/stop/config; they strictly do NOT receive per-frame data updates. Render count must remain flat during visualization.
