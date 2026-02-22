# 🔄 The ADA Improvement Propagation Model

> **How open source makes every ADA deployment smarter, faster.**

This document explains the mechanics of how improvements in ADA compound across all users — the core competitive advantage of an open source agent framework.

---

## The Core Insight

Every AI coding tool generates learnings during use. The question is: **where do those learnings go?**

| Model                              | Learnings Flow            | Beneficiary        |
| ---------------------------------- | ------------------------- | ------------------ |
| Proprietary (Devin, Cursor Agents) | Locked in vendor's system | Vendor only        |
| Self-hosted closed-source          | Locked in company silo    | Single company     |
| **ADA (Open Source)**              | **Flows to community**    | **Every ADA user** |

ADA's open source model creates a **positive-sum game**: when you improve your agents, everyone can benefit. When others improve theirs, you benefit automatically.

---

## How Propagation Works

### 1. Playbook Improvements

Playbooks define what each role can do. Better playbooks = smarter agents.

**Scenario:** Company A's QA team discovers their testing playbook misses edge cases. They add a new pattern.

```markdown
# Before (original playbook)

- Write unit tests for new functions
- Ensure coverage > 80%

# After (improved playbook)

- Write unit tests for new functions
- Write boundary tests for edge cases (nulls, empty arrays, overflow)
- Ensure coverage > 80%
- Add regression tests for fixed bugs
```

**Propagation path:**

1. Company A opens PR with improved playbook
2. ADA maintainers review and merge
3. `git pull` brings improvement to all deployments
4. Every QA agent now catches more edge cases

**Time to propagate:** Hours to days (vs. weeks/months for proprietary tools)

---

### 2. Rule Improvements

Rules enforce standards across the team. Better rules = fewer mistakes.

**Scenario:** A startup notices their agents keep forgetting to update documentation after code changes.

**Solution:** They add a new rule:

```markdown
## R-018: Documentation Sync Protocol

When code changes affect public APIs:

1. Update corresponding documentation
2. Add changelog entry
3. Flag reviewers if docs were skipped
```

**Propagation path:**

1. Rule added to `agents/rules/RULES.md`
2. PR opened, discussed, refined with community input
3. Merged and available to all ADA users
4. Every agent now enforces documentation sync

---

### 3. Memory Patterns

Memory bank structure determines what agents remember and how. Better patterns = better context.

**Scenario:** Enterprise team discovers their agents lose context during long sprints.

**Solution:** They develop a "sprint memory" compression pattern:

```markdown
## Sprint Memory Pattern

At sprint boundaries:

1. Archive detailed task logs to `archives/sprint-{N}.md`
2. Compress to summary: goals achieved, blockers, lessons
3. Carry forward: active threads, unresolved questions
4. Result: Agents maintain strategic context without memory bloat
```

**Propagation path:**

1. Pattern documented in `docs/patterns/memory/`
2. Added to compression protocol examples
3. Any team can adopt the pattern

---

### 4. Role Definitions

New roles expand what agents can do. More roles = broader capabilities.

**Scenario:** Security-focused company creates a "Security Auditor" role.

```json
{
  "id": "security",
  "name": "The Auditor",
  "title": "Security Lead",
  "emoji": "🔐",
  "focus": ["vulnerability_scanning", "dependency_audits", "security_reviews"],
  "actions": ["audit_dependencies", "review_auth_flows", "flag_vulnerabilities"]
}
```

**Propagation path:**

1. Role + playbook contributed to `templates/roles/`
2. Any team can add security auditing to their rotation
3. ADA's default roster could include it in future versions

---

### 5. Bug Fixes

Critical fixes reach everyone immediately.

**Scenario:** User discovers memory compression corrupts certain edge cases.

**Proprietary tool timeline:**

- Report bug → Triaged (1 week)
- Fixed internally → Tested (2 weeks)
- Scheduled for release → Deployed (2-4 weeks)
- **Total: 5-7 weeks until users see fix**

**ADA timeline:**

- Report bug → PR opened (same day)
- Community review → Merged (1-3 days)
- `git pull` → Fixed (immediate)
- **Total: 1-3 days until users see fix**

---

## The Compounding Effect

```
          More Users
              ↓
    ┌─────────────────────┐
    │  More Improvements  │ ← Playbooks, rules, patterns, roles
    └─────────────────────┘
              ↓
       Better Agents
              ↓
      More Productivity
              ↓
        More Adoption
              ↓
          More Users (cycle repeats)
```

This is the **open source flywheel**:

- 10 teams → 10x improvement surface area
- 100 teams → 100x improvement surface area
- Each team benefits from aggregate learnings

---

## Comparison: Proprietary vs ADA

| Aspect             | Proprietary Agent | ADA                |
| ------------------ | ----------------- | ------------------ |
| Learning isolation | Per-customer silo | Community-shared   |
| Bug fix speed      | Weeks             | Days               |
| Feature requests   | Vendor roadmap    | PR it yourself     |
| Customization      | Limited config    | Full source access |
| Vendor lock-in     | High              | None               |
| Cost scaling       | Per-seat fees     | Self-hosted free   |

---

## What You Can Contribute

**Quick wins (1-2 hours):**

- Improve a playbook action with lessons from your usage
- Add a rule that caught a common mistake
- Document a memory pattern that worked well

**Medium effort (1 day):**

- Create a new role with playbook
- Write an integration guide for a tool/service
- Add E2E tests for edge cases you hit

**Major contributions:**

- New execution backend (Claude, GPT, local models)
- Dashboard features
- Core architecture improvements

---

## How to Contribute

1. **Fork** the repository
2. **Create** a feature branch: `feat/improve-qa-playbook`
3. **Make** your changes with tests where applicable
4. **Open PR** with clear description of the improvement
5. **Discuss** with maintainers and community
6. **Merge** — your improvement now helps everyone

See [CONTRIBUTING.md](/CONTRIBUTING.md) for detailed guidelines.

---

## The ADA Promise

> **Your improvements make ADA better for everyone. Everyone's improvements make ADA better for you.**

This is the fundamental value proposition of open source AI agents. The more teams that use ADA, the faster everyone's agents evolve.

---

_Part of the [ADA Marketing Documentation](/docs/marketing/). For the README summary, see the "Why Open Source?" section._
