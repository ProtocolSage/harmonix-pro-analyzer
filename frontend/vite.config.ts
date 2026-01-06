import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    },
    fs: {
      // Allow serving files from node_modules
      allow: ['..']
    }
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Core dependencies
          vendor: ['react', 'react-dom'],
          
          // UI components
          ui: ['lucide-react'],
          
          // Audio processing (when using npm packages)
          // essentia: ['essentia.js'],
          
          // Analysis engines
          engines: [
            './src/engines/RealEssentiaAudioEngine.ts',
            './src/engines/VisualizationEngine.ts'
          ],
          
          // UI components
          components: [
            './src/components/FileUpload.tsx',
            './src/components/AnalysisResults.tsx',
            './src/components/TransportControls.tsx',
            './src/components/ExportFunctionality.tsx',
            './src/components/NotificationSystem.tsx',
            './src/components/ProgressIndicators.tsx'
          ]
        },
        // Optimize asset naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          let extType = info[info.length - 1];
          
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            extType = 'images';
          } else if (/woff2?|eot|ttf|otf/i.test(extType)) {
            extType = 'fonts';
          } else if (/css/i.test(extType)) {
            extType = 'styles';
          }
          
          return `assets/${extType}/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js'
      }
    },
    chunkSizeWarningLimit: 1000
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
    exclude: []
  },
  worker: {
    format: 'iife',  // Classic worker format
    plugins: () => [react()],
    rollupOptions: {
      output: {
        // Ensure worker files are properly named and cached
        entryFileNames: 'assets/workers/[name]-[hash].js'
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
      '@components': path.resolve(process.cwd(), 'src/components'),
      '@engines': path.resolve(process.cwd(), 'src/engines'),
      '@types': path.resolve(process.cwd(), 'src/types'),
      '@styles': path.resolve(process.cwd(), 'src/styles'),
      '@workers': path.resolve(process.cwd(), 'src/workers')
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify('1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __DEV__: JSON.stringify(false)
  },
  // Enable WASM support
  assetsInclude: ['**/*.wasm'],
  
  // Performance optimizations
  esbuild: {
    drop: ['console', 'debugger']
  }
})