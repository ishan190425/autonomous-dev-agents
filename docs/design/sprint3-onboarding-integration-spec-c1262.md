# Sprint 3 Onboarding Integration Spec (C1262)

> **Purpose:** Day 1 implementation handoff integrating Research (C1255) + Product (C1257) into unified onboarding UX
> **Author:** 🎨 Design (The Architect)
> **Cycle:** 1262 | **Date:** 2026-02-27 22:35 EST
> **Related:** #183 (Onboarding Wizard), #181 (GitHub OAuth), #155 (SaaS Container)
> **Builds on:** C1222 (Terminal UI), C1255 (Research), C1257 (Product Criteria)
> **Sprint 3:** Mar 1-14, 2026 — Day 1 Ready ✅

---

## Executive Summary

This spec integrates C1255's competitive research findings and C1257's activation criteria into concrete UX patterns for Sprint 3 Day 1 implementation. It provides the missing link between Product criteria and Engineering execution.

**Key Deliverables:**

1. **3-Step Golden Path** — Unified Auth→Connect→Act flow for CLI + Web
2. **Time-Optimized Flows** — Designed to hit <2 min auth, <5 min activation targets
3. **Error Message Templates** — What/Why/Fix/Help format for all error states
4. **Web Dashboard Wireframes** — Parallel to C1222's terminal UI spec

---

## 1. The 3-Step Golden Path (from C1255)

### 1.1 Flow Visualization

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ADA ONBOARDING FLOW                              │
│                                                                         │
│   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐            │
│   │   STEP 1    │ ──▶  │   STEP 2    │ ──▶  │   STEP 3    │            │
│   │ AUTHENTICATE│      │   CONNECT   │      │ FIRST ACTION│            │
│   └─────────────┘      └─────────────┘      └─────────────┘            │
│         │                    │                    │                     │
│    ┌────┴────┐          ┌────┴────┐          ┌────┴────┐               │
│    │  GitHub │          │  Repo/  │          │ Dispatch│               │
│    │  OAuth  │          │ Project │          │  Start  │               │
│    └─────────┘          └─────────┘          └─────────┘               │
│                                                                         │
│   Target: <2 min        Target: <1 min       Target: <2 min            │
│   ────────────────────────────────────────────────────────             │
│                   TOTAL: <5 MINUTES                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 CLI Golden Path

```bash
# STEP 1: Authenticate (<2 min)
$ npm install -g @ada-ai/cli    # 30 sec
$ ada login                      # Opens browser → GitHub OAuth → token saved

# STEP 2: Connect (<1 min)
$ cd my-project
$ ada init                       # Auto-detect, create agents/

# STEP 3: First Action (<2 min)
$ ada dispatch start             # First autonomous cycle!
```

### 1.3 Web Golden Path

```
STEP 1: ada.dev → "Log in with GitHub" → OAuth → Dashboard
STEP 2: Dashboard → "Connect Repository" → Select repo → Webhook installed
STEP 3: Dashboard → "Start First Dispatch" → Watch cycle execute
```

---

## 2. Step 1: Authenticate — UX Specification

### 2.1 Web: Login Page

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                           ada.dev/login                                 │
│                                                                         │
│    ╔═══════════════════════════════════════════════════════════════╗   │
│    ║                                                               ║   │
│    ║     🤖 ADA — Autonomous Dev Agents                            ║   │
│    ║                                                               ║   │
│    ║     AI roles that ship code while you sleep.                  ║   │
│    ║                                                               ║   │
│    ║     ┌───────────────────────────────────────────────────┐     ║   │
│    ║     │  🐙  Continue with GitHub                         │     ║   │
│    ║     └───────────────────────────────────────────────────┘     ║   │
│    ║                                                               ║   │
│    ║     By continuing, you agree to our                           ║   │
│    ║     Terms of Service and Privacy Policy                       ║   │
│    ║                                                               ║   │
│    ╚═══════════════════════════════════════════════════════════════╝   │
│                                                                         │
│    ┌─────────────────────────────────────────────────────────────┐     │
│    │  💡 Most developers complete setup in under 5 minutes        │     │
│    └─────────────────────────────────────────────────────────────┘     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Design Notes:**

- Single CTA: "Continue with GitHub" (not "Sign up" / "Log in" — reduces cognitive load)
- GitHub-only auth initially (per C1255: covers 95%+ of target users)
- Trust indicator: "Most developers complete setup in under 5 minutes"
- Mobile-responsive: Button is touch-friendly (min 48px height)

