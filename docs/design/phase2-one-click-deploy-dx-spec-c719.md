# Phase 2 One-Click Deploy — Developer Experience Specification

> Design spec for ADA SaaS Container deployment UX
> **Author:** 🎨 Design (The Architect) | **Cycle:** 719
> **Timeline:** Mar 8-14, 2026 (Phase 2)
> **Issue:** #155 | **Depends on:** Phase 1 Container MVP (C717-718)

---

## Executive Summary

Phase 2 delivers the "Deploy on Railway" experience — the moment a developer clicks a button and gets an autonomous dev team on their repo. This spec defines every touchpoint from discovery to first successful dispatch cycle.

**Goal:** A developer with zero ADA experience deploys successfully in < 5 minutes.

---

## User Journey Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  USER JOURNEY: First-Time ADA Deployment                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. DISCOVER          2. CLICK           3. CONFIGURE        4. VERIFY     │
│  ───────────         ─────────          ────────────        ─────────      │
│  "What is this?"     "Let's try it"     "Set up my repo"    "Is it working?"│
│                                                                             │
│  ┌─────────┐        ┌─────────┐        ┌─────────────┐     ┌───────────┐   │
│  │ README  │───────▶│ Deploy  │───────▶│ Railway Env │────▶│ Dashboard │   │
│  │ or Docs │        │ Button  │        │ Config Page │     │ + Logs    │   │
│  └─────────┘        └─────────┘        └─────────────┘     └───────────┘   │
│       │                  │                    │                   │         │
│       ▼                  ▼                    ▼                   ▼         │
│  "Sounds cool,      "OAuth to         "Paste tokens,       "First cycle    │
│   low risk"          Railway"          pick repo"           ran! ✅"       │
│                                                                             │
│  TIME: 30s          TIME: 10s          TIME: 2 min         TIME: 2 min    │
│  ────────           ─────────          ──────────          ──────────      │
│  TOTAL: < 5 minutes from click to first successful dispatch                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Discovery (README Experience)

### The Button

The "Deploy on Railway" button should be prominently placed in the README:

```markdown
## 🚀 Quick Start (One-Click Deploy)

Deploy ADA to your repo in under 5 minutes:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/ada-agent)

**What you'll need:**

- GitHub account (for repo access)
- Anthropic API key ([get one free](https://console.anthropic.com))

**What you'll get:**

- Autonomous issue triage and management
- Automated PR creation and code changes
- Documentation updates as code evolves
- 24/7 operation without manual dispatch
```

### UX Principles

| Principle      | Implementation                                        |
| -------------- | ----------------------------------------------------- |
| **Clarity**    | Button text matches destination ("Deploy on Railway") |
| **Trust**      | Clear list of requirements BEFORE clicking            |
| **Low risk**   | Emphasize "free tier" and "can delete anytime"        |
| **Quick wins** | "< 5 minutes" sets expectations                       |

---

## Phase 2: Railway Configuration Page

### Environment Variable Form Design

Railway shows env vars on a configuration page. Design for scanning:

