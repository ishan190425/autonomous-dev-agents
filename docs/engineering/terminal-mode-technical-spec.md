# ⚙️ Terminal Mode Technical Implementation Spec

> Engineering-focused implementation details for Terminal Mode based on Design's UX recommendations (C335).
> Bridges the gap between "what it should look like" and "how to build it."

**Created:** Cycle 339 (2026-02-10)
**Author:** 🌌 Frontier
**References:** `docs/design/sprint-2-open-questions-design-recommendations.md` (C335), Issue #125
**Replaces:** None (first technical spec)

---

## Overview

This document provides concrete implementation guidance for Terminal Mode based on Design's C335 UX recommendations. It includes:

1. Architecture decisions with code structure
2. Interface definitions
3. Implementation phases
4. Test requirements
5. Answers to emergent design questions

---

## Architecture

### Core Components

```
packages/core/src/terminal/
├── index.ts                 # Public API barrel export
├── shell-detector.ts        # Shell auto-detection logic
├── command-executor.ts      # Command execution with streaming
├── signal-collector.ts      # Heat signal batching
├── output-formatter.ts      # Real-time output formatting
├── session-manager.ts       # Terminal session lifecycle
└── types.ts                 # TypeScript interfaces

packages/cli/src/commands/dispatch/
├── terminal-mode.ts         # Terminal mode subcommand
└── terminal-ui.ts           # Terminal-specific UI rendering
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Terminal Mode Dispatch                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ ShellDetector│───▶│CommandExecutor│───▶│OutputFormatter│      │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                    │               │
│         ▼                   ▼                    ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ shell.config │    │SignalCollector│    │ stdout/stderr│       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                             │                                    │
│                             ▼                                    │
│                      ┌──────────────┐                           │
│                      │ HeatStorage  │ (at cycle complete)       │
│                      └──────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### 1. Shell Detector (`shell-detector.ts`)

**Design Recommendation:** Auto-detect with `--shell` override (C335 §2)

**Implementation:**

```typescript
// packages/core/src/terminal/shell-detector.ts

export interface ShellConfig {
  path: string;
  type: 'bash' | 'zsh' | 'sh';
  version?: string;
  detected: boolean; // true if auto-detected, false if user-specified
}

export interface ShellDetectorOptions {
  override?: string; // User-provided --shell flag
  fallback?: string; // Default: '/bin/bash'
}

export async function detectShell(
  options: ShellDetectorOptions = {}
): Promise<ShellConfig> {
  // 1. If override provided, validate and use it
  if (options.override) {
    return validateShell(options.override, false);
  }

  // 2. Check $SHELL environment variable
  const shellEnv = process.env.SHELL;
  if (shellEnv) {
    const shellType = getShellType(shellEnv);
    if (isSupported(shellType)) {
      return { path: shellEnv, type: shellType, detected: true };
    }
    // Warn and fall back for unsupported shells (fish, nushell, etc.)
    console.warn(`Unsupported shell: ${shellEnv}. Falling back to bash.`);
  }

  // 3. Fall back to /bin/bash
  const fallback = options.fallback || '/bin/bash';
  return validateShell(fallback, true);
}

function getShellType(path: string): 'bash' | 'zsh' | 'sh' | 'unknown' {
  if (path.includes('bash')) return 'bash';
  if (path.includes('zsh')) return 'zsh';
  if (path.endsWith('/sh')) return 'sh';
  return 'unknown';
}

function isSupported(type: string): type is 'bash' | 'zsh' | 'sh' {
  return ['bash', 'zsh', 'sh'].includes(type);
}

async function validateShell(
  path: string,
  detected: boolean
): Promise<ShellConfig> {
  // Verify shell exists and is executable
  const exists = await fileExists(path);
  if (!exists) {
    throw new TerminalError(`Shell not found: ${path}`);
  }

  const type = getShellType(path);
  if (type === 'unknown') {
    throw new TerminalError(`Unsupported shell type: ${path}`);
  }

  return { path, type, detected };
}
```

**Tests Required:**

- `detectShell()` returns $SHELL when set and supported
- `detectShell()` falls back to /bin/bash when $SHELL unset
- `detectShell()` warns and falls back for fish/nushell
- `detectShell({ override: '/bin/zsh' })` uses override
- `detectShell()` throws when shell path doesn't exist

---

### 2. Command Executor (`command-executor.ts`)

**Design Recommendation:** Real-time streaming with smart buffering (C335 §3)

**Implementation:**

```typescript
// packages/core/src/terminal/command-executor.ts

