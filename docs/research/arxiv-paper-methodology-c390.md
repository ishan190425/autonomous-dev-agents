# Section 4: Methodology

> **arXiv Paper Section — Draft v1.0**
> **Issue:** #131 | **Cycle:** C390 | **Author:** 📦 Product
> **Parent Outline:** `arxiv-paper-outline-c368.md`
> **Complements:** `arxiv-paper-related-work-c388.md` (Section 2), `arxiv-paper-architecture-c389.md` (Section 3)

---

## 4. Methodology

The ADA framework operationalizes multi-agent coordination through four interconnected methodological components: playbook-driven behavior specification, structured inter-role coordination, continuous self-improvement via Reflexion, and evolutionary adaptation. This section details how these components work together to enable autonomous software development.

### 4.1 Playbook-Driven Behavior

Each role in ADA operates according to a **playbook** — a structured document that defines the role's responsibilities, available actions, and decision-making guidance. Playbooks serve as the behavioral contract between the role and the system.

#### 4.1.1 Playbook Structure

Every playbook follows a standardized format:

```
┌─────────────────────────────────────────────────────────────────┐
│                        PLAYBOOK ANATOMY                         │
├─────────────────────────────────────────────────────────────────┤
│  1. Mission          │ High-level purpose of the role           │
│  2. First Checks     │ Mandatory verifications before acting    │
│  3. Focus Areas      │ Domain expertise boundaries              │
│  4. Available Actions│ Menu of permissible cycle actions        │
│  5. Voice/Style      │ Communication patterns and tone          │
│  6. Commit/Doc Style │ Artifact formatting conventions          │
│  7. Coordination     │ How to interact with other roles         │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.1.2 Action Selection Protocol

During each dispatch cycle, roles select exactly ONE action from their playbook. The selection follows a priority hierarchy:

1. **Blocked work** — If another role is blocked waiting on this role, unblock first
2. **First checks** — Mandatory verifications (e.g., issue tracking for Product)
3. **Active sprint goals** — Actions that advance current sprint milestones
4. **Backlog priorities** — High-priority items from the Active Threads queue
5. **Proactive work** — Innovation or improvement actions

This constraint (one action per cycle) prevents any single role from dominating execution time and ensures fair rotation across all 10 roles.

#### 4.1.3 Playbook Examples

**Engineering Playbook** (excerpt):

```markdown
## Actions (pick ONE per cycle)

### 1. Implement Feature

- Branch from main: `feat/<feature-name>`
- Write TypeScript code with tests
- Create PR with conventional commit title

### 2. Write Tests

- Add unit tests for untested code paths
- Add integration tests for cross-package functionality
- Target: maintain 80%+ coverage

### 3. Code Review

- Review open PRs from other roles
- Check TypeScript strict compliance
- Verify test coverage
```

**QA Playbook** (excerpt):

```markdown
## First Checks (EVERY CYCLE)

1. Run test suite: `npm test --workspaces`
2. Check for new PRs needing test review
3. Verify CI pipeline status

## Actions (pick ONE per cycle)

### 1. Write E2E Tests

- CLI sandbox tests for command flows
- Web integration tests with Playwright

### 2. File Bugs

- Document reproduction steps
- Set severity label
- Assign to appropriate role
```

#### 4.1.4 Playbook Customization

Users can customize playbooks for their project context:

```bash
# Initialize with default playbooks
ada init

# Modify playbook for project-specific needs
vim agents/playbooks/engineering.md
```

The framework validates playbook structure but allows arbitrary content, enabling adaptation to different tech stacks, team sizes, and development practices.

### 4.2 Inter-Role Coordination

ADA roles operate asynchronously but must coordinate to achieve system-level goals. Coordination happens through four mechanisms: memory bank handoffs, GitHub references, explicit dependencies, and emergent communication patterns.

#### 4.2.1 Memory Bank Handoffs

The primary coordination mechanism is the **Role State** section in the memory bank:

```markdown
## Role State

### 📦 Product

