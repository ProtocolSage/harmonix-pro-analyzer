# Track Plan: Architectural Stabilization & Critical Refactoring

## Phase 1: Type Safety (The Foundation)
- [x] Task: Audit and define strict types for `MLInferenceEngine.ts` inputs/outputs (remove `any` usage).
- [x] Task: Audit `essentiaWorkerProtocol.ts` and ensure strict type guards for all message payloads.
- [x] Task: Refactor `RealEssentiaAudioEngine.ts` to use strict types for all internal methods (`decodeAudioFile`, `analyzeWithWorker`).
- [x] Task: Verification: Run `npm run typecheck` and ensure zero errors in target files.
- [x] Task: Conductor - User Manual Verification 'Type Safety' (Protocol in workflow.md)

## Phase 2: Worker Stability (Robustness)
- [x] Task: Create a regression test `Worker.error.test.ts` that simulates `WORKER_ERROR` (init failure) and asserts engine cleanup.
- [x] Task: Create a regression test that simulates `ANALYSIS_ERROR` (corrupt audio data) and asserts promise rejection.
- [x] Task: Implement/Verify timeout handling in `RealEssentiaAudioEngine` (ensure `abort()` correctly terminates worker).
- [x] Task: Conductor - User Manual Verification 'Worker Stability' (Protocol in workflow.md)

## Phase 3: Component Splitting (MainStage.tsx)
- [x] Task: Extract `WaveformContainer` from `MainStage.tsx` into its own atomic component.
- [x] Task: Extract `AnalysisOverlay` from `MainStage.tsx` into its own atomic component.
- [x] Task: Extract `TimelineGrid` from `MainStage.tsx` into its own atomic component.
- [x] Task: Create smoke tests (`MainStage.test.tsx`) to verify composition of new sub-components.
- [x] Task: Conductor - User Manual Verification 'MainStage Refactor' (Protocol in workflow.md)

## Phase 4: Component Splitting (ExportFunctionality.tsx)
- [x] Task: Extract `FormatSelector` from `ExportFunctionality.tsx`.
- [x] Task: Extract `MetadataEditor` from `ExportFunctionality.tsx`.
- [x] Task: Extract `ExportProgress` from `ExportFunctionality.tsx`.
- [x] Task: Create smoke tests for `ExportFunctionality.tsx`.
- [x] Task: Conductor - User Manual Verification 'Export Refactor' (Protocol in workflow.md)
