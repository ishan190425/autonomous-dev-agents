# 🎬 Demo Video Narration Script (2 Minutes)

> Word-for-word script for the v1.0-alpha video recording
> **Author:** Growth (🚀 The Dealmaker)
> **Date:** 2026-02-06
> **Recording Window:** February 9, 2026 (Day 2 stretch goal)
> **Related:** Issue #39, docs/marketing/demo-recording-prep.md

---

## Overview

| Segment    | Duration  | Visual                           | Audio              |
| ---------- | --------- | -------------------------------- | ------------------ |
| Hook       | 0:00-0:15 | Logo/title card → empty terminal | Narration          |
| Problem    | 0:15-0:30 | Pain points graphic or terminal  | Narration          |
| Demo Flow  | 0:30-1:30 | Terminal commands                | Narration + typing |
| Dogfooding | 1:30-1:45 | GitHub activity montage          | Narration          |
| CTA        | 1:45-2:00 | Install command + links          | Narration + text   |

---

## Full Script

### [0:00-0:15] HOOK

**Visual:** Title card fades to empty terminal window

**Narration:**

> What if AI could run your _entire_ dev team?
>
> Not just write code — but plan features, review PRs, manage releases, and ship while you sleep.
>
> That's ADA: Autonomous Dev Agents.

**Notes:** Hook should create curiosity. Pause slightly after "entire dev team" for emphasis.

---

### [0:15-0:30] PROBLEM

**Visual:** Terminal or simple graphic showing pain points

**Narration:**

> Today's AI tools are copilots. Cursor suggests code — you review it. ChatGPT writes a function — you integrate it.
>
> You're still the bottleneck. Every context switch. Every decision. Every merge.
>
> What if AI could handle the whole workflow?

**Notes:** Keep the problem relatable but quick. We want to get to the demo.

---

### [0:30-1:30] DEMO FLOW

**Visual:** Clean terminal, large font. All commands typed live.

#### Scene 1: Project Setup (0:30-0:45)

**Type:** `cd ada-demo-project`

**Narration:**

> Here's an empty project. Let's add an AI team.

**Type:** `ada init`

**Wait for output, then narrate:**

> One command. ADA creates a full agent team — CEO, Product, Engineering, QA, Ops, Design.
>
> Each role has a playbook. A memory bank. A mission.

**Notes:** Let the init output breathe. Point out the roles list briefly.

---

#### Scene 2: First Dispatch (0:45-1:05)

**Type:** `ada run`

**Wait for LLM spinner, then narrate while it runs:**

> Now watch. We dispatch the current role — in this case, Engineering.
>
> The agent reads the project context, checks the memory bank, picks an action from its playbook, and executes.

**Wait for completion, then:**

> Done. One autonomous cycle. It created a GitHub issue, updated the memory bank, and rotated to the next role.

**Notes:** If using dry-run, mention "(For this demo, we're simulating the LLM call)" or just use live.

---

#### Scene 3: Status Check (1:05-1:20)

**Type:** `ada status`

**Narration:**

> The status command shows where we are. Current role: Ops. Cycle one complete. Memory bank healthy.
>
> Run it again, and Ops acts. Then QA. Then Design. Each cycle, the team progresses autonomously.

**Notes:** Emphasize the rotation — this is the key differentiator.

---

#### Scene 4: The Magic (1:20-1:30)

**Visual:** Quick cut to GitHub showing the created issue (optional)

**Narration:**

> This isn't toy code. ADA creates real issues, real PRs, real progress — while you focus on what matters.

**Notes:** If we can show the GitHub issue briefly, it's powerful. If not, skip to dogfooding.

---

### [1:30-1:45] DOGFOODING STORY

**Visual:** GitHub activity graph or montage of ADA's own commits/issues

**Narration:**

> Here's the wild part: we built ADA with ADA.
>
> 107 autonomous cycles. 21 PRs merged. 415 tests passing.
>
> Every architecture decision, every spec, every line of code — written by AI agents coordinating through GitHub.
>
> We're not just shipping a tool. We're proving the model works.

**Notes:** These numbers should be updated to current metrics on recording day. Check memory bank for latest.

---

### [1:45-2:00] CALL TO ACTION

**Visual:** Clean slide with install command and links

**Narration:**

> Try it yourself.
>
> npm install -g @ada/cli
>
> Star us on GitHub. Join the Discord. We're building the future of autonomous development, and you can be part of it.
>
> Links in the description.

**Visual shows:**

```
npm install -g @ada/cli

github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents
```

**Notes:** CTA should feel inviting, not pushy. Pause on the install command.

---

## Recording Notes

### Voice & Tone

- **Conversational:** Like explaining to a smart friend, not a sales pitch
- **Confident:** We believe in this product
- **Unhurried:** Let key points land. Silence is okay.
- **Technical but accessible:** Assume the viewer knows what GitHub is, but don't assume they know what agent teams are

### Pacing

- Slightly slower than natural speaking
- Pause at punctuation
- Let visuals breathe — don't narrate every keystroke

### Pronunciation

- **ADA:** "AY-duh" (like the programming language)
- **CLI:** "see-ell-eye" or "command line interface"

### If Something Goes Wrong

- Keep talking naturally — small mistakes are fine
- If major error, pause recording, reset terminal, start from that segment
- Can edit segments together in post

---

## Metrics to Update on Recording Day

Check `agents/memory/bank.md` for current numbers:

| Metric        | Current (Feb 6) | Update on Feb 9 |
| ------------- | --------------- | --------------- |
| Cycles        | 107             | [check]         |
| PRs merged    | 21              | [check]         |
| Tests passing | 415             | [check]         |
| Issues closed | 10              | [check]         |

---

## B-Roll Ideas (Optional Enhancement)

If time permits, capture extra footage for cutaways:

- GitHub issues page showing ADA-created issues
- GitHub commits page showing agent commits
- The memory bank file in an editor
- Split screen of terminal + GitHub activity

---

## Backup Script (Dry-Run Version)

If LLM API issues occur during recording, use `--dry-run` and adapt narration:

Replace:

> "It created a GitHub issue, updated the memory bank..."

With:

> "In a live run, it would create a real GitHub issue and update the memory bank. For this demo, we're showing the dry-run mode so you can see the flow."

---

## Audio Checklist

- [ ] Quiet environment (no AC, fans, neighbors)
- [ ] Microphone tested (check levels)
- [ ] Water nearby (dry mouth is real)
- [ ] Script printed or on second screen
- [ ] Read through once before recording

---

## Final Checklist Before Recording

- [ ] Terminal configured (per terminal-recording-config.md)
- [ ] Demo repo clean (`rm -rf agents/` + `git checkout -- .`)
- [ ] ADA CLI linked and working (`ada --version`)
- [ ] API key set (or plan to use dry-run)
- [ ] Script reviewed and comfortable
- [ ] Recording software ready (OBS/Screen Studio)
- [ ] Storage space available (video files are large)

---

## Cross-References

- **Issue #39:** Demo Asset Production Plan
- **docs/marketing/demo-recording-prep.md:** Full recording guide
- **docs/marketing/terminal-recording-config.md:** Terminal settings
- **docs/marketing/recording-tools-validation.md:** Tool verification

---

_🚀 Growth | Cycle 108 | Video script for Issue #39 stretch goal_
