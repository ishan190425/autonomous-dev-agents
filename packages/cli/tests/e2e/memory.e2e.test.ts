/**
 * E2E Tests: ada memory
 *
 * Tests the `ada memory` command suite in isolated sandbox environments.
 * Validates semantic search, listing, stats, embedding, and lifecycle
 * functionality for the cognitive memory system.
 *
 * Part of Issue #34: feat(qa): E2E Testing Infrastructure — Memory commands
 * Supports Issue #113: Cognitive Memory Architecture
 *
 * @module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSandbox, type Sandbox } from './harness';

describe('ada memory E2E', () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = createSandbox();
    // Initialize agents directory with memory bank
    const initResult = await sandbox.ada(['init']);
    expect(initResult.success).toBe(true);
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  describe('memory (no subcommand)', () => {
    it('shows help when no subcommand provided', async () => {
      const result = await sandbox.ada(['memory']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('memory');
      expect(result.stdout).toContain('search');
      expect(result.stdout).toContain('list');
      expect(result.stdout).toContain('stats');
    });
  });

  describe('memory list', () => {
    it('lists memory entries from bank', async () => {
      const result = await sandbox.ada(['memory', 'list']);

      expect(result.success).toBe(true);
      // Should show entries header
      expect(result.stdout).toMatch(/memory entries|no memory entries/i);
    });

    it('supports JSON output', async () => {
      const result = await sandbox.ada(['memory', 'list', '--json']);

      expect(result.success).toBe(true);
      // Should be valid JSON
      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('entries');
      expect(output).toHaveProperty('total');
      expect(Array.isArray(output.entries)).toBe(true);
    });

    it('supports limit option', async () => {
      const result = await sandbox.ada(['memory', 'list', '--limit', '5']);

      expect(result.success).toBe(true);
    });

    it('supports role filter', async () => {
      const result = await sandbox.ada(['memory', 'list', '--role', 'engineering']);

      expect(result.success).toBe(true);
    });

    it('supports kind filter', async () => {
      const result = await sandbox.ada(['memory', 'list', '--kind', 'decision']);

      expect(result.success).toBe(true);
    });

    it('supports date filters', async () => {
      const result = await sandbox.ada(['memory', 'list', '--since', 'yesterday']);

      expect(result.success).toBe(true);
    });

    it('rejects invalid date format', async () => {
      const result = await sandbox.ada(['memory', 'list', '--since', 'invalid-date']);

      expect(result.success).toBe(false);
      expect(result.stderr).toContain('Invalid');
    });
  });

  describe('memory search', () => {
    it('searches memories by semantic similarity', async () => {
      const result = await sandbox.ada(['memory', 'search', 'testing']);

      expect(result.success).toBe(true);
      // Either finds matches or reports none found
      expect(result.stdout).toMatch(/found|no memories|relevant memories/i);
    });

    it('supports JSON output', async () => {
      const result = await sandbox.ada(['memory', 'search', 'testing', '--json']);

      expect(result.success).toBe(true);
      // Should be valid JSON array
      const output = JSON.parse(result.stdout);
      expect(Array.isArray(output)).toBe(true);
    });

    it('supports limit option', async () => {
      const result = await sandbox.ada(['memory', 'search', 'testing', '--limit', '3']);

      expect(result.success).toBe(true);
    });

    it('supports threshold option', async () => {
      const result = await sandbox.ada(['memory', 'search', 'testing', '--threshold', '0.5']);

      expect(result.success).toBe(true);
    });

    it('supports role filter', async () => {
      const result = await sandbox.ada(['memory', 'search', 'testing', '--role', 'qa']);

      expect(result.success).toBe(true);
    });

    it('supports verbose output', async () => {
      const result = await sandbox.ada(['memory', 'search', 'testing', '--verbose']);

      expect(result.success).toBe(true);
    });
  });

  describe('memory stats', () => {
    it('shows memory system health and metrics', async () => {
      const result = await sandbox.ada(['memory', 'stats']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Memory');
      // Should show version, sections, or health info
      expect(result.stdout).toMatch(/version|bank|health|cycle/i);
    });

    it('supports JSON output', async () => {
      const result = await sandbox.ada(['memory', 'stats', '--json']);

      expect(result.success).toBe(true);
      // Should be valid JSON
      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('bank');
    });

    it('supports verbose output with archives', async () => {
      const result = await sandbox.ada(['memory', 'stats', '--verbose']);

      expect(result.success).toBe(true);
    });

    it('supports no-color option', async () => {
      const result = await sandbox.ada(['memory', 'stats', '--no-color']);

      expect(result.success).toBe(true);
    });
  });

  describe('memory export', () => {
    it('exports memory bank to stdout', async () => {
      const result = await sandbox.ada(['memory', 'export']);

      expect(result.success).toBe(true);
      // Should be valid JSON with schema version
      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('schemaVersion');
      expect(output).toHaveProperty('exportedAt');
      expect(output).toHaveProperty('bank');
    });

    it('exports to file with --output', async () => {
      const result = await sandbox.ada(['memory', 'export', '--output', 'memory-export.json']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Exported');
      expect(sandbox.exists('memory-export.json')).toBe(true);

      // Verify exported content
      const exported = sandbox.readJson<{ schemaVersion: string }>('memory-export.json');
      expect(exported.schemaVersion).toBe('1.0');
    });

    it('includes archives with --include-archives', async () => {
      const result = await sandbox.ada(['memory', 'export', '--include-archives']);

      expect(result.success).toBe(true);
      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('archives');
    });
  });

  describe('memory embed', () => {
    it('initializes persistent vector store', async () => {
      const result = await sandbox.ada(['memory', 'embed']);

      expect(result.success).toBe(true);
      // Should either create store or report it exists
      expect(result.stdout).toMatch(/indexed|already exists|initializing|no memory entries/i);
    });

    it('supports JSON output', async () => {
      const result = await sandbox.ada(['memory', 'embed', '--json']);

      expect(result.success).toBe(true);
      // Output is JSON (may be empty object or stats)
    });

    it('supports force reindex', async () => {
      // First embed
      await sandbox.ada(['memory', 'embed']);

      // Force reindex
      const result = await sandbox.ada(['memory', 'embed', '--force']);

      expect(result.success).toBe(true);
    });

    it('supports verbose output', async () => {
      const result = await sandbox.ada(['memory', 'embed', '--verbose']);

      expect(result.success).toBe(true);
    });
  });

  describe('memory lifecycle', () => {
    it('shows memory lifecycle status', async () => {
      const result = await sandbox.ada(['memory', 'lifecycle']);

      expect(result.success).toBe(true);
      // Either shows tier info or prompts to run embed
      expect(result.stdout).toMatch(/lifecycle|tier|vector store|embed/i);
    });

    it('supports JSON output', async () => {
      const result = await sandbox.ada(['memory', 'lifecycle', '--json']);

      expect(result.success).toBe(true);
      // Should be valid JSON
      const output = JSON.parse(result.stdout);
      expect(typeof output).toBe('object');
    });

    it('shows detailed info with --verbose after embed', async () => {
      // Initialize vector store first
      await sandbox.ada(['memory', 'embed']);

      const result = await sandbox.ada(['memory', 'lifecycle', '--verbose']);

      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('errors gracefully without agents directory', async () => {
      // Create sandbox without ada init
      const cleanSandbox = createSandbox();

      const result = await cleanSandbox.ada(['memory', 'list']);

      expect(result.success).toBe(false);
      expect(result.stderr).toContain('not found');

      cleanSandbox.cleanup();
    });

    it('handles missing memory bank gracefully', async () => {
      // Create sandbox without ada init
      const cleanSandbox = createSandbox();

      const result = await cleanSandbox.ada(['memory', 'stats']);

      expect(result.success).toBe(false);
      expect(result.stderr).toMatch(/not found|init/i);

      cleanSandbox.cleanup();
    });
  });
});
