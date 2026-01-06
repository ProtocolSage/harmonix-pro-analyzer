# Harmonix Pro Analyzer - Windows PowerShell Build Test
# ===================================================

Write-Host "🏗️ Harmonix Pro Analyzer - Production Build Test" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Start timer
$StartTime = Get-Date

# Function to print colored output
function Write-Status {
    param(
        [string]$Message,
        [bool]$Success
    )
    if ($Success) {
        Write-Host "✅ $Message" -ForegroundColor Green
    } else {
        Write-Host "❌ $Message" -ForegroundColor Red
    }
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️ $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️ $Message" -ForegroundColor Blue
}

# Test 1: Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor White
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "   Removed previous dist directory"
}

# Test 2: Check Node.js and npm
Write-Host ""
Write-Host "🔍 Checking Node.js and npm..." -ForegroundColor White
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Status "Node.js version: $nodeVersion" $true
    Write-Status "npm version: $npmVersion" $true
} catch {
    Write-Status "Node.js/npm check failed" $false
    Write-Host "Please ensure Node.js is installed and in PATH"
    exit 1
}

# Test 3: Install dependencies
Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor White
try {
    npm install 2>&1 | Out-File -FilePath "install_output.log"
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Dependencies installation" $true
    } else {
        Write-Status "Dependencies installation" $false
        Write-Warning "Installation issues found. Check install_output.log"
        exit 1
    }
} catch {
    Write-Status "Dependencies installation" $false
    exit 1
}

# Test 4: TypeScript compilation check
Write-Host ""
Write-Host "🔍 Running TypeScript type check..." -ForegroundColor White
try {
    npm run typecheck 2>&1 | Out-File -FilePath "typescript_output.log"
    $typescriptSuccess = $LASTEXITCODE -eq 0
    Write-Status "TypeScript type checking" $typescriptSuccess
    
    if (-not $typescriptSuccess) {
        Write-Warning "TypeScript issues found:"
        Get-Content "typescript_output.log" | Select-Object -First 20 | Write-Host
    }
} catch {
    Write-Status "TypeScript type checking" $false
}

# Test 5: Linting check
Write-Host ""
Write-Host "🧹 Running ESLint check..." -ForegroundColor White
try {
    npm run lint 2>&1 | Out-File -FilePath "lint_output.log"
    $lintSuccess = $LASTEXITCODE -eq 0
    Write-Status "ESLint check" $lintSuccess
    
    if (-not $lintSuccess) {
        Write-Warning "Linting issues found:"
        Get-Content "lint_output.log" | Select-Object -First 10 | Write-Host
    }
} catch {
    Write-Status "ESLint check" $false
}

# Test 6: Production build
Write-Host ""
Write-Host "🏗️ Running production build..." -ForegroundColor White
$BuildStart = Get-Date
try {
    npm run build 2>&1 | Out-File -FilePath "build_output.log"
    $buildSuccess = $LASTEXITCODE -eq 0
    $BuildEnd = Get-Date
    $BuildTime = ($BuildEnd - $BuildStart).TotalSeconds
    
    Write-Status "Production build" $buildSuccess
    
    if ($buildSuccess) {
        Write-Info "Build completed in $([math]::Round($BuildTime, 1)) seconds"
    } else {
        Write-Warning "Build failed. Output:"
        Get-Content "build_output.log" | Select-Object -Last 20 | Write-Host
    }
} catch {
    Write-Status "Production build" $false
}

# Test 7: Build output validation
Write-Host ""
Write-Host "📁 Validating build output..." -ForegroundColor White
if (Test-Path "dist") {
    Write-Status "Build directory created" $true
    
    # Check for essential files
    $essentialFiles = @("index.html", "assets")
    $missingFiles = 0
    
    foreach ($file in $essentialFiles) {
        if (Test-Path "dist\$file") {
            Write-Host "   ✅ $file exists" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $file missing" -ForegroundColor Red
            $missingFiles++
        }
    }
    
    Write-Status "Essential files check" ($missingFiles -eq 0)
    
    # Check build size
    try {
        $distSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum
        $distSizeMB = [math]::Round($distSize / 1MB, 2)
        Write-Info "Build size: $distSizeMB MB"
    } catch {
        Write-Info "Could not calculate build size"
    }
    
    # Count generated files
    try {
        $totalFiles = (Get-ChildItem -Path "dist" -Recurse -File).Count
        $jsFiles = (Get-ChildItem -Path "dist" -Recurse -File -Filter "*.js").Count
        $cssFiles = (Get-ChildItem -Path "dist" -Recurse -File -Filter "*.css").Count
        
        Write-Info "Generated files: $totalFiles total ($jsFiles JS, $cssFiles CSS)"
    } catch {
        Write-Info "Could not count generated files"
    }
} else {
    Write-Status "Build directory created" $false
}

# Clean up log files
Remove-Item -ErrorAction SilentlyContinue "install_output.log", "typescript_output.log", "lint_output.log", "build_output.log"

# Final summary
Write-Host ""
Write-Host "📋 BUILD TEST SUMMARY" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan

$EndTime = Get-Date
$TotalTime = ($EndTime - $StartTime).TotalSeconds

Write-Host "⏱️ Total test time: $([math]::Round($TotalTime, 1)) seconds"

# Calculate score
$score = 0
$maxScore = 7

if ($typescriptSuccess) { $score++ }
if ($lintSuccess) { $score++ }
if ($buildSuccess) { $score += 2 }
if (Test-Path "dist") { $score++ }
if ($missingFiles -eq 0) { $score++ }
if (Test-Path "dist\index.html") { $score++ }

$percentage = [math]::Round(($score * 100 / $maxScore), 0)
Write-Host "🎯 Build score: $score/$maxScore ($percentage%)"

if ($percentage -ge 85) {
    Write-Host "🎉 BUILD SUCCESS! Ready for production deployment." -ForegroundColor Green
    $exitCode = 0
} elseif ($percentage -ge 70) {
    Write-Host "⚠️ Build mostly successful with minor issues." -ForegroundColor Yellow
    $exitCode = 0
} else {
    Write-Host "❌ Build has significant issues that need to be addressed." -ForegroundColor Red
    $exitCode = 1
}

Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor White
if ($buildSuccess) {
    Write-Host "   • Production build successful"
    Write-Host "   • Run 'npm run preview' to test the built application"
    Write-Host "   • Deploy the 'dist' directory to your hosting platform"
} else {
    Write-Host "   • Fix build errors before deployment"
    Write-Host "   • Review TypeScript and linting issues"
    Write-Host "   • Test with 'npm run dev' for development debugging"
}

Write-Host ""
Write-Host "🏁 Build test complete!" -ForegroundColor Cyan

exit $exitCode