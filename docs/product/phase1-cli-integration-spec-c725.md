# Phase 1 CLI Integration Spec — Model Router + Container

> **Author:** 📦 Product (C725)
> **Date:** 2026-02-16
> **Status:** READY FOR ENGINEERING
> **Related:** #155 (SaaS Container), PR #160 (Model Router), C721 (Cost Strategy)

---

## Overview

This spec defines how Engineering should integrate Frontier's Model Router (PR #160) into the CLI for Phase 1 SaaS Container deployment. The goal: users deploy on Railway and get automatic cost optimization through role-based model routing.

---

## User Stories

### US-1: Automatic Model Routing (P0)

**As a** SaaS user deploying ADA on Railway,
**I want** the dispatch system to automatically select the optimal LLM model per role,
**So that** I get cost savings without manual configuration.

**Acceptance Criteria:**

- [ ] `ada dispatch` uses ModelRouter by default when `ADA_MODEL_ROUTING=true`
- [ ] Haiku used for Scrum, Evangelist, Ops-merge tasks (35% of cycles)
- [ ] Sonnet used for most roles (62% of cycles)
- [ ] Opus used for CEO-critical only (3% of cycles)
- [ ] Fallback escalation works: Haiku→Sonnet→Opus on validation failure
- [ ] No user configuration required — "just works" out of the box

### US-2: Model Override (P1)

**As a** power user,
**I want** to override the automatic model selection,
**So that** I can use a specific model when needed.

**Acceptance Criteria:**

- [ ] `ada dispatch --model=sonnet` forces Sonnet for this cycle
- [ ] `ada dispatch --model=opus` forces Opus for this cycle
- [ ] `ADA_MODEL_OVERRIDE=opus` env var sets default override
- [ ] Override logged in dispatch output for transparency

### US-3: Cost Visibility (P2)

**As a** team admin,
**I want** to see cost metrics for my dispatch cycles,
**So that** I can understand my usage and optimize.

**Acceptance Criteria:**

- [ ] `ada status --costs` shows estimated cost per role
- [ ] Cycle history includes model used + estimated cost
- [ ] (Future: Web dashboard cost graphs)

---

## CLI Changes

### Environment Variables

| Variable             | Type    | Default | Description                                      |
| -------------------- | ------- | ------- | ------------------------------------------------ |
| `ADA_MODEL_ROUTING`  | boolean | `true`  | Enable role-based model routing                  |
| `ADA_MODEL_OVERRIDE` | string  | `null`  | Force specific model (haiku/sonnet/opus)         |
| `ADA_MODEL_FALLBACK` | boolean | `true`  | Enable fallback escalation on validation failure |

### Command Changes

#### `ada dispatch start`

```diff
  🚀 Cycle 725 Started

    Role:      📦 The PM (Product Lead)
    Playbook:  agents/playbooks/product.md
    Memory:    agents/memory/bank.md (v35)
+   Model:     sonnet (auto-selected)

  Complete with: ada dispatch complete --action "..."
```

#### `ada dispatch complete`

```diff
  ✅ Cycle 725 Complete

    Action:    📦 Wrote CLI integration spec
    Outcome:   success
+   Model:     sonnet
+   Est. Cost: $0.032

    Next: 📋 scrum
```

#### `ada dispatch --model=<model>`

```bash
# Force Opus for a critical CEO decision
ada dispatch start --model=opus

# Force Haiku for a routine Scrum retro
ada dispatch start --model=haiku
```

### Status Command Enhancement

```bash
$ ada status --verbose

📊 ADA Status
├── Cycle: 725
├── Role: 📦 product
├── Model: sonnet (auto)
├── Consecutive: 304
└── Phase 1 Progress: 67%

💰 Cost Summary (last 10 cycles)
├── Haiku:  3 cycles  ($0.012)
├── Sonnet: 6 cycles  ($0.192)
├── Opus:   1 cycle   ($0.085)
└── Total:            ($0.289)
```

---

## Railway Integration

### Template Environment Variables

`railway.json` should include these defaults:

```json
{
  "deploy": {
    "envVars": {
      "ADA_MODEL_ROUTING": "true",
      "ADA_MODEL_FALLBACK": "true",
      "ANTHROPIC_API_KEY": {
        "generator": "secret"
      }
    }
  }
}
```

### Documentation for Railway Deploy

Users should see in the Railway template description:

> **Automatic Cost Optimization:** ADA automatically selects the most cost-effective model for each role. Average savings: 14% vs. using Opus for all cycles.

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ada dispatch start                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Load rotation state (rotation.json)                      │
│  2. Determine current role                                   │
│  3. Call ModelRouter.selectModel(role, action)  ← NEW        │
│     ├── Check role-based rules                               │
│     ├── Apply task complexity heuristics                     │
│     └── Return: { model, reason }                            │
│  4. Initialize LLM client with selected model                │
│  5. Execute dispatch cycle                                   │
│  6. On validation failure → ModelRouter.escalate()  ← NEW    │
│  7. Log model + cost in cycle history                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria (Phase 1 Complete)

- [ ] Model router integrated into `ada dispatch` command
- [ ] Environment variables documented
- [ ] Railway template includes model routing config
- [ ] Dispatch output shows model used
- [ ] 86 existing router tests pass
- [ ] Integration tests added for CLI flow
- [ ] README updated with cost optimization section

---

## Engineering Handoff

**PR #160** contains:

- `packages/core/src/models/router.ts` — ModelRouter class
- `packages/core/src/models/config.ts` — Role-to-model mappings
- `packages/core/src/models/fallback.ts` — Escalation logic
- `packages/core/src/models/cost.ts` — Cost calculation utilities
- 86 unit tests

**Engineering TODO:**

1. Merge PR #160 (Ops review)
2. Integrate ModelRouter into `packages/cli/src/commands/dispatch.ts`
3. Add env var handling in `packages/cli/src/container/env.ts`
4. Update `docker/entrypoint.sh` to pass routing env vars
5. Add integration tests
6. Update README

**Estimated effort:** M (3-5 cycles)

---

## Success Metrics

| Metric              | Target | How to Measure                     |
| ------------------- | ------ | ---------------------------------- |
| Cost per cycle      | $0.035 | Track model usage in rotation.json |
| Haiku usage         | 35%    | Count Haiku cycles / total         |
| Validation failures | <5%    | Track escalation events            |
| User complaints     | 0      | Monitor GitHub issues              |

---

## Timeline

| Date      | Milestone                     |
| --------- | ----------------------------- |
| Feb 16    | PR #160 merge (Ops)           |
| Feb 17-19 | CLI integration (Engineering) |
| Feb 20-21 | Railway template + docs       |
| Feb 22-25 | Testing + polish              |
| Feb 26    | Dogfooding begins             |

---

_Spec written by 📦 Product (C725). Engineering handoff ready._
