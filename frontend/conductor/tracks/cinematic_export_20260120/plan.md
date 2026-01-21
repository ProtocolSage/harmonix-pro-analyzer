# Implementation Plan: Cinematic Export & Data Art

## Phase 1: Infrastructure & POC (The Foundation)
- [x] **Install Dependencies**: `three`, `@types/three`, `@react-three/fiber`, `@react-three/drei`, `gsap`, `d3`.
- [x] **Create `ExportEngine`**: Service to generate the standalone HTML template.
- [x] **POC: Audio Galaxy**: Implement a basic Three.js particle system driven by frequency bins.
- [x] **UI Integration**: Add "Cinematic Export" button to `ExportFunctionality.tsx`.

## Phase 2: Core Visualizations (The "Wow" Moments)
- [x] **Spectral Terrain**: Implement the 3D mesh fly-over logic with downsampled data.
- [x] **Audio Galaxy Refinement**: Map particles to actual spectrogram data.
- [x] **Navigation System**: Implement the mode switcher (Galaxy -> Terrain) with GSAP transitions.
- [x] **Harmonic Constellation**: Implement the D3 force-directed chord map.
- [x] **Genre DNA**: Implement the helical 3D strand generator.

## Phase 3: Polish & Performance (Obsidian Reliability)
- [ ] **Epic Intro Animation**: Choreograph the camera zoom and title reveal.
- [ ] **Shader Optimization**: Implement custom GLSL for particle glowing and terrain shading.
- [ ] **Generative Colors**: System to map Key/Genre to unique color palettes.
- [ ] **Inlining Engine**: Ensure all libraries and data are correctly embedded for offline use.

## Phase 4: Advanced Interaction
- [ ] **Audio Playback**: Embed a lightweight player that syncs the 3D scene to time.
- [ ] **Canvas Recording**: Add ability to record the visualization as an MP4/WebM.
- [ ] **Mobile Optimization**: Touch controls and simplified shaders for mobile browsers.

## Phase 5: Verification
- [ ] **Test**: Export track -> Open in Chrome/Safari/Firefox -> Verify 60FPS.
- [ ] **Test**: Verify offline capability (disconnect internet, open file).
- [ ] **Test**: Verify ML tags correctly drive DNA strand thickness.