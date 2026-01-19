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
- **Machine Learning:** Automated Genre and Mood classification.
- **Professional Tooling:** Integrated loudness metering and data export capabilities.

## Architectural Integrity
- **Strict Type Safety:** The codebase adheres to strict TypeScript standards (no `any` types) to ensure reliability and self-documentation.
- **Modular Component Design:** UI components are strictly scoped (max 300 lines) to ensure maintainability, testability, and performance.
- **Zero-Mock Policy:** Core logic is tested against real implementations where feasible, avoiding fragile mock-heavy tests.
