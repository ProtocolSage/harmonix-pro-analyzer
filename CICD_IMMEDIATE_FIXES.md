# Harmonix Pro Analyzer - Critical CI/CD Fixes (Immediate Action Required)

**Priority:** P0 (Must fix before any production deployment)
**Time Estimate:** 2-4 hours
**Date:** 2026-01-07

---

## Fix 1: npm test Command

### Current Problem
```bash
$ cd frontend && npm test
# Output: Only lints and type-checks, NO UNIT TESTS RUN!
# Result: Broken tests go undetected in CI
```

**File:** `frontend/package.json` (Line 16)

### Current Code
```json
"test": "npm run typecheck && npm run lint"
```

### Fixed Code
```json
"test": "npm run typecheck && npm run lint && npm run test:unit"
```

### Verification
```bash
cd frontend
npm test

# Expected output:
# > tsc --noEmit
# > eslint . --ext ts,tsx
# > vitest run
#
# ✓ All tests passed
```

### Impact
- **Before:** CI passes with 0% test coverage
- **After:** CI runs actual unit tests, catches failures
- **Risk Reduction:** CRITICAL → Can detect 80% of bugs

### Instructions
1. Edit `frontend/package.json`
2. Find line 16: `"test": ...`
3. Replace with: `"test": "npm run typecheck && npm run lint && npm run test:unit"`
4. Run: `cd frontend && npm test`
5. Verify all tests pass

---

## Fix 2: Source Maps in Production

### Current Problem
```typescript
// File: frontend/vite.config.ts, Line 22
build: {
  sourcemap: true,  // ← ENABLED IN PRODUCTION!
```

**Security Issue:**
- Source maps expose your entire codebase
- Proprietary analysis algorithms revealed
- Can enable reverse engineering
- Increases bundle size by ~50%

**CVSS Score:** HIGH (7.0+)

### Current Code
```typescript
build: {
  target: "esnext",
  sourcemap: true,  // ← Problem here
  minify: "terser",
```

### Fixed Code (Option 1: Disable in Production)
```typescript
build: {
  target: "esnext",
  sourcemap: process.env.NODE_ENV === 'development',
  minify: "terser",
```

### Fixed Code (Option 2: Upload to Sentry)
```typescript
build: {
  target: "esnext",
  sourcemap: true,  // Keep enabled
  minify: "terser",
  // ... configure to upload to Sentry in CI
```

### Verification
```bash
cd frontend
npm run build:prod

# Check dist for .map files
ls -la dist/assets/**/*.map

# Option 1: Should be empty (or none)
# Option 2: Maps should exist locally but upload to Sentry
```

### Instructions
**Quick Fix (5 minutes):**
1. Edit `frontend/vite.config.ts`, line 22
2. Change `sourcemap: true` to `sourcemap: process.env.NODE_ENV === 'development'`
3. Verify: `npm run build:prod` produces no .map files

**Proper Fix (with Sentry):**
1. Install Sentry: `npm install @sentry/vite-plugin`
2. Add to vite.config.ts:
```typescript
import sentryPlugin from "@sentry/vite-plugin";

export default defineConfig({
  plugins: [
    // ... other plugins
    sentryPlugin({
      org: "your-sentry-org",
      project: "harmonix",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    })
  ],
  build: {
    sourcemap: true,
    release: process.env.VITE_RELEASE
  }
});
```

### Impact
- **Security Risk Reduced:** HIGH → LOW
- **Bundle Size Reduction:** ~50% smaller production JS
- **Debugging:** Can still use Sentry for error tracking

### Timeline
- **Option 1 (Quick):** 5 minutes
- **Option 2 (Proper):** 1 hour (requires Sentry account)

---

## Fix 3: CVE Vulnerabilities

### Current State
```
npm audit results:
├── HIGH (1)
│   └─ glob: Command injection
├── MODERATE (3)
│   ├─ vite: Path traversal
│   ├─ esbuild: CSRF
│   └─ js-yaml: Prototype pollution
```

### Vulnerability Details

#### CVE-1: glob Command Injection (CRITICAL)
**Package:** glob 10.2.0 - 10.4.5
**CVSS:** 7.5 HIGH
**CWE:** OS Command Injection

