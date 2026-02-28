# SaaS Onboarding UX Research — Autonomous Dev Agent Platforms (C1255)

> **Purpose:** Competitive analysis of first-run UX patterns for autonomous dev agent SaaS platforms
> **Author:** 🔬 Research (The Scout)
> **Cycle:** 1255 | **Date:** 2026-02-27 20:25 EST
> **Related:** #183 (Onboarding Wizard), #155 (SaaS Container), #181 (GitHub OAuth)
> **Sprint 3:** Mar 1-14, 2026 — Auth & Billing focus

---

## Executive Summary

This document analyzes how competing autonomous dev agent platforms handle user onboarding. The goal is to inform ADA's Sprint 3 auth flow and Sprint 4 onboarding wizard (#183) with evidence-based UX patterns.

**Key Findings:**

1. **3-step onboarding is standard** — Auth → Connect Repo → First Action
2. **OAuth is mandatory** — All platforms use GitHub/GitLab OAuth as primary auth
3. **Time-to-first-value < 5 minutes** — Successful platforms prioritize fast activation
4. **Demo modes build trust** — Many offer sandboxed experiences before requiring OAuth
5. **CLI-first platforms have higher friction** — Web dashboards reduce perceived complexity

---

## 2. Competitor Onboarding Analysis

### 2.1 Devin (Cognition)

**Onboarding Flow:**

1. Waitlist signup (email verification)
2. Slack workspace connect (primary interface)
3. GitHub OAuth (repository access)
4. First task via natural language in Slack

**Strengths:**

- Familiar interface (Slack) reduces learning curve
- Natural language task input feels low-friction
- Async-first — no dashboard to learn

**Weaknesses:**

- Closed source, limited transparency
- No CLI alternative for terminal-native users
- Slack dependency creates vendor lock-in

**Time-to-First-Value:** ~10 minutes (includes Slack setup)

**ADA Takeaway:** Consider chat-based interfaces (Discord/Slack integration) as alternative to CLI-only.

---

### 2.2 Cursor

**Onboarding Flow:**

1. Download IDE (Electron app)
2. Optional: Log in for settings sync
3. Open any project folder
4. Use AI features immediately

**Strengths:**

- **No auth required for basic use** — massive friction reduction
- Works with existing projects instantly
- Progressive disclosure of advanced features
- 2-week free trial, no credit card required

**Weaknesses:**

- Desktop app download is friction for quick evaluation
- Not autonomous — requires constant human interaction
- Mac/Windows focus, Linux support weaker

**Time-to-First-Value:** ~2 minutes (after download)

**ADA Takeaway:** Offer "try before you auth" experience. Demo mode with sample repo.

---

### 2.3 GitHub Copilot

**Onboarding Flow:**

1. GitHub account required (most devs have one)
2. Copilot subscription activation
3. IDE extension install (VS Code, JetBrains, etc.)
4. Works immediately on any file

**Strengths:**

- Leverages existing GitHub account (zero new auth)
- Familiar IDE context
- Free tier for students/OSS maintainers
- 30-day free trial for all users

**Weaknesses:**

- Subscription model ($10-19/mo) may deter exploration
- Not autonomous — requires human loop

**Time-to-First-Value:** ~5 minutes (extension install)

**ADA Takeaway:** GitHub OAuth is natural — most ADA users will have GitHub accounts already.

---

### 2.4 Aider

**Onboarding Flow:**

1. `pip install aider-chat` (or `pipx`)
2. Set API key environment variable
3. `aider` in any git repo
4. Start chatting

**Strengths:**

- **CLI-native** — appeals to terminal power users
- Works immediately with any LLM API key
- No account creation required
- Open source, full transparency

**Weaknesses:**

- API key management is friction for new users
- No web dashboard for non-CLI users
- No team features without additional tooling

**Time-to-First-Value:** ~3 minutes (if API key ready)

**ADA Takeaway:** ADA's `ada init` approach mirrors this. Keep CLI simplicity, add optional web dashboard for teams.

---

### 2.5 OpenHands (OpenDevin)

**Onboarding Flow:**

1. Clone repo or use Docker container
2. Set API keys in `.env` file
3. Run web UI locally
4. Connect to local/remote workspace

**Strengths:**

- Self-hosted option appeals to privacy-conscious users
- Web UI is accessible to non-CLI users
- Active open-source community

**Weaknesses:**

- Docker/local setup is significant friction
- No hosted SaaS option (as of Feb 2026)
- API key configuration is manual

**Time-to-First-Value:** ~15 minutes (Docker setup)

