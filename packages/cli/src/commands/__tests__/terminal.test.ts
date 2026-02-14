/**
 * @ada/cli — Terminal command tests
 *
 * Tests for the `ada terminal` CLI commands.
 *
 * @see commands/terminal.ts
 * @see Issue #125 — Terminal Mode for shell-based benchmarks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { terminalCommand } from '../terminal.js';

// ============================================================================
// Tests
// ============================================================================

describe('ada terminal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('command structure', () => {
    it('should have the correct name', () => {
      expect(terminalCommand.name()).toBe('terminal');
    });

    it('should have a description', () => {
      expect(terminalCommand.description()).toBeTruthy();
      expect(terminalCommand.description()).toContain('Terminal Mode');
    });

    it('should have subcommands', () => {
      const subcommands = terminalCommand.commands.map(c => c.name());
      expect(subcommands).toContain('detect');
      expect(subcommands).toContain('exec');
      expect(subcommands).toContain('history');
      expect(subcommands).toContain('demo');
    });

    it('should have --dir option', () => {
      const dirOption = terminalCommand.options.find(o => o.long === '--dir');
      expect(dirOption).toBeDefined();
    });

    it('should have --json option', () => {
      const jsonOption = terminalCommand.options.find(o => o.long === '--json');
      expect(jsonOption).toBeDefined();
    });

    it('should have --color and --no-color options', () => {
      const colorOption = terminalCommand.options.find(o => o.long === '--color');
      const noColorOption = terminalCommand.options.find(o => o.long === '--no-color');
      expect(colorOption).toBeDefined();
      expect(noColorOption).toBeDefined();
    });
  });

  describe('detect subcommand', () => {
    it('should have detect subcommand', () => {
      const detectCmd = terminalCommand.commands.find(c => c.name() === 'detect');
      expect(detectCmd).toBeDefined();
      expect(detectCmd?.description()).toContain('shell');
    });

    it('should have --shell option for override', () => {
      const detectCmd = terminalCommand.commands.find(c => c.name() === 'detect');
      const shellOption = detectCmd?.options.find(o => o.long === '--shell');
      expect(shellOption).toBeDefined();
    });
  });

  describe('exec subcommand', () => {
    it('should have exec subcommand', () => {
      const execCmd = terminalCommand.commands.find(c => c.name() === 'exec');
      expect(execCmd).toBeDefined();
      expect(execCmd?.description()).toContain('Execute');
    });

    it('should have --timeout option', () => {
      const execCmd = terminalCommand.commands.find(c => c.name() === 'exec');
      const timeoutOption = execCmd?.options.find(o => o.long === '--timeout');
      expect(timeoutOption).toBeDefined();
    });

    it('should have --max-lines option', () => {
      const execCmd = terminalCommand.commands.find(c => c.name() === 'exec');
      const maxLinesOption = execCmd?.options.find(o => o.long === '--max-lines');
      expect(maxLinesOption).toBeDefined();
    });

    it('should have --role option', () => {
      const execCmd = terminalCommand.commands.find(c => c.name() === 'exec');
      const roleOption = execCmd?.options.find(o => o.long === '--role');
      expect(roleOption).toBeDefined();
    });
  });

  describe('history subcommand', () => {
    it('should have history subcommand', () => {
      const historyCmd = terminalCommand.commands.find(c => c.name() === 'history');
      expect(historyCmd).toBeDefined();
      expect(historyCmd?.description()).toContain('history');
    });

    it('should have --limit option', () => {
      const historyCmd = terminalCommand.commands.find(c => c.name() === 'history');
      const limitOption = historyCmd?.options.find(o => o.long === '--limit');
      expect(limitOption).toBeDefined();
    });

    it('should have --cycle option', () => {
      const historyCmd = terminalCommand.commands.find(c => c.name() === 'history');
      const cycleOption = historyCmd?.options.find(o => o.long === '--cycle');
      expect(cycleOption).toBeDefined();
    });
  });

  describe('demo subcommand', () => {
    it('should have demo subcommand', () => {
      const demoCmd = terminalCommand.commands.find(c => c.name() === 'demo');
      expect(demoCmd).toBeDefined();
      expect(demoCmd?.description()).toContain('Demonstrate');
    });
  });
});

describe('terminal module integration', () => {
  it('should import terminal module from core without errors', async () => {
    // This tests that the imports in terminal.ts work correctly
    const terminalModule = await import('@ada-ai/core/terminal');
    
    expect(terminalModule.detectShell).toBeDefined();
    expect(terminalModule.createTerminalFormatter).toBeDefined();
    expect(terminalModule.createCommandExecutor).toBeDefined();
    expect(terminalModule.shouldUseColor).toBeDefined();
    expect(terminalModule.isSupported).toBeDefined();
    expect(terminalModule.getShellType).toBeDefined();
  });

  it('should detect a shell', async () => {
    const { detectShell } = await import('@ada-ai/core/terminal');
    
    const shell = await detectShell();
    
    expect(shell).toBeDefined();
    expect(shell.path).toBeTruthy();
    expect(shell.type).toMatch(/^(bash|zsh|sh)$/);
    expect(typeof shell.detected).toBe('boolean');
  });

  it('should create a formatter', async () => {
    const { createTerminalFormatter } = await import('@ada-ai/core/terminal');
    
    const formatter = createTerminalFormatter({ color: false });
    
    expect(formatter).toBeDefined();
    expect(typeof formatter.ada).toBe('function');
    expect(typeof formatter.command).toBe('function');
    expect(typeof formatter.stdout).toBe('function');
    expect(typeof formatter.stderr).toBe('function');
    expect(typeof formatter.exitCode).toBe('function');
  });

  it('should format ADA system message', async () => {
    const { createTerminalFormatter } = await import('@ada-ai/core/terminal');
    
    const formatter = createTerminalFormatter({ color: false });
    const output = formatter.ada('engineering', 'Testing message');
    
    expect(output).toContain('[ADA]');
    expect(output).toContain('Engineering');
    expect(output).toContain('Testing message');
  });

  it('should format command invocation', async () => {
    const { createTerminalFormatter } = await import('@ada-ai/core/terminal');
    
    const formatter = createTerminalFormatter({ color: false });
    const output = formatter.command('npm test');
    
    expect(output).toContain('>');
    expect(output).toContain('npm test');
  });

  it('should format stdout', async () => {
    const { createTerminalFormatter } = await import('@ada-ai/core/terminal');
    
    const formatter = createTerminalFormatter({ color: false });
    const output = formatter.stdout('test output');
    
    expect(output).toContain('|');
    expect(output).toContain('test output');
  });

  it('should format exit code', async () => {
    const { createTerminalFormatter } = await import('@ada-ai/core/terminal');
    
    const formatter = createTerminalFormatter({ color: false });
    
    const successOutput = formatter.exitCode(0, 100);
    expect(successOutput).toContain('exit 0');
    expect(successOutput).toContain('100ms');
    expect(successOutput).toContain('[OK]');
    
    const failOutput = formatter.exitCode(1, 500);
    expect(failOutput).toContain('exit 1');
    expect(failOutput).toContain('[FAIL]');
  });

  it('should format cycle summary', async () => {
    const { createTerminalFormatter } = await import('@ada-ai/core/terminal');
    
    const formatter = createTerminalFormatter({ color: false });
    const output = formatter.cycleSummary({
      cycle: 42,
      commandCount: 5,
      successCount: 4,
      failedCount: 1,
      totalDurationMs: 2500,
    });
    
    expect(output).toContain('Cycle 42');
    expect(output).toContain('Commands: 5');
    expect(output).toContain('Success: 4');
    expect(output).toContain('Failed: 1');
  });
});

describe('command executor', () => {
  it('should create an executor', async () => {
    const { createCommandExecutor, detectShell } = await import('@ada-ai/core/terminal');
    
    const shell = await detectShell();
    const executor = createCommandExecutor({ shell });
    
    expect(executor).toBeDefined();
    expect(typeof executor.execute).toBe('function');
    expect(typeof executor.getStats).toBe('function');
    expect(typeof executor.getHistory).toBe('function');
  });

  it('should execute a simple command', async () => {
    const { createCommandExecutor, detectShell } = await import('@ada-ai/core/terminal');
    
    const shell = await detectShell();
    const executor = createCommandExecutor({ shell });
    
    const result = await executor.execute('echo "hello"');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('hello');
    expect(result.durationMs).toBeGreaterThan(0);
    expect(result.truncated).toBe(false);
  });

  it('should track execution stats', async () => {
    const { createCommandExecutor, detectShell } = await import('@ada-ai/core/terminal');
    
    const shell = await detectShell();
    const executor = createCommandExecutor({ shell });
    
    await executor.execute('echo "test"');
    const stats = executor.getStats();
    
    expect(stats.total).toBe(1);
    expect(stats.succeeded).toBe(1);
    expect(stats.failed).toBe(0);
    expect(stats.totalDurationMs).toBeGreaterThan(0);
  });

  it('should maintain command history', async () => {
    const { createCommandExecutor, detectShell } = await import('@ada-ai/core/terminal');
    
    const shell = await detectShell();
    const executor = createCommandExecutor({ shell });
    
    await executor.execute('echo "first"');
    await executor.execute('echo "second"');
    
    const history = executor.getHistory();
    
    expect(history).toHaveLength(2);
    expect(history[0].command).toBe('echo "first"');
    expect(history[1].command).toBe('echo "second"');
  });

  it('should handle failed commands', async () => {
    const { createCommandExecutor, detectShell } = await import('@ada-ai/core/terminal');
    
    const shell = await detectShell();
    const executor = createCommandExecutor({ shell });
    
    const result = await executor.execute('exit 42');
    
    expect(result.exitCode).toBe(42);
    
    const stats = executor.getStats();
    expect(stats.failed).toBe(1);
    expect(stats.succeeded).toBe(0);
  });

  it('should stream stdout via callback', async () => {
    const { createCommandExecutor, detectShell } = await import('@ada-ai/core/terminal');
    
    const shell = await detectShell();
    const executor = createCommandExecutor({ shell });
    
    const lines: string[] = [];
    await executor.execute('echo "line1" && echo "line2"', {
      onStdout: (line) => lines.push(line),
    });
    
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines.some(l => l.includes('line1'))).toBe(true);
    expect(lines.some(l => l.includes('line2'))).toBe(true);
  });
});
