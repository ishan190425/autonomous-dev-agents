/**
 * E2E Tests: ada terminal
 *
 * Tests the `ada terminal` command for shell-based execution with visual formatting.
 * Validates shell detection, command execution, history, and demo features.
 *
 * Part of Issue #34: feat(qa): E2E Testing Infrastructure
 * Related: Issue #125 — Terminal Mode for shell-based benchmarks
 *
 * @module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSandbox, type Sandbox } from './harness';

describe('ada terminal E2E', () => {
  let sandbox: Sandbox;

  beforeEach(() => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  // =========================================================================
  // Help Output
  // =========================================================================

  describe('help output', () => {
    it('shows main command help', async () => {
      const result = await sandbox.ada(['terminal', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('terminal');
      expect(result.stdout).toContain('Terminal Mode');
      expect(result.stdout).toMatch(/detect|exec|history|demo/i);
    });

    it('shows detect subcommand help', async () => {
      const result = await sandbox.ada(['terminal', 'detect', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('detect');
      expect(result.stdout).toMatch(/shell|environment/i);
    });

    it('shows exec subcommand help', async () => {
      const result = await sandbox.ada(['terminal', 'exec', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('exec');
      expect(result.stdout).toMatch(/command|timeout/i);
    });

    it('shows history subcommand help', async () => {
      const result = await sandbox.ada(['terminal', 'history', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('history');
      expect(result.stdout).toMatch(/limit|cycle/i);
    });

    it('shows demo subcommand help', async () => {
      const result = await sandbox.ada(['terminal', 'demo', '--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('demo');
      expect(result.stdout).toMatch(/demonstrate|format/i);
    });
  });

  // =========================================================================
  // Main Command (Status)
  // =========================================================================

  describe('terminal status (default)', () => {
    it('shows terminal mode status', async () => {
      const result = await sandbox.ada(['terminal']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/terminal mode/i);
      expect(result.stdout).toMatch(/shell/i);
    });

    it('supports --json output', async () => {
      const result = await sandbox.ada(['terminal', '--json']);

      expect(result.success).toBe(true);

      let parsed: unknown;
      expect(() => {
        parsed = JSON.parse(result.stdout);
      }).not.toThrow();

      expect(parsed).toHaveProperty('shell');
      expect(parsed).toHaveProperty('supported');
    });
  });

  // =========================================================================
  // Detect Subcommand
  // =========================================================================

  describe('terminal detect', () => {
    it('detects current shell environment', async () => {
      const result = await sandbox.ada(['terminal', 'detect']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/shell detection|detected shell/i);
      expect(result.stdout).toMatch(/\$SHELL|path/i);
    });

    it('supports --json output', async () => {
      const result = await sandbox.ada(['terminal', 'detect', '--json']);

      expect(result.success).toBe(true);

      let parsed: unknown;
      expect(() => {
        parsed = JSON.parse(result.stdout);
      }).not.toThrow();

      expect(parsed).toHaveProperty('shell');
      expect(parsed).toHaveProperty('environment');
      expect(parsed).toHaveProperty('supported');
    });

    it('accepts --shell override option', async () => {
      const result = await sandbox.ada(['terminal', 'detect', '--shell', '/bin/bash']);

      // Should succeed (even if path doesn't exist, it's detected manually)
      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/bash/i);
    });
  });

  // =========================================================================
  // Exec Subcommand
  // =========================================================================

  describe('terminal exec', () => {
    it('executes a simple command', async () => {
      const result = await sandbox.ada(['terminal', 'exec', 'echo "hello from terminal"']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('hello from terminal');
    });

    it('shows exit code for successful command', async () => {
      const result = await sandbox.ada(['terminal', 'exec', 'true']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/exit|code|0/i);
    });

    it('returns non-zero exit code for failed command', async () => {
      const result = await sandbox.ada(['terminal', 'exec', 'false']);

      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
    });

    it('handles command with arguments', async () => {
      const result = await sandbox.ada(['terminal', 'exec', 'echo -n test']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('test');
    });

    it('accepts --timeout option', async () => {
      const result = await sandbox.ada(['terminal', 'exec', '--timeout', '5000', 'echo fast']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('fast');
    });

    it('accepts --role option for formatting', async () => {
      const result = await sandbox.ada(['terminal', 'exec', '--role', 'qa', 'echo test']);

      expect(result.success).toBe(true);
      // Command should succeed regardless of role
      expect(result.stdout).toContain('test');
    });

    it('requires command argument', async () => {
      const result = await sandbox.ada(['terminal', 'exec']);

      // Missing required argument
      expect(result.success).toBe(false);
      expect(result.stderr).toMatch(/missing|argument|command/i);
    });

    it('captures stderr from command', async () => {
      const result = await sandbox.ada(['terminal', 'exec', 'echo error >&2']);

      // The command itself succeeds (echo returns 0), but stderr is captured
      expect(result.success).toBe(true);
      // Stderr output should appear in the formatted output
      expect(result.stdout).toContain('error');
    });
  });

  // =========================================================================
  // History Subcommand
  // =========================================================================

  describe('terminal history', () => {
    it('shows command history placeholder', async () => {
      const result = await sandbox.ada(['terminal', 'history']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/history|command/i);
    });

    it('supports --json output', async () => {
      const result = await sandbox.ada(['terminal', 'history', '--json']);

      expect(result.success).toBe(true);

      let parsed: unknown;
      expect(() => {
        parsed = JSON.parse(result.stdout);
      }).not.toThrow();

      expect(parsed).toHaveProperty('cycle');
      expect(parsed).toHaveProperty('commands');
    });

    it('accepts --limit option', async () => {
      const result = await sandbox.ada(['terminal', 'history', '--limit', '5']);

      expect(result.success).toBe(true);
      // Should succeed (even with no history)
    });

    it('accepts --cycle option', async () => {
      const result = await sandbox.ada(['terminal', 'history', '--cycle', '42']);

      expect(result.success).toBe(true);
      // Should succeed (even with no history for that cycle)
    });
  });

  // =========================================================================
  // Demo Subcommand
  // =========================================================================

  describe('terminal demo', () => {
    it('demonstrates terminal mode formatting', async () => {
      const result = await sandbox.ada(['terminal', 'demo']);

      expect(result.success).toBe(true);
      // Demo should show various formatting examples
      expect(result.stdout).toMatch(/cycle|command|test/i);
    });

    it('shows exit code examples', async () => {
      const result = await sandbox.ada(['terminal', 'demo']);

      expect(result.success).toBe(true);
      // Should show exit code formatting
      expect(result.stdout).toMatch(/exit|0|1/i);
    });

    it('shows command history example', async () => {
      const result = await sandbox.ada(['terminal', 'demo']);

      expect(result.success).toBe(true);
      // Should include history section
      expect(result.stdout).toMatch(/history|command/i);
    });

    it('shows role-based formatting', async () => {
      const result = await sandbox.ada(['terminal', 'demo']);

      expect(result.success).toBe(true);
      // Should show different roles (research, qa, engineering)
      expect(result.stdout).toMatch(/research|qa|engineering/i);
    });
  });

  // =========================================================================
  // Options
  // =========================================================================

  describe('options validation', () => {
    it('accepts --dir option', async () => {
      const result = await sandbox.ada(['terminal', '--dir', sandbox.path]);

      expect(result.success).toBe(true);
    });

    it('accepts --no-color option', async () => {
      const result = await sandbox.ada(['terminal', '--no-color']);

      expect(result.success).toBe(true);
      // Should not contain ANSI escape codes (ESC[...m sequences)
      // eslint-disable-next-line no-control-regex
      const ansiRegex = /\x1B\[[0-9;]*m/;
      expect(result.stdout).not.toMatch(ansiRegex);
    });

    it('exec accepts --max-lines option', async () => {
      const result = await sandbox.ada([
        'terminal', 'exec', '--max-lines', '10',
        'seq 1 5'
      ]);

      expect(result.success).toBe(true);
      // Should show lines 1-5 (within limit)
      expect(result.stdout).toContain('1');
      expect(result.stdout).toContain('5');
    });
  });

  // =========================================================================
  // Error Handling
  // =========================================================================

  describe('error handling', () => {
    it('handles invalid subcommand gracefully', async () => {
      const result = await sandbox.ada(['terminal', 'invalid-cmd']);

      expect(result.success).toBe(false);
      // Commander reports unknown arguments or too many arguments
      expect(result.stderr).toMatch(/unknown|command|invalid|error|arguments/i);
    });

    it('handles invalid shell override', async () => {
      // This might still succeed with manual detection, or fail gracefully
      const result = await sandbox.ada(['terminal', 'detect', '--shell', '/nonexistent/shell']);

      // Should either succeed (with manual type detection) or fail gracefully
      // Either way, it shouldn't crash
      expect(result.stdout.length + result.stderr.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Integration
  // =========================================================================

  describe('integration', () => {
    it('exec works in sandbox directory', async () => {
      // Create a test file
      sandbox.write('test.txt', 'sandbox content');

      const result = await sandbox.ada(['terminal', 'exec', 'cat test.txt']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('sandbox content');
    });

    it('detect and exec use same shell', async () => {
      // Detect should find a shell
      const detectResult = await sandbox.ada(['terminal', 'detect', '--json']);
      expect(detectResult.success).toBe(true);

      const detected = JSON.parse(detectResult.stdout);
      const shellType = detected.shell?.type;

      // Exec should work with that shell
      const execResult = await sandbox.ada(['terminal', 'exec', 'echo works']);
      expect(execResult.success).toBe(true);
      expect(execResult.stdout).toContain('works');

      // If bash detected, verify we can use bash features
      if (shellType === 'bash' || shellType === 'zsh') {
        const varResult = await sandbox.ada(['terminal', 'exec', 'echo $((1+1))']);
        expect(varResult.success).toBe(true);
        expect(varResult.stdout).toContain('2');
      }
    });
  });
});
