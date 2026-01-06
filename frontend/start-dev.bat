@echo off
echo Starting Harmonix Pro Analyzer...

REM Copy Essentia files if needed
call copy-essentia.bat

REM Start Vite dev server
npm run dev