- **Last:** Created user stories for authentication feature (#145)
- **Working on:** Sprint planning document
- **Next:** Review Engineering's implementation questions

### ⚙️ Engineering

- **Last:** Started auth implementation, hit API question
- **Blocked by:** Product spec ambiguity (see #145 comment)
- **Next:** Continue implementation once unblocked
```

Each role updates its state section after every cycle. Other roles read these states during their context load phase, enabling asynchronous awareness.

**Handoff Pattern:**

```
Product (C100): Creates user stories → sets "Next: Engineering to implement"
     ↓
Engineering (C104): Reads Product state → implements feature → sets "Next: QA to test"
     ↓
QA (C108): Reads Engineering state → writes tests → sets "Next: Ops to merge"
```

#### 4.2.2 GitHub Issue References

GitHub issues serve as persistent coordination artifacts:

```markdown
## Active Threads (excerpt)

- **#145** (P1, Engineering, M) — Auth feature implementation
  - Product: Spec complete (C100)
  - Engineering: Blocked on OAuth flow (C104 comment)
  - Product: Clarified in C107
  - Engineering: Resuming (C108)
```

Roles communicate through issue comments, creating an auditable trail of decisions and handoffs.

#### 4.2.3 Explicit Dependencies

Some actions have explicit cross-role dependencies:

| Producing Role | Artifact             | Consuming Role       |
| -------------- | -------------------- | -------------------- |
| Product        | User Stories         | Engineering          |
| Research       | Feasibility Analysis | Product, Engineering |
| Engineering    | Code + Tests         | QA                   |
| QA             | Test Results         | Ops                  |
| Design         | API Spec             | Engineering          |
| Ops            | CI/CD Pipeline       | All roles            |

The memory bank's Active Threads section tracks these dependencies with status indicators.

#### 4.2.4 Emergent Communication Patterns

Through extensive self-dogfooding (390+ cycles), several emergent coordination patterns have been documented:

1. **Strategic Cascade** — CEO sets direction → Growth and Research respond within 2-3 cycles
2. **Implementation Chain** — Product→Engineering→QA→Ops forms a natural pipeline
3. **Cross-Cutting Concerns** — Ops and Design review work from all other roles
4. **Research-to-Practice Latency** — Research findings reach Product specs within 5-10 cycles

These patterns arise naturally from the rotation order and playbook definitions without explicit orchestration.

### 4.3 Reflexion System

ADA implements a three-phase Reflexion system inspired by Shinn et al. (2023), adapted for multi-agent coordination:

#### 4.3.1 Phase 1a: Per-Cycle Reflection Capture

Every dispatch cycle concludes with an optional but encouraged reflection:

```bash
ada dispatch complete \
  --action "Implemented OAuth flow for #145" \
  --reflection "What worked: Reused patterns from similar PR. What to improve: Should have checked existing tests first. Lesson: Always audit related test files before coding."
```

The reflection is stored in `rotation.json` history and indexed for later retrieval.

#### 4.3.2 Phase 1b: Cross-Role Pattern Extraction

Every 10 cycles, Scrum performs pattern extraction:

```markdown
## Reflexion Analysis (C380-389)

### Success Patterns

- Engineering→QA handoffs include test hints (3/3 successful)
- Research specs include implementation complexity estimates (2/2)

### Failure Patterns

- Product specs missing acceptance criteria (2 instances → Product playbook updated)

### Cross-Role Insights

- When Research and Engineering align early, implementation velocity +40%
```

#### 4.3.3 Phase 1c: Retrospective Synthesis

Formal retrospectives (every 10-15 cycles) synthesize learnings:

```markdown
## Retrospective C372-380

### What Went Well

- All Sprint 2 specs completed before kickoff
- Cross-referencing between docs (L133 applied)

### What Could Improve

- Retro cadence drifted despite documentation

### Action Items

- [ ] Add CLI enforcement for retro cadence (captured as lesson L132)

### Lessons Extracted

- L139: Kickoff documents synthesizing multiple specs reduce context-switching
- L140: Complete specification layers before implementation eliminates Day 1 ambiguity
```

#### 4.3.4 Reflexion Loop Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    REFLEXION FEEDBACK LOOP                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Cycle Action ───► Reflection ───► Pattern DB                   │
│       │                              │                           │
│       │                              ▼                           │
│       │                        Cross-Role                        │
│       │                        Analysis                          │
│       │                              │                           │
│       │                              ▼                           │
│       │                       Retrospective                      │
│       │                              │                           │
│       │                              ▼                           │
│       │                        Lessons                           │
│       │                         (L1, L2...)                      │
│       │                              │                           │
│       ▼                              ▼                           │
│  Playbook Updates ◄─────────── Rule Updates                     │
│       │                              │                           │
│       └──────────► Improved Behavior ◄───────────┘               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 4.4 Evolution Protocol

The agent team is not static. ADA includes mechanisms for systematic evolution:

#### 4.4.1 Evolution Signals

The system monitors for three evolution triggers:

1. **Capability Gap** — A recurring need with no dedicated role
2. **Issue Accumulation** — 5+ issues in a domain without a specialized owner
3. **Playbook Bloat** — A role's playbook exceeding reasonable scope

#### 4.4.2 Evolution Process

When an evolution signal is detected:

```
Step 1: Document in evolution-log.md
        "Detected 8 issues related to security with no dedicated role"

Step 2: Create proposal issue
        "chore(agents): propose new role — Security Engineer"

Step 3: Community/team review
        - Define focus areas
        - Draft playbook
        - Determine rotation position

Step 4: Implementation (if approved)
        - Add to roster.json
        - Create playbook file
        - Test in non-production first

Step 5: Monitoring
        - Track new role's effectiveness
        - Adjust playbook based on learnings
```

#### 4.4.3 Historical Evolution Events

ADA's own agent team has evolved through several documented events:

| Cycle | Event                    | Rationale                                           |
| ----- | ------------------------ | --------------------------------------------------- |
| C45   | Frontier role added      | Platform/innovation work grew beyond Research scope |
| C89   | Growth split from CEO    | Business strategy vs execution velocity mismatch    |
| C156  | QA elevated to full role | Test coverage became critical for quality           |

Each evolution is logged in `evolution-log.md` with full rationale and outcomes.

#### 4.4.4 Evolution Constraints

To prevent unbounded growth:

- Maximum 12 roles (prevents rotation cycles from becoming too long)
- Minimum 5 cycles before new role can be proposed
- Requires sign-off from CEO and affected roles
- New roles start with minimal playbook, expand based on need

### 4.5 Quality Gates

Quality is enforced through automated and process-based gates:

#### 4.5.1 Automated Gates

```
┌─────────────────────────────────────────────────────────────────┐
│                      CI QUALITY GATES                           │
├─────────────────────────────────────────────────────────────────┤
│  Lint ──► TypeCheck ──► Test ──► Build ──► Security ──► Merge  │
│    │           │          │         │          │                │
│   ESLint   tsc strict  Vitest   npm run    npm audit           │
│                                 build                           │
└─────────────────────────────────────────────────────────────────┘
```

All gates must pass before code reaches `main`.

#### 4.5.2 Process Gates

| Gate                        | Owner       | Trigger                       |
| --------------------------- | ----------- | ----------------------------- |
| Issue tracking verification | All roles   | Every cycle (R-013)           |
| Compression check           | Acting role | Bank >200 lines or 10+ cycles |
| PR transparency             | Ops         | Any open PR >2 cycles         |
| Spec review                 | QA          | Before implementation starts  |

### 4.6 Metrics Collection

ADA automatically collects metrics for continuous improvement:

#### 4.6.1 Velocity Metrics

- Cycles per day (target: 20-30 for autonomous operation)
- Issue close rate (target: >60%)
- PR merge latency (target: <5 cycles)

#### 4.6.2 Quality Metrics

- Test count and coverage
- Documentation freshness
- Rule compliance rate

#### 4.6.3 Coordination Metrics

- Handoff success rate
- Block duration (cycles until unblocked)
- Cross-role reference frequency

These metrics are updated in the memory bank's `Project Metrics` section and analyzed in retrospectives.

---

## Section Summary

The ADA methodology combines:

1. **Playbook-driven behavior** — Structured, bounded actions per role
2. **Asynchronous coordination** — Memory bank handoffs and GitHub references
3. **Continuous self-improvement** — Three-phase Reflexion loop
4. **Evolutionary adaptation** — Systematic role evolution protocol
5. **Quality enforcement** — Automated and process-based gates
6. **Metrics-driven feedback** — Quantitative tracking for improvement

This methodology enables sustained autonomous operation: 390+ cycles over 18 days with consistent velocity and quality metrics.

---

## References (Section-Specific)

- Shinn, N., et al. (2023). "Reflexion: Language Agents with Verbal Reinforcement Learning." NeurIPS 2023.
- Park, J., et al. (2023). "Generative Agents: Interactive Simulacra of Human Behavior." UIST 2023.

---

_Draft by 📦 Product (C390). Ready for integration into full paper draft (target: Mar 7)._
