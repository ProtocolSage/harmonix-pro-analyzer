/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  // @ts-ignore - type mismatch between vite and vitest
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    fs: {
      // Allow serving files from node_modules
      allow: [".."],
    },
  },
  build: {
    target: "esnext",
    sourcemap: process.env.NODE_ENV === "development",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 3,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React dependencies (critical path)
          if (id.includes("node_modules/react") || id.includes("node_modules/lucide-react")) {
            return "vendor-react";
          }

          // TensorFlow.js (lazy load, not critical)
          if (id.includes("@tensorflow/tfjs")) {
            return "tensorflow";
          }

          // Essentia.js (lazy load, not critical)
          if (id.includes("essentia.js")) {
            return "essentia";
          }

          // Other node_modules (utilities)
          if (id.includes("node_modules")) {
            return "vendor-utils";
          }

          // Split analysis engines into separate chunks
          if (id.includes("src/engines/RealEssentiaAudioEngine")) {
            return "engine-essentia";
          }
          if (id.includes("src/engines/MLInferenceEngine")) {
            return "engine-ml";
          }
          if (id.includes("src/engines/VisualizationEngine")) {
            return "engine-visualization";
          }
          if (id.includes("src/engines/StreamingAnalysisEngine")) {
            return "engine-streaming";
          }
          if (id.includes("src/engines")) {
            return "engines-core";
          }

          // UI components chunk
          if (id.includes("src/components/")) {
            return "components";
          }

          // Keep workers separate
          if (id.includes("src/workers/")) {
            return "workers";
          }
        },
        // Optimize asset naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split(".") || [];
          let extType = info[info.length - 1];

          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            extType = "images";
          } else if (/woff2?|eot|ttf|otf/i.test(extType)) {
            extType = "fonts";
          } else if (/css/i.test(extType)) {
            extType = "styles";
          }

          return `assets/${extType}/[name]-[hash][extname]`;
        },
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
      },
    },
    chunkSizeWarningLimit: 5000, // Vendor chunk includes WASM binaries (~4MB), which is expected
    reportCompressedSize: true,
  },
  optimizeDeps: {
    include: ["react", "react-dom", "lucide-react"],
    exclude: ["essentia.js"],
  },
  worker: {
    format: "es", // ES module format for workers
    // @ts-ignore - type mismatch
    plugins: () => [react()],
    rollupOptions: {
      output: {
        // Ensure worker files are properly named and cached
        entryFileNames: "assets/workers/[name]-[hash].js",
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
      "@components": path.resolve(process.cwd(), "src/components"),
      "@engines": path.resolve(process.cwd(), "src/engines"),
      "@types": path.resolve(process.cwd(), "src/types"),
      "@styles": path.resolve(process.cwd(), "src/styles"),
      "@workers": path.resolve(process.cwd(), "src/workers"),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify("1.0.0"),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __DEV__: JSON.stringify(false),
  },
  // Enable WASM support
  assetsInclude: ["**/*.wasm"],

  // Performance optimizations
  esbuild: {
    drop: ["console", "debugger"],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData.*",
        "dist/",
      ],
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 40,
        statements: 40,
      },
    },
  },
});
