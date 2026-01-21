# Track Specification: Cinematic Export & Data Art

## 1. Vision
Transform audio analysis data into a self-contained, interactive 3D workstation. Move beyond static reports to a "Mind-Blow" experience using Three.js, D3, and GSAP.

## 2. Flagship Features

### 2.1 Audio Galaxy (3D Nebula)
*   **Concept**: 3D particle system representing frequency content.
*   **Visuals**: Glowing clusters color-coded by harmonic intensity.
*   **Interaction**: Orbit navigation through sonic space.

### 2.2 Spectral Journey (3D Terrain)
*   **Concept**: Fly-over spectrogram terrain.
*   **Visuals**: 3D mesh landscapes with beat markers as glowing pillars.
*   **Interaction**: Timeline scrubbing and "low-flight" camera.

### 2.3 Harmonic Constellation (Force Graph)
*   **Concept**: D3 force-directed layout of chords.
*   **Visuals**: Stars connected by relationship lines (Circle of Fifths).
*   **Interaction**: Click nodes to jump to timestamps.

### 2.4 Genre DNA Helix
*   **Concept**: ML tags as intertwined 3D DNA strands.
*   **Visuals**: Thickness mapped to confidence scores.

### 2.5 Organic Waveform
*   **Concept**: Breathing, living waveform organism.
*   **Visuals**: Amplitude-reactive size, frequency-reactive color.

## 3. Technical Stack
*   **3D Engine**: Three.js + React Three Fiber + Drei
*   **Data Vis**: D3.js v7 + Canvas API
*   **Animation**: GSAP (GreenSock)
*   **Format**: Standalone `.html` with all data and libraries inlined.

## 4. Export Architecture
1.  **Serialization**: Convert `AudioAnalysisResult` to compact JSON.
2.  **Templating**: Generate HTML with inline `<script>` tags for minified libs.
3.  **Shaders**: Embed custom GLSL for performance and aesthetics.