export interface ExecutionResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  truncated: boolean; // True if output exceeded limit
}

export interface ExecutionOptions {
  shell: ShellConfig;
  timeout?: number; // Default: 60000ms
  maxOutputLines?: number; // Default: 50
  maxOutputBytes?: number; // Default: 10240 (10KB)
  onStdout?: (line: string) => void;
  onStderr?: (line: string) => void;
  cwd?: string;
  env?: Record<string, string>;
}

export async function executeCommand(
  command: string,
  options: ExecutionOptions
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const {
    shell,
    timeout = 60000,
    maxOutputLines = 50,
    maxOutputBytes = 10240,
  } = options;

  const child = spawn(shell.path, ['-c', command], {
    cwd: options.cwd || process.cwd(),
    env: { ...process.env, ...options.env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const stdoutBuffer: string[] = [];
  const stderrBuffer: string[] = [];
  let totalBytes = 0;
  let truncated = false;

  // Real-time streaming with buffering
  const handleOutput = (
    stream: NodeJS.ReadableStream,
    buffer: string[],
    callback?: (line: string) => void
  ) => {
    let lineBuffer = '';

    stream.on('data', (chunk: Buffer) => {
      const data = chunk.toString();
      totalBytes += chunk.length;

      // Check byte limit
      if (totalBytes > maxOutputBytes && !truncated) {
        truncated = true;
        buffer.push(`[... output truncated at ${maxOutputBytes} bytes ...]`);
        callback?.(`[... output truncated at ${maxOutputBytes} bytes ...]`);
        return;
      }
      if (truncated) return;

      // Line-buffered streaming
      lineBuffer += data;
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (buffer.length < maxOutputLines) {
          buffer.push(line);
          callback?.(line);
        } else if (!truncated) {
          truncated = true;
          const remaining = maxOutputLines - buffer.length;
          buffer.push(`[... ${remaining} more lines truncated ...]`);
          callback?.(`[... ${remaining} more lines truncated ...]`);
        }
      }
    });
  };

  handleOutput(child.stdout, stdoutBuffer, options.onStdout);
  handleOutput(child.stderr, stderrBuffer, options.onStderr);

  // Wait for completion with timeout
  const exitCode = await new Promise<number>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      reject(
        new TerminalError(`Command timed out after ${timeout}ms: ${command}`)
      );
    }, timeout);

    child.on('close', code => {
      clearTimeout(timeoutId);
      resolve(code ?? 1);
    });

    child.on('error', err => {
      clearTimeout(timeoutId);
      reject(new TerminalError(`Command failed: ${err.message}`));
    });
  });

  return {
    command,
    exitCode,
    stdout: stdoutBuffer.join('\n'),
    stderr: stderrBuffer.join('\n'),
    durationMs: Date.now() - startTime,
    truncated,
  };
}
```

**Tests Required:**

- `executeCommand()` streams stdout in real-time via callback
- `executeCommand()` respects maxOutputLines truncation
- `executeCommand()` respects maxOutputBytes truncation
- `executeCommand()` times out and kills long-running commands
- `executeCommand()` returns correct exit codes
- `executeCommand()` handles stderr separately from stdout

---

### 3. Signal Collector (`signal-collector.ts`)

**Design Recommendation:** Per-cycle batching (C335 §1)

**Implementation:**

```typescript
// packages/core/src/terminal/signal-collector.ts

export interface HeatSignal {
  type: 'access' | 'success' | 'failure';
  entityId: string; // e.g., "agents/memory/bank.md#current-status"
  weight: number; // Signal strength (1.0 = default)
  timestamp: number; // Unix timestamp ms
  command?: string; // Command that triggered this signal
}

export interface CycleSummary {
  cycleId: number;
  startTime: number;
  endTime: number;
  commandsExecuted: number;
  commandsSucceeded: number;
  commandsFailed: number;
  signals: HeatSignal[];
}

