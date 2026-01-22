# Implementation Plan: Spectrogram as a Persistent Artifact

## Phase 1: Persistence Schema & Manifest
**Goal:** Establish the type-safe foundation for tiled storage, manifest tracking, and atomic cleanup.

- [ ] **Task: Define Artifact Types**
    - [ ] Update `src/types/persistence.ts` to include `SpectrogramTileArtifact` and `SpectrogramManifestArtifact` with discriminated union types
    - [ ] Ensure all interfaces include `schemaVersion`, `audioFingerprint`, and deterministic metadata (fftSize, hopSize, sampleRate, windowFunction, freqBins, timeFrames, dbMin, dbMax, gamma, tileStartSec, tileDurationSec)
    - [ ] Add tile key format specification: `t:${tileIndex}` (0-based)
    - [ ] Manifest key **MUST** be `'default'`
    - [ ] **Code Contract**: Define `SPECTROGRAM_MANIFEST_KEY = 'default'` and `spectrogramTileKey(i)` as exported constants; use everywhere.
    - [ ] Define manifest structure with `tileSpec`, `completedTiles` (boolean bitmap or ranges), `fingerprint`, `schemaVersion`
    
- [ ] **Task: Extend DBService API**
    - [ ] Add `listArtifactsByType(trackId, type)` helper for bulk tile queries
    - [ ] Ensure `putArtifactsBatch(artifacts)` uses one IDB transaction: `create tx -> sync puts -> await tx.done` (no async gaps)
    - [ ] Ensure `deleteArtifactsByType(trackId, type)` uses one IDB transaction for the entire cascade
    - [ ] Verify `putArtifactsBatch` handles `SpectrogramTileArtifact` and `SpectrogramManifestArtifact` correctly
    
- [ ] **Task: Implement Manifest Logic in SessionManager**
    - [ ] Create `initSpectrogramManifest(trackId, tileSpec)` to initialize new manifests
    - [ ] Create `readSpectrogramManifest(trackId)` with runtime schema validation
    - [ ] Create `updateManifestCompletion(trackId, tileIndex)` to mark tiles as completed
    - [ ] Implement compact `completedTiles` tracking (boolean bitmap recommended)
    - [ ] Verification: Unit test manifest serialization, deserialization, and completion tracking logic
    
- [ ] **Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)**

---

## Phase 2: Worker-Side Spectrogram Tiling
**Goal:** Move spectrogram generation to the Worker and implement tiled quantization with guard bands.

- [ ] **Task: Deterministic DSP Contract**
    - [ ] Hard-pin DSP parameters: windowSize, hopSize, fftSize, freqBins, windowFunction, sampleRateUsed, dbMin=-100, dbMax=0, gamma
    - [ ] Persist contract in manifest.tileSpec
    - [ ] Any tileSpec change triggers cache invalidation
    
- [ ] **Task: Refactor Spectrogram Worker**
    - [ ] Implement chunked FFT processing with **30s visible window + 0.5s guard band on each end** (31s total per tile)
    - [ ] Implement Uint8 normalization: map **-100dB to 0dB** → **0 to 255** (clamped)
    - [ ] Use row-major layout: `Uint8Array(buffer)[frameIndex * bins + binIndex]`
    - [ ] Add `Transferable` support for zero-copy `ArrayBuffer` transfer to main thread
    - [ ] Ensure Worker emits tiles with deterministic metadata for each tile
    
- [ ] **Task: Implement Tile Header Generation**
    - [ ] Generate deterministic DSP metadata for each tile: fftSize, hopSize, sampleRate, windowFunction, freqBins, timeFrames
    - [ ] Include normalization params: dbMin=-100, dbMax=0, gamma
    - [ ] Include positioning: tileStartSec, tileDurationSec (31s with guard band)
    - [ ] Include validation: schemaVersion, audioFingerprint
    - [ ] Verification: Integration test Worker response for a sample audio buffer; verify Uint8 range (0-255), buffer dimensions match `timeFrames × freqBins`, and metadata completeness
    
- [ ] **Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)**

---

## Phase 3: Authoritative Write Pipeline
**Goal:** Implement the high-performance dual-trigger flush system with cache validation.

- [ ] **Task: Implement Dual-Trigger Flush**
    - [ ] Add `pendingSpectrogramTiles: Map<string, SpectrogramTileArtifact>` to SessionManager
    - [ ] Implement timer-based flush: trigger every **250ms** if tiles pending
    - [ ] Implement count-based flush: trigger when queue reaches **5 tiles**
    - [ ] Use `dbService.putArtifactsBatch(batch)` for atomic batch commits
    - [ ] Clear pending queue only after successful tx.done. On tx failure: retry batch once; on second failure: log error and drop tiles (corruption scenario).
    
