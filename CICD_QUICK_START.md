# Harmonix Pro Analyzer - CI/CD Quick Start Guide

**This guide walks through implementing a production-grade CI/CD pipeline in 2 weeks.**

---

## Week 1: Foundation (Build + Test + Security)

### Day 1-2: Fix npm test command & CVE vulnerabilities

**Current Problem:**
```bash
$ npm test
# Only runs: typecheck + lint
# Missing: unit tests!
```

**Step 1: Fix package.json**
```bash
cd frontend
```

Edit `frontend/package.json` and change:
```json
{
  "test": "npm run typecheck && npm run lint"
}
```

To:
```json
{
  "test": "npm run typecheck && npm run lint && npm run test:unit"
}
```

**Step 2: Update CVE dependencies**
```bash
# Update vulnerable packages
npm update glob vite esbuild js-yaml

# Verify fixes
npm audit
# Should show: 0 vulnerabilities (or only low-risk dev dependencies)
```

**Step 3: Run tests locally**
```bash
npm test
# Should now include:
# - TypeScript compilation
# - ESLint
# - Vitest (unit tests)
```

**Time Estimate:** 2 hours

---

### Day 2-3: Fix source maps and create GitHub Actions

**Current Problem:**
```typescript
// vite.config.ts
build: {
  sourcemap: true  // ← Exposes source code in production!
}
```

**Step 1: Fix Vite configuration**

Edit `frontend/vite.config.ts`:
```typescript
export default defineConfig({
  build: {
    // Conditionally enable sourcemaps
    sourcemap: process.env.NODE_ENV === 'development' ? true : false,

    // OR: Upload to error tracking instead
    // sourcemap: true, (keep enabled)
    // (then upload to Sentry in CI)

    // ... rest of config
  }
});
```

**Step 2: Create GitHub Actions workflow**

Create `.github/workflows/ci.yml`:
```yaml
# Copy content from CICD_GITHUB_ACTIONS.yml
# Focus on: lint, typecheck, unit tests, build, npm audit
```

**Step 3: Configure branch protection**

1. Go to GitHub repo Settings
2. Branches → main branch protection
3. Enable:
   - "Require status checks to pass"
   - "Require code review before merging"
   - "Require branches to be up to date"

**Step 4: Test the workflow**
```bash
# Push to a feature branch
git checkout -b test/ci-setup
git commit -m "Setup CI/CD pipeline"
git push origin test/ci-setup

# Open PR and verify workflow runs
# Watch GitHub Actions tab
```

**Time Estimate:** 4-6 hours

---

### Day 4-5: Add dependency scanning & pre-commit hooks

**Step 1: Enable npm audit in CI**

Already in GitHub Actions workflow, but verify:
```yaml
- name: Run npm audit
  run: npm audit --audit-level=moderate
```

**Step 2: Setup pre-commit hooks (husky)**

```bash
# Install husky
npm install husky --save-dev
npx husky install

# Create pre-commit hook
npx husky add .husky/pre-commit "npm run lint:fix && npm run typecheck"

# Verify
cat .husky/pre-commit
```

**Step 3: Add lint-staged (lint only changed files)**

```bash
npm install lint-staged --save-dev
```

Create `frontend/.lintstagedrc.json`:
```json
{
  "*.{ts,tsx}": [
    "eslint --fix",
    "tsc --noEmit"
  ]
}
```

Update `.husky/pre-commit`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

**Step 4: Test pre-commit hooks**
```bash
# Make a change
echo "// test" >> src/App.tsx

# Try to commit (should run hooks)
git add src/App.tsx
git commit -m "test"
# Should lint and typecheck before committing

# Rollback
git reset HEAD~1
git restore src/App.tsx
```

**Time Estimate:** 3 hours

---

### Day 5: Add bundle size checking

**Step 1: Configure bundle size limits**

Edit `frontend/vite.config.ts`:
```typescript
export default defineConfig({
  build: {
    // Set strict bundle limits
    chunkSizeWarningLimit: 500,  // Warn if chunk > 500KB

    // Add custom check in CI
    rollupOptions: {
      output: {
        // Limit chunk size
      }
    }
  }
});
```

**Step 2: Add bundle size check to GitHub Actions**

Add to `.github/workflows/ci.yml`:
```yaml
- name: Check bundle size
  run: |
    VENDOR_SIZE=$(ls -lh frontend/dist/assets/js/vendor*.js | awk '{print $5}')
    echo "Vendor bundle: $VENDOR_SIZE"
    # Fail if > 5MB
    SIZE_BYTES=$(ls -L frontend/dist/assets/js/vendor*.js | wc -c)
    if (( SIZE_BYTES > 5242880 )); then
      echo "::error::Vendor bundle exceeds 5MB limit"
      exit 1
    fi
```

