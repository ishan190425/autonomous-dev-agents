# Sprint 2 Feature Architecture — Reflexion & Terminal Mode

> **Document Type:** Technical Architecture for arXiv Paper (Section 5 Supplement)  
> **Cycle:** C628 (Research)  
> **Date:** 2026-02-14 (~T+7h post-npm-live)  
> **Author:** 🔬 Research (The Scout)  
> **Related:** #131 (arXiv Paper), #108 (Reflexion), #125 (Terminal Mode)

---

## Abstract

This document captures the technical architecture of two major Sprint 2 features — **Reflexion Phase 2** and **Terminal Mode** — both marked FEATURE-COMPLETE as of C623. These implementations represent significant advances in ADA's autonomous learning and developer experience capabilities, contributing to Section 5 (Implementation) of the arXiv paper.

---

## 1. Reflexion Phase 2 Architecture

### 1.1 Theoretical Foundation

Reflexion Phase 2 implements pattern extraction from agent reflection history, based on Shinn et al. (2023) "Reflexion: Language Agents with Verbal Reinforcement Learning." The key insight: recurring patterns in agent reflections indicate emergent team wisdom that should be formalized.

**Core Hypothesis:** Self-critique patterns from autonomous agents, when clustered and analyzed, reveal actionable lessons that improve team performance over time.

### 1.2 Module Structure

```
packages/core/src/reflexion/
├── index.ts          # Public API (barrel export)
├── types.ts          # Type definitions (11 exported types)
├── keywords.ts       # TF-IDF keyword extraction
├── clusters.ts       # Jaccard similarity clustering
├── confidence.ts     # Pattern confidence scoring
└── patterns.ts       # Pattern detection + lesson generation
```

### 1.3 Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REFLEXION PIPELINE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │ Reflection      │───▶│ Keyword         │───▶│ Clustering      │          │
│  │ History         │    │ Extraction      │    │ (Jaccard)       │          │
│  │ (rotation.json) │    │ (TF-IDF)        │    │                 │          │
│  └─────────────────┘    └─────────────────┘    └────────┬────────┘          │
│                                                          │                   │
│                                                          ▼                   │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │ Lesson          │◀───│ Pattern         │◀───│ Confidence      │          │
│  │ Suggestions     │    │ Classification  │    │ Scoring         │          │
│  │ (bank.md ready) │    │                 │    │ (multi-factor)  │          │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Key Algorithms

#### 1.4.1 TF-IDF Keyword Extraction

```typescript
// Tokenization with stopword removal
const tokens = tokenize(text); // lowercase, alphanumeric only

// Term Frequency calculation
const tf = countTerms(tokens) / tokens.length;

// Inverse Document Frequency across all reflections
const idf = Math.log(totalDocs / docsContaining(term));

// Final score
const tfidf = tf * idf;
```

**Configuration:**

- `MAX_KEYWORDS_PER_REFLECTION`: 10
- `MIN_WORD_LENGTH`: 3
- Custom stopwords tuned for development context

#### 1.4.2 Jaccard Similarity Clustering

```typescript
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}
```

**Configuration:**

- `DEFAULT_SIMILARITY_THRESHOLD`: 0.3 (30% keyword overlap)
- `DEFAULT_MIN_CLUSTER_SIZE`: 3 (minimum reflections to form pattern)
- `DEFAULT_RECENT_WINDOW`: 50 (cycles to consider)

#### 1.4.3 Multi-Factor Confidence Scoring

```typescript
function calculateConfidence(cluster: ReflectionCluster): number {
  const factors = {
    frequency: cluster.size / config.recentWindow, // How often
    recency: calcRecencyScore(cluster.cycles), // How recent
    crossRole: isCrossRolePattern(cluster) ? 0.2 : 0, // Multi-role bonus
    consistency: calcConsistency(cluster.outcomes), // Outcome alignment
  };

  return weightedSum(factors, config.weights);
}
```

**Confidence Thresholds:**

- `≥ 0.8`: High confidence — auto-suggest as lesson
- `0.5-0.8`: Medium confidence — human review recommended
- `< 0.5`: Low confidence — pattern emerging, not yet actionable

### 1.5 CLI Integration

```bash
# View extracted patterns with confidence bars
ada reflexion patterns

# Interactive pattern review
ada reflexion suggest

# Formalize as lesson
ada reflexion accept <pattern-id>

# Dismiss pattern
ada reflexion reject <pattern-id>

# View distribution stats
ada reflexion stats
```

### 1.6 Test Coverage

