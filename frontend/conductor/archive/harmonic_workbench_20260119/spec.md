# Track Specification: Harmonic A/B Workbench

## 1. Goal
Implement a professional comparative analysis system that allows users to bench a Source track against a Reference track. The system will provide deep-dive harmonic and melodic "DNA" comparisons with real-time visual deltas and tactile workstation controls.

## 2. Architecture & Technical Approach

### 2.1 Dual-Track "Ghost" Architecture
- **Cached Reference Strategy:** The Reference track is analyzed upon loading; its features (pitch track, chords, spectral envelope) are cached as a static "Ghost" layer.
- **Cache Integrity:** Features are stored with a `cache_version` and `audio_id` to prevent stale data collisions during swaps.
- **Reactive Source:** The primary Source track remains fully reactive, driving real-time visuals and bloom.
- **Swap Control:** 
  - **Function:** Instant "Swap" function (`Source ↔ Reference`) that flips roles without re-analysis.
  - **UX:** Promotes the old Reference to the active "Live" role and demotes the Source to the "Ghost" layer.
  - **Indicator:** Explicit "LIVE" (Cyan) and "GHOST" (Dimmed) badges displayed over the respective track waveforms.
  - **Control:** Keyboard shortcut `S` for rapid A/B testing; 200ms debounce on the swap action.
- **Performance:** Maintain the strict **< 3ms** main-thread budget by avoiding simultaneous dual-engine live analysis.

### 2.2 Comparative Visualization (The DNA Well)
- **Intertwined DNA Strands:** Render the melodic contours of both tracks as delicate, glowing incandescent lines in a dedicated Countersunk Well.
- **Divergence Bloom:** 
  - **Trigger:** Triggers on **melodic contour divergence**, NOT absolute pitch. 
  - **Logic:** Bloom activates when `|SourceInterval - ReferenceInterval| > 1 semitone`. For the first frame, fallback to absolute delta.
  - **Smoothing:** Apply a 100ms "Hold" logic to the bloom trigger to filter out vibrato and micro-jitter, preventing strobe effects.
  - **Visual:** The space between the strands illuminates with a **Jewel Ruby** reactive bloom.
- **Floating Smoked-Glass Labels:** 
  - **Content:** Discrete UI overlays displaying detected Source chord vs. Reference chord (e.g., `Am7` | `Am`).
  - **Polish:** Labels fade in/out on chord changes (150ms ease).
  - **Coding:** Use Cyan tint for Source labels, Ghost/Dimmed tint for Reference labels.

### 2.3 Advanced Analysis Detail (The Comparison Rack)
- **Spectral Variance Heatmap:** 
  - **UI:** A collapsible panel displaying a 2D technical heatmap of spectral differences.
  - **Resolution:** Divided into Low, Mid, and High frequency bands with 250ms temporal bins.
  - **Insight:** Highlights where the Source is "thinner" or "brighter" than the Reference.
- **Harmonic Delta:** A data-rich readout of key and scale variance between the two tracks.

## 3. Functional Requirements
- **Reference Management:** Loader for a secondary audio file with individual "Clear" and "Reload" controls.
- **Tactile workbench:** Add a "Comparison Mode" toggle to the main workstation chassis.
- **Deep Extraction:** Integrate Essentia algorithms for `PitchMelodia` and `ChordsDetection` into the analysis pipeline.

## 4. Non-Functional Requirements
- **UX Immediacy:** Comparison visuals must appear instantly upon switching tracks or completing analysis.
- **Aesthetic Consistency:** All new visualizations must adhere to the "Luxurious Precision" lighting and depth model.
- **Main Thread Budget:** All comparative logic and rendering must remain under **3ms** per frame.

## 5. Acceptance Criteria
- **Accuracy:** DNA strands correctly map to the melodic intervals of both tracks.
- **Intelligence:** Divergence bloom accurately triggers on interval mismatches > 1 semitone while smoothing out vibrato.
- **Fluidity:** Swapping Source/Reference roles occurs in < 100ms without UI hitches or re-analysis.
- **Utility:** The spectral heatmap provides actionable data for frequency-balance matching.

## 6. Out of Scope
- Support for more than two tracks (Source + 1 Reference).
- Real-time simultaneous live processing of two streams (Parallel Mode).
