# 🚀 v1.0-alpha Soft Launch Runbook

> Operational playbook for the Feb 24-27, 2026 soft launch window.
> **Created:** Cycle 460 | **Author:** 📦 Product
> **Complements:** Launch FAQ (C450), Go/No-Go Memo (C456)

---

## Timeline Overview

| Date      | Phase             | Focus                             |
| --------- | ----------------- | --------------------------------- |
| Feb 17    | Go/No-Go Decision | Execute decision process per memo |
| Feb 18-23 | Pre-Launch        | Final preparations                |
| Feb 24    | Launch Day (T-0)  | npm publish + announcements       |
| Feb 25-27 | Soft Launch       | Monitor, support, iterate         |
| Feb 28    | Sprint 2 Kickoff  | Transition to feature work        |

---

## Pre-Launch Checklist (Feb 18-23)

### Engineering (T-6 to T-1)

- [ ] Version bump to 1.0.0-alpha (Feb 24 morning)
- [ ] Final npm audit (no high/critical vulnerabilities)
- [ ] README.md updated with installation instructions
- [ ] CHANGELOG.md current through final PR
- [ ] All CI checks green on main

### QA (T-3 to T-1)

- [ ] Full test suite passing (target: 1,225+ tests)
- [ ] Manual CLI walkthrough completed
- [ ] Edge case testing on fresh npm install

### Ops (T-2 to T-1)

- [ ] NPM_TOKEN secret verified
- [ ] npm publish dry-run successful
- [ ] GitHub release draft prepared
- [ ] Discord server ready for traffic

### Growth (T-1)

- [ ] Demo GIF finalized and embedded in README
- [ ] Pioneer/YC app metrics current
- [ ] Twitter/social posts drafted

### Product (T-1)

- [ ] Launch FAQ reviewed and current
- [ ] This runbook reviewed by team (via memory bank)
- [ ] Success metrics baseline recorded

---

## Launch Day Protocol (Feb 24)

### Hour -1: Final Verification

```bash
# Verify clean state
git status  # Should be clean
npm test    # All passing
npm run build  # No errors

# Verify version
cat package.json | grep version  # Should show 1.0.0-alpha
```

### Hour 0: Publish

**Who:** Engineering (Ops backup)

```bash
# npm publish
npm publish --workspace=packages/cli --access public

# Verify publication
npm view @ada/cli
```

**Rollback:** If publish fails, do NOT retry without investigation. Document the error.

### Hour +1: Announce

**Who:** Growth (CEO backup)

1. **GitHub Release** — Create release with changelog, link to npm
2. **Twitter** — Announce with demo GIF
3. **Discord** — Post in #announcements
4. **Pioneer/YC** — Update applications with live link

### Hour +2-4: Monitor

**Who:** QA (rotate with Engineering)

- Watch npm download stats
- Monitor GitHub issues for new reports
- Check Discord for user questions
- Respond to any social mentions

---

## Soft Launch Monitoring (Feb 25-27)

### Daily Checkpoints

| Time      | Action                              | Who     |
| --------- | ----------------------------------- | ------- |
| 09:00 EST | Review overnight issues/Discord     | Product |
| 12:00 EST | npm stats + sentiment check         | Growth  |
| 17:00 EST | Issue triage, update FAQ if needed  | QA      |
| EOD       | Memory bank update with day summary | Scrum   |

### Issue Triage Protocol

**P0 — Blocker (respond within 2 hours):**

- npm install fails
- CLI crashes on basic commands
- Security vulnerability reported

**P1 — High (respond within 24 hours):**

- Feature doesn't work as documented
- Confusing error messages
- Missing documentation for common use case

**P2 — Normal (track for Sprint 2):**

- Enhancement requests
- Minor UX issues
- Feature suggestions

### Feedback Collection

Track in `docs/product/soft-launch-feedback.md`:

```markdown
## User Feedback Log (Feb 24-27)

### Issue Reports

- [ ] #N — Brief description (Source: GitHub/Discord/Twitter)

### Feature Requests

- [ ] Request description (Source)

### Positive Feedback

- Quote (Source)

### FAQ Additions Needed

- [ ] Question that wasn't covered
```

---

## Success Metrics

### Quantitative (Feb 24-27)

| Metric           | Target   | Stretch  |
| ---------------- | -------- | -------- |
| npm downloads    | 50+      | 200+     |
| GitHub stars     | 10+      | 50+      |
| Discord members  | 5+       | 20+      |
| Bug issues filed | <5 P0/P1 | <2 P0/P1 |
| Pioneer upvotes  | 10+      | 50+      |

### Qualitative

- [ ] At least 1 user completes `ada init` + `ada run` cycle
- [ ] No critical bugs blocking basic workflow
- [ ] Positive sentiment in early feedback
- [ ] Zero security vulnerabilities reported

### Baseline (Record Feb 23)

```markdown
Pre-launch baseline (Feb 23):

- Tests: \_\_\_
- Docs: \_\_\_
- Cycles: \_\_\_
- Discord members: \_\_\_
```

---

## Escalation

### Who to Ping

| Issue Type   | Primary     | Backup |
| ------------ | ----------- | ------ |
| npm/publish  | Engineering | Ops    |
| CLI bugs     | Engineering | QA     |
| Security     | Ops         | CEO    |
| User support | Product     | Growth |
| PR/Comms     | Growth      | CEO    |

### Go/No-Go for Continuing

If ANY of these occur, escalate to CEO immediately:

- [ ] Critical security vulnerability discovered
- [ ] > 50% of first-day users report same blocking bug
- [ ] Negative press coverage

---

## Post-Launch Transition (Feb 28)

### Handoff to Sprint 2

1. **Feedback synthesis** — Product summarizes soft launch learnings
2. **Backlog update** — New issues triaged and prioritized
3. **FAQ update** — Add questions that weren't covered
4. **Sprint 2 kickoff** — Resume feature development

### Sprint 2 Priorities (from Issue #102)

1. Heat scoring CLI integration
2. Terminal mode implementation
3. Reflexion Phase 2
4. Response to user feedback from soft launch

---

## Appendix: Quick Reference

### Key Commands

```bash
# Install (what users will run)
npm install -g @ada/cli

# Verify installation
ada --version

# Initialize in a project
cd my-project && ada init

# Run a dispatch cycle
ada run

# Check status
ada status
```

### Key Links

- npm: https://www.npmjs.com/package/@ada/cli
- GitHub: https://github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents
- Discord: discord.gg/5NCHGJAz
- Docs: (TBD)

---

_This runbook will be updated as we approach launch. Track changes in memory bank._
