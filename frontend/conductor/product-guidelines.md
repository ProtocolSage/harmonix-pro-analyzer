# Product Guidelines

## Visual Identity
- **Theme:** "Luxurious Precision" (Dark Mode).
- **Aesthetic:** Elegant, expensive, and hyper-polished. Think high-end analog mastering gear meets futuristic precision instruments. It should feel like a piece of crafted hardware, not just a software interface.
- **Color Palette:**
  - **Backgrounds:** Deep, rich "Obsidian" and "Midnight Blue" tones (avoiding flat/neutral greys). Use subtle radial gradients to create depth and warmth.
  - **Surfaces:** Brushed metal textures or matte finishes with extremely subtle noise to break digital flatness.
  - **Accents:** "Jewel Tones" – Sapphire Blue, Emerald Green, and Warm Gold for meters and indicators. These should glow with an inner luminosity.
  - **Typography:** Refined, sans-serif fonts with impeccable kerning. Headers should feel editorial.

## User Experience (UX) Principles
- **Density:** High information density. Users should see spectral analysis, waveforms, and key metrics simultaneously without excessive scrolling.
- **Responsiveness:** Real-time feedback. Visualizers (spectrograms, waveforms) must update at 60fps+ without lag.
- **Immediacy:** "Drop and Analyze." The core workflow should require zero configuration to get the first result.
- **Tactility:** Controls (knobs, faders) should have a sense of "weight" and resistance in their animation physics.

## Tone of Voice
- **Professional:** Use industry-standard terminology (e.g., "Transient," "Spectral Flux," "LUFS") without over-simplification.
- **Concise:** Error messages and tooltips should be direct and actionable.
- **Trustworthy:** Avoid vague promises. If a confidence score is low, explicitly state it.

## Coding Standards (Frontend)
- **Component Structure:** Atomic design principles. Complex widgets (like the Waveform Visualizer) must be broken down into sub-components.
- **State Management:** Local state for UI interactions; React Context or global store for Analysis Results.
- **Performance:** Memoization (`React.memo`, `useMemo`) is mandatory for all visualization components.