```
┌─────────────────────────────────────────────────────────────────┐
│  Configure ADA Agent Container                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ⚠️  Required                                                    │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  GITHUB_TOKEN                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ghp_                                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│  GitHub Personal Access Token with repo scope                    │
│  → How to create a GitHub PAT                                   │
│                                                                  │
│  GITHUB_REPO                                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ owner/repository                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│  Your repository in owner/repo format                           │
│  Example: ishan190425/my-project                                │
│                                                                  │
│  ANTHROPIC_API_KEY                                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ sk-ant-                                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│  Anthropic Claude API key                                        │
│  → Get an API key from console.anthropic.com                    │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  ⚙️  Optional (sensible defaults)                                │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ADA_DISPATCH_INTERVAL                     [15m        ▼]       │
│  How often to run dispatch cycles                                │
│                                                                  │
│  ADA_ROLES_MODE                            [read-write ▼]       │
│  read-only = issues/comments only                                │
│  read-write = can create PRs and push code                      │
│                                                                  │
│  ADA_LOG_LEVEL                             [info       ▼]       │
│  Logging verbosity (debug for troubleshooting)                  │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│                              [ Deploy Now ]                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Form UX Guidelines

| Element                         | Design Decision                                | Rationale                      |
| ------------------------------- | ---------------------------------------------- | ------------------------------ |
| **Required vs Optional**        | Visual hierarchy (Required first, bold labels) | Reduce cognitive load          |
| **Input placeholders**          | Show expected format (`ghp_`, `sk-ant-`)       | Reduce errors                  |
| **Inline help links**           | "How to create a PAT" directly in form         | Don't make users hunt          |
| **Dropdowns for fixed options** | Interval, mode, log level                      | Prevent typos                  |
| **Examples**                    | Show real example for `owner/repo`             | Pattern matching > explanation |

### Error States

```
┌─────────────────────────────────────────────────────────────────┐
│  ❌ GITHUB_TOKEN                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ github_pat_old_format                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ⚠️ Token should start with 'ghp_' or 'github_pat_'             │
│     Make sure you copied the entire token.                      │
└─────────────────────────────────────────────────────────────────┘
```

**Error message principles:**

1. **What's wrong** (format doesn't match)
2. **Why it matters** (won't authenticate)
3. **How to fix** (copy entire token)

---

## Phase 3: Post-Deploy Verification

### Container Startup Logs

Users will watch logs for confirmation. Design for scanning:

```
┌─────────────────────────────────────────────────────────────────┐
│  Logs: ada-agent-container                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  10:05:01  ✓ Environment validated                              │
│  10:05:01    GITHUB_REPO: ishan190425/my-project                │
│  10:05:01    ADA_DISPATCH_INTERVAL: 15m                         │
│  10:05:01    ADA_ROLES_MODE: read-write                         │
│                                                                  │
│  10:05:02  ✓ GitHub connection verified                         │
│  10:05:02    Repository: ishan190425/my-project (private)       │
│  10:05:02    Permissions: issues ✓ contents ✓ pull_requests ✓  │
│                                                                  │
│  10:05:03  ✓ Anthropic connection verified                      │
│  10:05:03    Model: claude-3-sonnet available                   │
│                                                                  │
│  10:05:04  ✓ Health server started on :8080                     │
│                                                                  │
│  10:05:05  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│            🚀 ADA Agent Ready                                    │
│            First dispatch in 30 seconds...                       │
│            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                  │
│  10:05:35  🔄 Cycle 1 Starting                                   │
│  10:05:35    Role: 👔 CEO (The Founder)                         │
│  10:05:36    Loading memory bank...                             │
│  10:05:40    Checking GitHub issues...                          │
│  10:05:45    Executing action: Initial repo setup               │
│  10:06:02  ✅ Cycle 1 Complete                                   │
│            Action: "Created AGENTS.md and initial memory bank"  │
│            Next cycle in 15 minutes                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Log Design Principles

| Element              | Design                          | Purpose                             |
| -------------------- | ------------------------------- | ----------------------------------- |
| **Checkmarks (✓)**   | Visual success indicators       | Quick scan for "all green"          |
| **Timestamps**       | Left-aligned, consistent format | Trace timing issues                 |
| **Visual separator** | `━━━` bar before "Ready"        | Clear state transition              |
| **Emoji roles**      | `👔 CEO`                        | Human-readable, memorable           |
| **Progress updates** | "Loading...", "Checking..."     | Shows activity (not frozen)         |
| **Cycle summary**    | Action + next timing            | Confirms success, sets expectations |

### Error Log Experience

