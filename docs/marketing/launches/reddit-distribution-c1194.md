# Reddit Distribution Plan — Building ADA with ADA

> **Created:** C1194 (Feb 23, 2026) by 🚀 Growth
> **Purpose:** Adapt blog post for Reddit distribution across r/programming, r/SideProject, r/MachineLearning
> **Related:** #131 (arXiv Paper), C1184 (Blog Post), #155 (SaaS Container)
> **Launch Date:** Mar 16, 2026 (paper launch)

---

## Platform Strategy

Reddit requires platform-native content. Cross-posting the blog post verbatim = spam. Each subreddit has its own culture:

| Subreddit         | Audience          | Angle                  | Format                 |
| ----------------- | ----------------- | ---------------------- | ---------------------- |
| r/programming     | Professional devs | Technical deep-dive    | Self-post, technical   |
| r/SideProject     | Indie builders    | "I built this" story   | Self-post, journey     |
| r/MachineLearning | ML/AI researchers | Research angle         | Self-post, methodology |
| r/LocalLLaMA      | LLM enthusiasts   | Implementation details | Self-post, technical   |

---

## r/programming Post

**Title:** We built a framework using itself: 1,190+ autonomous AI cycles later

---

**Body:**

Over the past 6 weeks, we've been running an experiment: can an AI agent team build software autonomously?

Not just generate code snippets. Actually manage the full dev process — sprints, PRs, code review, testing, documentation, releases.

**The setup:** 10 specialized AI agents rotating through a dispatch cycle:

```
ceo → growth → research → frontier → product →
scrum → qa → engineering → ops → design
```

Each cycle, one agent:

1. Loads shared context from a memory bank
2. Checks GitHub issues and PRs
3. Executes one action from its playbook
4. Updates the memory bank
5. Hands off to the next role

**The results after 1,190+ cycles:**

- 775 consecutive cycles without human commits (since cycle 421)
- 106 PRs merged
- 2,527 tests passing (89% coverage)
- 694 lessons captured and indexed
- ~80,400 lines of TypeScript

The framework is open source: [GitHub link]

**Technical details that might interest this sub:**

1. **Memory continuity** — Agents don't share a persistent context window. They read/write markdown files that preserve state across sessions. Closer to how human teams use docs than chat history.

2. **The tangible output rule** — We found agents naturally drift into "checkpoint mode" (writing status reports instead of shipping). R-017 mandates every non-CEO cycle produces an artifact: PR, test, doc, spec.

3. **Same-rotation PR turnaround** — PRs open >10 cycles accumulate "context debt." Best practice: create→review→merge within one rotation.

4. **Abstract base classes for LLM backends** — When we added multiple executor backends (Claude Code, Codex), we extracted shared logic into an abstract base. Test shared behavior once.

The preprint is on arXiv: [link]

Happy to answer technical questions about the architecture.

---

**Flair:** Project/Tool

**Timing:** Mar 16, 9:30 AM EST (same as Show HN)

**Engagement strategy:**

- Reply to technical questions within first 2 hours
- Be honest about limitations
- Don't oversell — "interesting experiment" not "AGI is here"

---

## r/SideProject Post

**Title:** I let AI agents build their own framework for 6 weeks — here's what happened

---

**Body:**

Hey r/SideProject,

Wanted to share a different kind of side project — one where AI agents did most of the building.

**The premise:** What if you could spin up an autonomous dev team for any repo? Not just Copilot autocomplete, but actual team roles — PM, Engineer, QA, Ops — each with its own playbook.

So I built a framework for this (ADA), and then... I let the framework build itself.

**6 weeks and 1,190+ dispatch cycles later:**

- 775 cycles with zero human commits
- 106 PRs merged (by the agents)
- 2,527 tests (written by the agents)
- The whole thing is on npm and GitHub

**What I learned from watching agents work:**

1. **They drift into bureaucracy.** Left alone, agents will write status reports forever. I had to add a "tangible output mandate" — every cycle must produce something real.

2. **Memory is hard.** Agents forget everything between sessions. The fix: shared markdown files they read/write. Sounds simple, works surprisingly well.

3. **Rotation order matters.** CEO→Growth→Research→...→Design. Each role needs context from the previous one.

4. **They evolve rules.** Started with 5 rules, now at 17. Agents propose new rules when patterns emerge.

**Honest limitations:**

- Won't replace your human team (yet)
- Terrible at creative design decisions
- Needs well-scoped work to be effective
- Setup still requires human effort

If you're into autonomous AI experiments, the code is open source: [GitHub link]

Building the SaaS version next — waitlist at [link].

Would love feedback from other builders here.

---

**Flair:** Side Project

**Timing:** Mar 16, 11:00 AM EST (stagger from r/programming)

**Engagement strategy:**

- More conversational, less technical
- Share the journey, not just results
- Engage with "how did you..." questions

---

## r/MachineLearning Post

**Title:** [P] ADA: Multi-agent framework for autonomous software development — 1,190+ cycles of self-bootstrapping

---

**Body:**

We present ADA (Autonomous Dev Agents), a framework for multi-agent software development that we've been running continuously since January 2026.

**Key contribution:** A rotation-based multi-agent system where specialized roles (CEO, Engineering, QA, etc.) cycle through a shared memory bank to maintain context across sessions without persistent context windows.

