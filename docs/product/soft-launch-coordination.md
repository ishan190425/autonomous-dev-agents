# Soft Launch Coordination (Feb 20-23, 2026)

> Tactical plan for the 4-day soft launch window before v1.0-alpha public launch.
> **Author:** 📦 Product (The PM)
> **Cycle:** 220
> **Date:** 2026-02-08
> **Relates to:** Issue #26 (v1.0-alpha Launch Coordination)

---

## Overview

The soft launch is our **controlled rollout** before the public community launch. We release to npm, announce to close networks, and gather initial feedback to catch issues before the HN/ProductHunt push.

**Why soft launch?**

- Catch installation issues with real users
- Validate docs/onboarding flow
- Build initial GitHub stars and social proof
- Generate testimonials for community launch

---

## Timeline

| Date         | Day   | Focus                               | Owner                 |
| ------------ | ----- | ----------------------------------- | --------------------- |
| Feb 20 (Thu) | Day 1 | npm publish + internal announcement | Ops + Growth          |
| Feb 21 (Fri) | Day 2 | Close network outreach              | Growth                |
| Feb 22 (Sat) | Day 3 | Monitor + iterate                   | All                   |
| Feb 23 (Sun) | Day 4 | Feedback synthesis + fixes          | Product + Engineering |

---

## Day 1: npm Publish (Feb 20)

### Pre-Publish Checklist

- [ ] NPM_TOKEN configured in GitHub repo secrets
- [ ] Package.json version set to `1.0.0-alpha.1`
- [ ] README has correct npm install command
- [ ] CHANGELOG prepared for v1.0.0-alpha.1
- [ ] License file present (MIT)
- [ ] All CI checks green on main

### Publish Sequence

1. **Tag release:** `git tag v1.0.0-alpha.1 && git push --tags`
2. **CI triggers publish:** `.github/workflows/publish.yml`
3. **Verify on npm:** Check `npm view @ada/cli`
4. **Test install:** Fresh machine `npm install -g @ada/cli && ada --version`

### Internal Announcement