export class SignalCollector {
  private signals: HeatSignal[] = [];
  private commandStats = { executed: 0, succeeded: 0, failed: 0 };
  private cycleId: number;
  private startTime: number;

  constructor(cycleId: number) {
    this.cycleId = cycleId;
    this.startTime = Date.now();
  }

  /**
   * Record a heat signal (collected during cycle, flushed at end)
   */
  record(signal: Omit<HeatSignal, 'timestamp'>): void {
    this.signals.push({
      ...signal,
      timestamp: Date.now(),
    });
  }

  /**
   * Record command completion
   */
  recordCommand(result: ExecutionResult): void {
    this.commandStats.executed++;
    if (result.exitCode === 0) {
      this.commandStats.succeeded++;
    } else {
      this.commandStats.failed++;
    }

    // Auto-generate heat signals based on command patterns
    this.inferSignalsFromCommand(result);
  }

  /**
   * Generate cycle summary for flush to heat storage
   */
  getSummary(): CycleSummary {
    return {
      cycleId: this.cycleId,
      startTime: this.startTime,
      endTime: Date.now(),
      commandsExecuted: this.commandStats.executed,
      commandsSucceeded: this.commandStats.succeeded,
      commandsFailed: this.commandStats.failed,
      signals: this.signals,
    };
  }

  /**
   * Infer heat signals from command patterns
   * E.g., "cat agents/memory/bank.md" → access signal for bank.md
   */
  private inferSignalsFromCommand(result: ExecutionResult): void {
    const { command, exitCode } = result;

    // File access patterns
    const filePatterns = [
      /cat\s+([^\s|>]+)/,
      /less\s+([^\s]+)/,
      /head\s+([^\s]+)/,
      /tail\s+([^\s]+)/,
      /vim?\s+([^\s]+)/,
    ];

    for (const pattern of filePatterns) {
      const match = command.match(pattern);
      if (match) {
        this.record({
          type: 'access',
          entityId: match[1],
          weight: 1.0,
          command,
        });
      }
    }

    // Git operations
    if (command.startsWith('git ')) {
      const type = exitCode === 0 ? 'success' : 'failure';
      this.record({
        type,
        entityId: 'git-operations',
        weight: exitCode === 0 ? 1.0 : -0.5,
        command,
      });
    }
  }
}
```

**Tests Required:**

- `SignalCollector.record()` adds signals with timestamp
- `SignalCollector.recordCommand()` updates command stats
- `SignalCollector.getSummary()` returns correct aggregation
- `inferSignalsFromCommand()` detects file access patterns
- `inferSignalsFromCommand()` handles git operations

---

### 4. Heat Storage (`heat-storage.ts`)

**Design Recommendation:** JSON files (C335 §4)

**Implementation:**

```typescript
// packages/core/src/heat/storage.ts

export interface HeatEntity {
  accessCount: number;
  successWeight: number;
  failureWeight: number;
  lastAccessMs: number;
  patternBonus: number;
  computed: number; // Final computed heat score
}

export interface HeatStore {
  version: 1;
  lastUpdated: string; // ISO timestamp
  entities: Record<string, HeatEntity>;
}

export interface HeatStorageOptions {
  basePath?: string; // Default: agents/memory/heat/
  decayRate?: number; // λ for exponential decay, default 0.1/hour
}

export class HeatStorage {
  private basePath: string;
  private decayRate: number;
  private stores: Map<string, HeatStore> = new Map();

  constructor(options: HeatStorageOptions = {}) {
    this.basePath = options.basePath || 'agents/memory/heat';
    this.decayRate = options.decayRate || 0.1; // Half-life ~7 hours
  }

  /**
   * Get heat score for an entity (applies decay)
   */
  async getHeat(category: string, entityId: string): Promise<number> {
    const store = await this.loadStore(category);
    const entity = store.entities[entityId];
    if (!entity) return 0;

    return this.computeHeat(entity);
  }

  /**
   * Apply heat signals from a cycle
   */
  async applySignals(category: string, signals: HeatSignal[]): Promise<void> {
    const store = await this.loadStore(category);

    for (const signal of signals) {
      const entity = store.entities[signal.entityId] || this.createEntity();

      entity.accessCount++;
      entity.lastAccessMs = signal.timestamp;

      switch (signal.type) {
        case 'success':
          entity.successWeight += signal.weight;
          break;
        case 'failure':
          entity.failureWeight += Math.abs(signal.weight);
          break;
        case 'access':
          // Access already counted
          break;
      }

      entity.computed = this.computeHeat(entity);
      store.entities[signal.entityId] = entity;
    }

    store.lastUpdated = new Date().toISOString();
    await this.saveStore(category, store);
  }

