# Track Specification: Professional Metering Suite

## 1. Overview
Transform the application into a mastering workbench by adding real-time, precision audio meters. These tools allow engineers to verify phase coherence, stereo width, frequency balance, and loudness compliance.

## 2. Core Components

### 2.1 Peak Meter (Foundation)
*   **Type**: Vertical Bar (Stereo L/R).
*   **Range**: -60dBFS to +3dBFS.
*   **Features**:
    *   Clip indicators (Red hold > 0dB).
    *   Peak hold (1-3s decay).
    *   Gradient coloring (Green < -12, Yellow < -3, Red > -3).

### 2.2 Phase Correlation Meter
*   **Type**: Horizontal Bar (-1 to +1).
*   **Math**: `Correlation = sum(L*R) / sqrt(sum(L^2) * sum(R^2))` windowed over ~50ms.
*   **Zones**:
    *   +1 (Mono compatible, Green).
    *   0 (Wide Stereo).
    *   -1 (Out of Phase, Red).

### 2.3 Spectrum Analyzer (RTA)
*   **Type**: 1/3 Octave Bands or FFT Curve.
*   **Features**:
    *   Logarithmic frequency scale (20Hz - 20kHz).
    *   Smoothing (Attack/Release).
    *   Peak hold curve.
    *   Pink noise reference slope (optional).

### 2.4 Vectorscope (Goniometer)
*   **Type**: Lissajous XY Plot.
*   **Input**: Left channel = Y+X, Right channel = Y-X (rotated 45 deg).
*   **Features**:
    *   Auto-gain (AGC) to keep drawing visible.
    *   Fade trail (persistence).
    *   Blur/Glow effect for "CRT" look.

### 2.5 LUFS Meter
*   **Standard**: EBU R128.
*   **Metrics**:
    *   Momentary (M): 400ms integration.
    *   Short-term (S): 3s integration.
    *   Integrated (I): Full track average.
*   **Range**: -30 LUFS to -5 LUFS.

## 3. Technical Architecture

### 3.1 Metering Engine
*   **`MeteringEngine.ts`**: Shared class managing `ScriptProcessorNode` or `AudioWorklet` (preferred) to extract meter data.
*   **Data Structure**:
    ```typescript
    interface MeterData {
      peak: [number, number]; // L, R dB
      correlation: number;    // -1 to 1
      rms: [number, number];
      fft: Uint8Array;
      lufs: { m: number, s: number, i: number };
    }
    ```

### 3.2 UI Integration
*   **Location**: `MainStage` -> `MeterBridge` or `Inspector`.
*   **Rendering**: HTML5 Canvas for Vectorscope/RTA. CSS/SVG for Bars (cheaper on GPU).

## 4. Performance Targets
*   **Frame Rate**: 60fps for Vectorscope/RTA.
*   **Latency**: < 50ms visual delay.
*   **Efficiency**: Use `requestAnimationFrame` and avoid GC in the render loop.
