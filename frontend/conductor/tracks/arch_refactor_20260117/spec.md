# Track Specification: Architectural Stabilization & Critical Refactoring

## 1. Goal
To stabilize the codebase by eliminating technical debt in three critical areas: Type Safety, Component Architecture, and Worker Reliability. This track prepares the "ground" for advanced features by ensuring the foundation is solid, type-safe, and modular.

## 2. Scope & Outcomes

### 2.1 Type Safety (Zero Tolerance)
- **Target:** `RealEssentiaAudioEngine.ts`, `MLInferenceEngine.ts`, `src/workers/essentiaWorkerProtocol.ts`.
- **Constraint:** Zero usage of `any` or `unknown` (unless strictly guarded).
- **Deliverables:**
  - Strict interfaces for all Worker messages (`WorkerInboundMessage`, `WorkerOutboundMessage`).
  - Strict interfaces for ML Model inputs/outputs.
  - Passing `npm run typecheck` with no suppressions in these files.

### 2.2 Component Splitting (Atomic Design)
- **Target:** `src/components/shell/MainStage.tsx` (~490 lines) and `src/components/ExportFunctionality.tsx` (~414 lines).
- **Goal:** Decompose into atomic sub-components <150 lines each.
- **Constraint:** Unchanged behavior. The refactor must be purely structural.
- **Deliverables:**
  - `MainStage` split into: `WaveformContainer`, `AnalysisOverlay`, `TimelineGrid`.
  - `ExportFunctionality` split into: `FormatSelector`, `MetadataEditor`, `ExportProgress`.
  - Smoke tests (React Testing Library) verifying that sub-components render correctly.

### 2.3 Worker Stability (Robustness)
- **Target:** `src/engines/RealEssentiaAudioEngine.ts` and `src/workers/essentia-analysis-worker.js`.
- **Goal:** Reproducible handling of all failure modes.
- **Deliverables:**
  - Verified handling of: `WORKER_ERROR` (init failure), `ANALYSIS_ERROR` (corrupt file), and Timeouts.
  - Regression test script (integration test) that forces these errors and asserts correct recovery/cleanup.

## 3. Technical Approach
- **Refactor Pattern:** "Strangler Fig" for components (extract one sub-component at a time).
- **Testing:** Use `vitest` for type/logic verification and `testing-library` for component smoke tests.
- **Verification:** Run `npm run typecheck` and `npm run test` after every single task.
