# Sprint 3 Activation Criteria — Auth & Onboarding Success Metrics (C1257)

> **Purpose:** Define testable activation criteria for Sprint 3 auth/onboarding features
> **Author:** 📦 Product (The PM)
> **Cycle:** 1257 | **Date:** 2026-02-27 20:55 EST
> **Related:** #181 (GitHub OAuth), #183 (Onboarding Wizard), #155 (SaaS Container)
> **Based on:** C1255 Research (SaaS Onboarding UX Research)
> **Sprint 3:** Mar 1-14, 2026

---

## Executive Summary

This document translates C1255's competitive research into testable acceptance criteria for Sprint 3. Engineering and QA should use these metrics to validate Day 1 implementations.

**Core Targets:**

- **Auth completion:** <2 minutes from landing page
- **First dispatch:** <5 minutes from `ada init`
- **Error resolution:** <30 seconds with actionable messages

---

## 1. GitHub OAuth (#181) — Activation Criteria

### 1.1 Time Targets (MUST PASS)

| Step                          | Target         | Measurement           |
| ----------------------------- | -------------- | --------------------- |
| Landing → GitHub OAuth prompt | <5 seconds     | Page load time        |
| OAuth consent → callback      | <10 seconds    | GitHub roundtrip      |
| Callback → "Welcome" screen   | <3 seconds     | Token save + redirect |
| **Total auth flow**           | **<2 minutes** | End-to-end stopwatch  |

### 1.2 Functional Criteria (MUST PASS)

- [ ] **Single-click auth:** "Log in with GitHub" button initiates OAuth (no form fields)
- [ ] **Minimal scopes:** Request only `read:user` and `repo` (public repos default)
- [ ] **Scope upgrade flow:** Optional write access prompted only when needed (PR creation)
- [ ] **Token persistence:** Session survives browser close (14-day default)
- [ ] **CLI integration:** `ada login` opens browser, captures token, confirms in terminal
- [ ] **Error recovery:** Failed OAuth redirects to retry page with clear message

### 1.3 UX Criteria (SHOULD PASS)

- [ ] **Welcome screen shows next steps:** CLI install command, `ada init` instruction
- [ ] **No dead ends:** Every error state has an actionable CTA
- [ ] **Mobile-friendly:** OAuth flow works on mobile browsers (for docs/sharing)
- [ ] **Loading states:** Spinner or skeleton during OAuth callback processing

### 1.4 Security Criteria (MUST PASS)

- [ ] **PKCE flow:** OAuth uses PKCE for enhanced security
- [ ] **State parameter:** Prevents CSRF attacks
- [ ] **Token encryption:** Stored tokens encrypted at rest
- [ ] **Scope transparency:** User sees exactly what permissions are requested

---

## 2. Onboarding Wizard (#183) — Activation Criteria

### 2.1 The 3-Step Golden Path (per C1255)

```
Step 1: Authenticate     ─→  ada login (or "Log in with GitHub")
                             Target: <2 min

Step 2: Connect          ─→  ada init (or "Select Repository")
                             Target: <1 min

Step 3: First Action     ─→  ada dispatch start (or "Start First Cycle")
                             Target: <2 min

TOTAL TIME-TO-FIRST-VALUE: <5 MINUTES
```

### 2.2 CLI Onboarding Criteria (MUST PASS)

| Command                      | Time Target | Success Criteria                    |
| ---------------------------- | ----------- | ----------------------------------- |
| `npm install -g @ada-ai/cli` | <30 sec     | npm registry fetch                  |
| `ada login`                  | <90 sec     | Browser opens, token saved          |
| `ada init`                   | <30 sec     | Project detected, `agents/` created |
| `ada dispatch start`         | <60 sec     | First cycle executes                |

### 2.3 Web Onboarding Criteria (MUST PASS)

| Screen                     | Time Target | Success Criteria    |
| -------------------------- | ----------- | ------------------- |
| Landing → Dashboard        | <3 sec      | Post-auth redirect  |
| Dashboard → Repo select    | <5 sec      | GitHub repos listed |
| Repo select → Connected    | <10 sec     | Webhook installed   |
| Connected → First dispatch | <30 sec     | Cycle visible in UI |

### 2.4 Auto-Detection Criteria (SHOULD PASS)

- [ ] **Project type detection:** Identifies web app / CLI / library / API from `package.json`, file patterns
- [ ] **Framework detection:** React, Next.js, Express, etc.
- [ ] **Git validation:** Confirms valid git repo before init
- [ ] **Node.js check:** Warns if Node.js <18 detected
- [ ] **GitHub CLI check:** Suggests `gh auth login` if not authenticated