**Step 3: Monitor bundle growth**

Archive build reports:
```yaml
- name: Archive bundle analysis
  uses: actions/upload-artifact@v4
  with:
    name: bundle-analysis-${{ github.run_number }}
    path: frontend/dist/
```

**Time Estimate:** 2 hours

---

## Week 2: Deployment & Monitoring

### Day 6: Create Dockerfile and docker-compose

**Step 1: Create Dockerfile**

Create `frontend/Dockerfile` (copy from `DOCKERFILE.recommended`)

**Step 2: Create nginx configuration**

Create `deployment/default.conf` (copy from `DEPLOYMENT_REFERENCE.md`)
Create `deployment/nginx.conf` (copy from `DEPLOYMENT_REFERENCE.md`)

**Step 3: Test Docker build locally**

```bash
# Build image
docker build -t harmonix:dev ./frontend

# Run container
docker run -p 3000:8080 harmonix:dev

# Test in browser
curl http://localhost:3000
# Should see Harmonix app

# Cleanup
docker stop $(docker ps -q --filter "ancestor=harmonix:dev")
```

**Step 4: Create docker-compose for dev environment**

Create `deployment/docker-compose.yml` (copy from `DEPLOYMENT_REFERENCE.md`)

```bash
# Test docker-compose
docker-compose -f deployment/docker-compose.yml up -d
sleep 5
curl http://localhost:3000/health
docker-compose -f deployment/docker-compose.yml down
```

**Time Estimate:** 4 hours

---

### Day 7: Setup deployment automation

**Step 1: Create GitHub Actions deployment workflow**

Create `.github/workflows/deploy-staging.yml`:
```yaml
name: Deploy to Staging

on:
  push:
    branches:
      - develop

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.harmonix.example.com

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to staging
        run: |
          # Example: Deploy to Vercel
          npm i -g vercel
          vercel --prod --token=${{ secrets.VERCEL_TOKEN }}

          # OR: Deploy to custom server
          # mkdir ~/.ssh
          # echo "${{ secrets.DEPLOY_KEY }}" > ~/.ssh/id_rsa
          # chmod 600 ~/.ssh/id_rsa
          # ssh deploy@staging.example.com "cd /app && docker-compose pull && docker-compose up -d"
```

**Step 2: Setup environment secrets**

1. GitHub repo Settings → Secrets & variables → Actions
2. Create secrets:
   - `VERCEL_TOKEN` (if using Vercel)
   - `DEPLOY_KEY` (if using custom server)
   - `STAGING_URL`

**Step 3: Test deployment**

```bash
# Push to develop branch
git checkout develop
git commit -m "Test deployment" --allow-empty
git push origin develop

# Watch GitHub Actions
# Should automatically deploy to staging
```

**Time Estimate:** 3 hours

---

### Day 8: Setup error tracking (Sentry)

**Step 1: Create Sentry account**

1. Go to https://sentry.io
2. Sign up for free account
3. Create new project → React
4. Copy DSN

**Step 2: Install Sentry SDK**

```bash
npm install @sentry/react @sentry/tracing
```

**Step 3: Integrate in application**

Create `frontend/src/utils/sentry.ts`:
```typescript
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      new BrowserTracing(),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
};
```

Update `frontend/src/main.tsx`:
```typescript
import { initSentry } from './utils/sentry';

initSentry();

// ... rest of app
```

**Step 4: Add environment variable**

Create `frontend/.env.local`:
```
VITE_SENTRY_DSN=your-sentry-dsn-here
```

**Step 5: Test error tracking**

Create a button to test:
```typescript
<button onClick={() => {
  throw new Error("Test error");
}}>
  Test Error Tracking
</button>
```

Push error, check Sentry dashboard to verify receipt.

**Time Estimate:** 3 hours

---

### Day 9: Setup health monitoring

**Step 1: Create health check endpoint**

Add to `frontend/vite.config.ts`:
```typescript
server: {
  middlewares: [
    (req, res, next) => {
      if (req.url === '/health') {
        res.end('OK');
      } else {
        next();
      }
    }
  ]
}
```

**Step 2: Setup uptime monitoring (UptimeRobot)**

1. Go to https://uptimerobot.com
2. Sign up for free account
3. Create new monitor → HTTP(s)
4. URL: `https://harmonix.example.com/health`
5. Check interval: 5 minutes
6. Add notification (email, Slack)

**Step 3: Add Sentry uptime checks**

In Sentry project:
1. Alerts → Create Alert
2. "When an error event is received"
3. Send to email/Slack

**Time Estimate:** 2 hours

---

### Day 10: Documentation & testing

**Step 1: Create deployment guide**

