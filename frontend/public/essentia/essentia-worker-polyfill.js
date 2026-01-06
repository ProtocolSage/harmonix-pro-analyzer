/**
 * Essentia.js Worker Polyfill
 * 
 * This polyfill provides fake DOM APIs for Essentia.js to work in Web Workers.
 * Load this BEFORE loading Essentia.js in your worker.
 */

// Polyfill document for web workers
if (typeof document === 'undefined') {
  self.document = {
    createElement: function(tagName) {
      // Return a fake canvas element if that's what they want
      if (tagName === 'canvas') {
        return {
          getContext: function() {
            return {
              // Fake canvas context methods that Essentia might use
              createImageData: function() { return {}; },
              getImageData: function() { return { data: [] }; },
              putImageData: function() {},
              drawImage: function() {},
              // Add more methods as needed based on errors
            };
          },
          width: 0,
          height: 0,
          style: {},
          addEventListener: function() {},
          removeEventListener: function() {}
        };
      }
      // Return a generic fake element for other tags
      return {
        style: {},
        appendChild: function() {},
        removeChild: function() {},
        addEventListener: function() {},
        removeEventListener: function() {},
        setAttribute: function() {},
        getAttribute: function() { return null; }
      };
    },
    createTextNode: function() { return {}; },
    getElementById: function() { return null; },
    getElementsByTagName: function() { return []; },
    querySelector: function() { return null; },
    querySelectorAll: function() { return []; },
    body: {
      appendChild: function() {},
      removeChild: function() {}
    },
    head: {
      appendChild: function() {},
      removeChild: function() {}
    },
    addEventListener: function() {},
    removeEventListener: function() {},
    location: {
      href: '',
      protocol: 'https:',
      host: 'localhost',
      hostname: 'localhost',
      port: '',
      pathname: '/',
      search: '',
      hash: ''
    }
  };
}

// Polyfill window for web workers
if (typeof window === 'undefined') {
  self.window = self;
}

// Polyfill navigator if needed
if (typeof navigator === 'undefined') {
  self.navigator = {
    userAgent: 'Mozilla/5.0 (Web Worker)',
    platform: 'Web Worker',
    language: 'en-US',
    languages: ['en-US'],
    onLine: true
  };
}

console.log('🩹 Essentia.js worker polyfill loaded');