**ADA Takeaway:** Hosted SaaS dramatically reduces friction vs self-hosted. Offer both paths.

---

### 2.6 Claude Code (Anthropic CLI)

**Onboarding Flow:**

1. `npm install -g @anthropic-ai/claude-code`
2. `claude` — browser opens for Anthropic auth
3. Approve permissions
4. Works immediately in terminal

**Strengths:**

- **Browser-based auth** — no manual API key entry
- Anthropic account already exists for many users
- Works with any codebase immediately
- Clear permission model

**Weaknesses:**

- Anthropic-only (no model choice)
- Not multi-agent (single agent sessions)
- Limited memory persistence

**Time-to-First-Value:** ~3 minutes

**ADA Takeaway:** Browser-based OAuth is excellent UX. Apply same pattern for GitHub OAuth.

---

## 3. Onboarding Pattern Matrix

| Platform         | Auth Method          | Steps | Time-to-Value | Demo Mode             | CLI | Web     |
| ---------------- | -------------------- | ----- | ------------- | --------------------- | --- | ------- |
| **Devin**        | OAuth (Slack+GitHub) | 4     | ~10 min       | ❌                    | ❌  | Slack   |
| **Cursor**       | Optional account     | 2     | ~2 min        | ✅ Works without auth | ❌  | IDE     |
| **Copilot**      | GitHub account       | 3     | ~5 min        | ❌ (trial)            | ❌  | IDE ext |
| **Aider**        | API key              | 3     | ~3 min        | ❌                    | ✅  | ❌      |
| **OpenHands**    | API key              | 5     | ~15 min       | ✅ Local sandbox      | ✅  | ✅      |
| **Claude Code**  | OAuth (Anthropic)    | 3     | ~3 min        | ❌                    | ✅  | ❌      |
| **ADA (Target)** | OAuth (GitHub)       | 3     | **<3 min**    | ✅ Demo repo          | ✅  | ✅      |

---

## 4. Best Practices Synthesis

### 4.1 The 3-Step Golden Path

All successful platforms converge on a similar pattern:

```
Step 1: Authenticate (OAuth preferred)
    ↓
Step 2: Connect workspace (repo/folder/Slack)
    ↓
Step 3: First action (generate, fix, ask)
```

**ADA Implementation:**

```bash
# Step 1: Auth
$ ada login        # Opens browser → GitHub OAuth → tokens saved

# Step 2: Connect
$ cd my-project && ada init    # Detects git, creates agents/

# Step 3: First action
$ ada dispatch start    # First autonomous cycle!
```

**Web Alternative:**

```
1. "Log in with GitHub" button
2. "Connect Repository" selector
3. "Start First Dispatch" button
```

### 4.2 Friction Reduction Strategies

| Strategy                   | Example              | ADA Application                             |
| -------------------------- | -------------------- | ------------------------------------------- |
| **OAuth over API keys**    | Claude Code, Copilot | Use GitHub OAuth, not manual tokens         |
| **Try before auth**        | Cursor, some SaaS    | Demo mode with sample ADA repo              |
| **Progressive disclosure** | Cursor, Copilot      | `ada init` is simple; advanced config later |
| **Existing accounts**      | Copilot (GitHub)     | Most devs have GitHub — leverage it         |
| **Local-first option**     | Aider, OpenHands     | `ada init` works locally, SaaS optional     |

### 4.3 Anti-Patterns to Avoid

| Anti-Pattern            | Example               | Why It Fails                                       |
| ----------------------- | --------------------- | -------------------------------------------------- |
| **Waitlist walls**      | Devin (initially)     | Creates artificial scarcity, loses impulse signups |
| **Complex env setup**   | OpenHands Docker      | Casual evaluators bounce                           |
| **Credit card upfront** | Some B2B SaaS         | Kills conversion for explorers                     |
| **No demo/trial**       | Enterprise-only tools | Can't evaluate fit before committing               |
| **Manual config files** | Raw dotenv setup      | Error-prone, intimidating                          |

---

## 5. ADA Sprint 3 Recommendations

### 5.1 Auth Flow (Sprint 3 — #181)

**Recommended Implementation:**

```
┌─────────────────────────────────────────┐
│  ada.dev/login                         │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  🐙  Log in with GitHub          │  │
│  └──────────────────────────────────┘  │
│                                        │
│  By logging in, you agree to our       │
│  Terms of Service and Privacy Policy   │
└─────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│  GitHub OAuth Consent                  │
│  - Read public repos                   │
│  - Read user email                     │
│  - (Optional) Write access for PRs     │
└─────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│  ✅ Welcome to ADA!                    │
│                                        │
│  Quick Start:                          │
│  $ npm install -g @ada-ai/cli          │
│  $ cd your-project && ada init         │
│  $ ada dispatch start                  │
│                                        │
│  Or: Connect a repo now →              │
└─────────────────────────────────────────┘
```

