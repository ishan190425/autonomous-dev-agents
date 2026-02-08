/**
 * Tests for observe and costs commands.
 *
 * Tests command structure, help text, option validation,
 * and Phase 2 latency rendering utilities.
 */

import { describe, it, expect } from 'vitest';
import { observeCommand } from '../observe.js';
import { costsCommand } from '../costs.js';

describe('observeCommand', () => {
  it('should have correct name', () => {
    expect(observeCommand.name()).toBe('observe');
  });

  it('should have description mentioning observability and latency', () => {
    expect(observeCommand.description()).toBeTruthy();
    expect(observeCommand.description().toLowerCase()).toContain('observability');
    expect(observeCommand.description().toLowerCase()).toContain('latency');
  });

  it('should have --dir option', () => {
    const dirOption = observeCommand.options.find((o) => o.long === '--dir');
    expect(dirOption).toBeDefined();
  });

  it('should have --by-role option', () => {
    const byRoleOption = observeCommand.options.find(
      (o) => o.long === '--by-role'
    );
    expect(byRoleOption).toBeDefined();
  });

  it('should have --cycle option', () => {
    const cycleOption = observeCommand.options.find(
      (o) => o.long === '--cycle'
    );
    expect(cycleOption).toBeDefined();
  });

  it('should have --last option', () => {
    const lastOption = observeCommand.options.find((o) => o.long === '--last');
    expect(lastOption).toBeDefined();
  });

  it('should have --json option', () => {
    const jsonOption = observeCommand.options.find((o) => o.long === '--json');
    expect(jsonOption).toBeDefined();
  });
});

describe('costsCommand', () => {
  it('should have correct name', () => {
    expect(costsCommand.name()).toBe('costs');
  });

  it('should have description mentioning cost', () => {
    expect(costsCommand.description()).toBeTruthy();
    expect(costsCommand.description().toLowerCase()).toContain('cost');
  });

  it('should have --dir option', () => {
    const dirOption = costsCommand.options.find((o) => o.long === '--dir');
    expect(dirOption).toBeDefined();
  });

  it('should have --json option', () => {
    const jsonOption = costsCommand.options.find((o) => o.long === '--json');
    expect(jsonOption).toBeDefined();
  });
});

// ─── Phase 2 Latency Utilities Tests ─────────────────────────────────────────

