# Track Plan: Harmonic A/B Workbench

## Phase 1: Harmonic Engine Extension
- [ ] Task: Update `EssentiaAudioEngine` and its worker to include `PitchMelodia` and `ChordsDetection` in the analysis pipeline.
      Outputs to cache for Reference: pitch contour, chord timeline, spectral envelope, tempo/key metadata.
- [ ] Task: Write Tests: Verify pitch and chord extraction accuracy against reference audio samples. 
      Assert all cached feature outputs (pitch contour, chord timeline, spectral envelope, tempo/key) are present and accurate.
- [ ] Task: Manual QA: Verify harmonic extraction against reference audio (see workflow.md protocol)

## Phase 2: Dual-Track State & Cache Logic
- [ ] Task: Create Reference Track loader UI with "Load Reference", "Clear", and "Reload" controls
- [ ] Task: Write Tests: Verify Reference file loading, clearing, and cache invalidation on reload
- [ ] Task: Create `src/contexts/ComparisonContext.tsx` to manage Source/Reference roles and feature caching.
      Cached features: pitch contour, chord timeline, spectral envelope, tempo/key metadata.
      cache_version = hash(audio_id + feature_params) to prevent swap-triggered re-analysis.
      Source remains live-only; no parallel processing by default.
- [ ] Task: Implement the role-swapping logic using `audio_id` and `cache_version` to prevent re-analysis.
- [ ] Task: Add keyboard shortcut `S` and 200ms swap debounce.
- [ ] Task: Write Tests: Verify state swap functionality, assert no re-analysis on swap (check cache hit), 
      and ensure "Live"/"Ghost" badges update correctly without engine hitches.
- [ ] Task: Manual QA: Verify state management and swap behavior (see workflow.md protocol)

## Phase 3: The DNA Well (Melodic Comparison)
- [ ] Task: Implement the `MelodicDNA` component using Canvas/SVG for intertwined pitch strands.
- [ ] Task: Implement the Melodic Contour divergence logic (|SourceInterval - ReferenceInterval| > 1 semitone).
      Render Jewel Ruby bloom in the space between DNA strands when divergence exceeds threshold.
- [ ] Task: Implement the 100ms hold smoothing for the Jewel Ruby bloom trigger to eliminate vibrato flicker.
      Apply low-pass filter to pitch contours if needed to reduce high-frequency noise.
- [ ] Task: Write Tests: Verify bloom correctly ignores vibrato but triggers on interval divergence.
      Assert 1-semitone threshold and 100ms hold are enforced.
- [ ] Task: Manual QA: Verify melodic comparison visual behavior (see workflow.md protocol)

## Phase 4: Overlays & Comparison Rack
- [ ] Task: Create the Floating Glass Labels for chords with Source (Cyan) and Reference (Ghost) tints and 150ms fades.
      Fade timing: 150ms ease on chord changes.
- [ ] Task: Implement the `ComparisonRack` panel with the Spectral Variance Heatmap.
      Frequency bands: Low/Mid/High (locked). Time bins: 250ms (selected from 200-500ms range for balance of time resolution vs visual clarity).
- [ ] Task: Write Tests: Verify heatmap data calculation (Low/Mid/High bands, 250ms bins) and chord label transition smoothness (150ms fade).
- [ ] Task: Manual QA: Verify advanced readouts and visual polish (see workflow.md protocol)

## Phase 5: Workstation Integration & Performance
- [ ] Task: Add "Comparison Mode" toggle to workstation chassis with keyboard accessibility
- [ ] Task: Write Tests: Verify toggle state persists and cleanly shows/hides comparison UI
- [ ] Task: Final layout integration: Place the DNA Well and Comparison Rack into the Obsidian Workstation chassis.
- [ ] Task: Performance Audit: Use `performance.measure` to log frame times during A/B swaps and active comparison.
      Assert main-thread budget (<3ms) is maintained with single-stream live analysis (Source only; Reference cached).
      If budget breaches, document fallback strategy and optimization targets.
- [ ] Task: Manual QA: Verify full integration and performance (see workflow.md protocol)

## Future Extensions (Backlog)
- [ ] Optional Circle-of-Fifths view in Extended Harmonic Analysis panel
      (Preserves the "Harmonic Ring" concept from initial exploration while keeping current sprint focused on core comparison workflow)
