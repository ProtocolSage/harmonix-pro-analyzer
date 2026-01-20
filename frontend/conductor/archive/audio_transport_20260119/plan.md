# Track Plan: Audio Transport & Playback Sync

## Phase 1: Core Transport & Node Management
- [x] Task: Create `src/engines/AudioTransportEngine.ts` to manage `AudioBufferSourceNode` lifecycle.
  - Sub-task: Implement `play(offset)`, `pause()`, and `stop()` logic with 5-10ms linear fades.
  - Sub-task: Implement `seek(time)` with strict node disposal and re-scheduling.
  - Sub-task: Handle `sampleRate` mismatch (buffer vs context) in offset calculations.
  - Sub-task: Expose `duration` and `currentTime` for external UI consumption.
- [x] Task: Write Tests: Verify node disposal on seek and correct offset math under sample-rate mismatch.
- [x] Task: Write Tests: Verify rapid play/stop/start stress test (ensure no node overlap or audible pops).
- [x] Task: Conductor - User Manual Verification 'Core Transport' (Protocol in workflow.md)

## Phase 2: Synchronization & Data Bridge
- [x] Task: Implement `requestAnimationFrame` loop in `AudioTransportEngine` for hot-path clock tracking.
- [x] Task: Implement `SharedArrayBuffer` (SAB) data bridge for 60fps time broadcast.
  - Sub-task: Add cross-origin isolation check.
  - Sub-task: Implement `MessageChannel` fallback for non-SAB environments.
- [x] Task: Update `src/workers/visualization.worker.ts` to read/receive time from the bridge.
- [x] Task: Write Tests: Verify both SAB and MessageChannel paths stay within 10ms tolerance.
- [x] Task: Write Tests: Simulate tab throttling (rAF clamped to 1Hz) and ensure system re-syncs on wake.
- [x] Task: Conductor - User Manual Verification 'Sync Bridge' (Protocol in workflow.md)

## Phase 3: Looping & Precision
- [x] Task: Implement A/B loop point management.
  - Sub-task: Implement sample-accurate rescheduling at boundary B -> A.
  - Sub-task: Implement 1ms epsilon handling for boundary stability.
- [x] Task: Implement `audioContext` lifecycle handling (suspend/resume) for tab visibility.
- [x] Task: Write Tests: Verify loop boundaries are respected with zero cumulative drift over 10 cycles.
- [x] Task: Write Tests: Verify 1ms epsilon prevents double-triggering at boundaries.
- [x] Task: Conductor - User Manual Verification 'Looping & Stability' (Protocol in workflow.md)

## Phase 4: Seek Optimization & Hybrid Path
- [x] Task: Implement "Light Path" for immediate UI playhead updates in rAF.
- [x] Task: Implement "Heavy Path" throttled worker reset (100ms).
  - Sub-task: Implement `AbortController` for worker re-analysis cancellation.
  - Sub-task: Implement 100ms "Settle" debounce for the final worker reset.
  - Sub-task: Add `audioId` matching to ignore stale worker responses.
- [x] Task: Write Tests: Verify rapid scrubbing only triggers one heavy reset per 100ms + one final commit on settle.
- [x] Task: Write Tests: Verify `AbortController` successfully cancels stale worker work.
- [x] Task: Conductor - User Manual Verification 'Scrubbing Optimization' (Protocol in workflow.md)

## Phase 5: Integration & Final Polish
- [ ] Task: Connect `AudioTransportEngine` to existing components (`WaveformVisualizer`, `TransportControls`).
- [ ] Task: Performance Audit: Add `performance.mark` probes to verify <3ms main-thread budget during active scrubbing.
- [ ] Task: Conductor - User Manual Verification 'Full Integration' (Protocol in workflow.md)