# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Harmonix Pro Analyzer is a professional-grade music analysis application powered by Essentia.js WASM and ML models. The frontend is built with React 18 + TypeScript + Vite, featuring research-grade DSP algorithms for audio analysis.

## Common Commands

### Development
```bash
cd frontend
npm install           # Install dependencies
npm run dev          # Start dev server on port 3000
npm run typecheck    # Run TypeScript type checking
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run test         # Run typecheck + lint
```

### Build & Production
```bash
npm run build              # Build for production (with typecheck)
npm run build:prod         # Build with NODE_ENV=production
npm run build:analyze      # Build and analyze bundle size
npm run preview            # Preview production build
```

### Essentia.js Setup (Windows)
```bash
copy-essentia.bat    # Copy Essentia files to public/essentia/
```
This script runs automatically via `predev` and `prebuild` hooks.

## Architecture

### Core Engine Architecture
The application uses a **Web Worker-based architecture** for non-blocking audio analysis:

1. **Main Thread**: UI components, audio context management, file handling
2. **Web Worker**: Essentia.js WASM execution, DSP computations
3. **Service Worker**: Asset preloading, caching Essentia.js files

### Key Engine Files
- `RealEssentiaAudioEngine.ts` - Primary analysis engine with actual Essentia.js integration
- `EssentiaAudioEngine.ts` - Alternative engine implementation
- `StreamingAnalysisEngine.ts` - Handles streaming analysis for large files
- `VisualizationEngine.ts` - Renders spectral/waveform visualizations
- `RealtimeVisualizationEngine.ts` - Real-time visual updates during playback

### Worker Architecture
- `workers/EssentiaWorker.ts` - TypeScript worker definition
- `workers/essentia-analysis-worker.js` - Compiled worker with Essentia algorithms
- Workers load Essentia.js via `/essentia/` static paths (served from `public/essentia/`)

### Essentia.js Integration Strategy
**Critical**: Essentia.js is distributed as CommonJS but the app uses ES modules. The integration works by:
1. Copying Essentia.js files to `public/essentia/` via `copy-essentia.bat`
2. Web Workers load via `importScripts('/essentia/...')`
3. Main thread uses ES module imports: `essentia.js/dist/essentia.js-core.es.js`
4. WASM initialization requires proper module runtime checking

See `ESSENTIA_FIX_README.md` for detailed integration documentation.

### Type System
All audio analysis types are centralized in `types/audio.ts`:
- `AudioAnalysisResult` - Complete analysis output with spectral, tempo, key, MFCC, genre, mood
- `AnalysisProgress` - Progress tracking for multi-stage analysis
- `EngineStatus` - Engine initialization state machine
- `StreamingChunk` - For chunked analysis of large files
- `AnalysisOptions` - Configuration for analysis behavior

### Analysis Features
The engine performs research-grade analysis:
- **Spectral**: centroid, rolloff, flux, energy, brightness, roughness, spread, contrast, ZCR
- **Tempo**: BPM detection (PercivalBpmEstimator), beat tracking, onset detection
- **Key**: Key/scale detection (KeyExtractor), HPCP, tonic frequency
- **Timbre**: MFCC coefficients
- **ML**: Genre classification, mood detection, instrument recognition (when models loaded)
- **Structure**: Segmentation, chord detection, loudness (LUFS)

### Vite Configuration Highlights
- **Server**: Port 3000, COOP/COEP headers for SharedArrayBuffer support
- **Build**: Code splitting into vendor, ui, engines, components chunks
- **Worker**: IIFE format for compatibility, separate bundle with hash
- **WASM**: Enabled via `assetsInclude: ['**/*.wasm']`
- **Aliases**: `@/`, `@components/`, `@engines/`, `@types/`, `@styles/`, `@workers/`

### Memory Management
Essentia.js uses C++ vectors that must be manually freed. Always call `.delete()` on:
- Essentia algorithm outputs (vectors)
- Temporary buffers
- See `RealEssentiaAudioEngine.ts` for proper cleanup patterns

