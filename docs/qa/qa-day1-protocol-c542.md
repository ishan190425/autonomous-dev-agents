# 🔍 QA Day 1 Protocol (C542)

> Created: 2026-02-13 16:45 EST | Role: QA | Cycle: 542
> **Purpose:** Define QA monitoring, triage, and response procedures for v1.0-alpha launch (Feb 14-17)

---

## Mission

On Day 1, QA's job is **rapid triage and quality assurance for launch-related issues**. We don't block — we verify, categorize, and enable fast fixes.

---

## Pre-Launch Quality Gate Summary (T-0 Eve)

| Gate      | Status                   | Notes                   |
| --------- | ------------------------ | ----------------------- |
| TypeCheck | ✅ 0 errors              | Clean                   |
| Lint      | ✅ 0 warnings            | Clean                   |
| Tests     | ✅ 1,220 passing         | CLI 405 + Core 815      |
| Coverage  | ✅ 87%+                  | Core 87.68%, CLI 87.36% |
| CI        | ✅ 16+ consecutive green | C521-541                |
| PRs       | ✅ 0 open                | No review debt          |

**Quality gates are GO. ✅**

---

## Monitoring Channels

### Primary (Check every 30 min during launch window)

| Channel          | What to Watch               | Priority |
| ---------------- | --------------------------- | -------- |
| GitHub Issues    | New issues with `bug` label | P0       |
| GitHub Issues    | Install/init failures       | P0       |
| CI Pipeline      | Red builds on main          | P0       |
| Discord #support | User-reported problems      | P1       |

### Secondary (Check every 2 hours)

| Channel          | What to Watch                     | Priority |
| ---------------- | --------------------------------- | -------- |
| npm              | Download errors, failed publishes | P0       |
| Discord #general | Confusion patterns                | P2       |
| Twitter/X        | @ada mentions, complaints         | P2       |

---

## Issue Severity Classification

### P0 — Blocker (Response: <30 min)

**Definition:** Users cannot install or run ADA at all.

**Examples:**

- `npm install @ada/cli` fails
- `ada init` crashes on fresh repo
- `ada dispatch start` throws unhandled error
- Missing dependencies block startup

**Response:**

1. Acknowledge issue immediately (GitHub comment)
2. Ping Engineering in Discord #team
3. Verify reproduction locally
4. Coordinate hotfix (Engineering leads, QA verifies)
5. Test hotfix before merge

### P1 — Degraded (Response: <2 hours)

**Definition:** Core functionality works but with friction.

**Examples:**

- CLI command outputs malformed data
- Error messages are confusing
- Rotation logic edge case
- Memory bank corruption risk

**Response:**

1. Document reproduction steps
2. Classify for Sprint 2 or hotfix
3. If hotfix: coordinate with Engineering
4. If Sprint 2: create issue with full details

### P2 — Minor (Response: <24 hours)

**Definition:** Issue doesn't block usage but impacts experience.

**Examples:**

- Help text typo
- CLI banner rendering issue
- Non-critical log noise
- Documentation inaccuracy

**Response:**

1. Create issue with details
2. Label for Sprint 2
3. No immediate action needed

---

## Triage Checklist (For Each Issue)

```markdown
## Issue #XX Triage

### Classification

- [ ] Severity: P0 / P1 / P2
- [ ] Reproducible: Yes / No / Partial
- [ ] Scope: CLI / Core / Docs / Ops

### Verification

- [ ] Reproduced locally
- [ ] Node version checked
- [ ] npm version checked
- [ ] OS noted

### Routing

- [ ] Engineering notified (if P0/P1)
- [ ] Issue labeled correctly
- [ ] Added to Active Threads (if P0/P1)

### Notes

[Your observations]
```

---

## Hotfix Quality Gate

**All hotfixes MUST pass before merge:**

1. **Local verification:**
   - `npm run typecheck` — 0 errors
   - `npm run lint` — 0 warnings
   - `npm test` — all pass (or explicit skip with reason)

2. **Targeted testing:**
   - Reproduce original bug
   - Verify fix resolves it
   - Check for regression in related functionality

3. **Review:**
   - At least 1 role sign-off (Engineering or QA)
   - Conventional commit format
   - Issue reference in PR

**Emergency bypass:** If CI is down, document local verification in merge commit.

---

## Day 1 Metrics to Track

| Metric              | Target            | Source                                   |
| ------------------- | ----------------- | ---------------------------------------- |
| Issues opened       | Track (no target) | `gh issue list --state open --label bug` |
| P0 issues           | 0                 | Manual triage                            |
| P0 resolution time  | <30 min           | Manual tracking                          |
| Test suite status   | Green             | CI                                       |
| npm install success | >99%              | npm stats (T+24h)                        |

---

## Communication Templates

### P0 Acknowledgment (GitHub)

```
🔍 **QA Triage**

Severity: P0 — Blocker
Reproduced: [Yes/No/Investigating]

Engineering has been notified. We're on it.

ETA: Investigating now, will update within 30 min.
```

### P1 Acknowledgment (GitHub)

```
🔍 **QA Triage**

Severity: P1 — Degraded functionality
Reproduced: [Yes/No]

This will be addressed [today / in Sprint 2]. Workaround: [if applicable]
```

### P2 Acknowledgment (GitHub)

```
🔍 **QA Triage**

Severity: P2 — Minor issue
Tracked for Sprint 2.

Thanks for the report!
```

---

## Post-Launch Review (T+24h)

After 24 hours of launch:

1. **Compile metrics:**
   - Issues opened (by severity)
   - Resolution times
   - User feedback themes

2. **Quality retrospective:**
   - What broke that tests should have caught?
   - Any new test cases to add?
   - Coverage gaps identified?

3. **Update memory bank:**
   - Document learnings
   - Feed into Sprint 2 planning (#102)

---

## Cross-Role Coordination

| Role        | How QA Coordinates                                  |
| ----------- | --------------------------------------------------- |
| Engineering | Tag on P0/P1 issues, coordinate hotfix verification |
| Product     | Share user feedback patterns                        |
| Scrum       | Report metrics for retro                            |
| Design      | Flag UX friction points                             |
| Ops         | Verify publish/deploy issues                        |

---

**QA is ready for launch. 🔍✅**

_— The Inspector (C542)_
