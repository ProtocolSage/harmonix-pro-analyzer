# Initial Concept
A professional audio analysis tool focusing on DSP and ML features.

# Harmonix Pro Analyzer

## Vision
To provide a professional-grade, browser-based audio analysis workstation that combines the power of high-performance DSP (Essentia.js) with modern machine learning (TensorFlow.js). Harmonix Pro Analyzer enables high-fidelity audio feature extraction and visualization without the need for server-side processing.

## Target Users
- **Music Producers & Musicians:** Primarily used for identifying musical building blocks such as tempo (BPM), key, scale, and harmonic structures to assist in creative workflows.
- **Audio Engineers:** Professionals performing mix audits, spectral balancing, and loudness (LUFS) verification for mastering.
- **Data Scientists & Researchers:** Users needing granular audio feature extraction (MFCCs, spectral moments) for analysis or model training.

## Core Value Proposition
- **Privacy & Speed:** Local client-side processing means audio files never leave the user's machine.
- **Accuracy:** Leveraging the industry-standard Essentia library via WebAssembly.
- **Interactive Visualization:** High-performance, real-time visual feedback of complex audio data.

## Key Features
- **DSP Analysis:** Centroid, Roll-off, Flux, Energy, ZCR, and MFCC extraction.
- **Musical Intelligence:** High-confidence BPM detection and Key/Scale estimation.
- **Harmonic A/B Workbench:** Professional comparative analysis with real-time "Ghost Layer" overlays and Melodic DNA visualization.
- **Spectral Visualization Engine:** High-performance, IndexedDB-backed tiled spectrogram and luminous waveform trace with cache-first rehydration.
- **ML Inference Engine:** On-device TensorFlow.js classification for Genre, Mood, and Danceability.
- **Reactive Atmosphere:** The interface physically adapts its lighting, stability, and character to the "soul" of the music.
- **Sample-Accurate Transport:** Precise audio playback with A/B looping and zero-latency visualization sync.

## Architectural Integrity
- **Strict Type Safety:** The codebase adheres to strict TypeScript standards (no `any` types) to ensure reliability and self-documentation.
- **Dual-Track "Ghost" Architecture:** Cached reference strategy using `audioId` and `cacheVersion` to allow instant A/B swapping without re-analysis.
- **Progressive Intelligence:** Persistent artifacts (spectrograms, analysis results) use tiled hydration and background processing to ensure <100ms first-paint times.
- **Modular Component Design:** UI components are strictly scoped (max 300 lines) to ensure maintainability, testability, and performance.
- **Zero-Mock Policy:** Core logic is tested against real implementations where feasible, avoiding fragile mock-heavy tests.
- **Fault Tolerance:** Robust crash recovery with auto-restart (<500ms) and telemetry-driven performance monitoring.
- **Background Optimization:** Intelligent warm-up strategies using idle periods to ensure sub-500ms cached model loading.
- **Adaptive Visual Performance:** Real-time performance monitoring adjusts visual complexity (bloom vs. static) to maintain a strict <3ms main-thread budget.
- **Tactile Fidelity:** Physics-based momentum and inertia for UI controls provide a weighted, professional hardware feel.
