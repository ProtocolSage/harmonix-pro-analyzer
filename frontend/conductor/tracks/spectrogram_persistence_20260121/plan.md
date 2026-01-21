# Implementation Plan: Spectrogram as a Persistent Artifact (Platinum Canon)

## Phase 1: Persistence Schema & Manifest
**Goal:** Establish the type-safe foundation for tiled storage, manifest tracking, and atomic cleanup.

- [x] **Task: Define Artifact Types**
    - [x] Update `src/types/persistence.ts` to include:
        - `SpectrogramTileArtifact` (`type: 'spectrogram_tile'`, `codec: 'raw'`)
        - `SpectrogramManifestArtifact` (`type: 'spectrogram_manifest'`, `codec: 'json'`)
    - [x] Ensure all artifact interfaces include:
        - `schemaVersion`
        - `audioFingerprint`
        - deterministic metadata (at minimum: `fftSize`, `hopSize`, `sampleRate`, `windowFunction`, `freqBins`, `timeFrames`, `dbMin`, `dbMax`, `gamma`, `tileStartSec`, `tileDurationSec`)
    - [x] **Lock key contract**
        - Tile key format **MUST** be `t:${tileIndex}` (0-based)
        - Manifest key **MUST** be `'default'`
    - [x] Define manifest structure:
        - `tileSpec` (DSP determinism contract)
        - `completedTiles` (bitmap preferred; ranges acceptable if compact)
        - `fingerprint`
        - `schemaVersion`
- [x] **Task: Extend DBService API (Atomic Operations)**
    - [x] Add `listArtifactsByType(trackId, type)` for bulk tile queries
    - [x] Add `deleteArtifactsByType(trackId, type)` for invalidation cascades (single transaction)
    - [x] Ensure `putArtifactsBatch(artifacts)` uses **a single IDB transaction** for all writes
    - [x] (If needed) Add `getArtifactsKeysByTrackAndType(trackId, type)` only for targeted deletes; otherwise delete-by-index
- [x] **Task: Implement Manifest Logic in SessionManager**
    - [x] `initSpectrogramManifest(trackId, tileSpec)` creates manifest (key `'default'`)
    - [x] `readSpectrogramManifest(trackId)` with runtime schema validation
    - [x] `updateManifestCompletion(trackId, tileIndex)` marks completion (bitmap recommended)
    - [x] Unit tests:
        - manifest serialization/deserialization
        - completion tracking correctness
- [ ] **Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)**

## Phase 2: Worker-Side Spectrogram Tiling
**Goal:** Move spectrogram generation to the Worker and implement tiled quantization with a deterministic DSP contract.

- [x] **Task: Deterministic DSP Contract**
    - [x] Hard-pin: `windowSize`, `hopSize`, `fftSize`, `freqBins`, `windowFunction`, `sampleRateUsed`, `dbMin=-100`, `dbMax=0`, `gamma`
    - [x] Persist contract in `manifest.tileSpec`
    - [x] **Any tileSpec change ⇒ invalidate cache**
- [x] **Task: Refactor Spectrogram Worker**
    - [x] Chunked FFT with **30s visible window + 0.5s guard band on each end** (**31s total per tile payload**)
    - [x] Uint8 normalization: clamp to `[-100dB, 0dB]`, map → `[0..255]`
    - [x] Row-major layout:
        - `Uint8Array(buffer)[frameIndex * freqBins + binIndex]`
    - [x] Use Transferables for zero-copy `ArrayBuffer` transfer Worker → main thread
    - [x] Worker emits each tile with deterministic metadata and validation fields (`schemaVersion`, `audioFingerprint`)
- [x] **Task: Implement Tile Header Generation**
    - [x] Emit metadata:
        - DSP params: `fftSize`, `hopSize`, `sampleRate`, `windowFunction`, `freqBins`, `timeFrames`
        - normalization: `dbMin=-100`, `dbMax=0`, `gamma`
        - positioning: `tileStartSec`, `tileDurationSec=31` (payload includes guard)
        - validation: `schemaVersion`, `audioFingerprint`
    - [x] Integration tests:
        - Uint8 range is `[0..255]`
        - buffer length matches `timeFrames * freqBins` bytes
        - metadata completeness
- [ ] **Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)**

## Phase 3: Authoritative Write Pipeline
**Goal:** Dual-trigger flush with survivability, corruption detection, and cache invalidation.