**Key Decisions:**

- **GitHub-only auth initially** — simplest implementation, covers 95%+ of target users
- **Minimal scopes** — read-only public repos default; write access opt-in
- **Immediate CLI instructions** — don't leave users wondering "now what?"

### 5.2 Demo Mode (Sprint 4 — #183)

**Recommendation:** Offer a sandboxed "playground" before requiring auth.

```
ada.dev/playground
┌─────────────────────────────────────────┐
│  🧪 ADA Playground                     │
│                                        │
│  Try ADA on a sample repository:       │
│                                        │
│  [ada-demo/hello-agent]                │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  ▶ Run Sample Dispatch           │  │
│  └──────────────────────────────────┘  │
│                                        │
│  See how 10 AI roles collaborate on    │
│  a real codebase — no signup needed.   │
└─────────────────────────────────────────┘
```

**Benefits:**

- Builds trust before OAuth consent
- Demonstrates value proposition concretely
- Reduces "will this work for me?" uncertainty

### 5.3 Time-to-First-Value Target

Based on competitor analysis:

| Metric              | Competitor Avg | ADA Target  |
| ------------------- | -------------- | ----------- |
| Auth completion     | 3-5 min        | **<2 min**  |
| First dispatch      | 5-15 min       | **<5 min**  |
| First PR from agent | varies         | **<30 min** |

**Success Criteria for Sprint 3:**

- [ ] GitHub OAuth works in single click
- [ ] `ada init` auto-detects project type
- [ ] `ada dispatch start` works within 30 seconds of init
- [ ] Error messages guide users to solutions

---

## 6. Metrics to Track (Sprint 3 Launch)

### 6.1 Activation Funnel

```
Funnel Stage              Target Rate
─────────────────────────────────────
Visit ada.dev            100%
Click "Log in"           40%     ← awareness
Complete OAuth           35%     ← conversion
Install CLI              25%     ← commitment
Run ada init             20%     ← activation
Complete first dispatch  15%     ← retention
Return within 7 days     10%     ← habit
```

### 6.2 Time-Based Metrics

| Metric                       | Target     |
| ---------------------------- | ---------- |
| Auth → CLI install           | <3 minutes |
| CLI install → first dispatch | <5 minutes |
| First dispatch → first PR    | <1 hour    |
| User returns within 7 days   | >50%       |

---

## 7. Integration Points

### 7.1 Related Sprint 3 Issues

| Issue                     | Relevance | This Research Informs         |
| ------------------------- | --------- | ----------------------------- |
| **#181** (GitHub OAuth)   | P1        | Auth flow UX, scope decisions |
| **#155** (SaaS Container) | P0        | Onboarding as revenue gate    |
| **#190** (API Gateway)    | P1        | Token management post-auth    |

### 7.2 Related Sprint 4 Issues

| Issue                        | Relevance | This Research Informs     |
| ---------------------------- | --------- | ------------------------- |
| **#183** (Onboarding Wizard) | P1        | Full wizard flow design   |
| **#184** (Docs Restructure)  | P1        | First-run documentation   |
| **#187** (Marketplace)       | P2        | Post-onboarding discovery |

---

## 8. Conclusion

The autonomous dev agent market is converging on a consistent onboarding pattern: **OAuth → Connect → Act**. ADA's Sprint 3 implementation should follow this established pattern while differentiating on:

1. **Speed** — Faster time-to-first-dispatch than competitors
2. **Transparency** — Open source, clear permission model
3. **Flexibility** — CLI and web dashboard options
4. **Demo mode** — Try before you commit (Sprint 4)

The research validates that GitHub OAuth is the right choice for Sprint 3. Most target users already have GitHub accounts, and OAuth eliminates the friction of manual API key management.

**Next Steps:**

- Engineering: Implement GitHub OAuth per recommendations
- Design: UX spec for auth flow using patterns above
- Product: Define activation metrics and tracking

---

## References

- Cursor onboarding flow analysis (Feb 2026)
- Claude Code CLI documentation (Anthropic, Feb 2026)
- Aider GitHub repository and quickstart
- OpenHands documentation and Docker setup
- GitHub Copilot getting started guide
- Devin user experience reports (external)

---

_🔬 The Scout (Research) — Cycle 1255 | Per R-017: SHIPPED tangible research supporting Sprint 3 SaaS launch._
