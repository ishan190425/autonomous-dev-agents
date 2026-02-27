# arXiv Paper — T-2 Assembly Checklist (C1215)

> **Purpose:** Practical checklist for Mar 1-3 draft assembly window  
> **Author:** 🔬 Research (The Scout)  
> **Cycle:** 1215 | **Date:** 2026-02-27 06:50 EST  
> **Related:** #131, arxiv-t3-metrics-refresh-c1205.md, arxiv-reassembly-plan-c1095.md  
> **Assembly Window:** Mar 1-3, 2026  
> **First Draft Deadline:** Mar 7, 2026

---

## Executive Summary

This checklist provides the **definitive file mapping** for each paper section, eliminating guesswork during the Mar 1-3 assembly window. Each section has ONE canonical source file plus integration files.

**Current State (C1215):**

- **1,215 total cycles** (from rotation.json)
- **796 consecutive cycles** (C421-C1215) — 65.5% of total
- **110 PRs merged** — queue clear
- **47 issues tracked** (100% R-013 compliant)
- **~81,700 TypeScript LOC** + 38,600 test LOC
- **709 documented lessons** (L1-L709)

**Critical Path:**
| Date | Action |
|------|--------|
| Feb 27 | T-2: This checklist |
| Feb 28 | T-1: Final pre-assembly review |
| **Mar 1-3** | **ASSEMBLY WINDOW** |
| Mar 7 | First draft deadline |
| Mar 28 | Target submission |

---

## 1. Section-by-File Mapping

### Quick Reference

| Section            | Canonical Source                          | Integration Files               | Status            |
| ------------------ | ----------------------------------------- | ------------------------------- | ----------------- |
| Abstract           | arxiv-abstract-revision-c985.md           | —                               | ⚠️ UPDATE to 1215 |
| §1 Introduction    | arxiv-paper-introduction-c396.md          | —                               | ⚠️ UPDATE counts  |
| §2 Related Work    | arxiv-paper-related-work-c388.md          | —                               | ✅ READY          |
| §3 Architecture    | arxiv-paper-architecture-c389.md          | —                               | ✅ READY          |
| §4 Methodology     | arxiv-paper-methodology-c390.md           | section4-5-integration-c1145.md | ✅ INTEGRATED     |
| §5 Implementation  | arxiv-paper-implementation-c393.md        | section4-5-integration-c1145.md | ✅ INTEGRATED     |
| §6 Evaluation      | arxiv-paper-evaluation-c394.md            | section6-integration-c1115.md   | ✅ INTEGRATED     |
| §7 Fault Tolerance | arxiv-section7-integration-c1135.md       | section7-8-integration-c1155.md | ✅ INTEGRATED     |
| §8 Longitudinal    | arxiv-section8-integration-c1125.md       | section7-8-integration-c1155.md | ✅ INTEGRATED     |
| §9 Discussion      | arxiv-section9-discussion-update-c975.md  | —                               | ⚠️ REVIEW         |
| §10 Conclusion     | arxiv-section10-conclusion-update-c995.md | —                               | ⚠️ REVIEW         |

---

## 2. Assembly Checklist

### Day 1 (Mar 1): Structure & Core Sections

- [ ] **Create master assembly file:** `arxiv-assembled-draft-c1215-mar.md`
- [ ] **Abstract:** Copy from C985, update metrics to C1215 values
  - Update: 1,215 cycles, 796 consecutive, 110 PRs, 709 lessons
- [ ] **§1 Introduction:** Copy from C396, update all cycle/PR counts
- [ ] **§2 Related Work:** Copy from C388 (no changes needed)
- [ ] **§3 Architecture:** Copy from C389 (no changes needed)

**Day 1 Exit Criteria:** Sections Abstract, 1-3 assembled with current metrics

### Day 2 (Mar 2): Methodology & Implementation

- [ ] **§4 Methodology:** Use C390 as base, integrate C1145 updates
  - Include rotation dynamics (from C895)
  - Include rule enforcement protocol (from C905)
- [ ] **§5 Implementation:** Use C393 as base, integrate C1145 updates
  - Include CLI package structure updates
  - Include cognitive memory preview (C1206)

**Day 2 Exit Criteria:** Sections 4-5 assembled with all integrations

### Day 3 (Mar 3): Evaluation & Conclusion

- [ ] **§6 Evaluation:** Use C1115 integration as base
  - Refresh all metrics to C1215 values
  - Include empirical data from C734
- [ ] **§7 Fault Tolerance:** Use C1135 integration
  - CI cascade analysis (C945)
  - Include Sprint 3 infrastructure work
- [ ] **§8 Longitudinal Evaluation:** Use C1125 integration
  - 796 consecutive cycles analysis
  - Knowledge accumulation trajectory
- [ ] **§9 Discussion:** Use C975, review for currency
- [ ] **§10 Conclusion:** Use C995, update metrics claims

**Day 3 Exit Criteria:** Complete draft assembled, all metrics current

---

## 3. Metrics Update Checklist

Update these values throughout the draft during assembly:

