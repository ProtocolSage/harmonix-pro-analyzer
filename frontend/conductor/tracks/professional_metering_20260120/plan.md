# Implementation Plan: Professional Metering Suite

## Phase 1: Foundation (Easy Wins)
- [x] **Create `MeteringEngine`**:
    - [x] `src/engines/MeteringEngine.ts` wrapping Web Audio API Analyzer/ScriptProcessor.
    - [x] Implement `getLevels()` (Peak/RMS).
- [x] **Create `PeakMeter`**:
    - [x] `src/components/meters/PeakMeter.tsx`.
    - [x] CSS-based vertical bars with clip hold.
- [x] **Create `PhaseCorrelation`**:
    - [x] Implement correlation math in `MeteringEngine`.
    - [x] Create `src/components/meters/PhaseCorrelation.tsx`.

## Phase 2: Frequency & Stereo Visualization
- [x] **Create `SpectrumAnalyzer`**:
    - [x] `src/components/meters/SpectrumAnalyzer.tsx` (Canvas).
    - [x] Logarithmic mapping of FFT bins.
    - [x] Peak hold logic.
- [ ] **Create `Vectorscope`**:
    - [ ] `src/components/meters/Vectorscope.tsx` (Canvas).
    - [ ] Implement Lissajous drawing loop.
    - [ ] Add fade trail/persistence.

## Phase 3: Advanced Metering (LUFS)
- [ ] **Implement EBU R128 Logic**:
    - [ ] Implement 400ms (Momentary) and 3s (Short-term) windows.
    - [ ] K-weighting filter (shelf + high-pass) - *Critical for R128*.
- [ ] **Create `LUFSMeter` UI**:
    - [ ] Readout + History Graph.

## Phase 4: Integration & Polish
- [x] **Create `MeterBridge` Component**:
    - [x] Container to layout meters (Horizontal or Sidebar).
- [x] **Integrate into `App-Production.tsx`**:
    - [x] Place MeterBridge in `BottomDock`.
- [ ] **Testing**:
    - [ ] Verify Peak Meter matches known test tones (-6dB sine).
    - [ ] Verify Correlation matches (Mono=1, Out-of-phase=-1).