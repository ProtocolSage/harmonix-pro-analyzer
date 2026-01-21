# Repository Guidelines

## Project Structure & Module Organization
- `frontend/` is the primary React + Vite app. Core code lives in `frontend/src/` (components, engines, hooks, types). Global styling is in `frontend/src/styles/`.
- Runtime assets (Essentia WASM + JS) are copied into `frontend/public/essentia/` by `frontend/scripts/copy-essentia.sh`.
- Supporting directories: `backend/`, `workers/`, `models/`, `docs/`, `deployment/`, and project-level scripts in `scripts/`.

## Build, Test, and Development Commands
Run these from `frontend/`:
- `npm run dev`: starts Vite; runs `predev` to copy Essentia assets.
- `npm run typecheck`: TypeScript typecheck only.
- `npm run lint`: ESLint across `ts/tsx`.
- `npm run test`: runs typecheck + lint.
- `npm run build`: TypeScript build + Vite production build (uses `prebuild`).
- `npm run preview`: serves the production build locally.
- `npm run test:integration`: runs `test-integration.js` (manual/integration flow).

## Coding Style & Naming Conventions
- TypeScript + React functional components with hooks.
- Follow ESLint rules in `frontend/.eslintrc.json` (no `var`, prefer `const`, avoid `any`).
- File naming matches existing patterns: `PascalCase.tsx` for components, `camelCase` for functions/variables, `kebab-case` for scripts.
- Keep styles consistent with existing CSS/Tailwind usage in `frontend/src/styles/` and component class names.

## Testing Guidelines
- There is no dedicated unit-test runner configured; focus on `npm run typecheck`, `npm run lint`, and `npm run test:integration`.
- Integration scripts live in `frontend/test-*.js` and `frontend/src/essentia-integration-test.ts`.
- If adding tests, keep them close to the feature and document how to run them.

## Commit & Pull Request Guidelines
- Git history is minimal (no enforced convention). Use concise, imperative messages (e.g., “Add waveform overlay slot”).
- PRs should include a short summary, UI screenshots for visual changes, and the commands run (e.g., `npm run test`).

## Configuration & Assets
- Essentia assets must exist in `frontend/public/essentia/` for runtime analysis. Use `npm run dev` or run `frontend/scripts/copy-essentia.sh` directly when updating assets.