**Methodology:**

The system runs 10 roles in fixed rotation:

- Each role has a "playbook" defining actions and focus areas
- Agents read from and write to a shared markdown memory bank
- GitHub issues/PRs serve as the coordination layer
- A "Reflexion" system captures lessons and evolves rules

**Results (1,190+ cycles):**

| Metric                        | Value   |
| ----------------------------- | ------- |
| Consecutive autonomous cycles | 775     |
| PRs merged                    | 106     |
| Tests passing                 | 2,527   |
| Lessons captured              | 694     |
| Rules evolved                 | 17      |
| LOC (TypeScript)              | ~80,400 |

**Key findings:**

1. **Tangible output mandate** reduces agent drift into meta-work (status reports vs. code)
2. **Same-rotation PR turnaround** minimizes context debt
3. **Abstract base classes** for LLM backends enable clean multi-model support
4. **Pre-sprint front-loading** of infrastructure reduces Day 1 scramble

**Limitations discussed in paper:**

- Novel architecture decisions still require human guidance
- No direct user research capability
- Complex debugging remains human-dependent

**Links:**

- arXiv: [preprint link]
- GitHub: [repo link]
- npm: @ada-ai/cli

This is a self-bootstrapped system — the agent team continues to develop the framework autonomously. Feedback and technical questions welcome.

---

**Flair:** [P] Project

**Timing:** Mar 16, 2:00 PM EST (academic audience often checks afternoon)

**Engagement strategy:**

- More formal, cite relevant work
- Be prepared for skepticism — have metrics ready
- Acknowledge limitations proactively

---

## r/LocalLLaMA Post

**Title:** Built a multi-agent framework that self-bootstrapped over 1,190 cycles — supports Claude Code, Codex, and any LLM backend

---

**Body:**

Hey r/LocalLLaMA,

Been working on ADA (Autonomous Dev Agents) — a framework for running multi-agent dev teams on any repo.

What might interest this sub: **the executor backend is pluggable.** Currently supports:

- Claude Code (Anthropic)
- Codex (OpenAI)
- Any LLM via abstract interface

**How the multi-agent system works:**

10 roles rotate through a dispatch cycle. Each role:

1. Reads a shared memory bank (markdown files)
2. Gets its action context from GitHub issues/PRs
3. Executes via the configured LLM backend
4. Updates memory and passes to next role

**The memory system:**

- No persistent context window
- Agents read/write markdown files
- `bank.md` = shared state
- `lessons.md` = captured learnings (694 so far)
- `rules.md` = evolved team rules (17)

This approach scales better than monolithic context — you compress/archive as needed.

**Stats from self-bootstrapping:**

- 1,190+ total cycles
- 775 consecutive without human intervention
- 106 PRs merged
- 2,527 tests, 89% coverage

**Code is open source:** [GitHub link]

If you're interested in running this with local models, the abstract base class pattern means you could implement a `LocalLlamaExecutor` pretty easily. PRs welcome.

---

**Flair:** Question | Discussion

**Timing:** Mar 16, 4:00 PM EST

**Engagement strategy:**

- Focus on local model possibilities
- Technical implementation details
- Community contribution angle

---

## Posting Schedule Summary

| Time (EST) | Platform          | Post                 |
| ---------- | ----------------- | -------------------- |
| 9:30 AM    | Show HN           | Main launch          |
| 9:30 AM    | r/programming     | Technical deep-dive  |
| 11:00 AM   | r/SideProject     | Builder journey      |
| 2:00 PM    | r/MachineLearning | Research angle       |
| 4:00 PM    | r/LocalLLaMA      | Implementation focus |

**Total posts:** 4 Reddit + 1 HN = 5 distribution channels

---

## Response Templates

**For skeptics:**

> Fair point. To be clear, this isn't AGI — it's a well-scoped system that excels at executing defined playbooks. Human architecture decisions still guide the work. The value is velocity + continuity, not creativity.

**For "how does memory work":**

> Agents don't share a persistent context window. They read/write markdown files that preserve state across sessions. The memory bank has sections for status, role state, active threads, and lessons learned. It's closer to how human teams use documentation than chat history.

**For "what LLM backend":**

> Currently using Claude Code and Codex. The executor interface is abstract, so any LLM can be plugged in. The key is the prompting strategy in each role's playbook, not the specific model.

---

## Success Metrics

| Metric                     | Target | Why                  |
| -------------------------- | ------ | -------------------- |
| r/programming upvotes      | 100+   | Reach front page     |
| r/SideProject upvotes      | 50+    | Community validation |
| r/MachineLearning comments | 20+    | Academic engagement  |
| GitHub stars (day of)      | +50    | Discovery multiplier |
| Waitlist signups (day of)  | 25+    | Conversion signal    |

---

## Risk Mitigation

| Risk                             | Mitigation                          |
| -------------------------------- | ----------------------------------- |
| "Self-promotion" removal         | Lead with value, link at end        |
| Skeptical reception              | Honest limitations section          |
| Downvote brigading               | Don't oversell, be humble           |
| Technical questions can't answer | Tag Research/Engineering for backup |

---

_Per R-017: Tangible marketing content. Per L680: Front-loaded 12 days ahead of Mar 5 schedule._
