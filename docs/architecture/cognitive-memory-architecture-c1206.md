# Cognitive Memory Architecture Specification

> **Author:** 🌌 The Frontier (C1206)
> **Date:** 2026-02-27
> **Status:** Proposed — Sprint 4 Implementation
> **Related Issues:** #113 (Cognitive Memory), #172 (Auto Compression), #173 (Enhanced Memory Search)
> **Builds On:** C1076 (Observability Spec), C1196 (Execution Queue ADR)

---

## Executive Summary

This specification formalizes the Cognitive Memory Architecture for ADA agents — a human-inspired memory system with **innate** (hardwired) and **learned** (acquired) memory tiers, governed by **reference-based heat scoring** for automatic prioritization and decay.

### Goals

1. **Reduce hallucination** — Protect core facts from being overwritten
2. **Intelligent prioritization** — Frequently-used memories stay hot
3. **Natural decay** — Unreferenced information fades to cold storage
4. **Efficient retrieval** — Semantic search weighted by heat scores
5. **Observable** — Memory state visible in dashboard

### Non-Goals

- Full MemGPT-style paging (out of scope for Sprint 4)
- Cross-agent memory sharing (future enhancement)
- Real-time memory visualization (separate #120)

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        COGNITIVE MEMORY SYSTEM                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         INNATE MEMORY                                │   │
│  │                    (Protected, Never Decays)                         │   │
│  │                                                                      │   │
│  │   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │   │
│  │   │   SOUL.md    │ │   RULES.md   │ │  Playbooks   │                │   │
│  │   │ (Identity)   │ │ (Constraints)│ │  (Behaviors) │                │   │
│  │   │   heat=1.0   │ │   heat=1.0   │ │   heat=1.0   │                │   │
│  │   └──────────────┘ └──────────────┘ └──────────────┘                │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼ provides substrate for                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        LEARNED MEMORY                                │   │
│  │              (Acquired, Decays Based on Usage)                       │   │
│  │                                                                      │   │
│  │   ┌────────────────────────────────────────────────────────────┐    │   │
│  │   │  🔥 HOT (heat > 0.8)          │  Working Memory            │    │   │
│  │   │  Always in context window    │  Recent cycles, blockers   │    │   │
│  │   └────────────────────────────────────────────────────────────┘    │   │
│  │                              │                                       │   │
│  │                              ▼ no reference → decay                  │   │
│  │                                                                      │   │
│  │   ┌────────────────────────────────────────────────────────────┐    │   │
│  │   │  🟠 WARM (0.4 ≤ heat ≤ 0.8)   │  Active Memory             │    │   │
│  │   │  Retrieved on semantic match │  Lessons, decisions, state │    │   │
│  │   └────────────────────────────────────────────────────────────┘    │   │
│  │                              │                                       │   │
│  │                              ▼ continued no reference                │   │
│  │                                                                      │   │
│  │   ┌────────────────────────────────────────────────────────────┐    │   │
│  │   │  🧊 COLD (heat < 0.4)         │  Archive Memory            │    │   │
│  │   │  Explicit recall only        │  Old cycles, stale facts   │    │   │
│  │   └────────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Memory Classification

### 1.1 Innate Memory

**Definition:** Information that is always present, never learned, and cannot be overwritten.

| Component      | File Location           | Purpose                                        | Heat        |
| -------------- | ----------------------- | ---------------------------------------------- | ----------- |
| Identity       | `SOUL.md`               | Core personality, values, behavior constraints | 1.0 (fixed) |
| Rules          | `agents/rules/RULES.md` | Mandatory operational constraints              | 1.0 (fixed) |
| Playbooks      | `agents/playbooks/*.md` | Role-specific behaviors                        | 1.0 (fixed) |
| Roster         | `agents/roster.json`    | Team structure, rotation order                 | 1.0 (fixed) |
| System Prompts | Built-in                | LLM framing, tool schemas                      | 1.0 (fixed) |

**Properties:**

- Cannot be modified by agent actions (read-only)
- Always included in context window
- Never subject to compression or decay
- Changes require human intervention

### 1.2 Learned Memory

**Definition:** Information acquired through agent experience that evolves based on usage.

| Category               | Examples                          | Initial Heat | Decay Rate            |
| ---------------------- | --------------------------------- | ------------ | --------------------- |
| Cycle State            | Recent actions, current role      | 0.9          | Fast (per-cycle)      |
| Active Work            | PR status, blockers, dependencies | 0.8          | Medium (per-rotation) |
| Lessons Learned        | L1-L702                           | 0.6          | Slow (per-sprint)     |
| Architecture Decisions | ADRs, specs                       | 0.7          | Very slow             |
| Historical Context     | Old cycles, closed issues         | 0.3          | Fast                  |
| Archived Content       | Compressed bank versions          | 0.1          | None (explicit only)  |

---

## 2. Heat Scoring Algorithm

### 2.1 Core Formula

```typescript
// packages/core/src/memory/heat.ts

export interface HeatScore {
  value: number; // 0.0 to 1.0
  lastUpdated: Date; // When heat was last calculated
  referenceCount: number; // Total references
  recentReferences: number; // References in last N cycles
}

/**
 * Calculate heat score for a memory item.
 *
 * Formula: heat = base × recency × reference_factor × importance
 *
 * @param item - Memory item with metadata
 * @param currentCycle - Current dispatch cycle number
 * @param config - Tunable parameters
 */
export function calculateHeat(
  item: MemoryItem,
  currentCycle: number,
  config: HeatConfig = DEFAULT_HEAT_CONFIG
): number {
  // 1. Base importance (0.1 to 1.0 based on category)
  const base = getBaseImportance(item.category);

  // 2. Recency factor (exponential decay)
  const cyclesSinceRef = currentCycle - item.lastReferencedCycle;
  const recency = Math.exp(-config.decayRate * cyclesSinceRef);

  // 3. Reference factor (logarithmic growth)
  const refFactor =
    1 + config.referenceWeight * Math.log1p(item.referenceCount);

  // 4. Importance multiplier (from explicit tags or content analysis)
  const importance = item.importanceScore ?? 1.0;

  // Calculate raw heat
  const rawHeat = base * recency * refFactor * importance;

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, rawHeat));
}

export const DEFAULT_HEAT_CONFIG: HeatConfig = {
  decayRate: 0.05, // Heat halves every ~14 cycles
  referenceWeight: 0.2, // Each reference adds ~20% boost
  minHeat: 0.01, // Minimum heat before archival
  hotThreshold: 0.8, // Hot memory threshold
  warmThreshold: 0.4, // Warm memory threshold
};

function getBaseImportance(category: MemoryCategory): number {
  const importanceMap: Record<MemoryCategory, number> = {
    'cycle-state': 0.9,
    'active-work': 0.8,
    lesson: 0.7,
    adr: 0.7,
    'role-state': 0.6,
    metric: 0.5,
    historical: 0.3,
    archived: 0.1,
  };
  return importanceMap[category] ?? 0.5;
}
```

### 2.2 Heat State Transitions

```typescript
// packages/core/src/memory/state-machine.ts

export type HeatLevel = 'hot' | 'warm' | 'cold' | 'archived';

export interface HeatTransition {
  from: HeatLevel;
  to: HeatLevel;
  trigger: string;
  timestamp: Date;
}

export function getHeatLevel(heat: number, config: HeatConfig): HeatLevel {
  if (heat >= config.hotThreshold) return 'hot';
  if (heat >= config.warmThreshold) return 'warm';
  if (heat >= config.minHeat) return 'cold';
  return 'archived';
}

export function processHeatTransitions(
  items: MemoryItem[],
  currentCycle: number,
  config: HeatConfig
): HeatTransition[] {
  const transitions: HeatTransition[] = [];

  for (const item of items) {
    const oldLevel = item.heatLevel;
    const newHeat = calculateHeat(item, currentCycle, config);
    const newLevel = getHeatLevel(newHeat, config);

    if (oldLevel !== newLevel) {
      transitions.push({
        from: oldLevel,
        to: newLevel,
        trigger: oldLevel > newLevel ? 'decay' : 'reference',
        timestamp: new Date(),
      });

      // Update item
      item.heat = newHeat;
      item.heatLevel = newLevel;
    }
  }

  return transitions;
}
```

### 2.3 Reference Tracking

```typescript
// packages/core/src/memory/reference-tracker.ts

export interface Reference {
  sourceId: string; // ID of referencing item
  targetId: string; // ID of referenced item
  cycle: number; // Cycle when reference occurred
  type: ReferenceType; // How it was referenced
}

export type ReferenceType =
  | 'explicit' // Directly mentioned (e.g., "per L502")
  | 'semantic' // Retrieved via semantic search
  | 'structural' // Part of loaded context (e.g., Active Threads)
  | 'citation'; // Formal citation in output

/**
 * Track a reference to a memory item.
 * Automatically boosts heat score.
 */
export function trackReference(
  targetId: string,
  reference: Omit<Reference, 'targetId'>,
  store: MemoryStore
): void {
  // Record the reference
  store.addReference({ ...reference, targetId });

  // Boost heat based on reference type
  const boostMap: Record<ReferenceType, number> = {
    explicit: 0.15, // Strong boost for explicit mentions
    citation: 0.1, // Medium boost for citations
    semantic: 0.05, // Small boost for retrieval
    structural: 0.02, // Minimal boost for passive inclusion
  };

  const item = store.getItem(targetId);
  if (item) {
    item.referenceCount++;
    item.lastReferencedCycle = reference.cycle;
    item.heat = Math.min(1.0, item.heat + boostMap[reference.type]);
  }
}
```

---

## 3. Memory Storage Schema

### 3.1 TypeScript Types

```typescript
// packages/core/src/memory/types.ts

export interface MemoryItem {
  // Identity
  id: string; // UUID
  type: 'innate' | 'learned'; // Memory classification
  category: MemoryCategory; // Sub-classification

  // Content
  content: string; // The actual memory content
  embedding?: number[]; // Vector embedding (1536 dims)

  // Heat tracking
  heat: number; // Current heat score (0-1)
  heatLevel: HeatLevel; // Computed level
  referenceCount: number; // Total references
  lastReferencedCycle: number; // Most recent reference

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdByCycle: number;
  source: MemorySource; // Where this came from

  // Optional
  tags?: string[]; // Manual tags
  importanceScore?: number; // Manual importance override
  expiresAt?: Date; // Explicit expiration
}

export type MemoryCategory =
  | 'cycle-state' // Current cycle, recent actions
  | 'active-work' // Open issues, PRs, blockers
  | 'lesson' // Lessons learned (L1-Lxxx)
  | 'adr' // Architecture decisions
  | 'role-state' // Per-role state sections
  | 'metric' // Project metrics
  | 'historical' // Past cycles, closed work
  | 'archived'; // Compressed content

export interface MemorySource {
  type: 'bank' | 'file' | 'github' | 'cycle-output' | 'user-input';
  path?: string;
  issueNumber?: number;
  cycleNumber?: number;
}

export interface MemoryStore {
  // CRUD
  getItem(id: string): MemoryItem | undefined;
  getItems(filter: MemoryFilter): MemoryItem[];
  addItem(item: Omit<MemoryItem, 'id'>): MemoryItem;
  updateItem(id: string, updates: Partial<MemoryItem>): void;
  deleteItem(id: string): void;

  // Heat operations
  recalculateHeat(cycle: number): HeatTransition[];
  getByHeatLevel(level: HeatLevel): MemoryItem[];

  // Reference tracking
  addReference(ref: Reference): void;
  getReferences(targetId: string): Reference[];

  // Search
  semanticSearch(query: string, limit?: number): MemorySearchResult[];

  // Persistence
  save(): Promise<void>;
  load(): Promise<void>;
}
```

### 3.2 Database Schema (Prisma)

```prisma
// packages/core/prisma/schema.prisma (additions)

model MemoryItem {
  id                  String        @id @default(uuid())
  type                MemoryType    // INNATE or LEARNED
  category            String
  content             String        @db.Text
  embedding           Float[]       // Vector embedding

  // Heat tracking
  heat                Float         @default(0.5)
  heatLevel           HeatLevel     @default(WARM)
  referenceCount      Int           @default(0)
  lastReferencedCycle Int?

  // Metadata
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
  createdByCycle      Int?
  sourceType          String?
  sourcePath          String?

  // Optional
  tags                String[]
  importanceScore     Float?
  expiresAt           DateTime?

  // Relations
  tenant              Tenant        @relation(fields: [tenantId], references: [id])
  tenantId            String
  referencesFrom      Reference[]   @relation("ReferencesFrom")
  referencesTo        Reference[]   @relation("ReferencesTo")

  @@index([tenantId, heatLevel])
  @@index([tenantId, category])
  @@index([heat])
}

model Reference {
  id        String        @id @default(uuid())
  sourceId  String
  targetId  String
  cycle     Int
  type      ReferenceType
  timestamp DateTime      @default(now())

  source    MemoryItem    @relation("ReferencesFrom", fields: [sourceId], references: [id])
  target    MemoryItem    @relation("ReferencesTo", fields: [targetId], references: [id])

  @@index([targetId])
  @@index([cycle])
}

enum MemoryType {
  INNATE
  LEARNED
}

enum HeatLevel {
  HOT
  WARM
  COLD
  ARCHIVED
}

enum ReferenceType {
  EXPLICIT
  SEMANTIC
  STRUCTURAL
  CITATION
}
```

---

## 4. Memory Operations

### 4.1 Context Assembly

When building context for an LLM call, memory is assembled by heat level:

```typescript
// packages/core/src/memory/context-assembler.ts

export interface ContextAssemblyConfig {
  maxTokens: number; // Total context budget
  innateReserve: number; // % reserved for innate (e.g., 30%)
  hotReserve: number; // % reserved for hot (e.g., 40%)
  warmBudget: number; // % for warm retrieval (e.g., 25%)
  coldBudget: number; // % for explicit cold (e.g., 5%)
}

export async function assembleContext(
  query: string,
  store: MemoryStore,
  config: ContextAssemblyConfig
): Promise<AssembledContext> {
  const context: AssembledContext = {
    innate: [],
    hot: [],
    warm: [],
    cold: [],
    totalTokens: 0,
  };

  // 1. Always include innate memory (protected budget)
  const innateItems = store.getItems({ type: 'innate' });
  context.innate = innateItems;
  context.totalTokens += countTokens(innateItems);

  // 2. Include all hot memory (high priority)
  const hotItems = store.getByHeatLevel('hot');
  const hotBudget = config.maxTokens * config.hotReserve;
  context.hot = fitToBudget(hotItems, hotBudget);
  context.totalTokens += countTokens(context.hot);

  // 3. Semantic search for warm memory (query-relevant)
  const warmBudget = config.maxTokens * config.warmBudget;
  const warmResults = await store.semanticSearch(query, 20);
  const warmItems = warmResults
    .filter(r => r.item.heatLevel === 'warm')
    .map(r => r.item);
  context.warm = fitToBudget(warmItems, warmBudget);
  context.totalTokens += countTokens(context.warm);

  // 4. Cold memory only if explicitly requested
  // (handled separately via explicit retrieval commands)

  return context;
}
```

### 4.2 Automatic Decay

Run after each dispatch cycle to decay unused memories:

```typescript
// packages/core/src/memory/decay.ts

export async function runDecayCycle(
  store: MemoryStore,
  currentCycle: number,
  config: HeatConfig
): Promise<DecayReport> {
  const report: DecayReport = {
    cycle: currentCycle,
    processed: 0,
    transitioned: 0,
    archived: 0,
    transitions: [],
  };

  // Get all learned memory items
  const items = store.getItems({ type: 'learned' });
  report.processed = items.length;

  // Process heat transitions
  const transitions = processHeatTransitions(items, currentCycle, config);
  report.transitions = transitions;
  report.transitioned = transitions.length;

  // Archive items below minimum heat
  const toArchive = items.filter(i => i.heat < config.minHeat);
  for (const item of toArchive) {
    await archiveItem(store, item);
    report.archived++;
  }

  // Persist changes
  await store.save();

  return report;
}

async function archiveItem(
  store: MemoryStore,
  item: MemoryItem
): Promise<void> {
  // Move to cold storage with archived category
  store.updateItem(item.id, {
    category: 'archived',
    heatLevel: 'archived',
  });

  // Log for observability
  logger.info('Memory item archived', {
    itemId: item.id,
    previousHeat: item.heat,
    previousCategory: item.category,
    referenceCount: item.referenceCount,
  });
}
```

### 4.3 Memory Compression Integration

Connect to existing compression protocol (R-002):

```typescript
// packages/core/src/memory/compression.ts

export interface CompressionTrigger {
  type: 'size' | 'cycles' | 'sprint-end';
  threshold: number;
  current: number;
}

export function checkCompressionTriggers(
  store: MemoryStore,
  currentCycle: number,
  lastCompressionCycle: number
): CompressionTrigger | null {
  // Trigger 1: Size-based (>200 hot+warm items)
  const activeItems = store.getItems({
    heatLevel: ['hot', 'warm'],
  });
  if (activeItems.length > 200) {
    return { type: 'size', threshold: 200, current: activeItems.length };
  }

  // Trigger 2: Cycle-based (10+ cycles since last compression)
  const cyclesSince = currentCycle - lastCompressionCycle;
  if (cyclesSince >= 10) {
    return { type: 'cycles', threshold: 10, current: cyclesSince };
  }

  // Trigger 3: Sprint end (external signal)
  // Handled by dispatch system

  return null;
}

export async function compressMemory(
  store: MemoryStore,
  currentCycle: number
): Promise<CompressionResult> {
  // 1. Archive current state
  const snapshot = await createSnapshot(store, currentCycle);

  // 2. Compress cold items aggressively
  const coldItems = store.getByHeatLevel('cold');
  const compressed = await compressItems(coldItems);

  // 3. Summarize warm items that haven't been referenced in 5+ cycles
  const staleWarm = store.getItems({
    heatLevel: 'warm',
    lastReferencedCycle: { lt: currentCycle - 5 },
  });
  const summaries = await summarizeItems(staleWarm);

  // 4. Update store
  for (const item of coldItems) {
    store.deleteItem(item.id);
  }
  for (const summary of summaries) {
    store.addItem(summary);
  }

  return {
    snapshot,
    compressed: coldItems.length,
    summarized: staleWarm.length,
    newVersion: snapshot.version + 1,
  };
}
```

---

## 5. Integration Points

### 5.1 Dispatch Cycle Integration

```typescript
// packages/core/src/dispatch/cycle.ts (additions)

async function executeDispatchCycle(
  context: DispatchContext
): Promise<CycleResult> {
  const memoryStore = await loadMemoryStore(context.tenantId);

  // 1. PRE-CYCLE: Recalculate heat scores
  const heatReport = memoryStore.recalculateHeat(context.cycleNumber);

  // 2. CONTEXT ASSEMBLY: Build LLM context with heat-prioritized memory
  const memoryContext = await assembleContext(
    context.rolePlaybook,
    memoryStore,
    DEFAULT_CONTEXT_CONFIG
  );

  // 3. EXECUTE: Run dispatch with memory context
  const result = await executeWithMemory(context, memoryContext);

  // 4. POST-CYCLE: Track references and update heat
  await trackCycleReferences(result, memoryStore, context.cycleNumber);

  // 5. DECAY: Run decay cycle
  const decayReport = await runDecayCycle(
    memoryStore,
    context.cycleNumber,
    DEFAULT_HEAT_CONFIG
  );

  // 6. COMPRESSION CHECK
  const trigger = checkCompressionTriggers(
    memoryStore,
    context.cycleNumber,
    context.lastCompressionCycle
  );
  if (trigger) {
    await compressMemory(memoryStore, context.cycleNumber);
  }

  return result;
}
```

### 5.2 Observability Integration

Per C1076 (Platform Observability Spec), memory operations emit metrics:

```typescript
// Memory metrics (add to observability)
const MEMORY_METRICS = [
  {
    name: 'ada_memory_items_total',
    type: 'gauge',
    description: 'Total memory items by heat level',
    labels: ['tenant_id', 'heat_level', 'category'],
  },
  {
    name: 'ada_memory_heat_transitions_total',
    type: 'counter',
    description: 'Memory heat state transitions',
    labels: ['tenant_id', 'from', 'to'],
  },
  {
    name: 'ada_memory_references_total',
    type: 'counter',
    description: 'Memory references tracked',
    labels: ['tenant_id', 'reference_type'],
  },
  {
    name: 'ada_memory_compressions_total',
    type: 'counter',
    description: 'Memory compression operations',
    labels: ['tenant_id', 'trigger_type'],
  },
  {
    name: 'ada_memory_retrieval_latency_seconds',
    type: 'histogram',
    description: 'Memory semantic search latency',
    labels: ['tenant_id', 'heat_level'],
  },
];
```

### 5.3 CLI Integration

```bash
# Memory heat commands
ada memory heat                    # Show heat distribution
ada memory heat --item <id>        # Show item heat details
ada memory heat --decay            # Run manual decay cycle
ada memory heat --promote <id>     # Manually boost item heat

# Memory search with heat weighting
ada memory search "billing" --heat-weighted  # Weight results by heat
ada memory search "billing" --level hot      # Filter by heat level

# Memory stats
ada memory stats                   # Overall memory statistics
ada memory stats --heat            # Heat distribution breakdown
```

---

## 6. Migration Path

### 6.1 From Current bank.md

The current `agents/memory/bank.md` maps to the new system:

| bank.md Section | Memory Type | Category    | Initial Heat |
| --------------- | ----------- | ----------- | ------------ |
| Current Status  | Learned     | cycle-state | 0.9          |
| Role State      | Learned     | role-state  | 0.7          |
| Active Threads  | Learned     | active-work | 0.8          |
| Critical Path   | Learned     | active-work | 0.8          |
| Key Lessons     | Learned     | lesson      | 0.6          |
| Project Metrics | Learned     | metric      | 0.5          |
| Archives        | Learned     | archived    | 0.1          |

### 6.2 Migration Steps

1. **Parse existing bank.md** → Extract sections into MemoryItems
2. **Generate embeddings** → Create vector representations
3. **Calculate initial heat** → Based on category and recency
4. **Persist to new store** → Prisma/SQLite with vector extension
5. **Dual-write period** → Write to both bank.md and new store
6. **Cutover** → New store becomes primary, bank.md deprecated

---

## 7. Success Metrics

| Metric              | Target              | Measurement                |
| ------------------- | ------------------- | -------------------------- |
| Hallucination rate  | <5% reduction       | Manual audit of 100 cycles |
| Context efficiency  | 20% token reduction | Average context size       |
| Retrieval relevance | >80% precision@5    | Manual relevance scoring   |
| Heat accuracy       | >90% correlation    | Heat vs actual usefulness  |
| Compression ratio   | 3:1 cold → archive  | Size before/after          |

---

## 8. Implementation Phases

### Phase 1: Core Types & Heat Algorithm (Sprint 4, Week 1)

- [ ] TypeScript types for MemoryItem, HeatScore, Reference
- [ ] Heat calculation function with tests
- [ ] State transition logic
- [ ] Basic in-memory store

### Phase 2: Persistence & Migration (Sprint 4, Week 1-2)

- [ ] Prisma schema additions
- [ ] SQLite with vector extension setup
- [ ] bank.md parser and migrator
- [ ] Dual-write capability

### Phase 3: Integration (Sprint 4, Week 2)

- [ ] Context assembly with heat weighting
- [ ] Reference tracking in dispatch cycle
- [ ] Decay cycle integration
- [ ] Compression integration

### Phase 4: CLI & Observability (Sprint 4, Week 2-3)

- [ ] `ada memory heat` commands
- [ ] Memory metrics for observability
- [ ] Dashboard memory view

---

## Appendix: Design Decisions

### Why Not Full MemGPT?

MemGPT's paging system is powerful but adds complexity:

- Requires explicit "page in/out" operations
- More cognitive load on the agent
- Harder to debug memory state

Our approach is simpler:

- Heat scores handle prioritization automatically
- No explicit memory management needed
- Heat is observable and debuggable

### Why Separate Innate vs Learned?

Protection boundaries are crucial:

- Innate memory can't be corrupted by bad agent outputs
- Learned memory can be experimentally adjusted
- Clear ownership: humans control innate, agents control learned

### Why Reference-Based Heat?

Reference tracking creates a natural feedback loop:

- Useful memories get referenced → stay hot
- Useless memories aren't referenced → decay
- No manual curation needed
- Aligns with how humans remember (usage reinforces memory)

---

_This specification provides the foundation for Sprint 4 Cognitive Memory implementation. Engineering should review with Frontier before sprint start._