Create `docs/DEPLOYMENT.md`:
```markdown
# Deploying Harmonix

## Prerequisites
- Docker & Docker Compose installed
- GitHub Actions enabled
- Sentry account created

## Local Deployment
```bash
docker-compose -f deployment/docker-compose.yml up -d
curl http://localhost:3000
```

## Staging Deployment
Push to `develop` branch - automatic deployment via GitHub Actions

## Production Deployment
1. Create release PR (develop → main)
2. Merge after approval
3. Monitor in Sentry dashboard
```

**Step 2: Create runbook**

Create `docs/RUNBOOK.md`:
```markdown
# Harmonix Operations Runbook

## Health Check
```bash
curl https://harmonix.example.com/health
```

## View Logs
```bash
# Docker Compose
docker-compose logs -f

# Kubernetes
kubectl logs -f deployment/harmonix
```

## Rollback
```bash
# Automatic rollback on error spike
# Or manual:
./deployment/rollback.sh production
```
```

**Step 3: Test end-to-end**

- [ ] Change code locally
- [ ] Push to feature branch
- [ ] Verify GitHub Actions runs
- [ ] Merge to develop
- [ ] Verify staging deployment
- [ ] Test staging application
- [ ] Merge to main
- [ ] Verify production deployment
- [ ] Check Sentry dashboard

**Time Estimate:** 4 hours

---

## Summary: 2-Week Implementation

### Checklist

- [x] Day 1-2: Fix npm test, update CVEs
- [x] Day 2-3: Fix source maps, create GitHub Actions
- [x] Day 4-5: Add dependency scanning, husky, lint-staged
- [x] Day 5: Bundle size checking
- [x] Day 6: Docker + docker-compose
- [x] Day 7: Staging deployment automation
- [x] Day 8: Sentry error tracking
- [x] Day 9: Health monitoring (UptimeRobot)
- [x] Day 10: Documentation & testing

### Infrastructure Costs

| Service | Cost | Purpose |
|---------|------|---------|
| GitHub Actions | Free (2,000 min/month) | CI/CD |
| Sentry | Free tier ($0) | Error tracking |
| UptimeRobot | Free tier ($0) | Uptime monitoring |
| Vercel/Netlify | Free tier ($0-20/mo) | Hosting |
| DigitalOcean | $5-10/mo | VPS (optional) |
| **Total** | **Free-$20/mo** | Production ready |

### Key Metrics After Implementation

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Build time | Manual | 5 min | < 10 min |
| Test coverage | 14.5% | 50% | 80%+ |
| CVEs | 4 | 0 | 0 |
| Deployments/week | 0-1 | 3-5 | Daily |
| MTTR (Mean Time To Recovery) | 4+ hours | 15 min | < 5 min |
| Uptime | 95% | 99.5%+ | 99.9% |

---

## Next Steps (Weeks 3-4)

1. **Expand test coverage to 50%+**
   - Focus on high-risk code (engines, file upload)
   - Estimated: 1 week

2. **Add integration tests**
   - Test worker communication
   - Test analysis pipeline
   - Estimated: 3 days

3. **Setup staging → production approval**
   - Manual gate on main branch
   - Requires review + testing
   - Estimated: 1 day

4. **Implement feature flags**
   - Control rollout of new features
   - Easy rollback without code change
   - Estimated: 3 days

5. **Advanced monitoring**
   - Performance metrics (Web Vitals)
   - User session tracking
   - Custom event analytics
   - Estimated: 1 week

---

## Troubleshooting

### GitHub Actions not triggering
- Check branch protection rules
- Verify workflow syntax: `gh workflow view`
- Check for secrets in required step

### Docker build fails
```bash
# Clean up
docker system prune -a

# Rebuild with verbose output
docker build --no-cache -t harmonix:dev ./frontend
```

### Tests failing locally
```bash
# Clear cache
rm -rf node_modules package-lock.json

# Reinstall and test
npm install
npm test
```

### Sentry not receiving errors
```bash
# Check DSN is set
echo $VITE_SENTRY_DSN

# Test error explicitly
throw new Error("Test Sentry error");

# Check browser console for Sentry messages
```

---

## Resources

- **GitHub Actions:** https://docs.github.com/en/actions
- **Docker:** https://docs.docker.com
- **Sentry:** https://docs.sentry.io/platforms/javascript/guides/react/
- **npm audit:** https://docs.npmjs.com/cli/v9/commands/npm-audit
- **Vite:** https://vitejs.dev/config/

---

## Support

For issues or questions:
1. Check GitHub Actions logs
2. Review Sentry error messages
3. Check deployment logs: `docker-compose logs`
4. Consult documentation files in `/docs` and `deployment/`

Good luck with your CI/CD implementation!
