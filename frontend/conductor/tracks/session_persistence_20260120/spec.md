# Track Specification: Session Persistence & Library

## 1. Overview
Transform Harmonix into a stateful workstation by implementing **IndexedDB** storage. Users should be able to analyze a track, close the browser, and return later to find their results and settings preserved.

## 2. Core Features

### 2.1 Storage Engine (IndexedDB)
*   **Database Name**: `harmonix_db`
*   **Stores**:
    *   `tracks`: Stores audio metadata and heavy analysis blobs.
    *   `sessions`: Stores UI state (visualizer settings, layout).
*   **Library**: Use `idb` (lightweight Promise wrapper) for cleanliness.

### 2.2 Data Models

#### Track Record
```typescript
interface TrackRecord {
  id: string;              // Fingerprint (SHA-256 of first 1MB + size + name)
  filename: string;
  dateAdded: number;
  duration: number;
  analysis: {
    full: AudioAnalysisResult; // The unified result blob
    spectral: {
      bpm?: number;
      key?: string;
      energy?: number;
    };
    tags: {
      genre: string[];
      mood: string[];
    };
  };
}
```

### 2.3 UI Components

#### Library Panel (New Sidebar Tab)
*   **Location**: Rendered in `MainStage` when `mode === 'library'`.
*   **Content**: Scrollable list of analyzed tracks.
*   **Item Layout**: 
    *   Thumbnail placeholder (icon).
    *   Title & Duration.
    *   Chips: BPM, Key, Top Genre.
*   **Actions**: Load (Hydrate), Delete, Clear All.

## 3. Technical Integration

### 3.1 Analysis Pipeline Hook
*   **Trigger**: In `App-Production.tsx` -> `startAnalysis` -> on success.
*   **Action**: Compute Hash -> Normalize Data -> `dbService.saveTrack`.

### 3.2 Loading
*   **Action**: User clicks track in Library.
*   **Result**: `analysis.completeAnalysis` is called with the stored blob. `playback` is reset (file missing).

## 4. User Flows
1.  **User drops file**: Analyzed & Saved automatically.
2.  **User clicks Library**: Sees history.
3.  **User clicks Item**: Analysis results load instantly.