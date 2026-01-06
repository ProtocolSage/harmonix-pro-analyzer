#!/bin/bash

echo "🏗️  Harmonix Pro Analyzer - Production Build Test"
echo "================================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Start timer
start_time=$(date +%s)

# Test 1: Clean previous builds
echo "🧹 Cleaning previous builds..."
if [ -d "dist" ]; then
    rm -rf dist
    echo "   Removed previous dist directory"
fi

# Test 2: Install dependencies
echo ""
echo "📦 Checking dependencies..."
if ! npm list --silent > /dev/null 2>&1; then
    print_warning "Dependencies not fully installed, running npm install..."
    npm install
    install_status=$?
    print_status "Dependencies installation" $install_status
    
    if [ $install_status -ne 0 ]; then
        echo "❌ Dependency installation failed. Cannot proceed with build test."
        exit 1
    fi
else
    print_status "Dependencies check" 0
fi

# Test 3: TypeScript compilation check
echo ""
echo "🔍 Running TypeScript type check..."
npm run typecheck > typescript_output.log 2>&1
typescript_status=$?
print_status "TypeScript type checking" $typescript_status

if [ $typescript_status -ne 0 ]; then
    print_warning "TypeScript issues found:"
    cat typescript_output.log | head -20
    echo ""
fi

# Test 4: Linting check
echo ""
echo "🧹 Running ESLint check..."
npm run lint > lint_output.log 2>&1
lint_status=$?
print_status "ESLint check" $lint_status

if [ $lint_status -ne 0 ]; then
    print_warning "Linting issues found:"
    cat lint_output.log | head -10
    echo ""
fi

# Test 5: Production build
echo ""
echo "🏗️  Running production build..."
build_start=$(date +%s)
npm run build > build_output.log 2>&1
build_status=$?
build_end=$(date +%s)
build_time=$((build_end - build_start))

print_status "Production build" $build_status

if [ $build_status -eq 0 ]; then
    print_info "Build completed in ${build_time} seconds"
else
    print_warning "Build failed. Output:"
    cat build_output.log | tail -20
    echo ""
fi

# Test 6: Build output validation
echo ""
echo "📁 Validating build output..."
if [ -d "dist" ]; then
    print_status "Build directory created" 0
    
    # Check for essential files
    essential_files=("index.html" "assets")
    missing_files=0
    
    for file in "${essential_files[@]}"; do
        if [ -e "dist/$file" ]; then
            echo "   ✅ $file exists"
        else
            echo "   ❌ $file missing"
            missing_files=$((missing_files + 1))
        fi
    done
    
    print_status "Essential files check" $missing_files
    
    # Check build size
    if command -v du &> /dev/null; then
        dist_size=$(du -sh dist 2>/dev/null | cut -f1)
        print_info "Build size: $dist_size"
    fi
    
    # Count generated files
    if command -v find &> /dev/null; then
        total_files=$(find dist -type f | wc -l)
        js_files=$(find dist -name "*.js" | wc -l)
        css_files=$(find dist -name "*.css" | wc -l)
        
        print_info "Generated files: $total_files total ($js_files JS, $css_files CSS)"
    fi
    
else
    print_status "Build directory created" 1
fi

# Test 7: Bundle analysis (if tool available)
echo ""
echo "📊 Analyzing bundle (if tools available)..."
if command -v npx &> /dev/null; then
    # Check if we can analyze the bundle
    if [ -f "dist/assets"/*.js ]; then
        print_info "JavaScript bundles generated successfully"
    fi
fi

# Test 8: Preview build (quick test)
echo ""
echo "🌐 Testing preview server..."
timeout 10s npm run preview > preview_output.log 2>&1 &
preview_pid=$!
sleep 3

if kill -0 $preview_pid 2>/dev/null; then
    print_status "Preview server starts" 0
    kill $preview_pid 2>/dev/null
else
    print_status "Preview server starts" 1
fi

# Clean up
rm -f typescript_output.log lint_output.log build_output.log preview_output.log

# Final summary
echo ""
echo "📋 BUILD TEST SUMMARY"
echo "===================="

end_time=$(date +%s)
total_time=$((end_time - start_time))

echo "⏱️  Total test time: ${total_time} seconds"

# Calculate score
score=0
max_score=7

[ $typescript_status -eq 0 ] && score=$((score + 1))
[ $lint_status -eq 0 ] && score=$((score + 1))  
[ $build_status -eq 0 ] && score=$((score + 2))
[ -d "dist" ] && score=$((score + 1))
[ $missing_files -eq 0 ] && score=$((score + 1))
[ -f "dist/index.html" ] && score=$((score + 1))

percentage=$((score * 100 / max_score))
echo "🎯 Build score: $score/$max_score ($percentage%)"

if [ $percentage -ge 85 ]; then
    echo -e "${GREEN}🎉 BUILD SUCCESS! Ready for production deployment.${NC}"
    exit_code=0
elif [ $percentage -ge 70 ]; then
    echo -e "${YELLOW}⚠️  Build mostly successful with minor issues.${NC}"
    exit_code=0
else
    echo -e "${RED}❌ Build has significant issues that need to be addressed.${NC}"
    exit_code=1
fi

echo ""
echo "🚀 Next steps:"
if [ $build_status -eq 0 ]; then
    echo "   • Production build successful"
    echo "   • Run 'npm run preview' to test the built application"
    echo "   • Deploy the 'dist' directory to your hosting platform"
else
    echo "   • Fix build errors before deployment"
    echo "   • Review TypeScript and linting issues"
    echo "   • Test with 'npm run dev' for development debugging"
fi

echo ""
echo "🏁 Build test complete!"

exit $exit_code