## Project Structure

```
harmonix-pro-analyzer/
├── frontend/
│   ├── src/
│   │   ├── App.tsx                    # Main application component
│   │   ├── App-Advanced.tsx           # Advanced features variant
│   │   ├── App-Production.tsx         # Production-ready variant
│   │   ├── components/                # React UI components
│   │   │   ├── FileUpload.tsx
│   │   │   ├── AnalysisResults.tsx
│   │   │   ├── TransportControls.tsx
│   │   │   ├── ExportFunctionality.tsx
│   │   │   ├── NotificationSystem.tsx
│   │   │   └── ProgressIndicators.tsx
│   │   ├── engines/                   # Audio analysis engines
│   │   │   ├── RealEssentiaAudioEngine.ts  # Primary engine (USE THIS)
│   │   │   ├── EssentiaAudioEngine.ts
│   │   │   ├── StreamingAnalysisEngine.ts
│   │   │   ├── VisualizationEngine.ts
│   │   │   └── RealtimeVisualizationEngine.ts
│   │   ├── workers/                   # Web Worker implementations
│   │   ├── types/                     # TypeScript type definitions
│   │   │   ├── audio.ts              # Core audio analysis types
│   │   │   └── essentia.d.ts         # Essentia.js type declarations
│   │   ├── utils/                     # Utility functions
│   │   └── styles/                    # Glassmorphic styling system
│   ├── public/
│   │   └── essentia/                  # Essentia.js static files (copied by script)
│   ├── vite.config.ts                 # Vite configuration
│   ├── package.json
│   └── copy-essentia.bat              # Essentia.js setup script
├── backend/                           # (Empty - future API)
├── models/                            # (Empty - future ML models)
├── workers/                           # (Root workers directory)
├── deployment/                        # Deployment configs
├── docs/                              # Documentation
└── test-setup.sh                      # Automated testing script
```

## Development Notes

### Engine Status State Machine
```
initializing → loading → ready
                ↓
              error
```
Monitor via `EngineStatus` type. The UI displays this progression with color-coded indicators.

### Analysis Workflow
1. User uploads audio file → `FileUpload` component
2. File decoded via Web Audio API (`AudioContext.decodeAudioData`)
3. Audio buffer sent to worker → `RealEssentiaAudioEngine.analyze()`
4. Worker performs Essentia.js analysis
5. Results returned → `AudioAnalysisResult`
6. UI updates → `AnalysisResults` component displays data
7. Visualization rendered → `VisualizationEngine`

### Progress Tracking
Analysis reports progress through callbacks:
- `stage`: 'decoding' | 'analyzing' | 'complete' | 'batch'
- `percentage`: 0-100
- `currentStep`: Human-readable step description
- For batch processing: `fileIndex`, `totalFiles`, `currentFile`

### Performance Expectations
- Initial load: < 3 seconds
- Engine initialization: < 5 seconds
- WASM compilation: < 2 seconds
- First analysis: < 10 seconds (file size dependent)

### Browser Requirements
- Modern browser with Web Worker support
- SharedArrayBuffer support (requires COOP/COEP headers - configured in vite.config.ts)
- WASM support
- Web Audio API

## Critical Gotchas

1. **Essentia.js Module System**: Must copy files to `public/essentia/` before dev/build
2. **Vector Memory Leaks**: Always call `.delete()` on Essentia vectors
3. **Worker Import Paths**: Workers use absolute paths like `/essentia/...`
4. **CORS Headers**: COOP/COEP required for SharedArrayBuffer (already configured)
5. **Build Process**: Always run typecheck before build (enforced by `prebuild` script)

## Testing

Run automated test suite:
```bash
./test-setup.sh
```

This performs:
1. Dependency installation
2. TypeScript compilation check
3. Full production build

Manual testing checklist:
- App loads without console errors
- Engine status shows: initializing → loading → ready
- UI is responsive with glassmorphic design
- File upload accepts audio files
- Analysis completes and displays results
- Visualizations render correctly
