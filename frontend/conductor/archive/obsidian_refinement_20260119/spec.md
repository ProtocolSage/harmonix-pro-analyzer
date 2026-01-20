# Track Specification: Obsidian Workstation Visual Refinement

## 1. Goal
Transform the user interface into a "Luxurious Precision" hardware workstation. Replace standard web components with hyper-polished, machined surfaces, reactive lighting physics, and tactile controls that signal ultra-premium quality and AI intelligence.

## 2. Architecture & Technical Approach

### 2.1 Machined Obsidian Chassis (Surface Architecture)
- **Base Material:** A multi-layered obsidian finish (`#0A0B10`) with a subtle SVG noise grain to simulate matte metal.
- **Countersunk Wells:** All analysis panels (Waveform, Spectral, AI) must appear "milled" into the chassis using:
  - **Inner Shadows:** Deep, sharp offsets to create perceived depth.
  - **Rim Highlights:** A 1px top-edge border (`rgba(255,255,255,0.05)`) to simulate light catching a machined corner.
- **Structural Integrity:** Panels feel anchored and permanent, avoiding floating "web card" aesthetics.

### 2.2 Adaptive Phosphor Bloom (Lighting Model)
- **Default State:** Static CSS glow (`box-shadow`) for baseline reliability.
- **Opt-Up Logic:** Enable **Reactive Bloom** only when `requestIdleCallback` reports >10ms idle for 60 consecutive frames.
- **Fallback Logic:** Revert to static glow if the main-thread budget (>3ms) is violated for 30 consecutive frames.
- **Signal Processing:**
  - **Filtering:** Apply a LERP (Linear Interpolation) or low-pass filter to the RMS signal before driving visual intensity to prevent jitter/flicker.
  - **Throttling:** Cap CSS Custom Property updates (`--glow-intensity`) at **~30fps**.
  - **GPU Usage:** Utilize `will-change: filter` on all glowing elements.

### 2.3 Precision Hybrid Knobs (Tactile Interface)
- **Interaction Logic:** 
  - **Precision Mode:** Slow drag (< 50px/s) results in a 1:1 linear value change.
  - **Inertial Mode:** Fast drag (> 150px/s) triggers momentum; value "coasts" on release with friction-based deceleration (constant: `0.95`).
  - **Fine-Tune:** `Shift + Drag` reduces the sensitivity ratio by 10x.
- **Accessibility:** Full keyboard support (Tab for focus, Arrow keys for incremental adjustment) to maintain professional usability.
- **Features:** 
  - **Reset:** Double-click to reset to the default value.
  - **Precision Toggle:** Global setting to disable inertial momentum for "precision-only" workflows.
  - **Clamping:** Strict range clamping to prevent overflow/invalid states.
- **Visuals:** Custom-rendered SVG or Canvas knobs that "roll" with mechanical weight.

### 2.4 Prism Spectral Scan (AI Visualization)
- **Active Analysis:** During ML inference, replace generic spinners with a **Prism Scan**.
- **Visuals:** A laser-thin "Warm Gold" (`#F59E0B`) vertical line that sweeps across the spectral well.
- **Lifecycle:**
  - **Persistence:** Max duration of 2 seconds or hidden immediately upon inference completion.
  - **Suspension:** Pause scan on tab blur/suspend; resume at the last recorded position on wake.
- **Pattern Hits:** Momentary, high-precision monospaced hex/data blips appear at the scan-line position when features are detected.

## 3. Functional Requirements
- **Hardware-Feel Controls:** Implement custom Knob and Fader components with the Hybrid Momentum logic.
- **Depth System:** Global CSS theme for machined surfaces and countersunk wells.
- **Reactive Lighting:** Hook Audio Transport Engine (RMS/Peak) into the filtered CSS Variable bloom system.

## 4. Non-Functional Requirements
- **Main Thread Budget:** All visual effects must remain under the **3ms** frame budget.
- **GPU Offloading:** Ensure bloom and blur filters are composited on the GPU.
- **No-React Hot Path:** Lighting and playhead updates must bypass React state entirely (using `refs`).

## 5. Acceptance Criteria
- **Aesthetic:** The UI feels like a physical instrument, not a browser application.
- **Performance:** 60fps stable playback with adaptive lighting that degrades gracefully.
- **Tactility:** Knobs feel "heavy" and responsive to both flick and fine-tuning gestures.
- **Intelligence:** The Prism Scan accurately conveys "active thought" without overstaying its welcome.
