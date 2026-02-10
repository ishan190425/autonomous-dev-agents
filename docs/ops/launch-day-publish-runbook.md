# 🚀 Launch Day Publish Runbook

> **Target Date:** February 24, 2026
> **Owner:** 🛡️ Ops (The Guardian)
> **Created:** Cycle 334
> **Related:** Issue #127, Issue #26

This runbook provides step-by-step instructions for publishing `@ada/cli` and `@ada/core` to npm on launch day.

---

## Pre-Launch Checklist (Complete by Feb 17)

### ⚠️ Critical — Human Action Required

- [ ] **NPM_TOKEN configured**
  - Go to: https://www.npmjs.com/settings/~/tokens
  - Click: "Generate New Token" → "Classic Token"
  - Type: "Publish" (Automation)
  - Copy the token immediately (shown only once)
  - Add to GitHub: Settings → Secrets and variables → Actions → New repository secret
    - Name: `NPM_TOKEN`
    - Value: (paste token)

### Verification

- [ ] **Dry-run publish successful**
  - Go to: Actions → "Publish to npm" workflow
  - Click: "Run workflow"
  - Select: `dry_run: true`, `packages: all`
  - Verify: All jobs pass (quality gates, pack preview)

---

## Launch Day Sequence (Feb 24)

### Phase 1: Version Bump (Morning)

```bash
# 1. Ensure you're on main with latest
git checkout main
git pull origin main

# 2. Bump version in both packages
# packages/core/package.json: "version": "0.1.0" → "1.0.0-alpha.1"
# packages/cli/package.json: "version": "0.1.0" → "1.0.0-alpha.1"

# 3. Update any version references in docs
# README.md installation examples
# docs/quickstart.md if applicable

# 4. Commit version bump
git add packages/core/package.json packages/cli/package.json
git commit -m "chore: bump version to 1.0.0-alpha.1"
git push origin main
```

### Phase 2: Verify CI (Wait for green)

- [ ] CI pipeline passes on version bump commit
- [ ] All quality gates green (lint, typecheck, test, build)

### Phase 3: Tag and Publish

```bash
# 1. Create version tag
git tag v1.0.0-alpha.1

# 2. Push tag to trigger publish workflow
git push origin v1.0.0-alpha.1
```

### Phase 4: Verify Publication

Monitor the publish workflow:

1. Go to: Actions → "Publish to npm" (triggered by tag)
2. Watch jobs: quality-gates → publish-core → publish-cli → verify-publish → create-release

#### Expected Timeline

- Quality gates: ~3-4 minutes
- Publish @ada/core: ~1 minute
- Publish @ada/cli: ~1 minute
- Verification: ~30 seconds
- GitHub Release: ~30 seconds
- **Total: ~6-7 minutes**

### Phase 5: Manual Verification

After workflow completes:

```bash
# 1. Verify packages on npm
npm view @ada/core@1.0.0-alpha.1 version
npm view @ada/cli@1.0.0-alpha.1 version

# 2. Test global install
npm install -g @ada/cli@1.0.0-alpha.1

# 3. Test basic functionality
ada --version
ada --help
```

### Phase 6: Verify GitHub Release

- [ ] Release created at: https://github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents/releases
- [ ] Tagged as pre-release (alpha)
- [ ] Release notes auto-generated
- [ ] Installation instructions correct

---

## Rollback Procedure

If something goes wrong:

### Scenario 1: Publish Failed (packages not on npm)

1. Check workflow logs for error
2. Fix the issue locally
3. Push fix to main
4. Delete the tag: `git push origin :refs/tags/v1.0.0-alpha.1`
5. Re-tag and push: `git tag v1.0.0-alpha.1 && git push origin v1.0.0-alpha.1`

### Scenario 2: Published but Broken

1. **Deprecate** (preferred over unpublish):

   ```bash
   npm deprecate @ada/cli@1.0.0-alpha.1 "Critical bug found, use 1.0.0-alpha.2"
   npm deprecate @ada/core@1.0.0-alpha.1 "Critical bug found, use 1.0.0-alpha.2"
   ```

2. Fix the issue
3. Bump to `1.0.0-alpha.2`
4. Tag and publish again

### Scenario 3: GitHub Release Wrong

1. Go to Releases page
2. Edit the release: fix notes, links, assets
3. Or delete and let workflow recreate on re-tag

---

## Post-Launch Verification

### Immediate (within 1 hour)

- [ ] npm downloads appearing (may take ~15 min to propagate)
- [ ] GitHub Release visible and correct
- [ ] Installation working from fresh environment
- [ ] Discord announcement made (see Growth runbook)

### Next Day

- [ ] Check npm download stats
- [ ] Monitor GitHub issues for install problems
- [ ] Verify docs links are correct

---

## Contacts

| Role   | Responsibility          | Backup      |
| ------ | ----------------------- | ----------- |
| Ops    | Execute publish, verify | Engineering |
| CEO    | Go/No-Go authority      | Product     |
| Growth | Announce, social posts  | CEO         |

---

## Version History

| Version       | Date         | Notes                  |
| ------------- | ------------ | ---------------------- |
| 1.0.0-alpha.1 | Feb 24, 2026 | Initial public release |

---

_🛡️ Ops | Cycle 334_