### 2.2 Web: OAuth Consent → Callback

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                        Connecting to GitHub...                          │
│                                                                         │
│                              ◉ ◯ ◯                                      │
│                                                                         │
│                   (animated spinner during OAuth)                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

    ↓ (callback received, token saved)

┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                            ✅ Welcome, @ishan!                          │
│                                                                         │
│     You're ready to deploy your first autonomous dev team.              │
│                                                                         │
│     ┌─────────────────────────────────────────────────────────────┐     │
│     │                                                             │     │
│     │  OPTION A: Use CLI (recommended for existing projects)     │     │
│     │                                                             │     │
│     │  npm install -g @ada-ai/cli                                │     │
│     │  cd your-project && ada init                               │     │
│     │  ada dispatch start                                         │     │
│     │                                                             │     │
│     │  [Copy Commands]                                            │     │
│     │                                                             │     │
│     ├─────────────────────────────────────────────────────────────┤     │
│     │                                                             │     │
│     │  OPTION B: Connect via Dashboard                           │     │
│     │                                                             │     │
│     │  ┌───────────────────────────────────────────────────┐      │     │
│     │  │  🔗  Connect a Repository                          │      │     │
│     │  └───────────────────────────────────────────────────┘      │     │
│     │                                                             │     │
│     └─────────────────────────────────────────────────────────────┘     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Design Notes:**

- Personalized greeting with GitHub username
- Two clear paths: CLI (power users) vs Dashboard (visual users)
- "Copy Commands" button copies all three lines to clipboard
- No dead ends — immediate next action in both cases

### 2.3 CLI: `ada login`

```
$ ada login

🔐 Opening browser for GitHub authentication...

┌─────────────────────────────────────────────────────────────────────────┐
│  Waiting for GitHub authorization...                                    │
│                                                                         │
│  If your browser didn't open, visit:                                    │
│  https://ada.dev/auth/cli?code=XXXX-XXXX                                │
│                                                                         │
│  ◐ Waiting...                                                           │
└─────────────────────────────────────────────────────────────────────────┘

    ↓ (callback received)

✅ Logged in as @ishan

┌─────────────────────────────────────────────────────────────────────────┐
│  🎉 Authentication complete!                                            │
│                                                                         │
│  Next: Initialize ADA in your project:                                  │
│  $ cd your-project && ada init                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Design Notes:**

- Fallback URL for manual auth (e.g., WSL, SSH sessions where browser won't open)
- Animated spinner during wait
- Immediate next step instruction (no "what now?" confusion)

---

## 3. Step 2: Connect — UX Specification

### 3.1 CLI: `ada init` (with auto-detection)

```
$ cd my-awesome-app
$ ada init

🔍 Analyzing project...

┌─────────────────────────────────────────────────────────────────────────┐
│  📁 Project Detected                                                    │
│                                                                         │
│  Directory:   my-awesome-app                                            │
│  Framework:   Next.js 14 (detected from package.json)                   │
│  Git:         ✅ Initialized (main branch)                              │
│  GitHub:      ✅ Remote: github.com/ishan/my-awesome-app                │
└─────────────────────────────────────────────────────────────────────────┘

? Select team size for role recommendations:
  ○ Solo (1 person) — 3 core roles
  ● Small (2-5 people) — 5 balanced roles   ← recommended
  ○ Full (6+ people) — 10 specialized roles

✨ Creating agents/ directory...

┌─────────────────────────────────────────────────────────────────────────┐
│  ✅ ADA Initialized!                                                    │
│                                                                         │
│  Created:                                                               │
│    agents/                                                              │
│    ├── DISPATCH.md          (agent orchestration protocol)             │
│    ├── roster.json          (team composition)                         │
│    ├── state/rotation.json  (cycle state)                              │
│    ├── memory/bank.md       (shared knowledge)                         │
│    ├── rules/RULES.md       (team rules)                               │
│    └── playbooks/           (role-specific guides)                     │
│                                                                         │
│  Roles (5): ⚙️ engineering  🔍 qa  📦 product  🛡️ ops  📋 scrum        │
│                                                                         │
│  Ready! Run your first dispatch:                                        │
│  $ ada dispatch start                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Design Notes:**

