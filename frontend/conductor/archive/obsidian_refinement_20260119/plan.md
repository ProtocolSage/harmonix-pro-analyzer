# Track Plan: Obsidian Workstation Visual Refinement

## Phase 1: Obsidian Chassis & Wells
- [x] Task: Create a global `src/styles/obsidian-theme.css` with the machined obsidian texture.
  - Sub-task: Default theme to static CSS glow (`box-shadow`).
  - Sub-task: Implement light/dark theme support for the Obsidian Chassis.
- [x] Task: Implement `CountersunkWell` wrapper component using CSS `box-shadow` (inset) and top-edge rim highlights.
- [x] Task: Update `App.tsx` and main layout components to use the Obsidian Chassis as the root surface.
- [x] Task: Write Tests: Verify `CountersunkWell` renders with correct depth CSS variables.
- [x] Task: Write Tests: Visual regression snapshot for `CountersunkWell` to lock rim highlights and inset shadows.
- [x] Task: Conductor - User Manual Verification 'Surface Architecture' (Protocol in workflow.md)

## Phase 2: Adaptive Lighting & Bloom
- [x] Task: Create `src/utils/VisualAdaptiveManager.ts` to manage rendering performance.
  - Sub-task: Opt-up: enable reactive bloom when `requestIdleCallback` > 10ms for 60 consecutive frames.
  - Sub-task: Fallback: revert to static when frame budget > 3ms for 30 consecutive frames.
- [x] Task: Implement `ReactiveBloom` utility to LERP the RMS signal and update `--glow-intensity` at 30fps.
  - Sub-task: Apply low-pass filter to the signal to avoid jitter/flicker.
- [x] Task: Connect `AudioTransportEngine` metrics to the `VisualAdaptiveManager`.
- [x] Task: Update visualizer components to use `will-change: filter` and dynamic glow variables.
- [x] Task: Write Tests: Verify Opt-Up/Fallback thresholds and idle-starved scenario (stay static).
- [x] Task: Conductor - User Manual Verification 'Lighting Model' (Protocol in workflow.md)

## Phase 3: Hardware-Feel Controls
- [x] Task: Implement `src/utils/MomentumEngine.ts` to handle inertia, friction (0.95 constant), and clamping logic.
- [x] Task: Create the `PrecisionKnob` component with Hybrid Drag logic, Shift-modifier support, and double-click reset.
  - Sub-task: Implement focus and keyboard accessibility (Tab to focus, Arrow keys for step-adjustment).
- [x] Task: Create `PrecisionFader` component with the same momentum logic for volume/gain controls.
  - Sub-task: Implement focus and keyboard accessibility (Tab to focus, Arrow keys for step-adjustment).
- [x] Task: Add "Precision-Only" global toggle to disable inertia for the workstation.
- [x] Task: Replace standard controls in `TransportControls` and settings with `PrecisionKnob`/`PrecisionFader`.
- [x] Task: Write Tests: Verify momentum decay follows the 0.95 constant and assert double-click reset/precision-toggle logic.
- [x] Task: Write Tests: Verify keyboard navigation and arrow-key value increments for accessibility.
- [x] Task: Conductor - User Manual Verification 'Tactile Interface' (Protocol in workflow.md)

## Phase 4: Intelligence Visuals (Prism Scan)
- [x] Task: Implement `PrismScan` component as a vertical overlay for the Spectral well.
  - Sub-task: Implement 2s max duration and automatic hide on inference completion.
  - Sub-task: Implement pause on tab blur and resume at last recorded position on wake.
- [x] Task: Create the "Pattern Hit" data-blip generator triggered by ML inference events.
- [x] Task: Hook `PrismScan` into the `mlPending` state within the `AnalysisContext`.
- [x] Task: Write Tests: Verify scan lifecycle (max 2s), hide on complete, and blur/resume behavior.
- [x] Task: Conductor - User Manual Verification 'AI Visualization' (Protocol in workflow.md)

## Phase 5: Performance Audit & Polish
- [x] Task: Final CSS polish: SVG noise grain, typography kerning, and color-balance audit.
- [x] Task: Performance Audit: Log main-thread frame times with bloom enabled to confirm < 3ms.
  - Sub-task: Document fallback state if budget is violated on target hardware.
- [x] Task: Conductor - User Manual Verification 'Final Polish' (Protocol in workflow.md)