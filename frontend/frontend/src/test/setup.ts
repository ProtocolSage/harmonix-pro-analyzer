import '@testing-library/jest-dom';

// Optional AudioContext polyfill for tests that might instantiate AudioContext
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { AudioContext } = require('standardized-audio-context');
  if (typeof globalThis.AudioContext === 'undefined') {
    (globalThis as any).AudioContext = AudioContext;
  }
} catch (error) {
  // Ignore if not available; streaming tests rely on PCM only
}