- **Core tests:** 42 tests (keywords: 20, clusters: 12, confidence: 6, patterns: 4)
- **CLI tests:** 10 tests (all 5 commands × 2 scenarios each)

---

## 2. Terminal Mode Architecture

### 2.1 Purpose

Terminal Mode enables ADA agents to execute shell-based benchmarks and development commands during dispatch cycles, with output formatting, heat signal collection, and cycle tracking designed for autonomous operation.

**Core Hypothesis:** Shell command execution with structured heat signals enables agents to learn which development patterns are high-value ("hot") based on actual execution outcomes.

### 2.2 Module Structure

```
packages/core/src/terminal/
├── index.ts            # Public API (barrel export)
├── types.ts            # Type definitions (18 exported types)
├── shell-detector.ts   # Auto-detect bash/zsh/fish/powershell
├── signal-collector.ts # Per-cycle heat signal batching
├── heat-display.ts     # Tier-based visualization (█▇▆▅▃░)
├── formatter.ts        # UX-spec compliant output zones
└── executor.ts         # Command execution with streaming
```

### 2.3 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TERMINAL MODE PIPELINE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │ Shell           │───▶│ Command         │───▶│ Signal          │          │
│  │ Detector        │    │ Executor        │    │ Collector       │          │
│  │ (bash/zsh/fish) │    │ (spawn + stream)│    │ (per-cycle)     │          │
│  └─────────────────┘    └─────────────────┘    └────────┬────────┘          │
│                                                          │                   │
│                                                          ▼                   │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │ Cycle           │◀───│ Terminal        │◀───│ Heat            │          │
│  │ Summary         │    │ Formatter       │    │ Display         │          │
│  │ (bank.md)       │    │ (zones)         │    │ (tiers + bars)  │          │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Key Components

#### 2.4.1 Shell Detection

```typescript
async function detectShell(): Promise<ShellConfig> {
  // Check $SHELL environment variable
  const shell = process.env.SHELL || '/bin/bash';

  // Validate availability
  const type = getShellType(shell); // bash | zsh | fish | powershell
  const isValid = await validateShell(type);

  return { type, path: shell, isValid };
}
```

**Supported Shells:** bash, zsh, fish, powershell (Windows)

#### 2.4.2 Command Execution

```typescript
interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  signals: HeatSignal[]; // Extracted during execution
}

// Streaming execution for long-running commands
const executor = createCommandExecutor({
  shell: 'bash',
  timeout: 30000,
  onStdout: chunk => streamHandler(chunk),
  onStderr: chunk => errorHandler(chunk),
});
```

#### 2.4.3 Heat Signal Types

```typescript
type HeatSignalType =
  | 'test_pass' // ✓ Test passed
  | 'test_fail' // ✗ Test failed
  | 'lint_error' // ESLint/TypeScript error
  | 'build_success' // Compilation succeeded
  | 'build_failure' // Compilation failed
  | 'coverage_delta' // Coverage change (+/-)
  | 'perf_metric'; // Performance measurement
```

#### 2.4.4 Heat Display Tiers

```typescript
const HEAT_TIERS = {
  hot: { min: 0.8, icon: '🔥', bar: '██████████' },
  warm: { min: 0.6, icon: '🌡️', bar: '████████░░' },
  neutral: { min: 0.4, icon: '➖', bar: '██████░░░░' },
  cool: { min: 0.2, icon: '❄️', bar: '████░░░░░░' },
  cold: { min: 0.0, icon: '🧊', bar: '██░░░░░░░░' },
};
```

#### 2.4.5 Output Formatting (UX Spec C605)

```typescript
type OutputZone =
  | 'header' // Role + cycle info
  | 'command' // Command being executed
  | 'output' // stdout/stderr
  | 'heat' // Heat signal summary
  | 'summary'; // Cycle summary

const formatter = createTerminalFormatter({
  colorEnabled: shouldUseColor(),
  width: process.stdout.columns || 80,
});
```

### 2.5 CLI Integration

```bash
# Detect current shell
ada terminal detect

# Execute command with heat tracking
ada terminal exec "npm test"

# View cycle history with heat signals
ada terminal history

# Demo formatting preview
ada terminal demo
```

### 2.6 Test Coverage

- **Core tests:** 35 tests (shell-detector: 8, executor: 10, heat-display: 21, formatter: 6)
- **CLI tests:** 30 tests (all 4 subcommands with various scenarios)

---

## 3. Integration with Existing Architecture

### 3.1 Core Package Exports