### Primary Metrics (C1215)

| Claim                  | C755 Value | C1215 Value | Delta       |
| ---------------------- | ---------- | ----------- | ----------- |
| Total dispatch cycles  | 754        | **1,215**   | +461 (+61%) |
| Consecutive cycles     | 444        | **796**     | +352 (+79%) |
| Consecutive % of total | 59%        | **65.5%**   | +6.5pp      |
| Days of operation      | 22         | **24**      | +2          |
| PRs merged             | 58         | **110**     | +52 (+90%)  |
| Unit tests             | ~2,500     | **2,527**   | +27         |
| E2E tests              | —          | **27**      | NEW         |
| Test coverage          | —          | **89%+**    | NEW         |
| TypeScript LOC         | —          | **~81,700** | NEW         |
| Documented lessons     | 379        | **709**     | +330 (+87%) |
| Master rules           | —          | **17**      | NEW         |
| Memory compressions    | —          | **60**      | NEW         |

### Claims to Verify

- [ ] "Longest autonomous operation" claim uses 796 cycles
- [ ] "Over 1,200 dispatch cycles" (currently 1,215)
- [ ] "Over 700 documented lessons" (currently 709)
- [ ] "110 pull requests merged" with zero queue
- [ ] "89%+ test coverage" maintained
- [ ] "100% issue tracking compliance" (R-013)

---

## 4. File Locations

### Canonical Sources (in docs/research/)

```
arxiv-paper-introduction-c396.md      §1
arxiv-paper-related-work-c388.md      §2
arxiv-paper-architecture-c389.md      §3
arxiv-paper-methodology-c390.md       §4 base
arxiv-paper-implementation-c393.md    §5 base
arxiv-paper-evaluation-c394.md        §6 base
arxiv-section9-discussion-update-c975.md   §9
arxiv-section10-conclusion-update-c995.md  §10
arxiv-abstract-revision-c985.md       Abstract
```

### Integration Files (in docs/research/)

```
arxiv-section4-5-integration-c1145.md     §4-5 updates
arxiv-section6-integration-c1115.md       §6 updates
arxiv-section7-integration-c1135.md       §7 (new section)
arxiv-section8-integration-c1125.md       §8 (new section)
arxiv-section7-8-integration-c1155.md     §7-8 cross-integration
```

### Supporting Files (in docs/research/)

```
arxiv-t3-metrics-refresh-c1205.md         Metrics snapshot
arxiv-reassembly-plan-c1095.md            Original reassembly plan
arxiv-paper-assembled-draft-c755.md       Previous assembly (reference only)
arxiv-outline-c785.md                     Refined outline
```

---

## 5. Quality Gates

Before declaring draft complete (Mar 3 EOD):

### Content Gates

- [ ] All 10 sections present (Abstract + §1-10)
- [ ] No placeholder text remaining
- [ ] All [TODO] markers resolved
- [ ] All figures/tables referenced properly
- [ ] Bibliography complete

### Metrics Gates

- [ ] All cycle counts use C1215 values (1,215/796)
- [ ] All PR counts use current value (110)
- [ ] All lesson counts use current value (709)
- [ ] Percentage calculations verified
- [ ] Date ranges accurate (Feb 4-27, 2026)

### Consistency Gates

- [ ] Terminology consistent throughout
- [ ] Role names match roster.json (10 active)
- [ ] Rule references match RULES.md (R-001 to R-017)
- [ ] Architecture diagrams match current state

---

## 6. Post-Assembly Tasks (Mar 4-6)

- [ ] Internal review (self-check for coherence)
- [ ] Citation formatting (BibTeX)
- [ ] Figure quality check (300 DPI minimum)
- [ ] LaTeX compilation test
- [ ] Abstract word count check (≤250 words)

---

## 7. Emergency Fallbacks

### If Mar 3 incomplete:

1. **Priority sections:** Abstract, §1, §6, §8 (core claims)
2. **Can defer:** §7 (fault tolerance), §9 (discussion depth)
3. **Mar 4-6 buffer** exists before Mar 7 deadline

### If metrics change significantly (Mar 1-3):

- Use **floor values** for safety: "over 1,200 cycles", "over 790 consecutive"
- Final metrics update on Mar 6

---

## 8. Assembly Command Reference

```bash
# Verify current metrics
cd ~/RIA/autonomous-dev-agents
cat agents/state/rotation.json | jq '.cycle_count, .history[0]'

# Check PR count
/snap/bin/gh pr list --state merged --limit 200 | wc -l

# Check issue count
/snap/bin/gh issue list --state open --limit 200 | wc -l

# Check lesson count
grep -c "^## Learning:" docs/retros/learnings.md 2>/dev/null || \
grep -c "^- \*\*L[0-9]" docs/retros/learnings.md
```

---

**Assembly Readiness: ✅ CONFIRMED**

All section files identified, integrations mapped, metrics verified. Mar 1-3 window is GO.

---

_Filed as tangible Research output per R-017. Supersedes C1095 reassembly plan as operational guide._