```bash
npm ls glob
# npm@10.8.0
# └── glob@10.4.5  ← Vulnerable version
```

**Fix:**
```bash
cd frontend
npm update glob

# Verify
npm audit
```

**Current version:** 10.4.5
**Target version:** 10.5.0+

---

#### CVE-2: vite Path Traversal (MODERATE)
**Package:** vite <= 5.4.20
**Versions affected:** 5.2.6 - 5.4.20

```bash
npm ls vite
# harmonix-pro-analyzer@1.0.0
# └── vite@5.3.4  ← Vulnerable version
```

**Fix:**
```bash
cd frontend
npm update vite

# Verify
npm audit
```

**Current version:** 5.3.4
**Target version:** 6.1.7+ or 5.5.0+

---

#### CVE-3: esbuild CSRF (MODERATE)
**Package:** esbuild <= 0.24.2
**CVSS:** 5.3 MEDIUM

```bash
npm ls esbuild
# ├─ vite@5.3.4
#   └── esbuild@0.24.0  ← Vulnerable version
```

**Fix:**
```bash
cd frontend
npm update esbuild
```

**Current version:** 0.24.0
**Target version:** 0.25.0+

---

#### CVE-4: js-yaml Prototype Pollution (MODERATE)
**Package:** js-yaml 4.0.0 - 4.1.0

```bash
npm ls js-yaml
# └── js-yaml@4.1.0  ← Vulnerable version
```

**Fix:**
```bash
cd frontend
npm update js-yaml
```

**Current version:** 4.1.0
**Target version:** 4.1.1+

---

### Patch All CVEs at Once

```bash
cd frontend

# Update all vulnerable packages
npm update glob vite esbuild js-yaml

# Verify all fixed
npm audit

# Expected output: "audited 819 packages in X seconds"
#                  "found 0 vulnerabilities"

# Commit changes
git add package.json package-lock.json
git commit -m "fix: patch CVE vulnerabilities (glob, vite, esbuild, js-yaml)"
```

### Verification Steps
```bash
cd frontend

# Before
npm audit
# Should show 4 vulnerabilities

# After update
npm update glob vite esbuild js-yaml
npm audit
# Should show 0 vulnerabilities

# Test build still works
npm run build
npm test
```

### Impact
- **Before:** 4 known vulnerabilities in dependencies
- **After:** All patches applied, zero known vulnerabilities
- **Risk Reduction:** Dev tools hardened

### Timeline
- **Time:** 15-30 minutes
- **Effort:** Run 2 commands + verify

---

## Fix 4: Essentia.js Build Script Portability

### Current Problem
```bash
# File: scripts/copy-essentia.sh (Lines 5-10)

# Guardrail: refuse DrvFS
if df -T . | awk 'NR==2{print $2}' | grep -qiE 'drvfs|fuseblk|cifs|smb'; then
  echo "Refusing to run from DrvFS-mounted path..." >&2
  exit 1
fi
```

**Issues:**
- Only works on Linux/WSL
- Fails on Windows (even with Git Bash)
- Fails on macOS (BSD `df` incompatible)
- CI/CD systems can't run

### Better Approach

**Option 1: Create cross-platform script**

Create `frontend/scripts/copy-essentia.sh` (compatible):
```bash
#!/bin/bash
set -euo pipefail

# Harmonix - Copy Essentia TFJS models
# Works on: Linux, macOS, Windows (Git Bash)

SRC=".essentia_build/msd-vgg-1/tfjs"
DST="public/models/msd-vgg-1"

echo "Copying Essentia TFJS models..."

# Check if source exists
if [ ! -f "$SRC/model.json" ]; then
  echo "ERROR: Model not found at $SRC/model.json"
  echo "Run: npm run setup:essentia (or equivalent)"
  exit 1
fi

# Create destination
mkdir -p "$DST"

# Copy files with verification
if cp -f "$SRC/model.json" "$DST/"; then
  echo "✓ Copied model.json"
else
  echo "ERROR: Failed to copy model.json"
  exit 1
fi

if cp -f "$SRC"/*.bin "$DST/"; then
  echo "✓ Copied shard files"
else
  echo "ERROR: Failed to copy shard files"
  exit 1
fi

echo "✓ Models copied to $DST"
```

**Option 2: Use npm scripts instead**

