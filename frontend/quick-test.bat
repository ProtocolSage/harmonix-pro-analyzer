@echo off
echo 🚀 Harmonix Pro Analyzer - Quick Test
echo =====================================
echo.

echo 📦 Installing dependencies...
call npm install
if errorlevel 1 (
    echo ❌ npm install failed
    pause
    exit /b 1
)

echo.
echo 🔍 Running integration test...
call npm run test:integration
if errorlevel 1 (
    echo ⚠️ Integration test found issues
)

echo.
echo 🔧 Running TypeScript check...
call npm run typecheck
if errorlevel 1 (
    echo ⚠️ TypeScript issues found
)

echo.
echo 🏗️ Testing production build...
call npm run build
if errorlevel 1 (
    echo ❌ Build failed
    pause
    exit /b 1
) else (
    echo ✅ Build successful!
)

echo.
echo 🎉 Quick test complete! 
echo.
echo Ready commands:
echo   npm run dev     - Start development server
echo   npm run preview - Test production build
echo.
pause