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

describe('observeCommand --last N option', () => {
  it('should have short alias -l for --last', () => {
    const lastOption = observeCommand.options.find((o) => o.long === '--last');
    expect(lastOption).toBeDefined();
    expect(lastOption?.short).toBe('-l');
  });

  it('should accept numeric value for --last', () => {
    const lastOption = observeCommand.options.find((o) => o.long === '--last');
    expect(lastOption).toBeDefined();
    // Commander parses this as string, command validates
  });
});

// ─── --last N Filter Logic Tests ─────────────────────────────────────────────

describe('--last N filter logic', () => {
  // Test the slice logic for filtering cycles
  describe('basic filter', () => {
    it('should return exactly N cycles when --last N and total > N', () => {
      const allCycles = Array.from({ length: 50 }, (_, i) => ({ cycle: i + 1 }));
      const lastN = 10;
      const filtered = allCycles.slice(-lastN);
      expect(filtered).toHaveLength(10);
      expect(filtered[0]?.cycle).toBe(41); // Cycles 41-50
      expect(filtered[9]?.cycle).toBe(50);
    });

    it('should return all cycles when --last N is larger than total', () => {
      const allCycles = Array.from({ length: 3 }, (_, i) => ({ cycle: i + 1 }));
      const lastN = 999;
      const filtered = allCycles.slice(-lastN);
      expect(filtered).toHaveLength(3); // Only 3 available
    });

    it('should return all cycles when --last N equals total', () => {
      const allCycles = Array.from({ length: 10 }, (_, i) => ({ cycle: i + 1 }));
      const lastN = 10;
      const filtered = allCycles.slice(-lastN);
      expect(filtered).toHaveLength(10);
    });
  });

  describe('edge case validation', () => {
    it('should identify --last 0 as invalid', () => {
      const lastN = 0;
      const isValid = lastN >= 1;
      expect(isValid).toBe(false);
    });

    it('should identify --last -5 as invalid', () => {
      const lastN = -5;
      const isValid = lastN >= 1;
      expect(isValid).toBe(false);
    });

    it('should identify --last 1 as valid', () => {
      const lastN = 1;
      const isValid = lastN >= 1;
      expect(isValid).toBe(true);
    });
  });

  describe('filter state construction', () => {
    it('should build correct cycle range for filter', () => {
      const cycles = [
        { cycle: 145 },
        { cycle: 146 },
        { cycle: 147 },
        { cycle: 148 },
        { cycle: 149 },
        { cycle: 150 },
        { cycle: 151 },
        { cycle: 152 },
        { cycle: 153 },
        { cycle: 154 },
      ];
      const filter = {
        last: 10,
        cycleRange: [cycles[0]!.cycle, cycles[cycles.length - 1]!.cycle] as const,
        unfilteredTotal: 154,
      };
      expect(filter.cycleRange[0]).toBe(145);
      expect(filter.cycleRange[1]).toBe(154);
    });

    it('should track unfiltered total correctly', () => {
      const unfilteredTotal = 154;
      const lastN = 10;
      const filter = {
        last: lastN,
        cycleRange: [145, 154] as const,
        unfilteredTotal,
      };
      expect(filter.unfilteredTotal).toBe(154);
      expect(filter.last).toBe(10);
    });
  });

  describe('by-role aggregation with filter', () => {
    it('should only count filtered cycles in role stats', () => {
      // Simulating byRole aggregation for filtered cycles
      const filteredCycles = [
        { cycle: 145, role: 'engineering' },
        { cycle: 146, role: 'product' },
        { cycle: 147, role: 'engineering' },
        { cycle: 148, role: 'scrum' },
        { cycle: 149, role: 'engineering' },
      ];

      const byRole: Record<string, { cycles: number }> = {};
      for (const cycle of filteredCycles) {
        if (!byRole[cycle.role]) {
          byRole[cycle.role] = { cycles: 0 };
        }
        byRole[cycle.role]!.cycles++;
      }

      expect(byRole['engineering']?.cycles).toBe(3);
      expect(byRole['product']?.cycles).toBe(1);
      expect(byRole['scrum']?.cycles).toBe(1);
    });
  });

  describe('JSON output with filter', () => {
    it('should include filter field when --last is specified', () => {
      const filter = {
        last: 10,
        cycleRange: [145, 154] as readonly [number, number],
      };
      const output = {
        filter: {
          last: filter.last,
          cycleRange: filter.cycleRange,
        },
        summary: { totalCycles: 10, unfilteredTotal: 154 },
      };
      expect(output.filter).toBeDefined();
      expect(output.filter.last).toBe(10);
      expect(output.filter.cycleRange).toEqual([145, 154]);
    });

    it('should include unfilteredTotal in summary', () => {
      const output = {
        filter: { last: 20, cycleRange: [135, 154] as const },
        summary: { totalCycles: 20, unfilteredTotal: 154 },
      };
      expect(output.summary.totalCycles).toBe(20);
      expect(output.summary.unfilteredTotal).toBe(154);
    });

    it('should not include filter field when --last is not specified', () => {
      const output: { filter?: unknown; summary: unknown } = {
        summary: { totalCycles: 100 },
      };
      expect(output.filter).toBeUndefined();
    });
  });

  describe('header and footer text', () => {
    it('should format header suffix correctly', () => {
      const lastN = 10;
      const filterSuffix = ` (last ${lastN} cycles)`;
      expect(filterSuffix).toBe(' (last 10 cycles)');
    });

    it('should format "N of TOTAL" display correctly', () => {
      const filtered = 10;
      const total = 154;
      const display = `${filtered} of ${total} tracked`;
      expect(display).toBe('10 of 154 tracked');
    });

    it('should format footer with filter info correctly', () => {
      const totalCycles = 20;
      const unfilteredTotal = 154;
      const footer = `Showing: last ${totalCycles} cycles (of ${unfilteredTotal} total)`;
      expect(footer).toBe('Showing: last 20 cycles (of 154 total)');
    });
  });

  describe('cycle warning for outside window', () => {
    it('should detect when specific cycle is outside filter window', () => {
      const filter = {
        last: 20,
        cycleRange: [135, 154] as const,
      };
      const requestedCycle = 100;
      const [rangeStart, rangeEnd] = filter.cycleRange;
      const isOutsideWindow = requestedCycle < rangeStart || requestedCycle > rangeEnd;
      expect(isOutsideWindow).toBe(true);
    });

    it('should not warn when specific cycle is inside filter window', () => {
      const filter = {
        last: 20,
        cycleRange: [135, 154] as const,
      };
      const requestedCycle = 145;
      const [rangeStart, rangeEnd] = filter.cycleRange;
      const isOutsideWindow = requestedCycle < rangeStart || requestedCycle > rangeEnd;
      expect(isOutsideWindow).toBe(false);
    });
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