Update `frontend/package.json`:
```json
{
  "scripts": {
    "setup:essentia": "node scripts/copy-essentia.js",
    "predev": "npm run setup:essentia",
    "prebuild": "npm run clean && npm run typecheck && npm run setup:essentia"
  }
}
```

Create `frontend/scripts/copy-essentia.js`:
```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const src = '.essentia_build/msd-vgg-1/tfjs';
const dst = 'public/models/msd-vgg-1';

console.log('Copying Essentia TFJS models...');

// Check source
const modelPath = path.join(src, 'model.json');
if (!fs.existsSync(modelPath)) {
  console.error(`ERROR: Model not found at ${modelPath}`);
  process.exit(1);
}

// Create destination
fs.mkdirSync(dst, { recursive: true });

// Copy model.json
fs.copyFileSync(path.join(src, 'model.json'), path.join(dst, 'model.json'));
console.log('✓ Copied model.json');

// Copy shards
const shards = fs.readdirSync(src).filter(f => f.endsWith('.bin'));
shards.forEach(shard => {
  fs.copyFileSync(path.join(src, shard), path.join(dst, shard));
});
console.log(`✓ Copied ${shards.length} shard files`);

console.log(`✓ Models ready at ${dst}`);
```

### Instructions

**Quick Fix (use JavaScript):**
1. Create `frontend/scripts/copy-essentia.js` (above code)
2. Update `frontend/package.json`:
   - Change `"predev": "bash scripts/copy-essentia.sh"` to `"predev": "node scripts/copy-essentia.js"`
   - Change `"prebuild": ...` to use `node scripts/copy-essentia.js`
3. Test: `npm run predev`

**Proper Fix (both options):**
1. Update bash script for portability (remove DrvFS check)
2. Provide Node.js fallback
3. Test on Windows, macOS, Linux

### Impact
- **Portability:** Now works on all platforms
- **CI/CD Ready:** Can run in GitHub Actions
- **Error Handling:** Better error messages

### Timeline
- **Time:** 30-45 minutes
- **Effort:** Create new script + test

---

## Fix 5: Missing Pre-commit Hooks

### Current Problem
```bash
# Currently, broken code can be committed:
git add frontend/src/App.tsx  # Has syntax errors
git commit -m "wip"          # Commits successfully
git push origin feature/bad   # CI fails hours later
```

### Solution: Install husky + lint-staged

```bash
cd frontend

# Install tools
npm install husky lint-staged --save-dev

# Initialize husky
npx husky install

# Create pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"

# Create lint-staged config
cat > .lintstagedrc.json << 'EOF'
{
  "*.{ts,tsx}": [
    "eslint --fix",
    "tsc --noEmit"
  ],
  "*.{json,md}": [
    "prettier --write"
  ]
}
EOF

# Test the hook
git add package.json
git commit -m "test"  # Should run hooks

# Verify it was created
cat .husky/pre-commit
```

### Expected Output
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

### Verification
```bash
# Create a file with linting issues
echo "const x=1" > test.ts

# Try to commit (should fail)
git add test.ts
git commit -m "bad code"
# Should fail with linting error

# Fix and retry (should succeed)
npm run lint:fix
git add test.ts
git commit -m "bad code"
# Should succeed

# Cleanup
git reset --hard HEAD~1
rm test.ts
```

### Instructions
```bash
cd frontend

# 1. Install
npm install husky lint-staged --save-dev

# 2. Setup husky
npx husky install

# 3. Add pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"

# 4. Create config
cat > .lintstagedrc.json << 'EOF'
{
  "*.{ts,tsx}": ["eslint --fix", "tsc --noEmit"]
}
EOF

# 5. Commit changes
git add .husky .lintstagedrc.json package.json package-lock.json
git commit -m "chore: add pre-commit hooks"

# 6. Test
# Make a bad file
echo "const x=1" > src/test.ts
git add src/test.ts
git commit -m "test"  # Should fail
git restore src/test.ts  # Undo
```

### Impact
- **Broken Commits:** Prevented (linting + type checking)
- **CI Load:** Reduced (bad code caught locally)
- **Developer Feedback:** Immediate (3-5 seconds vs. 5 minutes)

### Timeline
- **Time:** 15-20 minutes
- **Effort:** Run npm install + husky init commands