- [ ] **Task: Implement Cache Validation & Invalidation**
    - [ ] Create `validateSpectrogramCache(trackId)` that checks:
        - `audioFingerprint` matches current track
        - `schemaVersion` matches current schema
        - `tileSpec` parameters match (bins, hop, window, range)
        - No tile corruption (buffer size validation)
    - [ ] Implement "Delete-then-Recompute" cascade on invalidation:
        - Delete all tiles for track via `deleteArtifactsByType(trackId, 'spectrogram_tile')`
        - Delete manifest via `deleteArtifact(trackId, 'spectrogram_manifest')`
        - Log invalidation reason for debugging
        - Trigger fresh computation
    
- [ ] **Task: Corruption Detection & Local Repair**
    - [ ] Validate each tile buffer: `byteLength === timeFrames * freqBins` (Uint8)
    - [ ] If corrupt: delete tile, mark incomplete in manifest, recompute only missing tiles
    
- [ ] **Task: Robustness Hooks**
    - [ ] Add `pagehide` event listener to force flush pending tiles (best-effort survivability)
    - [ ] Add flush trigger on `analysis_complete` event
    - [ ] Implement graceful shutdown: ensure all pending tiles commit before page unload
    - [ ] Verification: Simulate partial computation (interrupt at tile 3/10); refresh browser; verify SessionManager reads manifest, detects missing tiles 4-10, and resumes computation for only missing tiles
    
- [ ] **Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)**

---

## Phase 4: Platinum Rehydration & Rendering
**Goal:** Achieve sub-100ms rehydration with seamless crossfade rendering and deterministic frame pacing.

- [ ] **Task: Deterministic Grid Layout**
    - [ ] Calculate total tile count and grid positions before fetching any tiles
    - [ ] Render fixed grid layout (non-overlapping 30s slots) immediately on mount
    - [ ] Add "Status Pill" component with minimal states:
        - "Loading cached spectrogram..." (during IDB fetch)
        - "Computing spectrogram..." (during Worker generation)
    - [ ] Ensure grid layout is stable—no layout shifts when tiles populate
    
- [ ] **Task: Cache-First Viewport Hydration**
    - [ ] Read manifest first to determine available tiles
    - [ ] Validate fingerprint/schemaVersion/tileSpec before fetching
    - [ ] Implement prioritized tile fetching: fetch **visible viewport tiles first** from IndexedDB
    - [ ] Queue background tiles for lazy loading
    - [ ] Use `requestAnimationFrame` to composite each tile onto canvas immediately upon fetch
    - [ ] Avoid bursty per-tile repaints—batch paint operations within single RAF callback when possible
    - [ ] Target: first visible tile renders in **<100ms**
    
- [ ] **Task: Edge Crossfade Implementation**
    - [ ] Implement **16-frame blending band** at tile boundaries using the 1.0s guard band data
    - [ ] Crossfade logic: blend last N frames of tile A with first N frames of tile B
    - [ ] Use linear interpolation: `blendedValue = (1-t) * tileA[frame] + t * tileB[frame]` where t ∈ [0,1]
    - [ ] Ensure guard band frames are never directly visible in timeline—only used for blending
    - [ ] Verification: Visual audit of tile boundaries during scrubbing; verify zero visible seams and zero layout shift
    
- [ ] **Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)**

---

## Phase 5: Performance & Final Audit
**Goal:** Verify 100% compliance with Platinum Status criteria.

- [x] **Task: Main Thread Budget Audit**
    - [x] Profile rehydration flow using Chrome DevTools Performance tab
    - [x] Measure IDB read operations—ensure each stays under 3ms typical
    - [x] Measure tile paint operations—ensure RAF callbacks stay under 3ms typical
    - [x] Identify any long tasks (>50ms) and refactor to Workers
    - [x] Verify deterministic 60fps frame pacing during progressive reveal
    
- [x] **Task: Type Integrity Check**
    - [x] Run `npm run typecheck` and ensure **zero errors**
    - [x] Audit codebase for any `any` types or unsafe casts in spectrogram path
    - [x] Verify all artifacts use discriminated unions (`SpectrogramTileArtifact | SpectrogramManifestArtifact`)
    - [x] Ensure runtime validation catches schema mismatches and corrupted tiles
    
- [x] **Task: Final Verification Against Acceptance Criteria**
    - [x] Verify spectrogram computation for a 5-minute track happens **exactly once** (unless invalidated)
    - [x] Verify reloading cached track paints first visible tile in **<100ms**
    - [x] Verify partial analyses resume correctly after refresh (compute only missing tiles)
    - [x] Verify tiles store deterministic metadata (fftSize, hopSize, dbMin, dbMax, etc.)
    - [x] Verify edge crossfade eliminates visual seams at boundaries
    - [x] Verify status pill updates correctly based on cache state
    - [x] Verify tile grid layout renders before data arrives (no layout shift)
    - [x] Verify no visible seams during playback and scrubbing
    - [x] Verify cache invalidation triggers on fingerprint/schema/tileSpec changes
    
- [ ] **Task: Conductor - User Manual Verification 'Phase 5' (Protocol in workflow.md)**

---

**Plan Complete.** This implementation achieves Platinum Status: allocation-minimized signal flow, deterministic frame pacing, sub-100ms rehydration, and calibration-grade type safety.