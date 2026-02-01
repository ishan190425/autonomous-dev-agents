# `ada run` Command Specification

> **Version:** 1.0 | **Author:** 📦 The PM | **Date:** 2026-02-01

## Overview

The `ada run` command executes autonomous development cycles using the configured agent team. This is the core command that brings ADA to life — where agents actually work on your project.

## User Stories

### Primary Use Cases

**As a solo developer, I want to run `ada run` so that my agent team performs one cycle of work on my project automatically.**

**As a team lead, I want to run `ada run --continuous` so that my agents work continuously while I focus on other tasks.**

**As an open source maintainer, I want to schedule `ada run` via cron so that my project gets maintained autonomously on a schedule.**

## Command Interface

```bash
# Execute one development cycle
ada run

# Run continuously (until interrupted)
ada run --continuous

# Run a specific number of cycles
ada run --cycles=5

# Run with specific agent focus
ada run --focus=engineering

# Dry run (show what would happen without executing)
ada run --dry-run

# Verbose output for debugging
ada run --verbose
```

## Flow Specification

### Single Cycle Mode (Default)

1. **Validation**
   - Verify `ada init` has been run (check for `.ada/` directory)
   - Validate agent configuration files exist
   - Check GitHub CLI authentication
   - Ensure working directory is clean (or warn about uncommitted changes)

2. **Dispatch Protocol Execution**
   - Load current rotation state from `.ada/state/rotation.json`
   - Execute the 7-phase protocol as defined in `DISPATCH.md`
   - Handle errors gracefully with rollback capabilities

3. **Output & Summary**
   - Display which role acted and what action was taken
   - Show key metrics (cycle count, issues created, PRs opened)
   - Suggest next steps if applicable

### Continuous Mode

```bash
ada run --continuous
```

- Execute cycles on an interval (default: 30 minutes)
- Respect GitHub API rate limits
- Graceful shutdown on `CTRL+C`
- Auto-pause if errors exceed threshold
- Log cycle summaries to `.ada/logs/`

### Focus Mode

```bash
ada run --focus=engineering
```

- Override normal rotation to prioritize specific role
- Useful for sprints or when specific expertise is needed
- Still follows role playbooks and rules

## Technical Architecture

### Implementation Strategy (per RES-001)

**Phase 1: Clawdbot Integration**
- Use Clawdbot session spawning for agent execution
- Leverage heartbeat protocol for dispatch cycles
- Shared memory coordination via `bank.md`
- Full GitHub tool access

**Phase 2: Direct LLM Optimization** (Future)
- Add direct API calls for performance-critical operations
- Maintain Clawdbot for complex multi-tool workflows
- Hybrid approach for optimal speed + capability

### Core Implementation

```typescript
// packages/cli/src/commands/run.ts
export async function runCommand(options: RunOptions): Promise<void> {
  // Validate environment
  await validateAdaProject();
  await validateGitHubAuth();
  
  // Load configuration
  const config = await loadAgentConfig();
  const rotation = await loadRotationState();
  
  if (options.continuous) {
    await runContinuous(config, rotation, options);
  } else {
    await runSingleCycle(config, rotation, options);
  }
}

async function runSingleCycle(config, rotation, options): Promise<CycleResult> {
  // Determine current agent role
  const currentRole = getCurrentRole(rotation, config.roster);
  
  // Spawn Clawdbot session for agent execution
  const session = await spawnAgentSession({
    role: currentRole,
    workingDirectory: process.cwd(),
    dispatchProtocol: config.dispatchProtocol,
    dryRun: options.dryRun
  });
  
  // Execute cycle and return result
  const result = await session.executeDispatchCycle();
  
  if (!options.dryRun) {
    await updateRotationState(result);
  }
  
  return result;
}
```

### Configuration Schema

```typescript
interface RunOptions {
  continuous?: boolean;
  cycles?: number;
  focus?: string; // Role ID to focus on
  dryRun?: boolean;
  verbose?: boolean;
  interval?: number; // Minutes between cycles (continuous mode)
}

interface CycleResult {
  cycleNumber: number;
  role: string;
  action: string;
  issuesCreated: number;
  prsCreated: number;
  errors: Error[];
  duration: number; // milliseconds
  nextRole: string;
}
```

## User Experience

### Success Flow

```bash
$ ada run
🏭 ADA Cycle 13 — 📦 Product Lead

✅ Phase 1: Context loaded (rotation, roster, rules, memory bank, product playbook)
✅ Phase 2: Situational awareness (2 open issues, 0 open PRs)
✅ Phase 3: Created Issue #4 — ada run command specification
✅ Phase 4: Memory bank updated with spec delivery
✅ Phase 5: Compression check (152 lines, no compression needed)
✅ Phase 6: Evolution check (8-role rotation effective)
✅ Phase 7: State updated (product → scrum rotation advance)

📊 Cycle complete: 47 seconds | Next role: 📋 Scrum Master

Issues: 3 (+1) | PRs: 0 | Cycles: 13 | Sprint: Foundation (Day 2/14)
```

### Error Handling

```bash
$ ada run
❌ Ada run failed: GitHub CLI not authenticated
💡 Run `gh auth login` to authenticate with GitHub

$ ada run
❌ Ada run failed: Working directory has uncommitted changes
💡 Commit your changes or run with `--force` to proceed anyway

$ ada run --continuous
🏭 Starting continuous mode (30min intervals)
✅ Cycle 13 complete — 📦 Product Lead
✅ Cycle 14 complete — 📋 Scrum Master
❌ Cycle 15 failed — ⚙️ Engineering (GitHub API limit exceeded)
⏸️  Pausing for 1 hour due to API limits...
```

## Acceptance Criteria

### MVP (Sprint 0)

- [ ] `ada run` executes single cycle successfully
- [ ] Validates environment before execution (ada init, gh auth)
- [ ] Follows 7-phase dispatch protocol from DISPATCH.md
- [ ] Updates rotation state correctly
- [ ] Displays clear cycle summary
- [ ] Handles common errors gracefully
- [ ] Integrates with Clawdbot for agent execution

### V2 Features

- [ ] `--continuous` mode with configurable intervals
- [ ] `--focus` mode for specific agent roles
- [ ] `--dry-run` for safe testing
- [ ] Cycle logging to `.ada/logs/`
- [ ] Performance metrics and timing
- [ ] GitHub API rate limit handling
- [ ] Auto-recovery from transient errors

### Success Metrics

- **Time to First Cycle:** < 5 seconds for `ada run`
- **Success Rate:** > 95% for valid repositories
- **User Satisfaction:** Clear, actionable output that builds confidence

## Dependencies

- **Blocker:** Issue #1 (LLM orchestration architecture) — ✅ RESOLVED
- **Dependency:** Engineering → implement based on this spec
- **Input:** Research RES-001 decision (Clawdbot integration approach)

## Implementation Timeline

- **Week 1:** Core single-cycle implementation with Clawdbot integration
- **Week 2:** Error handling, validation, and CLI polish
- **Week 3:** Continuous mode and advanced options
- **Week 4:** Testing with Social Trade POC customer

---

**Next Steps:**
1. Engineering → Implement core `ada run` command based on this spec
2. Ops → Add CI tests for command validation
3. Design → Review CLI output formatting and error messages

*This spec unblocks Engineering for core ADA functionality implementation.*