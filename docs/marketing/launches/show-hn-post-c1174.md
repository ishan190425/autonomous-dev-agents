# Show HN Post Draft — C1174

> **Created:** 2026-02-23 (C1174)
> **Target:** Mar 15-16, 2026 (with arXiv paper)
> **Issue:** #131 (arXiv Paper)

---

## Title Options

**Primary (recommended):**

> Show HN: ADA – A CLI that runs autonomous AI dev agent teams on your repo

**Alternatives:**

1. Show HN: ADA – Multi-agent AI teams for autonomous development (1100+ cycles dogfooding)
2. Show HN: ADA – We built an autonomous dev team that works 24/7 on our own repo
3. Show HN: ADA – Open-source framework for AI agent teams with role-based specialization

**Title Guidelines:**

- Lead with what it IS (CLI, framework) not what it DOES
- "Show HN:" prefix required
- Keep under 80 chars for clean rendering
- HN favors technical accuracy over marketing speak

---

## Post Body

```markdown
ADA (Autonomous Dev Agents) is a CLI tool that turns any GitHub repository into an autonomous development environment with a team of specialized AI agents.

Each agent has a specific role (CEO, Engineering, QA, Design, etc.) and follows a playbook. They rotate through cycles, read shared memory, execute actions (open issues, write code, review PRs), and update the team's knowledge base.

Key features:

- **Role specialization**: 10 distinct roles with focused playbooks (CEO for strategy, Engineering for code, QA for testing, etc.)
- **Shared memory**: Agents read/write to a memory bank that persists across cycles
- **GitHub-native**: Actions create issues, PRs, and comments—works with existing workflows
- **Dogfooding**: We've run 1,100+ cycles on the ADA repo itself (753 consecutive without human intervention)

What makes this different from Copilot/Cursor/etc:

- Multi-agent (specialized roles) vs single-agent (general assistant)
- Autonomous (agents decide what to do) vs reactive (waits for prompts)
- Team memory (learns and adapts) vs stateless (starts fresh each session)

We're publishing an arXiv paper with our methodology and results: [link when live]

Technical stack: TypeScript, Commander.js, npm workspaces monorepo. Works with any LLM provider (OpenRouter, Anthropic, OpenAI).

Install: `npx @ada-ai/cli init`

GitHub: https://github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents
Docs: [docs link]
Paper: [arXiv link]

Happy to answer questions about multi-agent coordination, memory systems, or how to set this up on your own repo.
```

---

## Submission Strategy

### Timing

- **Best days:** Tuesday, Wednesday, Thursday
- **Best times:** 9-11 AM EST (overlaps US/EU working hours)
- **Avoid:** Weekends, late Friday, holidays
- **Recommendation:** Tue Mar 16, 9:30 AM EST

### Coordination with Paper

- Paper should be on arXiv BEFORE HN post
- Twitter thread goes out same morning
- HN post 30-60 mins after thread stabilizes

### Comment Preparation

**Expected questions and answers:**

1. **"How much does this cost?"**

   > Currently free and open-source. Running cycles costs LLM tokens—roughly $X per cycle depending on context size. We're building a SaaS option for teams who want managed execution.

2. **"What model do you use?"**

   > Works with any LLM via OpenRouter—Claude, GPT-4, etc. Default is Claude Sonnet for good cost/quality balance. The framework is model-agnostic.

3. **"Is this just a toy/demo?"**

   > We've run 1,100+ cycles autonomously on our own repo. It's merged 100+ PRs, maintains 89% test coverage, and recently passed a rigorous 10-day pre-launch evaluation. The arXiv paper documents the methodology and results with real data.

4. **"How do you handle hallucinations/errors?"**

   > Role specialization helps—QA catches bugs Engineering introduces. Shared memory lets agents learn from mistakes (we have 680+ "lessons learned" entries). Tests run on every PR. But yes, it still makes mistakes—human review of PRs is recommended.

5. **"Why roles instead of a single agent?"**

   > Specialization > generalization for complex tasks. A QA agent focused only on testing catches things a generalist misses. The role rotation also prevents single-agent blind spots.

6. **"How is this different from Devin/Cursor/AutoGPT?"**
   > Devin: Single long-running agent vs our role-specialized team with rotation. Cursor: Copilot-style reactive vs our autonomous proactive. AutoGPT: General-purpose loops vs our structured playbooks and memory.

---

## Success Metrics

| Metric                     | Target   | Stretch  |
| -------------------------- | -------- | -------- |
| HN points                  | 50+      | 200+     |
| Time on front page         | 2+ hours | 8+ hours |
| GitHub stars (24h)         | +100     | +500     |
| npm installs (24h)         | +200     | +1000    |
| arXiv abstract views (24h) | +500     | +2000    |
| New Discord members (24h)  | +20      | +100     |

---

## Launch Checklist

### Pre-Launch (T-1 day)

- [ ] arXiv paper submitted and live
- [ ] README reflects latest features
- [ ] Docs site updated
- [ ] Demo video ready (optional)
- [ ] Response templates reviewed
- [ ] Team alerted for question support

### Launch Day

- [ ] arXiv link live
- [ ] Twitter thread posted
- [ ] Wait 30 mins for thread engagement
- [ ] Post to HN
- [ ] Monitor comments, respond within 30 mins
- [ ] Cross-post to Reddit r/LocalLLaMA, r/MachineLearning (separate posts, HN first)

### Post-Launch (T+1 day)

- [ ] Capture metrics
- [ ] Archive notable comments/feedback
- [ ] Create issues from valid feature requests
- [ ] Thank community in repo

---

## Risk Mitigation

| Risk                                | Mitigation                                           |
| ----------------------------------- | ---------------------------------------------------- |
| Paper not ready                     | Delay HN to match paper; paper is the proof          |
| HN flagged/moderated                | Keep post factual, avoid marketing speak             |
| Negative comments                   | Respond calmly with facts and data                   |
| Technical questions we can't answer | "Good question, I'll check and update" is fine       |
| Competition comparisons             | Be respectful of others' work, focus on our approach |

---

## Notes

- HN values technical depth over marketing
- Lead with what it IS and HOW, not just results
- The paper is our credibility—reference it for claims
- Be present in comments for first 2-3 hours
- Don't oversell; HN will punish hype

---

_Draft created C1174. Target: finalize by Mar 10, submit Mar 15-16._
