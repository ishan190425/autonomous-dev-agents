/**
 * @ada/core/terminal — Executor Tests
 *
 * Unit tests for Terminal Mode command execution.
 * Tests shell execution, streaming, timeouts, and safety limits.
 *
 * @see docs/engineering/terminal-mode-technical-spec.md §3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CommandExecutor,
  createCommandExecutor,
  executeCommand,
} from '../../src/terminal/executor.js';
import type { ShellConfig } from '../../src/terminal/types.js';
import { TerminalError } from '../../src/terminal/types.js';

// Mock shell config for tests
const mockShell: ShellConfig = {
  path: '/bin/bash',
  type: 'bash',
  detected: true,
};

describe('CommandExecutor', () => {
  describe('constructor', () => {
    it('should create executor with minimal config', () => {
      const executor = new CommandExecutor({ shell: mockShell });
      expect(executor).toBeInstanceOf(CommandExecutor);
    });

    it('should apply default values', () => {
      const executor = new CommandExecutor({ shell: mockShell });
      const config = executor.getConfig();
      
      expect(config.defaultTimeout).toBe(60000);
      expect(config.maxCommands).toBe(50);
      expect(config.maxOutputLines).toBe(200);
      expect(config.maxOutputBytes).toBe(51200);
    });

    it('should accept custom config values', () => {
      const executor = new CommandExecutor({
        shell: mockShell,
        defaultTimeout: 30000,
        maxCommands: 100,
        maxOutputLines: 500,
        maxOutputBytes: 102400,
        cwd: '/tmp',
      });
      const config = executor.getConfig();
      
      expect(config.defaultTimeout).toBe(30000);
      expect(config.maxCommands).toBe(100);
      expect(config.maxOutputLines).toBe(500);
      expect(config.maxOutputBytes).toBe(102400);
      expect(config.cwd).toBe('/tmp');
    });
  });

  describe('execute()', () => {
    let executor: CommandExecutor;
    
    beforeEach(() => {
      executor = new CommandExecutor({
        shell: mockShell,
        maxCommands: 10,
        defaultTimeout: 5000,
      });
    });

    it('should execute simple command successfully', async () => {
      const result = await executor.execute('echo "hello world"');
      
      expect(result.command).toBe('echo "hello world"');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('hello world');
      expect(result.stderr).toBe('');
      expect(result.durationMs).toBeGreaterThan(0);
      expect(result.truncated).toBe(false);
    });

    it('should capture exit code for failed commands', async () => {
      const result = await executor.execute('exit 42');
      
      expect(result.exitCode).toBe(42);
      expect(result.stdout).toBe('');
    });

    it('should capture stderr', async () => {
      const result = await executor.execute('echo "error message" >&2');
      
      expect(result.stderr).toContain('error message');
    });

    it('should capture both stdout and stderr', async () => {
      const result = await executor.execute('echo "out" && echo "err" >&2');
      
      expect(result.stdout).toContain('out');
      expect(result.stderr).toContain('err');
    });

    it('should track command stats', async () => {
      await executor.execute('echo 1');
      await executor.execute('echo 2');
      await executor.execute('exit 1');
      
      const stats = executor.getStats();
      
      expect(stats.total).toBe(3);
      expect(stats.succeeded).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.totalDurationMs).toBeGreaterThan(0);
    });

    it('should add to history', async () => {
      await executor.execute('echo 1');
      await executor.execute('echo 2');
      
      const history = executor.getHistory();
      
      expect(history).toHaveLength(2);
      expect(history[0].command).toBe('echo 1');
      expect(history[1].command).toBe('echo 2');
    });

    it('should enforce command limit', async () => {
      // Execute up to the limit
      for (let i = 0; i < 10; i++) {
        await executor.execute(`echo ${  i}`);
      }
      
      // Next command should fail
      await expect(executor.execute('echo 11')).rejects.toThrow(TerminalError);
      await expect(executor.execute('echo 11')).rejects.toThrow('Command limit exceeded');
    });

    it('should handle streaming callbacks', async () => {
      const stdoutLines: string[] = [];
      const stderrLines: string[] = [];
      
      await executor.execute('echo "line1" && echo "line2" && echo "error" >&2', {
        onStdout: (line) => stdoutLines.push(line),
        onStderr: (line) => stderrLines.push(line),
      });
      
      expect(stdoutLines).toContain('line1');
      expect(stdoutLines).toContain('line2');
      expect(stderrLines).toContain('error');
    });

    it('should respect custom working directory', async () => {
      const result = await executor.execute('pwd', { cwd: '/tmp' });
      expect(result.stdout).toContain('/tmp');
    });

    it('should handle environment variables', async () => {
      const result = await executor.execute('echo $MY_VAR', {
        env: { MY_VAR: 'test_value' },
      });
      expect(result.stdout).toContain('test_value');
    });
  });

  describe('timeout handling', () => {
    it('should timeout long-running commands', async () => {
      const executor = new CommandExecutor({
        shell: mockShell,
        defaultTimeout: 100, // 100ms timeout
      });
      
      const result = await executor.execute('sleep 5');
      
      expect(result.exitCode).toBe(-1); // Timeout indicator
      expect(result.durationMs).toBeGreaterThanOrEqual(100);
      expect(result.durationMs).toBeLessThan(5000);
    }, 10000);

    it('should count timeouts in stats', async () => {
      const executor = new CommandExecutor({
        shell: mockShell,
        defaultTimeout: 100,
      });
      
      await executor.execute('sleep 5');
      const stats = executor.getStats();
      
      expect(stats.timedOut).toBe(1);
      expect(stats.failed).toBe(1); // Timeouts count as failures
    }, 10000);
  });

  describe('output truncation', () => {
    it('should truncate excessive output', async () => {
      const executor = new CommandExecutor({
        shell: mockShell,
        maxOutputLines: 5,
      });
      
      // Generate 10 lines
      const result = await executor.execute('for i in 1 2 3 4 5 6 7 8 9 10; do echo "line $i"; done');
      
      const lines = result.stdout.split('\n').filter(l => l.length > 0);
      expect(lines.length).toBeLessThanOrEqual(5);
      expect(result.truncated).toBe(true);
    });

    it('should truncate by byte limit', async () => {
      const executor = new CommandExecutor({
        shell: mockShell,
        maxOutputBytes: 100,
      });
      
      // Generate a lot of output
      const result = await executor.execute('yes "aaaaaaaaaa" | head -n 100');
      
      expect(result.stdout.length).toBeLessThanOrEqual(100);
      expect(result.truncated).toBe(true);
    });
  });

  describe('executeMany()', () => {
    let executor: CommandExecutor;
    
    beforeEach(() => {
      executor = new CommandExecutor({ shell: mockShell });
    });

    it('should execute multiple commands', async () => {
      const results = await executor.executeMany(['echo 1', 'echo 2', 'echo 3']);
      
      expect(results).toHaveLength(3);
      expect(results[0].stdout).toContain('1');
      expect(results[1].stdout).toContain('2');
      expect(results[2].stdout).toContain('3');
    });

    it('should stop on error when requested', async () => {
      const results = await executor.executeMany(
        ['echo 1', 'exit 1', 'echo 3'],
        {},
        true // stopOnError
      );
      
      expect(results).toHaveLength(2);
      expect(results[1].exitCode).toBe(1);
    });

    it('should continue on error by default', async () => {
      const results = await executor.executeMany(['echo 1', 'exit 1', 'echo 3']);
      
      expect(results).toHaveLength(3);
      expect(results[2].exitCode).toBe(0);
    });
  });

  describe('getRemainingCommands()', () => {
    it('should return remaining command count', async () => {
      const executor = new CommandExecutor({
        shell: mockShell,
        maxCommands: 10,
      });
      
      expect(executor.getRemainingCommands()).toBe(10);
      
      await executor.execute('echo 1');
      expect(executor.getRemainingCommands()).toBe(9);
      
      await executor.execute('echo 2');
      expect(executor.getRemainingCommands()).toBe(8);
    });
  });

  describe('isNearLimit()', () => {
    it('should detect approaching limit', async () => {
      const executor = new CommandExecutor({
        shell: mockShell,
        maxCommands: 10,
      });
      
      expect(executor.isNearLimit()).toBe(false); // 10 remaining, threshold 5
      
      // Execute 5 commands (leaves 5 remaining, at threshold)
      for (let i = 0; i < 5; i++) {
        await executor.execute(`echo ${  i}`);
      }
      
      expect(executor.isNearLimit()).toBe(true); // 5 remaining = threshold, so true
      
      await executor.execute('echo 5');
      expect(executor.isNearLimit()).toBe(true); // 4 remaining, still at limit
    });

    it('should respect custom threshold', async () => {
      const executor = new CommandExecutor({
        shell: mockShell,
        maxCommands: 10,
      });
      
      await executor.execute('echo 1');
      
      expect(executor.isNearLimit(10)).toBe(true); // 9 remaining
      expect(executor.isNearLimit(8)).toBe(false); // 9 remaining
    });
  });

  describe('getLastCommands()', () => {
    it('should return last N commands', async () => {
      const executor = new CommandExecutor({ shell: mockShell });
      
      await executor.execute('echo 1');
      await executor.execute('echo 2');
      await executor.execute('echo 3');
      await executor.execute('echo 4');
      
      const last2 = executor.getLastCommands(2);
      
      expect(last2).toHaveLength(2);
      expect(last2[0].command).toBe('echo 3');
      expect(last2[1].command).toBe('echo 4');
    });

    it('should handle request for more than available', async () => {
      const executor = new CommandExecutor({ shell: mockShell });
      
      await executor.execute('echo 1');
      
      const last10 = executor.getLastCommands(10);
      
      expect(last10).toHaveLength(1);
    });
  });

  describe('reset()', () => {
    it('should clear history and stats', async () => {
      const executor = new CommandExecutor({
        shell: mockShell,
        maxCommands: 10,
      });
      
      await executor.execute('echo 1');
      await executor.execute('echo 2');
      
      executor.reset();
      
      expect(executor.getHistory()).toHaveLength(0);
      expect(executor.getStats().total).toBe(0);
      expect(executor.getRemainingCommands()).toBe(10);
    });
  });
});

describe('createCommandExecutor()', () => {
  it('should create executor with config', () => {
    const executor = createCommandExecutor({ shell: mockShell });
    expect(executor).toBeInstanceOf(CommandExecutor);
  });
});

describe('executeCommand()', () => {
  it('should execute single command', async () => {
    const result = await executeCommand(mockShell, 'echo "test"');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('test');
  });

  it('should accept options', async () => {
    const result = await executeCommand(mockShell, 'echo $MY_VAR', {
      env: { MY_VAR: 'hello' },
    });
    
    expect(result.stdout).toContain('hello');
  });
});
