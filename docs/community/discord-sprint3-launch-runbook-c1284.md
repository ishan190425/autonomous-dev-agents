# 🎮 Discord Sprint 3 Launch Readiness Runbook (C1284)

> **Created:** 2026-02-28 08:30 EST (Cycle 1284, Growth)
> **Status:** 🟢 READY FOR DAY 1 EXECUTION
> **Server:** discord.gg/5NCHGJAz
> **Related:** #92 (Discord Created), #155 (SaaS Container), C784 (Strategy)

---

## Executive Summary

This runbook enables Day 1 (Mar 1) Discord execution. The server exists (C784). Sprint 3 needs:

1. **Sprint 3 channel additions** for SaaS launch
2. **Role refinement** for conversion tracking
3. **Welcome message update** with SaaS CTA
4. **Launch day activation plan**

**Day 1 Success Criteria:** Discord ready for SaaS signups integration.

---

## Quick Reference: Server Links

| Resource       | Link                          |
| -------------- | ----------------------------- |
| Server Invite  | discord.gg/5NCHGJAz           |
| GitHub         | github.com/ada-dev/ada        |
| npm            | npmjs.com/package/@ada-ai/cli |
| Docs (planned) | docs.ada-dev.io               |

---

## Day 1 Checklist (Mar 1)

### 1. Verify Current State (5 min)

- [ ] Server accessible at discord.gg/5NCHGJAz
- [ ] Existing channels present per C784 structure
- [ ] Bot permissions verified

### 2. Add Sprint 3 Channels (15 min)

Add these new channels for SaaS launch:

```
📊 SAAS
├── #saas-announcements  — SaaS-specific updates, pricing, features
├── #waitlist            — Waitlist members discuss + get priority updates
├── #billing-help        — Payment/subscription questions
└── #feature-requests    — Direct product feedback for paid features
```

**Channel Creation Commands (via Discord):**

1. Right-click category → "Create Channel"
2. Name: `saas-announcements`, Type: Text
3. Permissions: `@everyone` = View, `@Moderator` = Send
4. Repeat for each channel

### 3. Update Role Structure (10 min)

**Add new roles:**

| Role          | Color   | Permissions           | Purpose            |
| ------------- | ------- | --------------------- | ------------------ |
| `@SaaS Beta`  | #FFD700 | View #saas-\*         | Early SaaS testers |
| `@Pro`        | #9B59B6 | Priority support      | Paying customers   |
| `@Enterprise` | #E74C3C | Direct founder access | Enterprise tier    |

**Existing roles (verify present):**

| Role             | Color   | Status          |
| ---------------- | ------- | --------------- |
| `@Early Adopter` | #00FF00 | ✅ Should exist |
| `@Contributor`   | #3498DB | ✅ Should exist |
| `@Moderator`     | #E91E63 | ✅ Should exist |

### 4. Update Welcome Message (10 min)

**Current:** Generic community welcome
**New:** SaaS-aware welcome with CTA

**Copy-paste ready welcome message:**

```
👋 **Welcome to the ADA Community!**

You've just joined the home of autonomous AI dev teams. Whether you're exploring, building, or scaling — you're in the right place.

**🚀 What is ADA?**
ADA runs autonomous AI agent teams on your repos. 10+ specialized roles (Engineering, QA, Design, Research...) rotate through your codebase, shipping code 24/7.

**🎯 Quick Start:**
• `npm install -g @ada-ai/cli`
• `ada init` in your repo
• `ada dispatch start` to begin your first cycle

**📢 Channels to Know:**
• #announcements — Major updates
• #help — Get unstuck fast
• #showcase — Show us what you're building
• #agent-experiments — Share your agent configs

**🔥 SaaS Coming Mar 2026:**
We're launching managed ADA — no infra, just results.
Drop by #saas-announcements for early access.

**Say hi in #general!** What repo are you thinking of ADA-ifying?
```

### 5. Configure GitHub Webhook (15 min)

**Purpose:** Auto-post PR merges + releases to #changelog

**Setup:**

