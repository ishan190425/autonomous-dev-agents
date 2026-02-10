/**
 * Tests for dispatch observability integration.
 *
 * Issue #83 — Dogfooding: Use ADA to develop ADA CLI
 * C349 — Observability Dispatch Integration Spec
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

describe('Dispatch Observability Integration', () => {
  let tmpDir: string;

  beforeEach(async () => {
    // Create a temp directory for test fixtures
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ada-dispatch-obs-'));
    
    // Set up minimal agent state
    const agentsDir = path.join(tmpDir, 'agents');
    await fs.mkdir(path.join(agentsDir, 'state'), { recursive: true });
    await fs.mkdir(path.join(agentsDir, 'memory'), { recursive: true });
    await fs.mkdir(path.join(agentsDir, 'playbooks'), { recursive: true });
    
    // Write rotation.json
    await fs.writeFile(
      path.join(agentsDir, 'state', 'rotation.json'),
      JSON.stringify({
        current_index: 0,
        last_role: 'test',
        last_run: new Date().toISOString(),
        cycle_count: 100,
        history: [],
        next_role_title: '⚙️ engineering',
      }, null, 2)
    );
    
    // Write roster.json
    await fs.writeFile(
      path.join(agentsDir, 'roster.json'),
      JSON.stringify({
        company: 'Test',
        product: 'Test Product',
        tagline: 'Testing',
        roles: [
          { id: 'engineering', name: 'Engineering', title: 'Engineer', emoji: '⚙️', focus: [], actions: [] },
        ],
        rotation_order: ['engineering'],
      }, null, 2)
    );
    
    // Write minimal memory bank
    await fs.writeFile(
      path.join(agentsDir, 'memory', 'bank.md'),
      '# Memory Bank\n**Version:** 1\n**Cycle:** 100'
    );
    
    // Write playbook
    await fs.writeFile(
      path.join(agentsDir, 'playbooks', 'engineering.md'),
      '# Engineering Playbook\n'
    );
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should accept --tokens-in and --tokens-out flags', async () => {
    // This test verifies the CLI accepts the observability flags
    // The actual parsing is handled by Commander.js
    const { dispatchCommand } = await import('../src/commands/dispatch.js');
    
    // Get the complete subcommand
    const completeCmd = dispatchCommand.commands.find(c => c.name() === 'complete');
    expect(completeCmd).toBeDefined();
    if (!completeCmd) throw new Error('complete command not found');
    
    // Check that the options exist
    const options = completeCmd.options;
    expect(options.find(o => o.long === '--tokens-in')).toBeDefined();
    expect(options.find(o => o.long === '--tokens-out')).toBeDefined();
    expect(options.find(o => o.long === '--model')).toBeDefined();
  });

  it('should record metrics when tokens are provided', async () => {
    // This test would require mocking the git operations
    // and verifying metrics.json is created
    // For now, we verify the types and imports are correct
    
    const { createCycleTracker } = await import('@ada/core');
    
    // Verify the factory functions exist and work
    const tracker = createCycleTracker(101, 'engineering', 'claude-4-sonnet');
    expect(tracker).toBeDefined();
    
    // Record some test tokens
    tracker.recordPhase('action_execution', 1000, 500);
    
    // Finalize
    const metrics = tracker.finalize(true);
    
    expect(metrics.cycle).toBe(101);
    expect(metrics.role).toBe('engineering');
    expect(metrics.model).toBe('claude-4-sonnet');
    expect(metrics.totals.inputTokens).toBe(1000);
    expect(metrics.totals.outputTokens).toBe(500);
    expect(metrics.totals.totalTokens).toBe(1500);
    expect(metrics.success).toBe(true);
    expect(metrics.cost).toBeDefined();
    expect(metrics.cost.totalCost).toBeGreaterThan(0);
  });

  it('should create metrics.json when manager records metrics', async () => {
    const { createCycleTracker, createMetricsManager } = await import('@ada/core');
    
    // Create tracker and metrics
    const tracker = createCycleTracker(101, 'engineering', 'claude-4-sonnet');
    tracker.recordPhase('action_execution', 2000, 800);
    const metrics = tracker.finalize(true);
    
    // Create manager pointing to temp dir
    const manager = createMetricsManager(tmpDir, 'agents/');
    
    // Record metrics
    await manager.record(metrics);
    
    // Verify metrics.json was created
    const metricsPath = path.join(tmpDir, 'agents', 'state', 'metrics.json');
    const metricsContent = await fs.readFile(metricsPath, 'utf-8');
    const metricsState = JSON.parse(metricsContent);
    
    expect(metricsState.version).toBe(1);
    expect(metricsState.cycles).toHaveLength(1);
    expect(metricsState.cycles[0].cycle).toBe(101);
    expect(metricsState.cycles[0].totals.totalTokens).toBe(2800);
  });
});
