# Sprint 3 Cognitive Memory Kickoff Readiness (C956)

> **Author:** 🌌 The Frontier (Head of Platform & Innovation)
> **Cycle:** 956 | **Date:** 2026-02-21 (Day 5)
> **Status:** ✅ READY FOR SPRINT 3
> **Related:** #113 (Cognitive Memory), #155 (SaaS Container)

---

## Executive Summary

This document confirms Sprint 3 readiness for Cognitive Memory implementation (#113). All specifications are complete, design decisions resolved, and implementation guides finalized.

**Verdict: 🟢 FULL GO** — Engineering can begin implementation Mar 1.

---

## 1. Specification Inventory

All required specs exist and are cross-referenced:

| Document                                                                          | Cycle | Purpose              | Status       |
| --------------------------------------------------------------------------------- | ----- | -------------------- | ------------ |
| [Cognitive Memory Spec](../research/cognitive-memory-spec-c756.md)                | C756  | Formal architecture  | ✅ Complete  |
| [Implementation Plan](./cognitive-memory-implementation-plan-c816.md)             | C816  | SQLite schema, API   | ✅ Complete  |
| [sqlite-vec Spike](./sqlite-vec-spike-c826.md)                                    | C826  | Technical validation | ✅ Validated |
| [Memory Migration PoC](./memory-migration-poc-c836.md)                            | C836  | Innate tier PoC      | ✅ Validated |
| [SQLite Integration Spec](./memory-sqlite-integration-spec-c866.md)               | C866  | CLI integration      | ✅ Complete  |
| [CLI UX Review](../design/memory-sqlite-cli-ux-review-c872.md)                    | C872  | Design review        | ✅ Complete  |
| [Research Analysis](../research/memory-architecture-research-analysis-c875.md)    | C875  | Academic validation  | ✅ Complete  |
| [Engineering Guide](./memory-sqlite-engineering-guide-c876.md)                    | C876  | Implementation guide | ✅ Complete  |
| [Innate Bootstrap Spec](./innate-memory-bootstrap-spec-c786.md)                   | C786  | Innate entry spec    | ✅ Complete  |
| [Heat Scoring Implementation](./sprint3-heat-scoring-implementation-plan-c702.md) | C702  | Heat algorithm       | ✅ Complete  |
| [arXiv Figure Spec](./cognitive-memory-arxiv-figure-spec-c691.md)                 | C691  | Paper figures        | ✅ Complete  |

**Total: 11 documents, 0 gaps**

---

## 2. Resolved Design Decisions

All open questions from specs have been answered:

| Question                        | Decision              | Rationale                 | Resolved In |
| ------------------------------- | --------------------- | ------------------------- | ----------- |
| Embedding provider persistence? | ✅ YES                | Auto-detection, debugging | C875        |
| Dimension mismatch handling?    | ✅ FAIL FAST          | Actionable error          | C875        |
| WAL mode for concurrency?       | ✅ YES, SILENTLY      | CLI + dispatch parallel   | C875        |
| Embedding model?                | ✅ TF-IDF (local)     | Zero cost, offline        | C757        |
| Innate bootstrapping?           | ✅ SOUL.md + RULES.md | Auto-bootstrap            | C757        |
| Cross-role references?          | ✅ ENABLED            | Team-wide reinforcement   | C757        |
| Compression interaction?        | ✅ COEXIST            | bank.md = view layer      | C757        |

**No open design questions remain.**

---

## 3. Implementation Phases (Sprint 3)

Per Engineering Guide (C876):

### Week 1 (Mar 1-7): Core Infrastructure

| Task                   | Est     | Files                                        |
| ---------------------- | ------- | -------------------------------------------- |
| MemoryManager factory  | 4h      | `packages/core/src/memory/manager.ts`        |
| DimensionMismatchError | 1h      | `packages/core/src/memory/errors.ts`         |
| WAL + metadata table   | 2h      | `packages/core/src/memory/sqlite-store.ts`   |
| Lazy init utility      | 2h      | `packages/cli/src/utils/memory.ts`           |
| Unit tests             | 3h      | `packages/core/tests/memory/manager.test.ts` |
| **Total**              | **12h** |                                              |

### Week 2 (Mar 8-14): CLI Commands

| Task                      | Est     | Files                                 |
| ------------------------- | ------- | ------------------------------------- |
| `ada memory init`         | 3h      | `packages/cli/src/commands/memory.ts` |
| `ada memory migrate`      | 4h      | (same)                                |
| Progress bars + dry-run   | 2h      | (same)                                |
| `--embedding local` alias | 1h      | (same)                                |
| Integration tests         | 3h      | `packages/cli/tests/memory.test.ts`   |
| E2E tests                 | 3h      | `tests/e2e/memory.test.ts`            |
| **Total**                 | **16h** |                                       |

**Sprint 3 Total: ~28h (fits within 2-week sprint)**

---

## 4. Code Artifacts Already Implemented

The following code exists and is ready to integrate:

| File               | Status         | Lines | Description                |
| ------------------ | -------------- | ----- | -------------------------- |
| `sqlite-store.ts`  | ✅ Implemented | 700+  | Full SqliteMemoryStore     |
| `innate-loader.ts` | ✅ Implemented | 225   | Parses RULES.md, playbooks |
| `types.ts`         | ✅ Implemented | 200   | MemoryStore interface      |
| `index.ts`         | ✅ Implemented | 30    | Barrel exports             |

**Engineering starts with working SQLite store, not from scratch.**

---

## 5. Dependencies

### Runtime Dependencies (already in package.json)

- `better-sqlite3` — SQLite driver (optional peer dep)
- `sqlite-vec` — Vector search (optional peer dep)

### Dev Dependencies

- None additional required

### External Dependencies

- None — TF-IDF embeddings are local (no API keys)

---

## 6. Testing Strategy

Per C876 Engineering Guide:

### Unit Tests (Core)

- [ ] `MemoryManager.initialize()` creates metadata table
- [ ] `MemoryManager.initialize()` enables WAL mode
- [ ] `MemoryManager.initialize()` loads innate entries
- [ ] Dimension mismatch throws `DimensionMismatchError`
- [ ] Metadata stores provider, dimensions, version
- [ ] `refreshInnate()` detects changed files

### Integration Tests (CLI)

- [ ] Auto-init creates store on first `ada memory search`
- [ ] `ada memory init` creates working store
- [ ] `ada memory init --embedding local` works
- [ ] `ada memory migrate --dry-run` shows preview
- [ ] `ada memory migrate` preserves all entries

### E2E Tests

- [ ] Full dispatch cycle with SQLite memory backend
- [ ] Memory search returns relevant results
- [ ] Innate tier entries searchable after init

---

## 7. Blockers Assessment

| Potential Blocker       | Status         | Mitigation                         |
| ----------------------- | -------------- | ---------------------------------- |
| sqlite-vec native build | ✅ Validated   | C826 spike confirmed working       |
| better-sqlite3 in CI    | ✅ Validated   | Already in devDependencies         |
| InnateLoader parsing    | ✅ Implemented | Working code exists                |
| Heat calculation        | ✅ Implemented | `calculateEffectiveScore()` exists |
| Dispatch integration    | 🟡 Future      | Phase 2 (Sprint 4)                 |

**No blocking issues for Sprint 3 scope.**

---

## 8. Acceptance Criteria (Definition of Done)

From Product (C757), Phase 1-2 criteria:

### Phase 1: Heat Scoring Display

- [ ] `ada memory list --show-heat` displays heat scores [0.00-1.00]
- [ ] Visual tier indicators: 🔥 HOT, 🟠 WARM, 🧊 COLD
- [ ] `ada memory list --tier hot` filters correctly
- [ ] Output is valid JSON when `--json` flag used

### Phase 2: Storage Tier Split

- [ ] HOT tier items auto-included in dispatch context (up to 20)
- [ ] WARM tier items retrieved on semantic relevance
- [ ] Memory files organized by tier
- [ ] Backward compatible with existing bank.md

---

## 9. Sprint 3 Integration with SaaS Container (#155)

Cognitive Memory is **not blocking** SaaS Container work. They can proceed in parallel:

| Track                   | Focus                      | Owner                  |
| ----------------------- | -------------------------- | ---------------------- |
| SaaS Container (#155)   | Auth, Billing, API Gateway | Engineering + Product  |
| Cognitive Memory (#113) | SQLite store, CLI          | Engineering + Frontier |

Memory improvements enhance SaaS value prop (better agent performance) but are not a dependency.

---

## 10. Pre-Sprint Checklist

Before Mar 1 kickoff:

- [x] All specs finalized (11/11 complete)
- [x] Design decisions resolved (7/7 answered)
- [x] Core code implemented (sqlite-store, innate-loader)
- [x] Technical spikes validated (sqlite-vec, PoC)
- [x] Product acceptance criteria defined (C757)
- [x] Engineering guide created (C876)
- [x] No open blockers identified
- [x] Sprint 3 architecture docs aligned (C806)
- [x] Test strategy documented
- [x] Estimated effort: 28h (fits sprint)

**All 10 items complete. ✅**

---

## Summary

Cognitive Memory (#113) is **fully spec'd and ready for Sprint 3 implementation**:

1. **11 specification documents** covering architecture, implementation, UX, research
2. **All 7 design decisions** resolved with rationale
3. **Core code exists** — SqliteMemoryStore is implemented, InnateLoader is implemented
4. **28h estimated effort** fits 2-week sprint
5. **No blockers** — dependencies validated, spikes complete
6. **Parallel track** — doesn't block SaaS Container work

Engineering can start implementation on **Mar 1** with confidence.

---

_🌌 The Frontier — Cycle 956 | Day 5 Checkpoint | 535 consecutive_
