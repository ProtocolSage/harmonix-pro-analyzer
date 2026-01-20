# Implementation Plan: Spectral Visualization Engine (Obsidian Aesthetic)

## Phase 1: Worker Architecture & Data Plumbing
- [x] Task: Write Tests: Verify `MessageChannel` and `SharedArrayBuffer` sync clock precision (assert <10ms drift). Include fallback test for `MessageChannel` logic when `SAB` is unavailable.
- [x] Task: Implement `VisualizationWorker` skeleton with `OffscreenCanvas` support and high-precision clock listener.
- [x] Task: Implement `VisualizerBridge` utility to tap `EssentiaWorker` outputs. **Must support both 'live' mode (AnalysisWorker → VisWorker direct transfer) and 'replay' mode (Main Thread Buffer → VisWorker).**
- [x] Task: Conductor - User Manual Verification 'Worker Architecture & Data Plumbing' (Protocol in workflow.md)

## Phase 2: Real-time Spectrogram Engine
- [x] Task: Write Tests: Assert FFT decimation logic correctly maps 256–512 bins to viewport height. Test that draw cadence responds dynamically to prior frame compute time.
- [x] Task: Implement scrolling Spectrogram renderer in the Worker using a bitmapped buffer for O(1) scroll performance.
- [x] Task: Implement variable draw cadence (30–60fps) that throttles based on previous frame compute time.
- [x] Task: Conductor - User Manual Verification 'Real-time Spectrogram Engine' (Protocol in workflow.md)

## Phase 3: Luminous Waveform Overlay
- [x] Task: Write Tests: Verify waveform downsampling logic correctly reduces raw buffers to 1,024–2,048 peak points. Assert sample-accurate alignment between waveform peaks and playhead time.
- [x] Task: Implement Waveform overlay renderer with Cyan phosphor glow and sample-accurate playhead alignment.
- [x] Task: Conductor - User Manual Verification 'Luminous Waveform Overlay' (Protocol in workflow.md)

## Phase 4: Obsidian Aesthetic & Opt-Up Lighting
- [x] Task: Write Tests: Verify `Adaptive Phosphor Glow` CSS variables update correctly in response to RMS inputs. **Test forced fallback to static mode when frame time > 3ms for 30 consecutive frames.**
- [x] Task: Implement the `CountersunkWell` UI component with precision rim highlights and inner shadows.
- [x] Task: Implement the "Opt-Up" state machine:
    - Enable reactive bloom after 60 frames of >10ms idle time.
    - Fallback to static mode after 30 frames of >3ms main-thread usage.
- [x] Task: Implement "Jewel Ruby" peak warning bloom (-3dB trigger logic).
- [x] Task: Conductor - User Manual Verification 'Obsidian Aesthetic & Opt-Up Lighting' (Protocol in workflow.md)

## Phase 5: Workstation Integration & Performance Audit
- [x] Task: Integrate the visualization well into the primary Obsidian Chassis layout.
- [x] Task: Performance Audit: Use `performance.measure` to assert main-thread budget remains <3ms during active playback.
- [x] Task: Conductor - User Manual Verification 'Performance Integration & Audit' (Protocol in workflow.md)