### 2.5 Error Message Quality (MUST PASS)

Every error message must include:

1. **What failed:** Clear description
2. **Why it failed:** Root cause if detectable
3. **How to fix:** Actionable command or link
4. **Where to get help:** Discord/docs link

**Examples:**

```
❌ Bad:  "Authentication failed"
✅ Good: "GitHub OAuth failed: Invalid state parameter.
         This can happen if you have multiple browser tabs open.
         Fix: Close other tabs and try again: ada login
         Help: https://ada.dev/docs/auth-troubleshooting"
```

```
❌ Bad:  "Could not initialize"
✅ Good: "ada init failed: Not a git repository.
         ADA requires a git repo to track agent changes.
         Fix: git init && ada init
         Help: https://ada.dev/docs/getting-started"
```

---

## 3. Activation Funnel Targets (Launch Week)

Based on C1255 competitor analysis:

```
Funnel Stage                 Target    Tracking Method
─────────────────────────────────────────────────────────
Visit ada.dev                100%      Analytics
Click "Log in with GitHub"   40%       Event tracking
Complete OAuth               90%*      OAuth callback
Install CLI                  70%*      Post-auth survey
Run ada init                 60%*      API telemetry
Complete first dispatch      50%*      Dispatch API
Return within 7 days         40%       User re-engagement

* of previous stage
```

**North Star:** 20% of visitors complete first dispatch in Week 1.

---

## 4. Day 1 Validation Checklist

### 4.1 Engineering Pre-Merge Checklist (Day 1-3)

- [ ] OAuth flow completes in <2 minutes (timed test)
- [ ] `ada login` works on macOS, Linux, Windows
- [ ] Token persists across terminal sessions
- [ ] Error messages follow quality criteria above
- [ ] No console errors in browser during auth

### 4.2 QA Acceptance Testing (Day 4-7)

- [ ] **Happy path:** New user → auth → init → dispatch in <5 min
- [ ] **Edge cases:** Expired tokens, revoked access, network errors
- [ ] **Cross-browser:** Chrome, Firefox, Safari tested
- [ ] **CLI environments:** bash, zsh, fish, PowerShell tested
- [ ] **Error paths:** All errors have actionable messages

### 4.3 Product Validation (Day 7-10)

- [ ] **Dogfood test:** Team member completes flow without guidance
- [ ] **Time tracking:** Actual time-to-first-dispatch measured
- [ ] **Friction audit:** List any confusion or unnecessary steps
- [ ] **Documentation check:** Getting started guide matches reality

---

## 5. Sprint 3 Feature Dependencies

```
Week 1 (Mar 1-7)
├── #181 GitHub OAuth ────────────────────────┐
│   └── Auth flow (Day 1-3)                   │
│   └── Token management (Day 2-4)            │
│   └── CLI integration (Day 3-5)             │
│                                             ▼
├── #183 Onboarding (parallel)          ┌─────────────┐
│   └── Auto-detection (Day 1-3)        │ Integration │
│   └── Error messages (Day 2-4)        │  Testing    │
│   └── Welcome flow (Day 4-6)          │  (Day 5-7)  │
│                                       └─────────────┘
Week 2 (Mar 8-14)
├── Polish and edge cases
├── Load testing
└── Launch preparation
```

---

## 6. Success Criteria Summary

### Must Ship (Launch Blocker)

- [ ] GitHub OAuth completes in <2 min
- [ ] `ada login` + `ada init` + `ada dispatch start` in <5 min
- [ ] All errors have actionable messages
- [ ] Token persistence works across sessions

### Should Ship (Quality Bar)

- [ ] Project type auto-detection
- [ ] Pre-flight checks (Node, git, gh)
- [ ] Mobile-friendly OAuth flow
- [ ] Loading states and transitions

### Nice to Have (Sprint 4)

- [ ] Demo mode (try before auth)
- [ ] In-browser first dispatch
- [ ] Email notification on first PR

---

## 7. Revision History

| Version | Date       | Author     | Changes                                  |
| ------- | ---------- | ---------- | ---------------------------------------- |
| 1.0     | 2026-02-27 | 📦 Product | Initial criteria based on C1255 research |

---

_📦 The PM (Product) — Cycle 1257 | Synthesizing C1255 research into testable activation criteria for Sprint 3 Day 1._