  /**
   * Compute heat score with exponential decay
   * heat(t) = base_heat * e^(-λt)
   */
  private computeHeat(entity: HeatEntity): number {
    const now = Date.now();
    const hoursSinceAccess = (now - entity.lastAccessMs) / (1000 * 60 * 60);

    // Base heat from access frequency and outcomes
    const baseHeat =
      entity.accessCount * 2 +
      entity.successWeight * 5 -
      entity.failureWeight * 3 +
      entity.patternBonus;

    // Apply exponential decay
    const decayFactor = Math.exp(-this.decayRate * hoursSinceAccess);

    // Normalize to 0-100 scale
    return Math.min(100, Math.max(0, baseHeat * decayFactor));
  }

  private createEntity(): HeatEntity {
    return {
      accessCount: 0,
      successWeight: 0,
      failureWeight: 0,
      lastAccessMs: Date.now(),
      patternBonus: 0,
      computed: 0,
    };
  }

  private getStorePath(category: string): string {
    return `${this.basePath}/${category}.heat.json`;
  }

  private async loadStore(category: string): Promise<HeatStore> {
    if (this.stores.has(category)) {
      return this.stores.get(category)!;
    }

    const path = this.getStorePath(category);
    try {
      const content = await fs.readFile(path, 'utf-8');
      const store = JSON.parse(content) as HeatStore;
      this.stores.set(category, store);
      return store;
    } catch {
      const store: HeatStore = {
        version: 1,
        lastUpdated: new Date().toISOString(),
        entities: {},
      };
      this.stores.set(category, store);
      return store;
    }
  }

  private async saveStore(category: string, store: HeatStore): Promise<void> {
    const path = this.getStorePath(category);
    await fs.mkdir(this.basePath, { recursive: true });
    await fs.writeFile(path, JSON.stringify(store, null, 2));
  }
}
```

**Tests Required:**

- `HeatStorage.getHeat()` returns 0 for unknown entities
- `HeatStorage.applySignals()` creates entities on first signal
- `HeatStorage.applySignals()` increments existing entities
- Exponential decay reduces heat over time
- Heat score is bounded 0-100
- JSON files are created in correct location

---

## Emergent Design Questions (Frontier Answers)

### Q1: Heat Visualization Language — Emoji vs Text?

**Answer: Hybrid approach with mode flag**

- **Default (TTY):** Use emoji (🔥🟡🟢❄️) — more scannable, modern CLI aesthetic
- **CI/Machine output:** Use text (HOT/WARM/COOL/COLD) — better for log parsing
- **JSON mode:** Use numeric (0-100) — machine-readable

**Implementation:**

```typescript
export type HeatDisplayMode = 'emoji' | 'text' | 'numeric';

