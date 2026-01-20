# Track Specification: Spectral Visualization Engine (Obsidian Aesthetic)

## 1. Goal
Implement a high-performance, real-time spectral visualization system that integrates a scrolling spectrogram and a luminous waveform trace into the Obsidian-themed workstation. The engine must adhere to strict performance guardrails to ensure zero impact on UI responsiveness.

## 2. Architecture & Technical Approach

### 2.1 Offloaded Rendering Pipeline
- **Primary Engine:** Utilize `OffscreenCanvas` to offload the spectrogram's pixel-heavy draw loop to a dedicated Visualization Worker.
- **Fallback:** Automatic 2D Canvas fallback for environments where `OffscreenCanvas` is unsupported.
- **Data Plumbing:** Tap into existing `EssentiaWorker` outputs using `Transferable` objects (ArrayBuffers).
- **Decimation & Sampling:**
  - **FFT Bins:** Decimate frequency bins to match the vertical viewport height (e.g., 256–512 bins).
  - **Waveform Peaks:** Downsample time-domain data to 1,024–2,048 points per viewport.
- **Cadence:**
  - **Spectrogram:** Draw cadence capped at 30–60fps depending on system load.
  - **Waveform:** Overlay maintained at 60fps for maximum fluidity.

### 2.2 Visual Integration & Lighting
- **The Well:** Render within a "Countersunk Well" featuring precision-milled rim highlights and inner shadows.
- **Layering:** 
  - **Base:** Scrolling frequency spectrogram (vertical frequency, horizontal time).
  - **Overlay:** Delicate, glowing Cyan waveform line floating above the spectral data.
- **Reactive Model (Opt-Up Strategy):**
  - **Enable Glow:** Transition to reactive phosphor bloom when system idle time > 10ms for 60 consecutive frames.
  - **Revert to Static:** Fallback to static "dim" colors if main-thread budget > 3ms for 30 consecutive frames.
  - **Jewel Ruby Warning:** Subtle ruby-red phosphor bloom triggers when the signal exceeds -3dB.

### 2.3 Synchronization
- **Clock:** Main-thread `requestAnimationFrame` loop writes `audioContext.currentTime` to shared memory.
- **Sync Method:**
  - **Primary:** `SharedArrayBuffer` for zero-latency timecode access.
  - **Fallback:** `MessageChannel` port messaging for environments where SAB is unavailable.
- **Tolerance:** Playhead and visuals aligned within 5–10ms.

## 3. Functional Requirements
- **Real-time Spectrogram:** Dynamic frequency intensity map.
- **Waveform Trace:** Sample-accurate luminous overlay.
- **Obsidian Theme Support:** Full integration with workstation chassis shadows/highlights.
- **Performance Guardrails:** Automatic down-sampling and effect throttling.

## 4. Non-Functional Requirements
- **Main Thread Budget:** Execution MUST remain under **<3ms** per frame.
- **Responsiveness:** Zero "jank" on workstation controls (knobs/faders).
- **Update Frequency:** Stable 60fps for waveform; variable 30-60fps for spectrogram.

## 5. Acceptance Criteria
- Spectrogram and waveform render correctly within the Obsidian countersunk wells.
- Visuals maintain a smooth 60fps on mid-tier hardware.
- UI interaction remains fluid during active visualization.
- Reactive lighting correctly tracks audio RMS and peak levels with stable state transitions (no flickering).

## 6. Out of Scope
- Support for 3D frequency waterfalls.
- Multi-track simultaneous visualization.
