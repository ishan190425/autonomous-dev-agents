# 📦 Release Management Guide

> How ADA ships software to users.
> **Owner:** Product (process) + Ops (automation) + CEO (communications)
> **Created:** 2026-02-06 | **Status:** Active

---

## Quick Reference

| Release Type | Version Bump | Trigger                      | Announcement            |
| ------------ | ------------ | ---------------------------- | ----------------------- |
| **Hotfix**   | 0.0.x        | Critical bug in prod         | Changelog only          |
| **Patch**    | 0.0.x        | Bug fixes, dependencies      | Changelog only          |
| **Minor**    | 0.x.0        | New features (non-breaking)  | Release notes + Discord |
| **Major**    | x.0.0        | Breaking changes, milestones | Full PR campaign        |

---

## Release Cadence

### v1.0-alpha (February 24, 2026)

Special first release. See [v1-alpha-launch-roadmap.md](./business/v1-alpha-launch-roadmap.md).

### Post-Launch

- **Patch releases:** As needed (security fixes, critical bugs)
- **Minor releases:** Every 2-4 weeks (feature bundles)
- **Major releases:** Milestone-driven (significant capability jumps)

---

## Release Process

### Phase 1: Scope Lock (Product)

**When:** 2-3 days before release

1. Review open PRs — anything not merged is out of scope
2. Verify no P0/P1 bugs blocking release
3. Confirm changelog draft covers all changes
4. Post scope confirmation to Issue #26 (or current release issue)

**Product confirms:** "v{X.Y.Z} scope is locked. Changes: [list]. Ready for release validation."

### Phase 2: Release Validation (QA → Ops)

**When:** 1-2 days before release

1. QA runs full test suite locally and in CI
2. QA performs manual smoke test of key flows:
   - `npm install -g @ada/cli` (from pack)
   - `ada init` in fresh directory
   - `ada status` shows clean state
   - `ada run --dry-run` executes without error
3. Ops verifies:
   - All CI checks green on `main`
   - `npm pack` produces valid tarball
   - Package metadata correct (name, version, description)

**QA confirms:** "Release candidate v{X.Y.Z} validated. All tests passing, smoke tests clean."

### Phase 3: Tag & Publish (Ops)

**When:** Release day, morning (before announcements)

1. Create release branch: `git checkout -b release/v{X.Y.Z}`
2. Bump version in all `package.json` files
3. Update `CHANGELOG.md` with release date
4. Commit: `chore(release): v{X.Y.Z}`
5. Tag: `git tag v{X.Y.Z}`
6. Push branch and tag
7. Publish to npm:
   ```bash
   npm publish --workspace=packages/core
   npm publish --workspace=packages/cli
   ```
8. Create GitHub Release with changelog body
9. Merge release branch to `main`

**Ops confirms:** "v{X.Y.Z} published to npm and tagged on GitHub. Release URL: [link]"

### Phase 4: Announce (CEO)

**When:** Release day, after Ops confirms publish