```
┌─────────────────────────────────────────────────────────────────┐
│  10:05:01  ✓ Environment validated                              │
│  10:05:02  ❌ GitHub connection failed                           │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Error: Bad credentials (401)                              │ │
│  │                                                            │ │
│  │  The GITHUB_TOKEN was rejected by GitHub.                  │ │
│  │                                                            │ │
│  │  Common causes:                                            │ │
│  │  • Token expired or revoked                                │ │
│  │  • Token doesn't have 'repo' scope                         │ │
│  │  • Token was created for a different account               │ │
│  │                                                            │ │
│  │  Fix: Generate a new PAT at                                │ │
│  │  github.com/settings/tokens/new?scopes=repo                │ │
│  │                                                            │ │
│  │  Then update GITHUB_TOKEN in Railway Variables.            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Container will retry in 60 seconds...                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Error experience principles:**

1. **Clear signal** (❌ with error type)
2. **Plain language** (not stack traces)
3. **Possible causes** (most common first)
4. **Actionable fix** (direct link with scopes!)
5. **Graceful handling** (retry, don't crash)

---

## Phase 4: First Success Confirmation

### GitHub Activity (What Users Will Check)

After first cycle, users check GitHub. Design for "proof it worked":

```
GitHub Issue Created by ADA:
┌─────────────────────────────────────────────────────────────────┐
│  🤖 ADA Initialization Complete                                  │
│  #1 opened 2 minutes ago by ada-bot                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  👋 Hello! ADA is now running on this repository.               │
│                                                                  │
│  **Setup Summary:**                                              │
│  - Container: Running on Railway                                │
│  - Dispatch interval: Every 15 minutes                          │
│  - Mode: read-write (can create PRs)                            │
│  - First cycle: Completed successfully                          │
│                                                                  │
│  **What happens next:**                                          │
│  1. I'll analyze your existing issues and PRs                   │
│  2. I'll create an `agents/` folder with memory + config        │
│  3. Each cycle, a role will take one action                     │
│                                                                  │
│  **Need help?**                                                  │
│  - [📚 Documentation](https://ada.dev/docs)                     │
│  - [💬 Discord](https://discord.gg/ada-community)               │
│  - [🐛 Report Issue](https://github.com/ada/cli/issues)         │
│                                                                  │
│  Labels: `ada-bot`, `documentation`                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### First Issue UX Goals

| Goal              | Implementation                             |
| ----------------- | ------------------------------------------ |
| **Confirmation**  | "ADA is now running" — unambiguous success |
| **Transparency**  | Show config so user can verify             |
| **Education**     | Explain what happens next                  |
| **Support paths** | Links for help if needed                   |
| **Low noise**     | One issue, not a flood                     |

---

## railway.json Template Spec

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5,
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30
  },
  "variables": {
    "GITHUB_TOKEN": {
      "description": "GitHub Personal Access Token with repo scope",
      "required": true,
      "placeholder": "ghp_..."
    },
    "GITHUB_REPO": {
      "description": "Target repository (owner/repo)",
      "required": true,
      "placeholder": "owner/repository"
    },
    "ANTHROPIC_API_KEY": {
      "description": "Anthropic Claude API key",
      "required": true,
      "placeholder": "sk-ant-..."
    },
    "ADA_DISPATCH_INTERVAL": {
      "description": "How often to run dispatch cycles",
      "required": false,
      "default": "15m"
    },
    "ADA_ROLES_MODE": {
      "description": "Permission mode (read-only or read-write)",
      "required": false,
      "default": "read-write"
    },
    "ADA_LOG_LEVEL": {
      "description": "Logging verbosity",
      "required": false,
      "default": "info"
    }
  }
}
```

---

## Documentation Structure

### Quick Start (README.md)

```markdown
# ADA — Autonomous Dev Agents

Deploy AI dev agents on any repository.

## 🚀 Deploy in 5 Minutes

### Prerequisites

- GitHub account
- Anthropic API key ([get one free](https://console.anthropic.com))

### One-Click Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/ada)

### Manual Setup

1. Fork this repository
2. Set environment variables (see below)
3. Deploy to Railway, Fly.io, or any Docker host

## Environment Variables

| Variable                | Required | Description                           |
| ----------------------- | -------- | ------------------------------------- |
| `GITHUB_TOKEN`          | ✅       | GitHub PAT with `repo` scope          |
| `GITHUB_REPO`           | ✅       | Your repo (`owner/name`)              |
| `ANTHROPIC_API_KEY`     | ✅       | Claude API key                        |
| `ADA_DISPATCH_INTERVAL` | ❌       | Cycle frequency (default: `15m`)      |
| `ADA_ROLES_MODE`        | ❌       | `read-only` or `read-write` (default) |

## Verification

After deploy, check:

1. ✅ Container logs show "ADA Agent Ready"
2. ✅ First cycle completes within 2 minutes
3. ✅ Initialization issue appears on your repo
```

---

## Success Metrics (Phase 2)

| Metric                | Target          | Measurement       |
| --------------------- | --------------- | ----------------- |
| Time to deploy        | < 5 minutes     | User testing      |
| Deploy success rate   | 95%+            | Railway analytics |
| First-cycle success   | 90%+            | Logs analysis     |
| Support tickets       | < 5% of deploys | Discord/issues    |
| User confusion points | 0 blockers      | Usability testing |

---

## Handoff Checklist for Engineering

### Container Requirements

- [ ] Startup logs follow this spec format
- [ ] Error messages are human-readable (not stack traces)
- [ ] Checkmarks (✓/❌) for visual scanning
- [ ] "Ready" banner with timing info
- [ ] Graceful error handling with retry messaging

### Railway Template Requirements

- [ ] `railway.json` matches this spec
- [ ] Variable descriptions are helpful
- [ ] Placeholders show expected format
- [ ] Defaults are sensible for first-time users

### Documentation Requirements

- [ ] README follows this structure
- [ ] Deploy button is prominent
- [ ] Prerequisites clear before clicking
- [ ] Troubleshooting covers common errors

---

## Open Questions

1. **GitHub App vs PAT messaging?**
   - PAT is simpler but less secure for Phase 1
   - Should we warn about token scope?

2. **First issue: auto-create or optional?**
   - Pro: Clear confirmation that it's working
   - Con: Some users may not want "noise"
   - Recommendation: Create by default, add env var to disable

3. **Failure recovery UX?**
   - If first cycle fails, what does user see?
   - Recommendation: Clear error with fix steps, auto-retry

---

## Related Documents

- **Product C714:** Phase 1 Container MVP Spec
- **Research C712:** SaaS Container Deployment Research
- **QA C716:** Phase 1 Container Test Plan
- **Engineering C717:** PR #159 Container MVP Foundation

---

_🎨 Design | The Architect | Cycle 719 | Phase 2 One-Click Deploy DX Specification_
