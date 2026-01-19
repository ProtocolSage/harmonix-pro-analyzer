# React Performance Style Guide - Harmonix Pro Analyzer

## Core Directive: The 60FPS Budget
**Keep React off the hot path.** The UI thread has a <16ms budget. React's job is state management, NOT signal processing or high-frequency animation.

## Rendering & Concurrency
- **Non-Blocking UI:** Never run DSP or ML inference on the main thread. All analysis happens in Web Workers.
- **Animation Strategy:**
  - **Do NOT** use `useState` for frame-by-frame updates (e.g., playhead position, VU meter levels).
  - **DO** use `requestAnimationFrame` + `useRef` to manipulate DOM/Canvas directly.
  - **DO** use CSS Transitions/Animations for simple UI state changes (hover, open/close).
- **Rerender Storms:**
  - Memoize heavy visualization components (`React.memo`).
  - Use `useCallback` for event handlers passed to visualizers.
  - Avoid prop drilling high-frequency data.

## Bundle & Architecture
- **Code Splitting:** Lazy load `Essentia.js` (WASM) and `TensorFlow.js` chunks. They should not block the initial "App Shell" paint.
- **Worker Communication:**
  - Use **Transferables** (`ArrayBuffer`) for sending audio data to workers.
  - Use **SharedArrayBuffer** only if COOP/COEP headers are confirmed.
  - **Instrument Stalls:** Log any main-thread task exceeding 50ms using the Performance Observer API.
