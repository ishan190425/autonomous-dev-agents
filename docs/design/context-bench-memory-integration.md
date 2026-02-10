# 🧠 Context-Bench Memory Integration Design

> Design specification for integrating Cognitive Memory and Heat Scoring with Context-Bench adapter
> **Author:** 🌌 The Frontier | **Cycle:** 309 | **Date:** 2026-02-10
> **Related Issues:** #90 (Benchmark Testing), #113 (Cognitive Memory), #118 (Heat Scoring)
> **Depends On:** `docs/research/context-bench-adapter-spec.md`, `docs/research/cognitive-memory-innate-learned-heat-scoring.md`
> **Status:** Design Specification | **Target:** Sprint 3 Week 3

---

## Executive Summary

This document bridges the Context-Bench adapter specification (Research C308) and the Cognitive Memory architecture (Research #113) by designing the concrete integration layer. It specifies:

1. **Heat signal generation** — What signals Context-Bench tasks emit during execution
2. **Memory integration layer** — How benchmark mode interacts with the memory system
3. **Cross-task learning** — Mechanisms for learning across benchmark tasks
4. **Optimization feedback loop** — How Frontier role monitors and optimizes during dispatch

**Key Design Principle:** Context-Bench tasks should _naturally_ generate heat signals that improve subsequent task performance, without benchmark-specific tuning that would constitute overfitting.

---

## 1. Heat Signal Generation

### 1.1 Signal Types

Context-Bench execution generates four types of heat signals:

| Signal Type        | When Generated                         | Heat Effect     | Memory Target              |
| ------------------ | -------------------------------------- | --------------- | -------------------------- |
| **Access Signal**  | File opened or searched                | +0.1 per access | File pattern memories      |
| **Success Signal** | Answer verified correct                | +0.3 to pathway | Retrieval path memories    |
| **Failure Signal** | Answer incorrect or incomplete         | -0.2 to pathway | Failed pattern memories    |
| **Pattern Signal** | Recurring entity relationship detected | +0.15 per match | Relationship type memories |

### 1.2 Signal Schema

```typescript
interface HeatSignal {
  signalId: string;
  taskId: string; // Context-Bench task ID
  signalType: 'access' | 'success' | 'failure' | 'pattern';
  timestamp: Date;

  // What generated the signal
  source: {
    role: 'research' | 'engineering' | 'qa' | 'frontier';
    action: string; // e.g., "grep_files", "verify_answer"
    target: string; // e.g., file path, entity name
  };

  // Heat modification
  heatDelta: number; // Positive or negative change
  targetMemoryIds: string[]; // Which memories to update

  // Context for learning
  context: {
    questionType?: string; // Multi-hop, entity-trace, etc.
    entityTypes?: string[]; // Person, project, pet, etc.
    relationshipType?: string; // owner, collaborator, etc.
    hopDepth?: number; // How many hops deep
  };
}
```

### 1.3 Signal Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Context-Bench Task Execution                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│   RESEARCH    │           │  ENGINEERING  │           │      QA       │
│   Planning    │           │   Execution   │           │  Verification │
└───────┬───────┘           └───────┬───────┘           └───────┬───────┘
        │                           │                           │
        │ Plan created              │ File accessed             │ Answer verified
        │ (Pattern Signal)          │ (Access Signal)           │ (Success/Failure)
        │                           │                           │
        ▼                           ▼                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Heat Signal Collector                         │
│  - Aggregates signals from all roles                                │
│  - Deduplicates within task                                         │
│  - Batches updates for efficiency                                   │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Memory Heat Updater                           │
│  - Applies heatDelta to target memories                             │
│  - Triggers tier transitions if thresholds crossed                  │
│  - Logs heat changes for analysis                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Memory Integration Layer

### 2.1 Benchmark Memory Namespace

Context-Bench tasks operate in an isolated namespace to prevent contamination:

```typescript
interface BenchmarkMemoryConfig {
  // Isolation settings
  namespace: 'benchmark:context-bench';
  inheritFromCore: boolean; // Whether to seed with core memories
  persistAfterBatch: boolean; // Keep memories between batches

  // Heat settings (tunable per experiment)
  heatParams: {
    alpha: number; // Reference weight exponent (default: 0.4)
    lambda: number; // Decay rate per task (default: 0.05)
    accessBoost: number; // Per-access heat boost (default: 0.1)
    successBoost: number; // Success verification boost (default: 0.3)
    failurePenalty: number; // Failure penalty (default: -0.2)
  };

  // What to track
  trackPatterns: boolean; // Learn relationship patterns
  trackPaths: boolean; // Remember successful retrieval paths
  trackFailures: boolean; // Remember what didn't work
}
```

### 2.2 Memory Types for Context-Bench

Extend Cognitive Memory types for benchmark-specific information:

```typescript
type BenchmarkMemoryType =
  | 'relationship-pattern' // e.g., "owner → pet → owner_of_pet"
  | 'retrieval-path' // Successful sequence of operations
  | 'entity-location' // Where to find entity types
  | 'failure-pattern' // Sequences that led to wrong answers
  | 'question-strategy'; // How to approach question types

interface BenchmarkMemory extends MemoryEntry {
  benchmarkType: BenchmarkMemoryType;

  // Specific to retrieval paths
  retrievalPath?: {
    steps: Array<{
      tool: 'open' | 'grep';
      pattern: string;
      expectedResult: string;
    }>;
    successRate: number; // 0.0 - 1.0
    avgHops: number;
  };

  // Specific to relationship patterns
  relationshipPattern?: {
    fromType: string; // e.g., "person"
    toType: string; // e.g., "project"
    viaType: string; // e.g., "ownership"
    reverseValid: boolean; // Can traverse backwards?
  };
}
```

### 2.3 Pre-Task Memory Loading

Before each Context-Bench task, the adapter loads relevant hot/warm memories:

```typescript
async function prepareTaskContext(
  task: ContextBenchTask
): Promise<TaskContext> {
  // 1. Identify likely question type from task structure
  const questionType = classifyQuestion(task.question);

  // 2. Load hot memories (always in context)
  const hotMemories = await memorySearch({
    namespace: 'benchmark:context-bench',
    minHeat: 0.8,
    limit: 10,
  });

  // 3. Load relevant warm memories based on question type
  const relevantWarm = await memorySearch({
    namespace: 'benchmark:context-bench',
    query: questionType,
    minHeat: 0.4,
    maxHeat: 0.8,
    limit: 5,
  });

  // 4. Build context window
  return {
    task,
    questionType,
    priorKnowledge: [...hotMemories, ...relevantWarm],
    tokenBudget: calculateTokenBudget(hotMemories, relevantWarm),
  };
}
```

---

## 3. Cross-Task Learning

### 3.1 Learning Phases

Context-Bench evaluation runs multiple tasks. Learning accumulates across phases:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BATCH START                                  │
│  Memory state: Clean (or seeded from prior batch if configured)     │
└─────────────────────────────────────┬───────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
        ┌─────────┐             ┌─────────┐             ┌─────────┐
        │ Task 1  │─────────────│ Task 2  │─────────────│ Task N  │
        │ Cold    │  Heat flows │ Warmer  │  Heat flows │ Hot     │
        │ Start   │ ──────────► │ Start   │ ──────────► │ Start   │
        └─────────┘             └─────────┘             └─────────┘
              │                       │                       │
              │ Signals               │ Signals               │ Signals
              ▼                       ▼                       ▼
        ┌─────────────────────────────────────────────────────────────┐
        │                    ACCUMULATED MEMORY                        │
        │  Task 1: +3 memories, baseline heat                         │
        │  Task 2: +2 memories, Task 1 patterns warming               │
        │  Task N: Rich memory, patterns are hot                      │
        └─────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │  BATCH END    │
                              │  Export stats │
                              └───────────────┘
```

### 3.2 Pattern Detection

After each task, detect reusable patterns:

```typescript
interface PatternDetection {
  // Triggered when similar retrieval paths succeed multiple times
  detectRetrievalPatterns(
    successfulPaths: RetrievalPath[],
    threshold: number // Minimum occurrences to become a pattern
  ): RelationshipPattern[];

  // Triggered when same entity types appear across tasks
  detectEntityPatterns(
    entityAccesses: EntityAccess[],
    threshold: number
  ): EntityLocationPattern[];

  // Triggered when question structures repeat
  detectQuestionPatterns(
    questions: string[],
    threshold: number
  ): QuestionStrategyPattern[];
}

// Run after each task
async function postTaskLearning(
  task: ContextBenchTask,
  result: TaskResult
): Promise<void> {
  const signals = collectSignals(task, result);

  // Apply immediate heat updates
  await applyHeatSignals(signals);

  // Detect new patterns (runs every 5 tasks to batch)
  if (shouldRunPatternDetection(task.index)) {
    const patterns = await detectPatterns();
    await storeNewPatterns(patterns);
  }

  // Log learning metrics
  await logLearningMetrics(task.id, signals.length, patterns.length);
}
```

### 3.3 Learning Metrics

Track cross-task learning effectiveness:

```typescript
interface LearningMetrics {
  taskId: string;
  taskIndex: number;

  // Memory state at task start
  memoryAtStart: {
    hotCount: number;
    warmCount: number;
    coldCount: number;
    totalPatterns: number;
  };

  // Memory state at task end
  memoryAtEnd: {
    hotCount: number;
    warmCount: number;
    coldCount: number;
    totalPatterns: number;
    newPatterns: number;
    heatedMemories: number;
    cooledMemories: number;
  };

  // Performance impact
  performance: {
    accuracy: boolean;
    cyclesUsed: number;
    tokensUsed: number;
    retrievalEfficiency: number; // Useful info / total tokens
  };

  // Learning signal
  learningContribution: number; // How much this task contributed to memory
}
```

---

## 4. Frontier Optimization Role

### 4.1 Optimization Actions During Dispatch

Per the Context-Bench adapter spec, Frontier's role during dispatch is "optimization":

```typescript
interface FrontierOptimizationActions {
  // Monitor token consumption in real-time
  monitorTokens(currentUsage: number, budget: number): TokenAlert | null;

  // Suggest cheaper alternatives when appropriate
  suggestCheaperTool(
    currentPlan: RetrievalStep[],
    memoryHeat: MemoryHeat[]
  ): ToolSuggestion | null;

  // Track context window utilization
  trackContextUtilization(
    contextSize: number,
    usefulInfo: number
  ): UtilizationMetric;

  // Log efficiency metrics for learning
  logEfficiencyMetrics(taskId: string, metrics: EfficiencyMetrics): void;
}
```

### 4.2 Optimization Heuristics

```typescript
const OPTIMIZATION_HEURISTICS = {
  // When to suggest grep over open
  preferGrep: {
    condition: 'Looking for specific pattern in large file',
    heuristic: (fileSize: number, patternSpecificity: number) =>
      fileSize > 1000 && patternSpecificity > 0.7,
  },

  // When to use hot memory instead of re-reading
  useHotMemory: {
    condition: 'Information already in hot memory',
    heuristic: (query: string, hotMemories: Memory[]) =>
      hotMemories.some(m => semanticMatch(m.content, query) > 0.85),
  },

  // When to abort and submit best attempt
  abortThreshold: {
    condition: 'Token budget nearly exhausted with no answer',
    heuristic: (tokensRemaining: number, hasCandidate: boolean) =>
      tokensRemaining < 500 && hasCandidate,
  },

  // When to skip verification (risky, use sparingly)
  skipVerification: {
    condition: 'High-confidence answer from hot retrieval path',
    heuristic: (pathConfidence: number, timeRemaining: number) =>
      pathConfidence > 0.95 && timeRemaining < 0.2,
  },
};
```

### 4.3 Real-Time Dashboard Signals

Frontier emits signals for the optimization dashboard:

```typescript
interface OptimizationDashboardSignal {
  taskId: string;
  cycle: number;
  role: string;

  // Current state
  tokensUsed: number;
  tokenBudget: number;
  cyclesUsed: number;
  maxCycles: number;

  // Memory utilization
  hotMemoriesLoaded: number;
  warmMemoriesLoaded: number;
  memoryHitRate: number; // How often memory helped

  // Efficiency scores
  retrievalEfficiency: number; // 0.0 - 1.0
  tokenEfficiency: number; // Useful info per token
  pathOptimality: number; // How close to optimal path

  // Alerts
  alerts: Array<{
    type: 'token_warning' | 'inefficient_retrieval' | 'missed_memory';
    message: string;
    suggestion: string;
  }>;
}
```

---

## 5. Configuration Schema

### 5.1 CLI Integration

Extend `--mode=context` with memory options:

```bash
ada dispatch --mode=context \
             --headless \
             --max-cycles=5 \
             --input=question.json \
             --data-dir=./files/ \
             --output=answer.json \
             --export-metrics=metrics.json \
             # Memory integration options
             --memory-learning=on \
             --memory-persist=batch \
             --heat-alpha=0.4 \
             --heat-lambda=0.05 \
             --pattern-threshold=3
```

### 5.2 Config File

```yaml
# ada.config.yaml - Context-Bench memory settings
benchmark:
  context-bench:
    memory:
      enabled: true
      namespace: 'benchmark:context-bench'
      persist: 'batch' # batch | session | none
      inheritFromCore: false # Start fresh for clean evaluation

    heat:
      alpha: 0.4 # Reference weight exponent
      lambda: 0.05 # Decay rate per task
      accessBoost: 0.1
      successBoost: 0.3
      failurePenalty: -0.2

    learning:
      detectPatterns: true
      patternThreshold: 3 # Min occurrences to become pattern
      detectEvery: 5 # Run detection every N tasks

    optimization:
      enableFrontierRole: true
      tokenWarningPercent: 80 # Warn at 80% budget
      abortThreshold: 95 # Abort at 95% budget
```

---

## 6. Evaluation Metrics

### 6.1 Memory-Specific Metrics

In addition to Context-Bench standard metrics, track:

| Metric                  | Description                                   | Target       |
| ----------------------- | --------------------------------------------- | ------------ |
| **Memory Hit Rate**     | % of retrievals aided by prior memory         | > 60% by end |
| **Pattern Accuracy**    | % of patterns that improve performance        | > 80%        |
| **Heat Convergence**    | Cycles until hot memories stabilize           | < 10 tasks   |
| **Learning Curve**      | Accuracy improvement from task 1 to task N    | +10-15%      |
| **Memory Efficiency**   | Useful memories / total memories created      | > 70%        |
| **Cross-Task Transfer** | Performance on task N using only prior memory | > baseline   |

### 6.2 A/B Test Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                      EXPERIMENT DESIGN                               │
└─────────────────────────────────────────────────────────────────────┘

Condition A: Memory Learning OFF
- Fresh state for each task
- No pattern detection
- Baseline single-task performance

Condition B: Memory Learning ON (default params)
- Accumulating heat scores
- Pattern detection enabled
- Full cross-task learning

Condition C: Memory Learning ON (optimized params)
- Tuned heat parameters
- Optimized pattern thresholds
- Best configuration from Phase 3 tuning

Metrics: Accuracy, Cost, Cycles, Learning Curve
Tasks: Full Context-Bench suite (100+ tasks)
Runs: 3 per condition for statistical significance
```

---

## 7. Implementation Phases

### Phase 1: Core Infrastructure (Sprint 3, Week 1-2)

Engineering owns, Frontier supports:

- [ ] Heat signal collector implementation
- [ ] Benchmark memory namespace
- [ ] Pre-task memory loading
- [ ] Post-task signal application

### Phase 2: Learning System (Sprint 3, Week 2-3)

Frontier owns:

- [ ] Pattern detection algorithms
- [ ] Cross-task learning loop
- [ ] Learning metrics collection
- [ ] Memory persistence options

### Phase 3: Optimization Layer (Sprint 3, Week 3)

Frontier owns:

- [ ] Real-time optimization heuristics
- [ ] Dashboard signals
- [ ] Token efficiency monitoring
- [ ] Tool suggestion system

### Phase 4: Evaluation (Sprint 3, Week 3-4)

QA owns, Research analyzes:

- [ ] A/B test infrastructure
- [ ] Run full experiment suite
- [ ] Statistical analysis
- [ ] Parameter tuning recommendations

---

## 8. Open Questions for Engineering

1. **Signal batching:** Should heat signals batch per-task or per-cycle? (Trade-off: latency vs efficiency)

2. **Pattern storage:** Where do patterns live? Inline in memory entries or separate pattern table?

3. **Memory budget:** Hard limit on benchmark memory size? (Prevent unbounded growth)

4. **Cold memory access:** During benchmark, should cold memories be accessible at all? (Purity of evaluation)

5. **Parallelization:** If running multiple tasks in parallel, how to handle concurrent heat updates?

---

## 9. References

### Internal Documents

- `docs/research/context-bench-adapter-spec.md` — Adapter architecture (Research C308)
- `docs/research/cognitive-memory-innate-learned-heat-scoring.md` — Memory architecture (Research #113)
- `docs/design/terminal-failure-recovery.md` — Recovery patterns (Frontier C299)

### Issues

- #90 — Benchmark Testing (parent)
- #113 — Cognitive Memory Architecture
- #118 — Heat Scoring Implementation

---

_🌌 The Frontier | Cycle 309 | Context-Bench Memory Integration Design_
_"Memory isn't just storage — it's the substrate for learning."_
