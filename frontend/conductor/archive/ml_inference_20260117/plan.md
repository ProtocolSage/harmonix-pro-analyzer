# Implementation Plan: ML Inference Engine & Reactive Atmosphere

## Phase 1: ML Core & Worker Handshake
- [x] Task: Define `MLWorker` protocol and message types (Inference request, model status, results).
- [x] Task: Write Tests: Verify `MLEngineCoordinator` handles worker lifecycle (init sequence, deferred loading, timeout, and crash recovery).
- [x] Task: Implement `MLWorker` skeleton with TensorFlow.js WASM backend and progressive model preloading.
- [x] Task: Implement `MLEngineCoordinator` with "Deferred Initialization" (post-Transport) and "Progressive Memory Detection."
- [x] Task: Conductor - User Manual Verification 'ML Core & Worker Handshake' (Protocol in workflow.md)

## Phase 2: Inference Pipeline & Data Plumbing
- [x] Task: Write Tests: Verify zero-copy data transfer (Transferable objects) from `EssentiaWorker` to `MLWorker`.
- [x] Task: Verify `EssentiaWorker` mel-spectrogram output matches ML model input requirements (and implement if missing).
- [x] Task: Implement inference logic in `MLWorker` for Genre, Mood, and Danceability models.
- [x] Task: Implement "Stale-Result Guard" to discard results when `audioId` no longer matches active track.
- [x] Task: Conductor - User Manual Verification 'Inference Pipeline & Data Plumbing' (Protocol in workflow.md)

## Phase 3: Reactive Atmosphere (Lighting Engine)
- [x] Task: Write Tests: Verify confidence-to-visual mapping math (lerp logic for glow radius and flicker rates).
- [x] Task: Implement `AtmosphereManager` utility to translate ML results into Obsidian CSS variables.
- [x] Task: Implement the "Locking On" logic (transitioning from jittery anticipation to stable certainty).
- [x] Task: Implement "Atmosphere Freeze" to pause lighting updates during rapid playback scrubbing.
- [x] Task: Conductor - User Manual Verification 'Reactive Atmosphere' (Protocol in workflow.md)

## Phase 4: UI Integration (Etched Enunciators)
- [x] Task: Implement the "Etched Glass Enunciator" React components (recessed LED indicators).
- [x] Task: Integrate enunciators into the primary Obsidian chassis layout.
- [x] Task: Implement the 300ms–500ms visual decay/smoothing for color transitions.
- [x] Task: Conductor - User Manual Verification 'UI Integration' (Protocol in workflow.md)

## Phase 5: Performance & Stability Audit
- [x] Task: Performance Audit: Use `performance.measure` to assert main-thread budget remains <3ms during inference.
- [x] Task: Memory Audit: Verify total ML heap usage stays under the 60MB cap.
- [x] Task: Verify graceful fallback to standard Cyan lighting when ML initialization fails.
- [x] Task: Conductor - User Manual Verification 'Performance & Stability Audit' (Protocol in workflow.md)