Both features are exposed as subpath exports in `@ada-ai/core`:

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./reflexion": "./dist/reflexion/index.js",
    "./terminal": "./dist/terminal/index.js"
  }
}
```

**Usage:**

```typescript
import { extractPatterns } from '@ada-ai/core/reflexion';
import { detectShell, executeCommand } from '@ada-ai/core/terminal';
```

### 3.2 Memory Bank Integration

Both features contribute to the memory bank workflow:

| Feature       | Memory Bank Section | Contribution                  |
| ------------- | ------------------- | ----------------------------- |
| Reflexion     | Lessons Learned     | Auto-suggested lessons (L###) |
| Reflexion     | Role State          | Pattern extraction status     |
| Terminal Mode | Role State          | Command execution summaries   |
| Terminal Mode | Project Metrics     | Test counts, coverage deltas  |

### 3.3 Dispatch Protocol Integration

```bash
# Phase 4: Execute (with Terminal Mode)
ada terminal exec "npm test"

# Phase 8: Complete (with Reflexion)
ada dispatch complete \
  --action "..." \
  --reflection "What worked: [...]. Lesson: [...]"
```

---

## 4. Implementation Metrics

### 4.1 Code Statistics (as of C628)

| Metric           | Reflexion | Terminal Mode | Combined |
| ---------------- | --------- | ------------- | -------- |
| TypeScript LOC   | ~800      | ~1,200        | ~2,000   |
| Type definitions | 11 types  | 18 types      | 29 types |
| Core tests       | 42        | 35            | 77       |
| CLI tests        | 10        | 30            | 40       |
| **Total tests**  | **52**    | **65**        | **117**  |

### 4.2 Development Timeline

| Feature       | Spec (Design) | Core (Engineering) | CLI (Engineering/Frontier) | Total Cycles |
| ------------- | ------------- | ------------------ | -------------------------- | ------------ |
| Reflexion     | C469, C615    | C609               | C619                       | 4            |
| Terminal Mode | C605          | C613               | C623                       | 3            |

### 4.3 Quality Gates

Both features pass all quality gates:

- ✅ TypeCheck: 0 errors
- ✅ Lint: 0 errors, 2 warnings
- ✅ Test: All passing
- ✅ Core coverage: 89.07%

---

## 5. arXiv Paper Integration

### 5.1 Section 5 (Implementation) Additions

This document provides supplementary material for:

```markdown
### 5.X Reflexion Pattern Extraction

ADA implements Reflexion-style verbal reinforcement learning (Shinn et al. 2023)
adapted for multi-agent teams. Rather than single-agent self-improvement,
patterns emerge from cross-role reflection clustering...

### 5.Y Terminal Mode Integration

For benchmark execution and development workflow integration, ADA provides
shell-aware command execution with heat signal extraction. This enables
agents to learn which development patterns produce high-value outcomes...
```

### 5.2 Section 6 (Evaluation) Data Points

These features contribute evaluation claims:

- **Pattern extraction from 600+ cycles** — demonstrated learning capability
- **Cross-role pattern detection** — validates multi-agent knowledge synthesis
- **Heat signal tracking** — quantifiable development outcome metrics
- **Lesson formalization** — 297 lessons extracted via Reflexion methodology

---

## 6. Research Implications

### 6.1 Novel Contributions

1. **Multi-agent Reflexion:** Extending single-agent Reflexion (Shinn et al.) to team settings with cross-role pattern detection
2. **Heat-based Learning:** Using execution outcomes (tests, builds, coverage) as learning signals for autonomous agents
3. **Spec-to-Code Pipeline:** UX specifications (Design role) enabling rapid, consistent implementation (Engineering role)

### 6.2 Future Research Directions

- **Adaptive confidence thresholds:** Learning optimal pattern detection sensitivity over time
- **Heat-weighted scheduling:** Prioritizing actions based on predicted heat outcomes
- **Cross-repository pattern sharing:** Swarm learning from multiple ADA deployments (#104)

---

## References

- Shinn, N., et al. (2023). "Reflexion: Language Agents with Verbal Reinforcement Learning." _NeurIPS 2023._
- `docs/frontier/reflexion-phase2-impl-spec-c469.md` — Original implementation spec
- `docs/design/terminal-mode-ux-spec-c605.md` — Terminal Mode UX specification
- `docs/design/reflexion-cli-ux-spec-c615.md` — Reflexion CLI UX specification
- Issue #108 — Reflexion Research
- Issue #125 — Terminal Mode

---

_This architecture document captures Sprint 2 feature implementations at T+7h post-launch, providing technical detail for the arXiv paper's Implementation section._
