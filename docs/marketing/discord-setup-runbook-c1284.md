# Discord Server Setup Runbook — Sprint 3 Day 1

> Operational guide for setting up the ADA Discord community server.
> **Target:** Mar 1 (Day 1) — Server URL + welcome flow live
> **Created:** C1284 | **Per:** C1283 Day 1 Brief, C1264 Content Calendar

---

## Prerequisites

- [ ] Discord account with verified email
- [ ] Administrator access to create servers
- [ ] GitHub account for OAuth (optional, for verification bots)
- [ ] Content ready: Twitter thread (Mar 2), Dev.to article (Mar 3)

---

## Phase 1: Server Creation (30 min)

### 1.1 Create Server

```
Discord → "+" icon → "Create My Own" → "For a club or community"
Server Name: ADA — Autonomous Dev Agents
```

### 1.2 Server Settings

```
Settings → Overview:
  - Server Name: ADA — Autonomous Dev Agents
  - Description: Building the future of autonomous AI dev teams. Ship faster with ADA.
  - Icon: [Use ADA logo or 🤖 temporary]
```

### 1.3 Verification Level

```
Settings → Safety Setup:
  - Verification Level: Medium (5-minute wait before messaging)
  - Explicit Media Content Filter: Keep me safe
  - DM Spam Filter: Filter all
```

---

## Phase 2: Channel Structure (45 min)

### Category: WELCOME

| Channel        | Type | Purpose                        |
| -------------- | ---- | ------------------------------ |
| #welcome       | Text | Rules, intro, getting started  |
| #introductions | Text | New members introduce yourself |
| #announcements | Text | Official ADA updates (locked)  |

### Category: COMMUNITY

| Channel   | Type  | Purpose                         |
| --------- | ----- | ------------------------------- |
| #general  | Text  | Main discussion                 |
| #help     | Text  | Support and questions           |
| #showcase | Text  | Share your ADA-powered projects |
| #feedback | Text  | Feature requests, bug reports   |
| #lounge   | Voice | Voice chat for community        |

### Category: DEVELOPMENT

| Channel       | Type | Purpose                       |
| ------------- | ---- | ----------------------------- |
| #dev-updates  | Text | Engineering updates, releases |
| #contributing | Text | OSS contributions, PRs        |
| #architecture | Text | Technical deep-dives          |

### Category: EARLY ACCESS (Restricted)

| Channel        | Type | Purpose                     |
| -------------- | ---- | --------------------------- |
| #beta-testers  | Text | Early adopters, pre-release |
| #founders-chat | Text | Power users, direct access  |

---

## Phase 3: Roles Setup (20 min)

### Role Hierarchy (top to bottom)

| Role         | Color   | Permissions                     |
| ------------ | ------- | ------------------------------- |
| @Core Team   | #FF6B6B | All permissions                 |
| @Beta Tester | #4ECDC4 | Early access channels           |
| @Contributor | #45B7D1 | Contributing channel access     |
| @Member      | #95E1D3 | Default, all public channels    |
| @everyone    | Default | #welcome, #rules only initially |

### Auto-Role Setup

Use Discord's Onboarding (native) or bot:

- New members → @Member after accepting rules
- Manual promote to @Beta Tester, @Contributor

---

## Phase 4: Welcome Flow (30 min)

### 4.1 Onboarding Questions (Discord Native)

```
Settings → Community → Onboarding:

Question 1: "What brings you to ADA?"
  - Building with AI agents
  - Learning about autonomous dev
  - Just exploring
  - Looking for help with my project

Question 2: "How did you find us?"
  - Twitter/X
  - GitHub
  - Hacker News
  - Dev.to
  - Friend referral
  - Search
```

### 4.2 Welcome Message (#welcome)

```markdown
# 👋 Welcome to ADA — Autonomous Dev Agents!

We're building the framework that lets AI agent teams autonomously develop software.

## 🚀 Quick Start

1. **Install ADA:** `npm install -g @ada-ai/cli`
2. **Init your repo:** `ada init`
3. **Run a cycle:** `ada dispatch start`

📖 [Documentation](https://github.com/ada-ai/ada#readme)
📦 [npm Package](https://www.npmjs.com/package/@ada-ai/cli)
⭐ [Star on GitHub](https://github.com/ada-ai/ada)

## 📋 Channels

- #general — Chat with the community
- #help — Get support
- #showcase — Share what you've built
- #dev-updates — Follow development progress

## 📜 Rules

1. Be respectful and constructive
2. No spam or self-promotion without context
3. Keep discussions relevant to AI, agents, development
4. Help others — we're all learning together
```

### 4.3 Rules (Server Rules or #welcome)

```markdown
## Community Guidelines

1. **Be respectful** — No harassment, hate speech, or personal attacks
2. **Stay on topic** — Discussions about AI, agents, dev, ADA
3. **No spam** — Share projects in #showcase, not every channel
4. **Help each other** — If you know the answer, share it
5. **Give feedback** — Constructive criticism helps us build better

Violations may result in warnings, mutes, or bans.
```

---

## Phase 5: Integrations (30 min)

### 5.1 GitHub Integration (Optional)

```
Server Settings → Integrations → GitHub:
  - Connect ada-ai/ada repository
  - Subscribe #dev-updates to:
    - Releases
    - Pull Requests
    - Commits to main (optional)
```

### 5.2 Webhook for Announcements (Optional)

```bash
# Can be used to post release announcements automatically
curl -X POST "DISCORD_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"content": "🚀 ADA v1.0.1 released! Check it out: npm install @ada-ai/cli"}'
```

---

## Phase 6: Verification Steps ✅

Run these checks after setup:

```bash
# Verification Checklist

□ Server created and accessible
□ Invite link generated (check below)
□ All channels visible to @Member role
□ Early access channels hidden from @everyone
□ Welcome message posted
□ Onboarding questions active
□ Test: Join as new user, verify flow works
```

### Generate Invite Link

```
Server Settings → Invites → Create Invite:
  - Max Uses: No limit
  - Expiration: Never
  - Grant temporary membership: No

Save URL: https://discord.gg/[CODE]
```

---

## Phase 7: Launch Coordination

### Day 1 (Mar 1)

- [ ] Server live with all channels
- [ ] Welcome flow tested
- [ ] Invite link saved to memory bank

### Day 2 (Mar 2)

- [ ] Twitter thread posted → includes Discord CTA
- [ ] Monitor for first members

### Day 3 (Mar 3)

- [ ] Dev.to article posted → includes Discord CTA
- [ ] Respond to first help questions

---

## Output Artifacts

After setup, document in memory bank:

```
Discord Server: [URL]
Invite Link: https://discord.gg/[CODE]
Channels: 11 (5 welcome/community, 3 dev, 3 early access)
Roles: 5 (Core Team, Beta Tester, Contributor, Member, everyone)
Integrations: GitHub (optional)
```

---

## Contingency: No Discord Account Access

If creating Discord server isn't possible:

1. Flag as blocker in next cycle
2. Fall back to GitHub Discussions for community
3. Defer Discord to post-billing priority

---

_Runbook created C1284 for Sprint 3 Day 1 execution. Per L723: Human-actionable with verification commands._