**Discord (#announcements):**

> 🚀 **v1.0.0-alpha.1 is LIVE on npm!**
>
> Install it now:
>
> ```bash
> npm install -g @ada/cli
> cd your-repo
> ada init
> ada run
> ```
>
> Please report any issues in #support. We're in soft launch mode — full public launch is Feb 24!

---

## Day 2: Close Network Outreach (Feb 21)

### Target Audience

| Tier | Audience            | Size | Channel             |
| ---- | ------------------- | ---- | ------------------- |
| 1    | Friends who code    | ~10  | Direct message      |
| 2    | Discord members     | ~25  | Server announcement |
| 3    | Twitter mutuals     | ~50  | DM + soft tweet     |
| 4    | Early email signups | ~20  | Email blast         |

### Outreach Template (DM/Email)

> Hey [Name],
>
> Quick favor — I just shipped the alpha of a project I've been building: ADA, an AI dev team that runs autonomously.
>
> The twist? I built ADA _with_ ADA. 220+ cycles of autonomous development, zero human commits to the agent code.
>
> Would love your feedback:
>
> - `npm install -g @ada/cli`
> - `cd any-project && ada init`
> - Let it run a cycle and tell me what breaks
>
> Takes 5 min. Any feedback helps!
>
> [Link to GitHub]

### Soft Tweet (not thread, not announcement)

> Been building an autonomous dev team framework. Finally shipped the alpha.
>
> `npm i -g @ada/cli`
>
> Built it with itself — 220 cycles, 35 PRs merged, zero human commits.
>
> Curious if it breaks on your repo. 🧪

---

## Day 3-4: Monitor + Iterate (Feb 22-23)

### Monitoring Checklist

**Every 4 hours:**

- [ ] npm download count
- [ ] GitHub stars/forks
- [ ] Discord activity
- [ ] GitHub issues (new)
- [ ] Twitter mentions

### Feedback Triage Process

| Priority | Description        | Response Time    | Owner       |
| -------- | ------------------ | ---------------- | ----------- |
| P0       | npm install fails  | 30 min           | Ops         |
| P1       | Core command crash | 2 hours          | Engineering |
| P2       | Confusing docs     | 24 hours         | Product     |
| P3       | Feature request    | Log for Sprint 2 | Product     |

### Issue Response Template

```markdown
Thanks for reporting this! 🙏

[Immediate response/workaround]

We're tracking this in Issue #[X]. Fix incoming.

— The ADA Team
```

### Quick Fix Protocol

For P0/P1 issues discovered during soft launch:

1. File GitHub issue with `soft-launch` label
2. Engineering implements fix
3. QA verifies in <30 min
4. Ops merges + tags `v1.0.0-alpha.2`
5. Notify reporter

---

## Feedback Synthesis (Feb 23)

### Feedback Collection Points

1. **Discord #feedback channel** — structured feedback
2. **GitHub Issues** — bugs and feature requests
3. **DM responses** — qualitative insights
4. **npm download errors** — technical issues

### Synthesis Document

Create `docs/product/soft-launch-feedback-synthesis.md` by end of Day 4:

```markdown
## Soft Launch Feedback Synthesis

### Metrics

- npm downloads: [X]
- GitHub stars: [X]
- Issues filed: [X]
- Positive feedback: [X]
- Negative feedback: [X]

### Common Themes

1. [Theme 1]
2. [Theme 2]

### Quick Fixes Shipped

- [Fix 1]

### Sprint 2 Backlog Additions

- [Feature request 1]

### Testimonials Collected

- "[Quote]" — @user
```

---

## Success Criteria

### Minimum Viable Soft Launch

| Metric               | Target | Measurement   |
| -------------------- | ------ | ------------- |
| npm downloads        | 20+    | npm stats     |
| GitHub stars         | 5+     | Repo page     |
| Install success rate | 90%+   | Issue reports |
| P0 bugs              | 0      | Issue tracker |

### Stretch Goals

| Metric                     | Target |
| -------------------------- | ------ |
| npm downloads              | 50+    |
| GitHub stars               | 15+    |
| External repos running ADA | 3+     |
| Testimonials collected     | 3+     |

---

## Risk Mitigation

### If npm publish fails

1. Debug locally with `npm pack`
2. Manual publish with `npm publish --access public`
3. Document workaround, fix CI for v1.0.0-alpha.2

### If install issues are widespread

1. Quick diagnosis (Node version? npm version? OS?)
2. Add troubleshooting to README
3. Consider Docker fallback: `docker run ada/cli init`

### If no engagement

1. Double down on direct outreach (Tier 1 contacts)
2. Offer 1:1 setup help via Discord
3. Consider delaying public launch for more testing

---

## Launch Assets Ready

Confirm before Feb 20:

- [ ] README is polished and accurate
- [ ] Demo GIF/video embedded
- [ ] Discord invite link works
- [ ] GitHub repo is public
- [ ] npm package name is available
- [ ] Getting Started guide tested
- [ ] CHANGELOG written

---

## Role Assignments

| Role            | Responsibility                             |
| --------------- | ------------------------------------------ |
| **Ops**         | npm publish execution, quick fix merges    |
| **Growth**      | Outreach, social, community management     |
| **Product**     | Feedback triage, synthesis, prioritization |
| **Engineering** | Bug fixes, quick iterations                |
| **QA**          | Verify fixes, install testing              |
| **CEO**         | Strategic decisions, blocker escalation    |

---

## Post-Soft Launch

After Feb 23, hand off to **community launch** (Feb 24):

- Finalize HN "Show HN" post draft
- Prepare Product Hunt launch
- Schedule launch tweet thread
- Alert accelerator contacts

The soft launch is dress rehearsal. If we nail this, Feb 24 is a victory lap.

---

_📦 Product (The PM) — Cycle 220_
