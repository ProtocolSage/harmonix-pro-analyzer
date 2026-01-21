# Specification: Spectrogram as a Persistent Artifact

## 1. Overview
Implement the spectrogram visualization as a first-class, versioned, and persistent artifact within the Harmonix Pro Stateful Workbench architecture. This track moves the spectrogram from a transient view to a stateful instrument that is computed once, cached in segments (tiles) to IndexedDB, and rehydrated instantly on session restoration. Rehydration must prefer cache and only recompute on invalidation.

## 2. Functional Requirements

### 2.1 Tiled Storage Architecture
- **Tile Duration (Visible):** 30 seconds per tile for UI grid layout.
- **Guard Band (Platinum Tweak):** Each tile stores an additional **+0.5s overlap on both ends** (1.0s total guard band) strictly for seam-free rendering. The UI grid remains **non-overlapping 30s slots**; guard bands are internal to tile storage and not exposed to the timeline.
- **Indexing:** Each tile is stored as a unique artifact in IndexedDB with keyPath: `[trackId, 'spectrogram_tile', tileKey]`
  - `tileKey` format (deterministic): `t:${tileIndex}` (0-based index)
- **Manifest System:** A `spectrogram_manifest` artifact must track:
  - **Tile Specification:** `tileSeconds`, `guardSeconds`, `freqBins`, `hopSize`, `windowSize`, `sampleRateUsed`
  - **Cache Validation:** `audioFingerprint`, `schemaVersion`
  - **Completion Tracking:** `completedTiles` as a compact structure (recommended: boolean bitmap or tile index ranges)
- **Tile Metadata:** Each tile artifact must include deterministic metadata:
  - **DSP Parameters:** `fftSize`, `hopSize`, `sampleRate`, `windowFunction`, `freqBins`, `timeFrames`
  - **Normalization:** `dbMin` (-100), `dbMax` (0), `gamma` (for rendering normalization)
  - **Positioning:** `tileStartSec`, `tileDurationSec` (30s visible + 1s guard band = 31s total)
  - **Validation:** `schemaVersion`, `audioFingerprint` (for cache validation)

### 2.2 Data Representation & Normalization
- **Quantization:** Magnitudes must be normalized to Uint8 (0-255) within the Worker thread.
- **Scaling:** Use a fixed dB range of **-100dB to 0dB** mapped to **0 to 255** (clamped).
- **Serialization:** Tiles are stored as raw `ArrayBuffer` payloads to maximize rehydration speed and minimize GC pressure.
- **Tile Payload Layout (Deterministic):**
  - Row-major format: `timeFrames × frequencyBins`
  - Access pattern: `Uint8Array(buffer)[frameIndex * bins + binIndex]`

### 2.3 Rehydration & Rendering
- **Progressive Reveal:** Individual tiles must render immediately upon IndexedDB fetch completion, composited via `requestAnimationFrame` to maintain deterministic 60fps pacing. No bursty per-tile repaints.
- **Deterministic Grid:** The layout must be fixed before hydration; tiles fill their reserved slots without shifting the UI. Grid layout renders deterministically before tile data arrives (no layout shift).
- **Seam Management (Platinum):** The renderer must implement a **16-frame edge crossfade band** to eliminate visual artifacts between adjacent tiles. Use the stored guard band to blend the end of tile N with the start of tile N+1 for seamless transitions.
- **UI Feedback:** Display a minimal status pill:
  - "Loading cached spectrogram..." during hydration (cache hit path)
  - "Computing spectrogram..." during fresh analysis (cache miss/invalidation path)

### 2.4 Persistence Workflow
- **Authoritative Ownership:**
  - Worker computes tiles (no UI-thread DSP)
  - Main thread owns persistence and commits tiles through SessionManager/DBService
- **Write Strategy (Platinum):**
  - **Dual-Trigger Flush:** Flush pending tiles to IndexedDB when:
    1. Tile queue reaches **5 tiles**, OR
    2. **250ms** has elapsed since last flush (whichever comes first)
  - **Additional Flush Points:** On analysis completion and `pagehide` event (best-effort survivability)
  - **Coalesced Writes:** Use `dbService.putArtifactsBatch(batch)` to ensure all tiles in a batch are committed within a single IndexedDB transaction
- **Resume Behavior:**
  - On load, read manifest first
  - If manifest valid + fingerprint matches: fetch required tiles and render progressively
  - If partial tiles exist: compute only missing tiles and continue committing to resume interrupted analysis
- **Survivability:** Ensure partial progress persists across browser refreshes and crashes

### 2.5 Cache Invalidation
Invalidate cache and recompute when any of the following mismatch:
- `audioFingerprint` (track content changed)
- `schemaVersion` (tile schema changed)
- `tileSpec` parameters (bins/hop/window/range changed)
- Tile corruption detected (deserialize bounds / buffer size mismatch)

**On Invalidation:**
- Delete all spectrogram tiles + manifest for that track
- Recompute from scratch
- Log invalidation reason for debugging

## 3. Non-Functional Requirements

### 3.1 Platinum Status Performance
- **Rehydration Target:** First visible tile must paint in **<100ms** (cache hit path).
- **No UI-Thread DSP:** All spectrogram generation must run in a Worker. Zero DSP on main thread.
- **Deterministic Frame Pacing:** Tile painting must be rAF-paced to maintain consistent 60fps rendering. Avoid long main-thread tasks.
- **Allocation-Minimized Signal Flow:** Reuse tile buffers end-to-end (computation → serialization → render) with no repacking or per-frame allocations. IDB boundary involves structured clone; post-fetch is zero-copy within app pipeline. Use transferable ArrayBuffers from Worker → main thread where feasible.
- **Main Thread Integrity:** All IDB interactions, serialization, and paint scheduling must maintain the **<3ms main-thread budget** per frame for typical workload.

### 3.2 Type Safety & Integrity
- **Discriminated Unions:** All spectrogram artifacts must use the `SpectrogramTileArtifact` and `SpectrogramManifestArtifact` types defined in `persistence.ts`. Never use unsafe casts.
- **Schema Versioning:** Implement runtime validation at deserialization; invalidate and recompute if `schemaVersion` or audio fingerprint mismatches.
- **Runtime Validation:** Reject invalid artifacts at read time; fall back to recomputation if corrupted (buffer size mismatch, invalid metadata, etc.).

## 4. Acceptance Criteria
- [ ] Spectrogram computation for a 5-minute track happens exactly once (unless invalidated).
- [ ] Reloading a track from the library hydrates the visible portion of the spectrogram in <100ms.
- [ ] Partial analyses are resumed correctly after a browser refresh or crash (compute only missing tiles).
- [ ] Tiles store deterministic metadata (fftSize, hopSize, dbMin, dbMax, etc.) for render-time validation.
- [ ] Edge crossfade rendering (16 frames) eliminates visual seams between adjacent tiles using guard band overlap.
- [ ] Status pill updates correctly: "Loading cached..." vs "Computing..." based on cache state.
- [ ] Tile grid layout renders deterministically before tile data arrives (no layout shift).
- [ ] No visible seams at tile boundaries under normal playback and scrubbing.
- [ ] `npm run typecheck` passes with zero errors.
- [ ] Cache invalidation triggers correctly when audio fingerprint, schema version, or tile spec changes.

## 5. Out of Scope
- Multi-resolution LOD (Level of Detail) layers for zooming (Future Phase).
- Persistent spectrogram "Ghost Layer" overlays for comparison mode (Future Phase).
- Real-time spectrogram updates during playback (current phase focuses on static analysis).