- [x] **Task: Implement Dual-Trigger Flush**
    - [x] Add `pendingSpectrogramTiles: Map<string, SpectrogramTileArtifact>` to SessionManager
    - [x] Timer flush every **250ms** if pending > 0
    - [x] Count flush when pending reaches **5 tiles**
    - [x] Use `dbService.putArtifactsBatch(batch)` for atomic commits
    - [x] Clear pending entries only after successful tx.done. On tx failure: retry batch once; on second failure: log error and drop tiles (corruption scenario).
- [x] **Task: Cache Validation & Invalidation (Delete-then-Recompute)**
    - [x] `validateSpectrogramCache(trackId)` checks:
        - manifest exists + parses
        - `audioFingerprint` matches
        - `schemaVersion` matches
        - `tileSpec` matches pinned DSP contract
        - tile integrity checks pass (see below)
    - [x] Invalidate by:
        - `deleteArtifactsByType(trackId, 'spectrogram_tile')`
        - delete manifest `deleteArtifact(trackId, 'spectrogram_manifest', 'default')` (or equivalent)
        - log reason
        - trigger recompute
- [x] **Task: Corruption Detection & Local Repair**
    - [x] Validate each tile buffer:
        - `byteLength === timeFrames * freqBins` (Uint8)
    - [x] If corrupt:
        - delete tile
        - mark incomplete in manifest
        - recompute **only missing tiles**
- [x] **Task: Robustness Hooks**
    - [x] Flush on `analysis_complete`
    - [x] Best-effort flush on `pagehide`
    - [x] Verification:
        - interrupt after tile 3/10
        - refresh
        - resume tiles 4-10 only
- [ ] **Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)**

## Phase 4: Platinum Rehydration & Rendering
**Goal:** Sub-100ms first paint with cache-first orchestration, deterministic layout, and seam-free rendering.

- [x] **Task: Deterministic Grid Layout**
    - [x] Pre-calc total tile count + grid slots before fetching any tiles
    - [x] Render fixed grid (non-overlapping **30s slots**) immediately on mount
    - [x] Status pill:
        - “Loading cached spectrogram...” (IDB hydrate)
        - “Computing spectrogram...” (Worker compute)
    - [x] No layout shift allowed
- [x] **Task: Cache-First Viewport Hydration (Authoritative Order)**
    1. Read manifest
    2. Validate fingerprint/schemaVersion/tileSpec
    3. Fetch visible viewport tiles first from IDB
    4. Paint each tile immediately on arrival, rAF-paced
    5. Backfill remaining tiles lazily
    - [x] rAF compositing:
        - avoid burst repaints
        - batch multiple ready tiles into a single rAF tick where possible
    - [x] Target: first visible tile <100ms
- [x] **Task: Edge Crossfade Implementation**
    - [x] Use **guard band data** to crossfade boundaries
    - [x] Implement 16-frame blending band:
        - blend last N frames of tile A with first N frames of tile B
        - `blended = (1-t)*A + t*B`
    - [x] Guard band is never directly visible—only used for blending
    - [x] Verification: zero visible seams during scrubbing + playback
- [ ] **Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)**

## Phase 5: Performance & Final Audit
**Goal:** Prove Platinum compliance with measurable gates.

- [ ] **Task: Main Thread Budget Audit**
    - [ ] Profile in Chrome DevTools
    - [ ] IDB reads <3ms typical
    - [ ] rAF paint callbacks <3ms typical
    - [ ] No long tasks (>50ms)
    - [ ] Deterministic 60fps pacing during progressive reveal
- [ ] **Task: Type Integrity Check**
    - [ ] `npm run typecheck` passes with zero errors
    - [ ] No `any` / no unsafe casts in spectrogram path
    - [ ] Runtime validation catches schema mismatches + corrupted tiles
- [ ] **Task: Final Verification Against Acceptance Criteria**
    - [ ] 5-minute track spectrogram computes **exactly once** unless invalidated
    - [ ] cached reload first visible tile <100ms
    - [ ] partial analyses resume correctly (missing tiles only)
    - [ ] tile metadata deterministic + complete
    - [ ] crossfade eliminates seams
    - [ ] status pill correct
    - [ ] grid renders before data arrives (no layout shift)
    - [ ] invalidation triggers on fingerprint/schema/tileSpec changes
- [ ] **Task: Conductor - User Manual Verification 'Phase 5' (Protocol in workflow.md)**
