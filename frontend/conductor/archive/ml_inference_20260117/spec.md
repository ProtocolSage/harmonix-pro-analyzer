# Track Specification: ML Inference Engine & Reactive Atmosphere

## 1. Goal
Activate the "Intelligence" layer of Harmonix Pro by integrating TensorFlow.js for deep audio classification (Genre, Mood, Danceability). Translate these insights into a "Reactive Atmosphere" where the Obsidian chassis physically adapts its lighting, stability, and character to the "soul" of the music.

## 2. Architecture & Technical Approach

### 2.1 The "Brain" (ML Inference Worker)
- **Deferred Worker Initialization:** The `MLWorker` spins up *only after* `AudioTransportEngine` is "Ready," using `requestIdleCallback` to ensure zero impact on initial UI interactivity.
- **Backend:** TensorFlow.js with the **WASM backend** (favored for stability) and WebGL fallback.
- **Input Pipeline:** Tap into the `EssentiaWorker`'s Mel-Spectrogram output. Use `Transferable` objects to move spectro-temporal data to the `MLWorker` without copying.
- **Models:** Deploy quantized, lightweight models for:
    - **Genre:** (Electronic, Rock, Jazz, etc.)
    - **Mood:** (Happy, Sad, Aggressive, Calm)
    - **Danceability:** (Static vs. High-groove)
- **Model Hosting:** Models served from CDN with cache-first strategy. Version pinned in build config to prevent runtime breakage.

### 2.2 Low Memory Mode & Safety Valves
- **Progressive Detection:** Bypasses ML initialization entirely if:
    1. `navigator.deviceMemory` <= 2GB.
    2. `performance.memory.jsHeapSizeLimit` < 500MB (fallback).
    3. `navigator.hardwareConcurrency` <= 2 cores (last resort).
- **Initialization Failure:** If ML warmup fails (model fetch error, backend crash), gracefully degrade to Low Memory Mode behavior. Log failure to PerformanceMonitor for telemetry but never block UI.
- **Behavior:** Falls back to standard Cyan "Technical" lighting and skips `MLEngineCoordinator` warmup.

### 2.3 Reactive Atmosphere (Visual Language)
- **The Enunciators:** Implement "Etched Glass Enunciators"—recessed, physical-looking LED indicators in the chassis.
- **Confidence Mapping:**
    - `glowRadius = lerp(40, 12, confidence)` (px: diffuse → tight)
    - `glowIntensity = lerp(0.3, 1.0, confidence)` (opacity)
    - `flickerRate = lerp(8, 0, confidence)` (Hz: jittery → stable)
    - `isLocked = confidence > 0.85` (snap to stable state)
- **Mood Color Mapping:**
    - **Aggressive/High Energy:** Jewel Ruby / Magma accents.
    - **Calm/Atmospheric:** Deep Amethyst / Midnight.
    - **Happy/Dance:** Sapphire / Emerald.
    - **Default/Uncertain:** Technical Cyan (Neutral).

## 3. Functional Requirements
- **Background Preloading:** Models load during idle periods after transport is stable.
- **Asynchronous Inference:** Analysis results arrive non-deterministically; UI must handle "Pending" states gracefully.
- **Stale-Result Guard:** Every inference request is tied to an `audioId`; late results from previous tracks must be discarded.
- **Atmosphere Freeze:** Lighting updates are throttled and frozen during rapid scrubbing to prevent visual strobe effects.

## 4. Non-Functional Requirements
- **Main Thread Budget:** All lighting logic and state updates must remain under **< 3ms**.
- **Memory Cap:** ML layer must not exceed 60MB of additional heap usage.
- **Visual Decay:** Lighting transitions use a 300ms–500ms ease-out to prevent "twitchy" UI.

## 5. Acceptance Criteria
- ML models initialize successfully without dropping frames on mid-tier hardware.
- The "Locking On" sequence correctly visualizes the transition from uncertainty to confidence.
- Workstation lighting accurately reflects the detected mood within 1.5s of analysis completion.
- Low Memory Mode correctly triggers on constrained devices.

## 6. Out of Scope
- Real-time simultaneous dual-track ML inference (Source only).
- Training or fine-tuning models within the client.
