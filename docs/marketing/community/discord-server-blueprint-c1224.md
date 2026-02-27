# 🎮 Discord Server Blueprint (C1224)

> **Purpose:** Complete setup guide for ADA Discord server (Feb 28 execution)
> **Created:** C1224 (Feb 27, 2026)
> **Execution Date:** Feb 28, 2026 (T-15)
> **Status:** READY FOR EXECUTION

---

## Server Overview

### Identity

| Field            | Value                                                                     |
| ---------------- | ------------------------------------------------------------------------- |
| **Server Name**  | ADA — Autonomous Dev Agents                                               |
| **Server Icon**  | ADA logo (simple, recognizable at small size)                             |
| **Banner**       | Optional: Terminal screenshot with agent output                           |
| **Description**  | "Build software with autonomous AI dev teams. CLI + SaaS. OSS on GitHub." |
| **Invite URL**   | discord.gg/ada-dev (or similar vanity URL if available)                   |
| **Verification** | Low (email verified) — balance accessibility vs spam                      |

---

## Channel Structure

### Category: 📢 ANNOUNCEMENTS

| Channel          | Purpose                       | Permissions             |
| ---------------- | ----------------------------- | ----------------------- |
| `#announcements` | Release notes, major updates  | Read-only (admins post) |
| `#changelog`     | Detailed version changes      | Read-only (admins post) |
| `#roadmap`       | Upcoming features, milestones | Read-only (admins post) |

### Category: 💬 COMMUNITY

| Channel      | Purpose                         | Permissions |
| ------------ | ------------------------------- | ----------- |
| `#general`   | Open discussion, introductions  | Everyone    |
| `#showcase`  | Share your ADA-powered projects | Everyone    |
| `#ideas`     | Feature requests, suggestions   | Everyone    |
| `#off-topic` | Non-ADA chat, community bonding | Everyone    |

### Category: 🛠️ SUPPORT

| Channel          | Purpose                            | Permissions |
| ---------------- | ---------------------------------- | ----------- |
| `#help`          | General questions, troubleshooting | Everyone    |
| `#installation`  | npm/setup issues                   | Everyone    |
| `#configuration` | Config, roles, playbooks           | Everyone    |
| `#bug-reports`   | Bug discussion (link to GitHub)    | Everyone    |

### Category: 📚 RESOURCES

| Channel      | Purpose                        | Permissions             |
| ------------ | ------------------------------ | ----------------------- |
| `#docs`      | Documentation links, tutorials | Read-only (admins post) |
| `#faq`       | Frequently asked questions     | Read-only (admins post) |
| `#templates` | Playbook/config sharing        | Everyone (moderated)    |

### Category: 🔬 DEVELOPMENT (Future)

| Channel          | Purpose                    | Permissions               |
| ---------------- | -------------------------- | ------------------------- |
| `#contributors`  | Open source contributors   | Contributor role required |
| `#dev-chat`      | Technical discussion       | Contributor role required |
| `#pull-requests` | PR notifications (webhook) | Read-only (bot posts)     |

---

## Roles

### Role Hierarchy (top to bottom)

| Role             | Color   | Permissions                        | Assignment         |
| ---------------- | ------- | ---------------------------------- | ------------------ |
| `@Admin`         | Red     | Full server management             | Founders only      |
| `@Moderator`     | Orange  | Message management, timeout users  | Trusted community  |
| `@Team`          | Purple  | Post in announcements              | ADA team members   |
| `@Contributor`   | Green   | Access to #contributors, #dev-chat | OSS contributors   |
| `@Early Adopter` | Gold    | Badge only (recognition)           | Pre-launch members |
| `@Member`        | Default | Standard permissions               | Everyone else      |

### Auto-Assign on Join

- New members get `@Member` automatically
- `@Early Adopter` given to anyone joining before Mar 15 launch

---

## Onboarding Flow

### Welcome Message (System/Bot)

```
👋 **Welcome to ADA — Autonomous Dev Agents!**

We're building AI dev teams that ship real software. Glad you're here!

**Quick links:**
📖 Docs: https://ada.dev/docs
🔧 GitHub: https://github.com/autonomous-dev-agents/ada
📦 npm: `npm install -g @ada-ai/cli`
📝 Paper: [link when live]

**Channels to check out:**
💬 #general — Say hi, introduce yourself
❓ #help — Get support from the community
🎨 #showcase — See what people are building

**Rules:**
1. Be kind and constructive
2. No spam, self-promo, or off-topic links
3. Search before asking (docs + #faq first)
4. Keep support in #help, bugs on GitHub

Questions? Ask in #help — we're a small community and we respond!
```

### Rules Channel Content (`#rules`)

```
# 📜 Community Rules

**1. Be Respectful**
Treat everyone with kindness. No harassment, discrimination, or personal attacks.

**2. Stay On Topic**
- #general for ADA discussion
- #off-topic for everything else
- #help for support questions

**3. No Spam**
No unsolicited promotions, crypto shills, or repetitive messages.

**4. Search First**
Before asking, check:
- 📖 Documentation: ada.dev/docs
- ❓ #faq channel
- 🔍 Discord search

**5. Keep Bugs on GitHub**
Report bugs at: github.com/autonomous-dev-agents/ada/issues
Use #bug-reports for discussion, not as the primary tracker.

**6. No Piracy/Illegal Content**
Self-explanatory.

**Breaking rules:** Warning → Mute → Ban
Most people are great. Don't be the exception. 💜
```

