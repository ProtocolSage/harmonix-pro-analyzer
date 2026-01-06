#!/bin/bash
echo "Copying Essentia.js files to public directory..."

# Create essentia directory in public
mkdir -p public/essentia

# Copy essential files
cp node_modules/essentia.js/dist/essentia-wasm.web.js public/essentia/
cp node_modules/essentia.js/dist/essentia-wasm.web.wasm public/essentia/
cp node_modules/essentia.js/dist/essentia.js-core.js public/essentia/

echo "Done! Essentia.js files copied to public/essentia/"