- Auto-detection reduces questions (framework detected from package.json)
- Git + GitHub validation upfront (prevents errors later)
- Team size recommendation based on project size
- Tree visualization shows what was created
- Immediate next step: `ada dispatch start`

### 3.2 Web: Connect Repository

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  🔗 Connect a Repository                                                │
│                                                                         │
│  Select a repository to deploy ADA agents:                              │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🔍 Search repositories...                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  YOUR REPOSITORIES                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  📁 ishan/my-awesome-app                          [Connect]      │   │
│  │     Next.js • Updated 2 hours ago                                │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  📁 ishan/api-service                             [Connect]      │   │
│  │     Express • Updated 1 day ago                                  │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  📁 ishan/cli-tool                                [Connect]      │   │
│  │     TypeScript • Updated 3 days ago                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  💡 ADA works best with active repositories.                     │   │
│  │     Select a repo you're actively developing.                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

    ↓ (after clicking Connect)

┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ⚙️ Configuring ADA for ishan/my-awesome-app...                        │
│                                                                         │
│  ☑ Installing GitHub webhook                                           │
│  ☑ Creating agents/ directory                                          │
│  ◐ Generating initial roster...                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

    ↓ (complete)

┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ✅ Connected: ishan/my-awesome-app                                     │
│                                                                         │
│  ADA agents are ready! Start your first dispatch:                       │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │  ▶  Start First Dispatch                                       │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  Or use CLI:                                                            │
│  $ cd my-awesome-app && ada dispatch start                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Design Notes:**

- Search filter for users with many repos
- Framework detection shown (confirms ADA understands the project)
- Recent activity indicator (encourages active repos)
- Step-by-step progress during setup
- Both web CTA and CLI command shown

---

## 4. Step 3: First Action — UX Specification

### 4.1 CLI: `ada dispatch start`

```
$ ada dispatch start

🚀 Cycle 1 Started

  Role:      ⚙️ Engineering
  Playbook:  agents/playbooks/engineering.md
  Memory:    agents/memory/bank.md (v1)
  Model:     ⚖️ sonnet (auto)

┌─────────────────────────────────────────────────────────────────┐
│  Rotation: engineering → qa → product → ops → scrum*            │
└─────────────────────────────────────────────────────────────────┘

Complete with: ada dispatch complete --action "..."
```

### 4.2 Web: First Dispatch Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  🚀 First Dispatch Running!                                             │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  CYCLE 1                                         ⏱️ 00:45       │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                 │   │
│  │  ⚙️ Engineering                                                 │   │
│  │  Status: Analyzing codebase...                                  │   │
│  │                                                                 │   │
│  │  ┌───────────────────────────────────────────────────────────┐ │   │
│  │  │  📝 Reading project files...                               │ │   │
│  │  │  📊 Identifying improvement opportunities...               │ │   │
│  │  │  ◐ Planning first action...                                │ │   │
│  │  └───────────────────────────────────────────────────────────┘ │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  💡 Your first dispatch usually takes 2-5 minutes.              │   │
│  │     Engineering is learning your codebase!                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Design Notes:**

- Live timer shows progress
- Step-by-step status updates
- Expectation setting ("2-5 minutes")
- Engaging copy ("learning your codebase")

---

## 5. Error Message Standards (from C1257)

### 5.1 Error Template (MANDATORY)

Every error must include four components:

```
❌ [WHAT FAILED]

   Why: [ROOT CAUSE]

   Fix: [ACTIONABLE COMMAND OR STEPS]

   Help: [LINK TO DOCS OR DISCORD]
```

### 5.2 Auth Errors

```
❌ GitHub OAuth failed: Invalid state parameter

   Why: This happens when you have multiple browser tabs open,
        or the auth link expired.

   Fix: Close other tabs and try again:
        $ ada login

   Help: https://ada.dev/docs/auth-troubleshooting
```

```
❌ GitHub OAuth failed: Access denied

   Why: You clicked "Cancel" on the GitHub authorization screen,
        or your organization has restricted third-party app access.

   Fix: Try again and click "Authorize ADA":
        $ ada login

        If your org restricts apps, ask an admin to approve ADA.

   Help: https://ada.dev/docs/org-authorization
```

### 5.3 Init Errors

```
❌ ada init failed: Not a git repository

   Why: ADA requires a git repo to track agent changes and
        coordinate with GitHub.

   Fix: Initialize git first:
        $ git init
        $ ada init

   Help: https://ada.dev/docs/getting-started
```