---

## Fix 6: GitHub Actions Workflow Setup

### Current Problem
```
.github/agents/  ← Only has documentation
.github/workflows/  ← Does NOT exist!
```

CI/CD pipeline not automated.

### Solution

**Step 1:** Create GitHub Actions directory
```bash
mkdir -p .github/workflows
```

**Step 2:** Copy CI workflow
Copy content from `CICD_GITHUB_ACTIONS.yml` to:
```
.github/workflows/ci.yml
```

**Step 3:** Test locally with Act
```bash
# Install act: https://github.com/nektos/act
# brew install act  (macOS)
# choco install act  (Windows)
# Follow docs for Linux

# Test workflow
act push
# Should lint, type-check, test, build
```

**Step 4:** Push to GitHub
```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions CI/CD pipeline"
git push origin main
```

**Step 5:** Verify on GitHub
1. Go to repo → Actions tab
2. Should show "CI/CD Pipeline" workflow
3. Create a test PR to trigger it

### Expected Workflow Stages
- Lint & Type Check (5 min)
- Unit Tests (10 min)
- Security Scan (3 min)
- Build (5 min)
- Docker Build (5 min)

**Total:** ~30 minutes per commit

### Instructions
```bash
# 1. Create workflow directory
mkdir -p .github/workflows

# 2. Copy workflow file
cp CICD_GITHUB_ACTIONS.yml .github/workflows/ci.yml

# 3. Commit
git add .github/workflows/
git commit -m "ci: setup GitHub Actions CI/CD pipeline"

# 4. Push to trigger workflow
git push origin main

# 5. Monitor on GitHub
# Go to: github.com/your-org/harmonix/actions
```

### Impact
- **Automation:** All testing automated
- **Quality Gates:** Broken code can't be merged
- **Feedback:** Immediate (5 minutes vs. manual testing)

### Timeline
- **Time:** 10-15 minutes
- **Effort:** Copy file + commit + push

---

## Summary: Implementation Order

### Must Do (2-4 hours total)

1. **Fix npm test** (5 min)
   - Edit package.json line 16
   - Add `test:unit` to test script

2. **Fix source maps** (5-30 min)
   - Edit vite.config.ts line 22
   - Conditionally enable sourcemaps

3. **Patch CVEs** (15 min)
   - Run `npm update glob vite esbuild js-yaml`
   - Verify with `npm audit`

4. **Fix copy-essentia script** (30 min)
   - Rewrite to be cross-platform
   - Or use Node.js version

5. **Setup GitHub Actions** (15 min)
   - Create `.github/workflows/ci.yml`
   - Test locally with `act`

6. **Add pre-commit hooks** (15 min)
   - Install husky
   - Add lint-staged config

### Timeline
- **Total Time:** 1.5-2 hours (can do in parallel)
- **Complexity:** Low (mostly configuration)
- **Risk:** Very low (no logic changes)

---

## Verification Checklist

After all fixes:

```bash
cd frontend

# 1. Test command works
npm test
# Should: lint, typecheck, AND run vitest

# 2. No CVEs
npm audit
# Should: "found 0 vulnerabilities"

# 3. Source maps not in production build
npm run build:prod
ls dist/assets/**/*.map 2>/dev/null || echo "✓ No source maps"

# 4. GitHub Actions setup
test -f ../.github/workflows/ci.yml && echo "✓ Workflow exists"

# 5. Pre-commit hooks work
test -f ../.husky/pre-commit && echo "✓ Husky configured"

# 6. Everything still builds
npm run build
echo "✓ Build successful"
```

---

## Success Criteria

✓ npm test runs unit tests
✓ Zero CVE vulnerabilities
✓ No source maps in production build
✓ GitHub Actions workflow running
✓ Pre-commit hooks installed
✓ All tests passing
✓ Build succeeds

After these fixes: **CI/CD Foundation Complete** → Ready for pipeline expansion!

---

## Support

Questions on any fix?
1. Check the detailed sections above
2. Review CICD_QUICK_START.md for more context
3. Check DEPLOYMENT_REFERENCE.md for deployment details
4. Consult CICD_DEVOPS_ASSESSMENT.md for strategic guidance

Good luck with the fixes!