See [Announcement Templates](#announcement-templates) below.

1. Draft announcement based on release type
2. Coordinate timing with Growth (avoid weekends, holidays)
3. Publish to channels:
   - **Minor:** Discord, GitHub Release notes
   - **Major:** Twitter thread, Discord, GitHub, Dev.to, HN (if appropriate)
4. Monitor for user feedback, respond to questions

**CEO confirms:** "v{X.Y.Z} announced on [channels]. Monitoring for feedback."

---

## Role Responsibilities

### Product (The PM)

- **Owns:** Release scope, timing, readiness criteria
- **Actions:**
  - Lock scope 2-3 days before release
  - Write release notes content
  - Maintain release calendar
  - Review and approve changelog
- **Not responsible for:** Automation, npm publish, social media

### Ops (The Guardian)

- **Owns:** Release automation, CI/CD, npm publishing
- **Actions:**
  - Run release workflow (tag, build, publish)
  - Verify package integrity
  - Fix any publish failures
  - Maintain `CHANGELOG.md` format
- **Not responsible for:** Scope decisions, announcements

### QA (The Inspector)

- **Owns:** Release validation, quality gates
- **Actions:**
  - Run full test suite on release candidate
  - Perform smoke tests for key flows
  - Block release if quality criteria not met
- **Not responsible for:** Publishing, scope decisions

### CEO (The Founder)

- **Owns:** External communications, strategic timing
- **Actions:**
  - Write and publish announcements (major releases)
  - Coordinate with Growth on timing/channels
  - Handle press/partnership embargoes
- **Not responsible for:** Technical release process

### Growth (The Dealmaker)

- **Owns:** Marketing collateral, demo assets
- **Actions:**
  - Prepare demo GIFs/videos for announcements
  - Suggest optimal posting times
  - Draft social copy (CEO reviews)
- **Not responsible for:** Final announcement decisions

---

## Release Readiness Checklist

Copy this for each release:

```markdown
### v{X.Y.Z} Release Checklist

**Scope Lock (Product)**

- [ ] All planned features merged
- [ ] No P0/P1 bugs open
- [ ] Changelog draft complete
- [ ] Scope posted to release issue

**Validation (QA)**

- [ ] CI pipeline green on `main`
- [ ] Test suite passing (all packages)
- [ ] Smoke tests clean
- [ ] Release candidate approved

**Publish (Ops)**

- [ ] Version bumped in package.json files
- [ ] CHANGELOG.md updated with release date
- [ ] Git tag created
- [ ] npm packages published
- [ ] GitHub Release created

**Announce (CEO)**

- [ ] Announcement drafted
- [ ] Timing coordinated with Growth
- [ ] Published to appropriate channels
- [ ] Monitoring for feedback
```

---

## Changelog Format

Follow [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
## [1.0.0] - 2026-02-24

### Added

- `ada init` — Initialize agent team in any repository
- `ada run` — Execute dispatch cycles (one-shot or continuous)
- `ada status` — View rotation state and memory summary
- `ada memory` — Manage agent memory bank

### Changed

- Improved CLI help text for all commands

### Fixed

- Fixed rotation state persistence across runs

### Security

- Updated dependencies to patch CVE-XXXX-XXXX
```

---

## Announcement Templates

### Minor Release (Discord + GitHub)

````markdown
## 🚀 ADA v{X.Y.Z} Released

**What's new:**

- Feature 1: Brief description
- Feature 2: Brief description
- Bug fix: What was fixed

**Install/Update:**

```bash
npm install -g @ada/cli@latest
```
````

**Full changelog:** [link to GitHub Release]

Thanks to everyone who contributed feedback! 🙏

```

### Major Release (Twitter Thread)

```

🧵 Excited to announce ADA v{X.0.0}!

{Hook — what's the big deal?}

Here's what's new: 👇

1/ {Feature 1 with demo GIF}

2/ {Feature 2 with demo GIF}

3/ {Feature 3}

Install now:
npm install -g @ada/cli

Docs: {link}
GitHub: {link}

If you try it, reply with your experience! We're listening. 🎧

```

### v1.0-alpha Launch (Special)

See `docs/marketing/gtm-strategy.md` for the full launch communications plan.

---

## Versioning Strategy

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR:** Breaking changes (API changes, removed features)
- **MINOR:** New features (backwards compatible)
- **PATCH:** Bug fixes (backwards compatible)

### Pre-1.0 Rules

While in `0.x.x`:
- MINOR versions may include breaking changes
- Document all breaking changes clearly
- Aim for 1.0.0 when API is stable

### Monorepo Sync

All packages share the same version:
- `@ada/cli` — 1.0.0
- `@ada/core` — 1.0.0

Bump all packages together, even if only one changed.

---

## Emergency Hotfix Process

For critical production bugs:

1. **Identify:** Ops or user reports critical issue
2. **Branch:** Create `hotfix/v{X.Y.Z}` from latest tag
3. **Fix:** Engineering applies minimal fix
4. **Test:** QA validates fix + no regressions
5. **Release:** Ops publishes immediately
6. **Announce:** Ops posts to Discord (no CEO needed for patches)
7. **Merge:** Hotfix branch merged to `main`

Hotfixes skip scope lock and full validation — speed matters.

---

## Release Calendar

| Date | Version | Type | Status |
|------|---------|------|--------|
| Feb 24, 2026 | v1.0.0-alpha | Major (Alpha) | Planning |
| Mar 10, 2026 | v1.1.0-alpha | Minor | Tentative |
| Mar 24, 2026 | v1.0.0-beta | Major (Beta) | Tentative |

_Updated by Product each cycle as needed._

---

## Success Metrics

Track for each release:

- **Downloads:** npm download count (7-day, 30-day)
- **Issues:** Bug reports within 48 hours
- **Feedback:** User comments (GitHub, Discord, Twitter)
- **Regression:** Any rollback required?

Review metrics in retrospective to improve process.

---

## References

- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [npm publish docs](https://docs.npmjs.com/cli/v10/commands/npm-publish)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- [Issue #27](https://github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents/issues/27) — Original spec

---

*📦 The PM — Product Lead | Cycle 101*
```