export function formatHeatDisplay(
  score: number,
  mode: HeatDisplayMode
): string {
  if (mode === 'numeric') return score.toFixed(1);

  const thresholds = [
    { min: 80, emoji: '🔥', text: 'HOT' },
    { min: 50, emoji: '🟡', text: 'WARM' },
    { min: 20, emoji: '🟢', text: 'COOL' },
    { min: 0, emoji: '❄️', text: 'COLD' },
  ];

  const tier = thresholds.find(t => score >= t.min)!;
  return mode === 'emoji'
    ? `${tier.emoji} ${score.toFixed(0)}`
    : `${tier.text} (${score.toFixed(0)})`;
}
```

**CLI Flags:**

```bash
ada memory list --heat              # Auto-detect (emoji if TTY)
ada memory list --heat --text       # Force text mode
ada memory list --heat --json       # Numeric in JSON
```

---

### Q2: Benchmark Comparison UI — Multi-agent vs Single-agent?

**Answer: Side-by-side comparison table with delta indicators**

**Design:**

```
┌────────────────────────────────────────────────────────────────┐
│  Terminal-Bench Results Comparison                              │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Metric              Single-Agent    Multi-Agent    Delta      │
│  ─────────────────────────────────────────────────────────────  │
│  Tasks Completed     38/50 (76%)     44/50 (88%)    +12% ✓     │
│  Avg Time/Task       12.4s           8.2s           -34% ✓     │
│  Total Cost          $2.45           $3.12          +27% ✗     │
│  Error Rate          18%             8%             -10% ✓     │
│  Token Efficiency    1.2K/task       0.9K/task      -25% ✓     │
│                                                                 │
│  Overall Improvement: +21% (4/5 metrics improved)              │
│                                                                 │
│  Key Insight: Multi-agent parallelism reduced time but         │
│  increased cost due to coordination overhead.                   │
└────────────────────────────────────────────────────────────────┘
```

**Implementation Notes:**

- Use ANSI colors: green for improvements, red for regressions
- Calculate "Overall Improvement" as weighted average (configurable weights)
- Store comparison in benchmark results JSON for regression tracking

---

### Q3: Cost Tracking Granularity — Per-command or Per-task?

**Answer: Per-task with optional per-command breakdown**

**Rationale:**

- Per-task is the useful aggregation level for budgeting decisions
- Per-command is noise for most users, but valuable for debugging
- Store per-command, display per-task, drill-down available

**Data Structure:**

```typescript
export interface TaskCost {
  taskId: string;
  totalTokens: number;
  totalCostUsd: number;
  commands: CommandCost[]; // Per-command breakdown (stored, not displayed by default)
}

export interface CommandCost {
  command: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
}
```

**CLI Output:**

```bash
# Default: per-task summary
ada benchmark run terminal-bench --cost

Task                    Tokens      Cost
────────────────────────────────────────
file-navigation         2,450       $0.12
git-operations          4,890       $0.24
package-management      3,200       $0.16
...
Total                   52,340      $2.62

# Verbose: per-command breakdown
ada benchmark run terminal-bench --cost --verbose

Task: file-navigation ($0.12)
  Command: ls -la                    240 tokens   $0.01
  Command: cat README.md             1,200 tokens $0.06
  Command: find . -name "*.ts"       1,010 tokens $0.05
```

---

## Implementation Phases

### Phase 1: Core Shell Execution (Sprint 2, Week 1)

- [ ] Shell detector with auto-detection and override
- [ ] Command executor with real-time streaming
- [ ] Basic error handling and timeout
- [ ] Unit tests for all components

### Phase 2: Heat Signal Integration (Sprint 2, Week 1-2)

- [ ] Signal collector with per-cycle batching
- [ ] Heat storage with JSON persistence
- [ ] Exponential decay implementation
- [ ] Integration tests for signal flow

### Phase 3: CLI Integration (Sprint 2, Week 2)

- [ ] `ada dispatch --mode=terminal` command
- [ ] Real-time output formatting
- [ ] Heat visualization in `ada memory list --heat`
- [ ] E2E tests for terminal mode dispatch

### Phase 4: Benchmarks (Sprint 2, Week 3)

- [ ] Terminal-Bench adapter
- [ ] Cost tracking per-task
- [ ] Comparison UI
- [ ] Benchmark result persistence

---

## Test Coverage Requirements

| Component         | Unit Tests | Integration Tests | E2E Tests |
| ----------------- | ---------- | ----------------- | --------- |
| Shell Detector    | 5+         | 2                 | -         |
| Command Executor  | 8+         | 3                 | -         |
| Signal Collector  | 6+         | 2                 | -         |
| Heat Storage      | 8+         | 3                 | -         |
| Terminal Mode CLI | -          | 4                 | 2         |
| Benchmark Adapter | 4+         | 2                 | 1         |

**Minimum Coverage:** 80% line coverage for new code

---

## Dependencies

- Node.js `child_process` for command execution
- Existing `@ada/core` rotation and memory systems
- JSON file system (no new dependencies for storage)
- ANSI escape codes for terminal formatting (use existing `chalk` dependency)

---

## Migration Notes

- No breaking changes to existing commands
- Terminal mode is opt-in via `--mode=terminal` flag
- Heat storage creates new `agents/memory/heat/` directory (gitignored by default)
- Existing dispatch workflow unchanged when not using terminal mode

---

🌌 _The Frontier | Cycle 339_
