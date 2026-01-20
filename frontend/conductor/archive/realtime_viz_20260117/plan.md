# Track Plan: Real-time Visualization Pipeline

## Phase 1: Data Bridge & Core Engine (The Infrastructure)
- [x] Task: Create `src/types/visualizer.ts` with `IRenderer`, `VisualizerConfig` (sample rate, bin count, max payload rate: 30-60 fps), and payload schemas.
- [x] Task: Implement `DataBridge` in `VisualizerEngine.ts` with `SharedArrayBuffer` detection, fallback to Transferable, and explicit backpressure (cap queue at 3, drop oldest).
- [x] Task: Implement `VisualizerEngine` with `requestAnimationFrame` loop, adaptive degradation triggers (>2 frames >3ms), and "lite mode" toggle.
- [x] Task: Write Tests: Verify SAB -> Transferable fallback path, frame-dropping under synthetic load, and lite-mode trigger on budget breach.
- [x] Task: Conductor - User Manual Verification 'Engine Infrastructure' (Protocol in workflow.md)

## Phase 2: Renderer Implementation (The Visuals)
- [x] Task: Implement `WaveformRenderer.ts` (Normal: 1024 bins; Lite: 256 bins, 30 FPS cap).
- [x] Task: Implement `SpectrogramRenderer.ts` (Normal: 2048 bins; Lite: 512 bins, 30 FPS cap).
- [x] Task: Implement `VUMeterRenderer.ts` (lightweight defaults).
- [x] Task: Write Tests ("Budget Checks"): Mock `performance.now`, assert draw time <3ms for normal and lite presets with synthetic payloads.
- [x] Task: Conductor - User Manual Verification 'Renderers' (Protocol in workflow.md)

## Phase 3: Worker & Threading (The Offloading)
- [x] Task: Create `src/workers/visualization.worker.ts` with strict feature detection for `OffscreenCanvas`.
- [x] Task: Implement "Main Thread Proxy" to throttle pointer/resize events (cap 60Hz) and forward to worker.
- [x] Task: Update `VisualizerEngine` to handle main-thread fallback (degraded config) if OffscreenCanvas init fails or worker crashes mid-session.
- [x] Task: Write Tests: Simulate OffscreenCanvas failure and worker crash to verify main-thread degraded resumption.
- [x] Task: Conductor - User Manual Verification 'Multi-threaded Rendering' (Protocol in workflow.md)

## Phase 4: Integration & Telemetry (The Final Polish)
- [x] Task: Define strict payload schema for Essentia -> DataBridge (Peaks/RMS array, FFT bins array).
- [x] Task: Connect `EssentiaAudioEngine` output to `DataBridge`.
- [x] Task: Wire `MainStage.tsx` to `VisualizerEngine` via `useVisualizer` hook (Ref-based, no React state).
- [x] Task: Implement Telemetry: Log worst-frame time (>10ms warning), drop counts (>5% warning), and lite-mode engagement.
- [x] Task: Final Verification ("Render Audit"): Record React render baseline. Assert count stays within +0/±1 during active visualization (with and without telemetry).
- [x] Task: Conductor - User Manual Verification 'Full Pipeline Integration' (Protocol in workflow.md)