1. Go to: Server Settings → Integrations → Webhooks
2. Create webhook named "ADA GitHub"
3. Target channel: #changelog
4. Copy webhook URL
5. In GitHub repo: Settings → Webhooks → Add webhook
6. Paste URL, Content type: `application/json`
7. Events: Releases, Pull requests (merged only)

**Test:** Manually trigger via GitHub webhook "Redeliver"

### 6. Verify Bot Permissions (5 min)

**Required bots:**

| Bot             | Purpose                  | Status |
| --------------- | ------------------------ | ------ |
| GitHub Webhook  | PR/Release notifications | ⏳ Add |
| Discord Welcome | Onboarding               | ✅     |
| ModBot          | Anti-spam                | ✅     |

---

## Launch Day Activation Plan (Mar 14 SaaS Go-Live)

### T-24h: Pre-Launch

- [ ] Post countdown in #announcements
- [ ] Unlock #saas-announcements for @everyone viewing
- [ ] Enable #waitlist → #saas-beta conversion prompt
- [ ] Draft launch announcement (below)

### T-0: Launch

**Launch Announcement (copy-paste):**

```
🚀 **ADA SaaS IS LIVE!**

No more infrastructure headaches. Managed ADA runs your autonomous dev team in the cloud.

**What's included:**
✅ Automated dispatch scheduling
✅ GitHub App integration (zero config)
✅ Team workspaces
✅ Priority support
✅ Analytics dashboard

**Pricing:**
• Free: 50 cycles/month
• Pro ($29/mo): Unlimited cycles, priority support
• Enterprise: Contact us

**Get started:** https://ada-dev.io/signup

Early adopters: Check your DMs for a special thank-you! 💜

Let's build together. 🔧
```

### T+1h: Engagement

- [ ] Monitor #billing-help for issues
- [ ] Celebrate first signups in #general
- [ ] Post signup milestone updates (10, 50, 100)

### T+24h: Follow-up

- [ ] Send thank-you to @Early Adopter role
- [ ] Share signup metrics in #announcements
- [ ] Collect feedback in #feature-requests

---

## SaaS Integration Hooks

### Signup → Discord

When user signs up for SaaS:

1. Auto-DM Discord invite (if email matches Discord)
2. Auto-assign `@Pro` or `@Enterprise` role based on tier
3. Welcome to #saas-announcements

**Implementation:** Resend webhook → Discord bot (Day 5-7 Engineering task)

### Discord → Signup

1. `/signup` command in Discord → Opens signup page
2. Waitlist members get `@SaaS Beta` role
3. Beta feedback collected in #waitlist

---

## Metrics Dashboard

Track in `docs/marketing/discord-metrics.md`:

| Metric              | Current | Mar 1 Target | Mar 14 Target |
| ------------------- | ------- | ------------ | ------------- |
| Total Members       | ~50     | 100          | 500           |
| #saas-announcements | 0       | —            | 200           |
| @SaaS Beta Role     | 0       | 25           | 100           |
| @Pro Role           | 0       | —            | 50            |

---

## Troubleshooting

### "Can't create channels"

→ Verify you have Manage Channels permission
→ Check server boost level (shouldn't be blocking)

### "GitHub webhook not posting"

→ Check webhook secret matches
→ Verify channel permissions allow bot posting
→ Check GitHub webhook delivery logs

### "Welcome message not sending"

→ Verify Welcome Bot is online
→ Check #welcome channel exists
→ Review bot dashboard for errors

---

## Success Criteria

**Day 1 Complete (Mar 1 EOD):**

- [ ] All Sprint 3 channels created
- [ ] New roles configured
- [ ] Welcome message updated
- [ ] GitHub webhook functional

**Launch Ready (Mar 14):**

- [ ] 100+ members
- [ ] Launch announcement drafted
- [ ] Signup→Discord integration tested
- [ ] Support triage working

---

## Related Documents

- `docs/community/discord-growth-strategy-c784.md` — Master strategy
- `docs/community/early-adopter-program-c794.md` — Early adopter details
- `docs/marketing/launches/` — Launch coordination docs

---

_🚀 Growth Cycle 1284 — Discord Sprint 3 launch readiness runbook. Enables Day 1 execution with zero context-loading._
