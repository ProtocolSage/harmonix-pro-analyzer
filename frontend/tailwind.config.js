/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      backdropBlur: {
        'xs': '2px',
      },
      colors: {
        // Legacy glass colors (keep for now)
        'glass': {
          50: 'rgba(255, 255, 255, 0.1)',
          100: 'rgba(255, 255, 255, 0.2)',
          200: 'rgba(255, 255, 255, 0.3)',
        },
        // New DAW theme colors (Phase 0-1)
        bg: {
          0: 'var(--bg-0)',
          1: 'var(--bg-1)',
          2: 'var(--bg-2)',
          3: 'var(--bg-3)',
        },
        border: 'var(--border)',
        gridline: 'var(--gridline)',
        text: {
          1: 'var(--text-1)',
          2: 'var(--text-2)',
          3: 'var(--text-3)',
          disabled: 'var(--text-disabled)',
        },
        accent: {
          brand: 'var(--accent-brand)',
          'brand-soft': 'var(--accent-brand-soft)',
          spectral: 'var(--accent-spectral)',
          mfcc: 'var(--accent-mfcc)',
          tempo: 'var(--accent-tempo)',
          key: 'var(--accent-key)',
          dynamics: 'var(--accent-dynamics)',
          segments: 'var(--accent-segments)',
        },
        error: 'var(--error)',
        warning: 'var(--warning)',
        success: 'var(--success)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
      },
      spacing: {
        xs: 'var(--space-xs)',
        sm: 'var(--space-sm)',
        md: 'var(--space-md)',
        lg: 'var(--space-lg)',
        xl: 'var(--space-xl)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
        sm: 'var(--radius-sm)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        focus: 'var(--shadow-focus)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        standard: 'var(--duration-standard)',
      },
    },
  },
  plugins: [],
}