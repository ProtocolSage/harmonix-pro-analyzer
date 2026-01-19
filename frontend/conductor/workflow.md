# Conductor Project Workflow

## 1. Development Principles
- **Tiered Test Coverage:**
  - **Core Logic (`src/utils`, `src/engines`):** Strict **>80%** numeric coverage target (enforced via Vitest).
  - **Integration Layer (`src/components`, `src/workers`):** **Flexible** targets. Focus on integration correctness (e.g., "Does the worker respond?") rather than line coverage. No hard numeric gate.
- **Commit Discipline:**
  - Commit after reaching a **stable state** or completing a feature.
  - **Critical Rule:** Never commit broken worker integrations. The main thread/worker handshake must be valid before committing.
- **Documentation:**
  - Use Git Notes to record architectural decisions, context, and next steps for complex tasks.

## 2. Task Lifecycle
Each task in the `plan.md` follows this cycle:
1. **Context:** Read specifications and relevant code.
2. **Test:** Write/Update tests (Unit tests for Logic; Integration tests for Workers).
3. **Implement:** Write code to pass tests.
4. **Verify:** Run full test suite and type check.
5. **Commit:** `git commit` with descriptive message.
6. **Note:** Append context to Git Notes if necessary.

## 3. Phase Completion Verification
At the end of each phase in `plan.md`:
1. **Audit:** Verify strict type safety (no `any`).
2. **Performance Check:** Ensure main thread budget (<3ms) is maintained.
3. **Integration Check:** Verify WASM/Worker loading patterns are stable.