```
❌ ada init failed: Already initialized

   Why: This directory already has an agents/ folder.

   Fix: To reinitialize, remove the existing config:
        $ rm -rf agents/
        $ ada init

        Or view current status:
        $ ada status

   Help: https://ada.dev/docs/reinitializing
```

```
❌ ada init failed: No GitHub remote

   Why: ADA needs a GitHub remote to create PRs and coordinate.

   Fix: Add a GitHub remote:
        $ git remote add origin git@github.com:you/repo.git
        $ ada init

   Help: https://ada.dev/docs/github-setup
```

### 5.4 Dispatch Errors

```
❌ ada dispatch start failed: Not authenticated

   Why: No valid GitHub token found. You need to log in first.

   Fix: Run the login command:
        $ ada login
        $ ada dispatch start

   Help: https://ada.dev/docs/authentication
```

```
❌ ada dispatch start failed: No agents/ directory

   Why: This project hasn't been initialized with ADA.

   Fix: Initialize first:
        $ ada init
        $ ada dispatch start

   Help: https://ada.dev/docs/getting-started
```

---

## 6. Time Target Verification (from C1257)

### 6.1 Stopwatch Tests (Engineering Pre-Merge)

| Test Case                            | Target     | Measurement      |
| ------------------------------------ | ---------- | ---------------- |
| Fresh install → `ada login` complete | <90 sec    | End-to-end timer |
| `ada init` in detected project       | <30 sec    | Command timer    |
| `ada dispatch start` (first cycle)   | <60 sec    | Command timer    |
| **Total golden path**                | **<5 min** | Full flow timer  |

### 6.2 Performance Checklist

- [ ] OAuth callback processes in <3 seconds
- [ ] Token persistence avoids re-auth on subsequent commands
- [ ] Auto-detection completes in <5 seconds
- [ ] No blocking prompts (all have defaults)
- [ ] Network errors have <3 second timeout with clear message

---

## 7. Accessibility Standards

### 7.1 Terminal UI

- **Color-blind safe:** All states have text indicators, not just colors
  - ✅ Success (green + checkmark)
  - ❌ Error (red + X)
  - ◐ Loading (yellow + spinner)
  - 💡 Info (blue + lightbulb)
- **Screen reader compatible:** All boxes use ASCII, no custom Unicode
- **No blinking:** Spinners animate, never flash

### 7.2 Web UI

- **Focus indicators:** All interactive elements have visible focus
- **Keyboard navigation:** Full flow completable without mouse
- **Reduced motion:** Respect `prefers-reduced-motion` media query
- **Contrast:** All text meets WCAG AA (4.5:1 ratio minimum)

---

## 8. Integration with Existing Specs

This spec builds on:

| Spec  | What It Provides                      | This Spec Adds                  |
| ----- | ------------------------------------- | ------------------------------- |
| C1222 | Terminal UI components (boxen, chalk) | Web wireframes, error templates |
| C1255 | 3-Step Golden Path pattern            | Concrete implementations        |
| C1257 | Time targets, success criteria        | UX flows hitting targets        |
| C1202 | Auth error pages                      | Error message standards         |

**Not duplicated:** C1222's terminal component library (use directly).

---

## 9. Sprint 3 Day 1 Handoff Checklist

### 9.1 For Engineering

- [ ] Read this spec + C1222 (terminal components)
- [ ] Implement OAuth flow per Section 2
- [ ] Implement `ada login` with browser fallback
- [ ] All errors follow Section 5 template
- [ ] Time targets met per Section 6

### 9.2 For QA

- [ ] Happy path test: <5 min end-to-end
- [ ] Error path test: All errors have What/Why/Fix/Help
- [ ] Cross-platform: macOS, Linux, Windows (WSL)
- [ ] Accessibility: keyboard-only completion

### 9.3 For Product

- [ ] Dogfood test without reading docs
- [ ] Friction audit: list any confusion points
- [ ] Activation funnel matches Section 6 targets

---

## 10. Revision History

| Version | Date       | Author    | Changes                              |
| ------- | ---------- | --------- | ------------------------------------ |
| 1.0     | 2026-02-27 | 🎨 Design | Initial integration of C1255 + C1257 |

---

_🎨 The Architect (Design) — Cycle 1262 | Per L724: UX specs follow Product specs within 1 rotation. Synthesizes C1255 research + C1257 criteria into Day 1 implementation handoff._
