# Track Specification: Audio Transport & Playback Sync

## 1. Goal
Implement a sample-accurate audio transport system with synchronized real-time visualizations. The system must maintain UI fluidity by using a "No-React" hot path for playhead tracking, ensuring visual alignment between the audio clock and visualizer frames.

## 2. Architecture & Technical Approach

### 2.1 Transport Layer (`AudioBufferSourceNode`)
- **Node Management:** Use `AudioBufferSourceNode` for playback. Adhere to a strict **stop/dispose/re-schedule** pattern on every seek or loop boundary to prevent node leaks.
- **Audio Integrity:** Apply a short linear fade (5-10ms) on start/stop/seek actions to prevent audible clicks.
- **Clock Tracking:** Calculate offsets in **seconds** (float) respecting `audioContext.sampleRate`. 
- **Looping:** Implement precise A/B loop points. Use a tiny epsilon (e.g., 1ms) on boundaries to avoid double-triggering or scheduling collisions at exact timestamps.
- **Context Lifecycle:** Explicitly handle `audioContext` suspend/resume. On resume (tab wake), reset clock deltas and re-align the rAF loop to the current `audioContext.currentTime`.

### 2.2 Synchronization Protocol
- **Hot Path:** Drive the UI playhead and visualizer sync via a main-thread `requestAnimationFrame` (rAF) loop targeting 60fps.
- **Data Bridge:** 
  - **Primary:** Use `SharedArrayBuffer` (SAB) to write `currentTime` at 60fps if cross-origin isolation is active.
  - **Fallback:** Gracefully degrade to `MessageChannel` (`SYNC_TIME` events) if SAB is unavailable.
- **Worker Communication:** The Visualizer Worker reads/receives time for frame alignment.

### 2.3 Seek & Scrubbing Logic (Hybrid Path)
- **Visual Feedback (Light Path):** Update the playhead cursor and waveform indicators **immediately** (rAF) with zero throttling.
- **Worker Management (Heavy Path):** 
  - **Throttle:** Commit re-analysis or state resets at a fixed 100ms interval during active scrubbing. This **only** applies to the heavy worker reset, not the UI cursor.
  - **Cancellation:** Abort in-flight worker requests when a new seek is committed.
  - **Debounce on Settle:** Dispatch the final, non-throttled worker request 100ms after the last user input.

## 3. Functional Requirements
- **Transport Controls:** Play, Pause, Stop, and Seek functionality.
- **Loop Regions:** Define and toggle A/B loop points with sample-accurate scheduling.
- **Time Exposure:** Expose `currentTime` and `duration` for external UI updates.

## 4. Non-Functional Requirements
- **Performance:** Main-thread logic must remain under 3ms per frame.
- **React Optimization:** Zero React state churn for the playhead; use `refs` and direct DOM manipulation.
- **Sync Tolerance:** Playhead and visuals must stay aligned within **5–10ms**.

## 5. Acceptance Criteria
- **Precision:** Looping at A/B points is seamless and sample-accurate.
- **Fluidity:** Playback and scrubbing remain smooth without "render storms."
- **Robustness:** Rapid scrubbing cancels pending worker tasks and correctly renders the final position only.
- **Wake Behavior:** System re-syncs accurately after the tab has been backgrounded and the audio context resumes.

## 6. Out of Scope
- Playlist or queue management.
- New DSP/Analysis features.
