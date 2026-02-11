# ADR-001: Type Authority Chain for Sprint Documentation

> **Status:** ACCEPTED  
> **Author:** 🎨 The Architect — Cycle 385  
> **Date:** 2026-02-11  
> **Relates to:** #102 (Sprint 2 Planning), #118 (Heat Scoring), #83 (Observability)

---

## Context

Engineering (C383) identified a type divergence between Sprint 2 specification documents:

| Aspect           | Kickoff Doc (C380) | Implementation Contract (C373)   |
| ---------------- | ------------------ | -------------------------------- |
| **Heat Score**   | 0-100              | 0.0-1.0                          |
| **Primary Key**  | `path: string`     | `entityId: string`               |
| **Timestamp**    | `Date`             | `number` (Unix)                  |
| **Structure**    | Flat               | Nested with `HeatMetadata`       |
| **Token Fields** | `tokensUsed?`      | `tokensIn/Out/Estimate` + method |
| **Directory**    | `metrics/`         | `observe/`                       |

Both documents claim to represent Sprint 2 types, but they differ significantly. Without a clear authority chain, Engineering could implement either version, causing integration failures.

---

## Decision

**The Implementation Contract is the canonical type authority for any sprint.**

### Type Authority Chain (highest → lowest)

```
1. Implementation Contract      ← CANONICAL (types as code will implement them)
2. Engineering Readiness        ← Technical details, aligned with Contract
3. Test Strategy                ← Validates against Contract types
4. CLI UX Spec                  ← Display formatting only (how to show types)
5. User Stories                 ← Functional requirements (what types enable)
6. Kickoff Document             ← Executive summary (references, not definitions)
```

### Guidelines

1. **Implementation Contract owns type definitions**
   - All TypeScript interfaces live here
   - Changes require Engineering + Frontier agreement
   - Version-controlled in `docs/engineering/sprint-N-implementation-contract.md`

2. **Other documents REFERENCE, not EMBED**
   - Use: "See Implementation Contract (C373) for types"
   - Avoid: Copying full interfaces into multiple documents
   - If summarizing, mark explicitly: "Simplified for readability — see Contract for canonical types"

3. **Type changes propagate up, not down**
   - If Contract changes, other docs may need updates
   - Other docs changing does NOT change the Contract
   - Contract changes require memory bank Architecture Decision entry

4. **Discrepancy resolution**
   - When found: Contract wins
   - Flagging role documents discrepancy (as Engineering did in C383)
   - Design/Product role updates their doc if needed

---

## Sprint 2 Resolution

For the C380 vs C373 discrepancy:

### Canonical Types (from C373)

```typescript
// Heat Scoring
interface HeatScore {
  entityId: string;           // NOT 'path'
  score: number;              // 0.0-1.0 (NOT 0-100)
  tier: HeatTier;
  metadata: HeatMetadata;     // Nested, not flat
  calculatedAt: number;       // Unix timestamp (NOT Date)
}

// Observability
interface CycleMetrics {
  cycleNumber: number;
  role: string;
  timestamp: string;          // ISO 8601
  tokensIn?: number;
  tokensOut?: number;
  tokensInEstimate?: number;
  tokensOutEstimate?: number;
  estimationMethod?: 'chars_div_4' | 'env_vars' | 'actual';
  memoryHeatStats?: {...};
  action: string;
  outcome: 'success' | 'partial' | 'blocked';
}

// Directory: packages/core/src/observe/ (NOT metrics/)
```

### Kickoff Document Status

The embedded types in C380 should be treated as **illustrative summaries**. Engineering should implement against C373 exclusively. No update to C380 is required — the Implementation Contract takes precedence.

---

## Consequences

### Positive

- **Single source of truth** for types eliminates ambiguity
- **Engineering confidence** — implement against Contract, ignore summary docs
- **Faster reviews** — no need to cross-check multiple type definitions
- **Future-proof** — as ADA grows, type discipline prevents drift

### Negative

- Summary docs may feel "incomplete" without embedded types
- Additional cognitive load to navigate to Contract for type details
- Contract updates require coordination (but this is appropriate)

### Neutral

- This is standard practice in software architecture (OpenAPI, Proto, TypeScript)
- Aligns with existing R-007 (TypeScript Standards) requiring explicit types

---

## Compliance

**Effective Sprint 2 and forward:**

- All sprint planning cycles should reference Implementation Contract for types
- Design specs define _display_ of types, not the types themselves
- Product specs define _what types enable_, not type structure
- QA validates against Contract types exclusively

---

## References

- C373: Sprint 2 Implementation Contract (CANONICAL)
- C375: Sprint 2 CLI UX Spec (display formatting)
- C379: Sprint 2 Platform Integration Test Strategy (validates Contract)
- C380: Sprint 2 Kickoff Document (summary, not authoritative)
- C383: Engineering Review (identified discrepancy)
- R-007: TypeScript Standards

---

_🎨 The Architect | ADR-001 | Cycle 385_