---

## Bot Integrations

### Required (Day 1)

| Bot             | Purpose                           | Setup Notes                     |
| --------------- | --------------------------------- | ------------------------------- |
| **MEE6**        | Welcome messages, auto-moderation | Free tier sufficient initially  |
| OR **Carl-bot** | Alternative to MEE6               | More features, slightly complex |

### Nice-to-Have (Post-Launch)

| Bot          | Purpose                  | Setup Notes               |
| ------------ | ------------------------ | ------------------------- |
| **GitHub**   | PR/Issue notifications   | Webhook to #pull-requests |
| **Disboard** | Server listing/discovery | Helps with growth         |

### Bot Permissions

- Welcome messages: Send Messages in #general
- Auto-mod: Manage Messages (for spam removal)
- No unnecessary permissions (principle of least privilege)

---

## Moderation Setup

### AutoMod Rules

1. **Spam protection:** Block messages with 5+ mentions or 5+ emojis
2. **Link filtering:** Flag messages with links for review (first N posts per user)
3. **Profanity filter:** Light filter (allow technical terms, block slurs)
4. **Duplicate messages:** Flag identical messages posted <5 seconds apart

### Manual Moderation

- **Response time:** Check #general and #help 2-3x daily during launch week
- **Escalation:** DM Admin for complex situations
- **Logs:** Keep moderation log (who was warned/muted/banned and why)

---

## Content to Prepare

### Pin in #general

```
📌 **Welcome to ADA!**

Quick start:
1. Install: `npm install -g @ada-ai/cli`
2. Initialize: `ada init`
3. Watch your AI team work: `ada status`

Docs: ada.dev/docs
GitHub: github.com/autonomous-dev-agents/ada
```

### Pin in #help

```
📌 **Before Asking:**

1. Check the docs: ada.dev/docs
2. Check #faq
3. Search this channel

**When Asking:**
- Include your OS (macOS/Linux/Windows)
- Include ADA version: `ada --version`
- Include the full error message
- Share relevant config (redact secrets!)

We'll help ASAP!
```

### FAQ Content (#faq)

```
# ❓ Frequently Asked Questions

**Q: What is ADA?**
A: ADA enables autonomous AI dev agent teams for any repo. Instead of pair programming, you have a full team (PM, Engineer, QA, etc.) working autonomously.

**Q: Is it free?**
A: The CLI is open source and free forever. We're building a SaaS for managed hosting and advanced features.

**Q: What LLMs does it support?**
A: Currently Claude and GPT-4. More coming. See docs for configuration.

**Q: Can I use it with my existing repo?**
A: Yes! Run `ada init` in any git repository. ADA creates an `agents/` folder with configuration.

**Q: How is this different from Copilot?**
A: Copilot is a pair programmer (suggestions). ADA is an autonomous team (full dispatch cycles — planning, coding, testing, reviewing).

**Q: Where can I report bugs?**
A: GitHub Issues: github.com/autonomous-dev-agents/ada/issues

**Q: How can I contribute?**
A: Check "good first issue" labels on GitHub. PRs welcome!
```

---

## Launch Day Discord Tasks

### Feb 28 Setup (T-15) — 1-2 hours

| #   | Task                                      | Time   |
| --- | ----------------------------------------- | ------ |
| 1   | Create server with name/description       | 5 min  |
| 2   | Set up categories and channels per above  | 15 min |
| 3   | Create roles per hierarchy                | 10 min |
| 4   | Set channel permissions                   | 15 min |
| 5   | Configure welcome bot (MEE6 or Carl-bot)  | 15 min |
| 6   | Write and post content (#rules, pins)     | 20 min |
| 7   | Create invite link (permanent, no expiry) | 2 min  |
| 8   | Test with alt account (join, see welcome) | 10 min |
| 9   | Add invite link to GitHub README          | 5 min  |

**Total:** ~90 minutes

### Mar 15 Launch Day

- Monitor #general for new joins
- Welcome active participants personally
- Be ready to answer questions in #help
- Post launch announcement in #announcements

---

## Success Metrics

| Metric             | Target (Mar 22) | Stretch |
| ------------------ | --------------- | ------- |
| Total Members      | 50              | 100     |
| Daily Active Users | 10              | 25      |
| Messages/day       | 20              | 50      |
| #help resolved     | 80% same-day    | 95%     |
| Spam incidents     | < 5             | 0       |

---

## Post-Setup Checklist

- [ ] Server created with correct name/description
- [ ] All channels created and categorized
- [ ] Roles created with correct permissions
- [ ] Welcome bot configured and tested
- [ ] Rules posted and pinned
- [ ] FAQ posted
- [ ] #general and #help pins set
- [ ] Invite link created (permanent)
- [ ] README updated with Discord link
- [ ] Test join with alt account
- [ ] Screenshot for verification

---

## References

- **Execution Tracker:** `docs/marketing/launches/pre-launch-execution-tracker-c1214.md`
- **Launch Playbook:** `docs/marketing/launches/launch-execution-playbook-c1204.md`
- **Community Strategy:** `docs/marketing/community/` (future docs)

---

_This blueprint front-loads Feb 28 Discord setup per L706. Execute checklist, mark tasks complete in C1214._

— 🚀 Growth (C1224)
