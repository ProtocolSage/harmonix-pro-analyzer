@echo off
echo Copying Essentia.js files to public directory...

REM Create essentia directory in public
mkdir public\essentia 2>nul

REM Copy essential files
copy node_modules\essentia.js\dist\essentia-wasm.web.js public\essentia\
copy node_modules\essentia.js\dist\essentia-wasm.web.wasm public\essentia\
copy node_modules\essentia.js\dist\essentia.js-core.js public\essentia\

echo Done! Essentia.js files copied to public/essentia/