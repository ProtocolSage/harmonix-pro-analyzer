# Implementation Plan: Session Persistence & Library

## Phase 1: Infrastructure (Storage Layer)
- [ ] **Install Dependency**: `npm install idb`
- [ ] **Create `DBService`**: `src/services/DBService.ts`
    - [ ] Initialize DB with schema versioning (`tracks`, `sessions`).
    - [ ] Implement migration strategy.
    - [ ] **Robustness**: Add error boundary for quota exceeded.
    - [ ] **Fallback**: Implement graceful degradation if IndexedDB is unavailable (e.g., private mode).
    - [ ] Methods: `saveTrack`, `getTrack`, `getAllTracks`, `deleteTrack`, `saveSession`, `getSession`.
- [ ] **Create `HashUtils`**: Utility for SHA-256 calculation (first 1MB + file size) for robust deduplication.

## Phase 2A: Analysis Integration (Saving)
- [ ] **Modify `AnalysisContext`**:
    - [ ] Hook into analysis completion (Spectral, Essentia, ML).
    - [ ] Call `DBService.saveTrack` with combined results.
- [ ] **Implement `ThumbnailGenerator`**:
    - [ ] Service to capture a small PNG/WebP of the Spectrogram canvas.
    - [ ] Save thumbnail blob to `TrackRecord`.

## Phase 3: Library UI
- [ ] **Create `LibraryContext`**:
    - [ ] Manage `tracks` list state.
    - [ ] Handle loading/error states for the library view.
- [ ] **Create `LibraryPanel` component**:
    - [ ] `src/components/library/LibraryPanel.tsx` (Sidebar container).
    - [ ] `src/components/library/TrackListItem.tsx` (Thumbnail, Metadata, Chips).
    - [ ] Handle **Empty State** ("No tracks analyzed yet").
    - [ ] **Performance**: Use virtualization (or simple pagination) if list grows large.
- [ ] **Update `Sidebar`**:
    - [ ] Add navigation/tabs to toggle between "Active Analysis" and "Library".

## Phase 2B: Cache Loading (Optimization)
- [ ] **Modify `AudioTransportEngine` / `App`**:
    - [ ] On file drop -> Calculate Hash -> Query `DBService`.
    - [ ] **If Hit**: Dispatch `LOAD_FROM_CACHE` action.
- [ ] **Hydration Logic**:
    - [ ] Skip Essentia/ML workers.
    - [ ] Populate `AnalysisContext` directly from DB record.
    - [ ] Display "Loaded from Library" notification.

## Phase 4: Session Restoration
- [ ] **Create `SessionManager`**:
    - [ ] Subscribe to `VisualizerContext`, `LayoutContext`, `TransportContext`.
    - [ ] **Debounce Save**: Persist state after 500ms idle.
    - [ ] **Safety Net**: Hook `window.addEventListener('beforeunload')` for final save.
- [ ] **Boot Logic**:
    - [ ] Read `sessions` store on mount.
    - [ ] Dispatch restoration actions to Contexts.
    - [ ] Handle **Schema Version Mismatches** (reset session if invalid).

## Phase 5: Verification & Robustness
- [ ] **Test**: **Deletion** -> Verify removed from UI and DB.
- [ ] **Test**: **Quota Exceeded** -> Verify user is warned and app doesn't crash.
- [ ] **Test**: **Corrupt DB** -> Verify "Reset Database" recovery option works.
- [ ] **Test**: **Refresh Cycle** -> Analyze -> Refresh -> Verify Library & Visualizer settings.
- [ ] **Test**: **Duplicate Drop** -> Verify instant load (no re-analysis).