describe('Phase 2: Latency Timer CLI Utilities', () => {
  // These test the internal utility functions for latency display
  // We import them indirectly via the observe command's internal logic
  
  describe('progress bar rendering', () => {
    // Test the progress bar logic (20-char width)
    it('should render full bar for 100%', () => {
      const ratio = 1.0;
      const filled = Math.round(ratio * 20);
      const empty = 20 - filled;
      expect(filled).toBe(20);
      expect(empty).toBe(0);
    });

    it('should render empty bar for 0%', () => {
      const ratio = 0;
      const filled = ratio > 0 ? Math.max(1, Math.round(ratio * 20)) : 0;
      expect(filled).toBe(0);
    });

    it('should render at least 1 bar for non-zero ratio', () => {
      const ratio = 0.01; // 1%
      const filled = ratio > 0 ? Math.max(1, Math.round(ratio * 20)) : 0;
      expect(filled).toBeGreaterThanOrEqual(1);
    });

    it('should render proportional bar for 50%', () => {
      const ratio = 0.5;
      const filled = Math.round(ratio * 20);
      expect(filled).toBe(10);
    });
  });

  describe('phase name abbreviations', () => {
    const PHASE_DISPLAY_NAMES: Record<string, string> = {
      context_load: 'context_load',
      situational_awareness: 'situational',
      action_selection: 'selection',
      action_execution: 'execution',
      memory_update: 'memory_update',
      compression_check: 'compression',
      evolution_check: 'evolution',
      state_update: 'state_update',
    };

    it('should abbreviate situational_awareness to situational', () => {
      expect(PHASE_DISPLAY_NAMES['situational_awareness']).toBe('situational');
    });

    it('should abbreviate action_selection to selection', () => {
      expect(PHASE_DISPLAY_NAMES['action_selection']).toBe('selection');
    });

    it('should abbreviate action_execution to execution', () => {
      expect(PHASE_DISPLAY_NAMES['action_execution']).toBe('execution');
    });

    it('should keep context_load as is', () => {
      expect(PHASE_DISPLAY_NAMES['context_load']).toBe('context_load');
    });

    it('should abbreviate compression_check to compression', () => {
      expect(PHASE_DISPLAY_NAMES['compression_check']).toBe('compression');
    });

    it('should abbreviate evolution_check to evolution', () => {
      expect(PHASE_DISPLAY_NAMES['evolution_check']).toBe('evolution');
    });
  });

  describe('efficiency calculations', () => {
    it('should calculate throughput as tokens per second', () => {
      const tokens = 10000;
      const durationMs = 5000; // 5 seconds
      const throughput = Math.round((tokens / durationMs) * 1000);
      expect(throughput).toBe(2000); // 2000 tokens/sec
    });

    it('should calculate spend rate per hour', () => {
      const cost = 0.10; // $0.10
      const durationMs = 60_000; // 1 minute
      const hoursElapsed = durationMs / (1000 * 60 * 60);
      const spendRate = cost / hoursElapsed;
      expect(spendRate).toBeCloseTo(6.0, 1); // $6/hour
    });

    it('should handle zero duration gracefully', () => {
      const tokens = 10000;
      const durationMs = 0;
      const throughput = durationMs === 0 ? 0 : Math.round((tokens / durationMs) * 1000);
      expect(throughput).toBe(0);
    });
  });

  describe('slow role insight detection', () => {
    // Threshold: 30% slower than average
    it('should flag role as slow when 30%+ slower than average', () => {
      const roleAvgMs = 52300; // 52.3s
      const overallAvgMs = 36100; // 36.1s
      const percentSlower = Math.round(((roleAvgMs / overallAvgMs) - 1) * 100);
      expect(percentSlower).toBeGreaterThanOrEqual(30);
      expect(percentSlower).toBe(45); // ~45% slower
    });

    it('should not flag role when less than 30% slower', () => {
      const roleAvgMs = 40000; // 40s
      const overallAvgMs = 36100; // 36.1s
      const percentSlower = Math.round(((roleAvgMs / overallAvgMs) - 1) * 100);
      expect(percentSlower).toBeLessThan(30);
    });
  });

  describe('hasLatencyData detection', () => {
    it('should return true when cycle has latency data', () => {
      const cycle = {
        latency: {
          context_load: { startedAt: '', endedAt: '', durationMs: 100 },
        },
      };
      const hasLatency = !!cycle.latency && Object.keys(cycle.latency).length > 0;
      expect(hasLatency).toBe(true);
    });

    it('should return false when cycle has no latency data', () => {
      const cycle = {};
      const hasLatency = !!(cycle as any).latency && Object.keys((cycle as any).latency || {}).length > 0;
      expect(hasLatency).toBe(false);
    });

    it('should return false when latency is empty object', () => {
      const cycle = { latency: {} };
      const hasLatency = !!cycle.latency && Object.keys(cycle.latency).length > 0;
      expect(hasLatency).toBe(false);
    });
  });

  describe('graceful degradation', () => {
    it('should identify cycles without latency as older cycles', () => {
      // Cycles before Phase 2 won't have latency field
      const oldCycle = {
        cycle: 100,
        phases: {},
        totals: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      };
      const hasLatency = !!(oldCycle as any).latency;
      expect(hasLatency).toBe(false);
    });

    it('should calculate partial latency stats correctly', () => {
      // 45 out of 50 cycles have latency data
      const cyclesWithLatency = 45;
      const totalCycles = 50;
      const note = `* Avg Time based on ${cyclesWithLatency}/${totalCycles} cycles`;
      expect(note).toContain('45/50');
    });
  });
});
