/**
 * @ada/core/terminal — Formatter Tests
 *
 * Unit tests for Terminal Mode output formatting.
 * Tests visual zone separation, color modes, and box drawing.
 *
 * @see docs/design/terminal-mode-ux-spec-c605.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TerminalFormatter,
  createTerminalFormatter,
  shouldUseColor,
  type CycleSummaryData,
  type CommandEntry,
} from '../../src/terminal/formatter.js';
import type { ExecutionResult } from '../../src/terminal/types.js';

describe('TerminalFormatter', () => {
  describe('constructor', () => {
    it('should create formatter with default options', () => {
      const formatter = new TerminalFormatter();
      expect(formatter).toBeInstanceOf(TerminalFormatter);
    });

    it('should respect color option when provided', () => {
      const colorFormatter = new TerminalFormatter({ color: true });
      const noColorFormatter = new TerminalFormatter({ color: false });
      
      // Color output includes ANSI codes
      const colorOutput = colorFormatter.command('test');
      const noColorOutput = noColorFormatter.command('test');
      
      expect(colorOutput).toContain('\x1b[');
      expect(noColorOutput).not.toContain('\x1b[');
    });
  });

  describe('ada()', () => {
    let formatter: TerminalFormatter;
    
    beforeEach(() => {
      formatter = new TerminalFormatter({ color: false });
    });

    it('should format ADA system message with role', () => {
      const output = formatter.ada('engineering', 'Starting implementation...');
      expect(output).toContain('[ADA]');
      expect(output).toContain('[⚙️ Engineering]');
      expect(output).toContain('Starting implementation...');
    });

    it('should support all role IDs', () => {
      const roles = ['ceo', 'growth', 'research', 'frontier', 'product', 
                     'scrum', 'qa', 'engineering', 'ops', 'design'] as const;
      
      for (const role of roles) {
        const output = formatter.ada(role, 'test');
        expect(output).toContain('[ADA]');
        expect(output.length).toBeGreaterThan(10);
      }
    });

    it('should include emoji in role display', () => {
      expect(formatter.ada('ceo', 'test')).toContain('👔');
      expect(formatter.ada('research', 'test')).toContain('🔬');
      expect(formatter.ada('qa', 'test')).toContain('🔍');
    });
  });

  describe('command()', () => {
    it('should format command with prefix', () => {
      const formatter = new TerminalFormatter({ color: false });
      const output = formatter.command('npm test');
      expect(output).toBe('> npm test');
    });

    it('should use color prefix when color enabled', () => {
      const formatter = new TerminalFormatter({ color: true });
      const output = formatter.command('npm test');
      expect(output).toContain('▶');
      expect(output).toContain('\x1b[33m'); // Yellow
    });
  });

  describe('stdout()', () => {
    let formatter: TerminalFormatter;
    
    beforeEach(() => {
      formatter = new TerminalFormatter({ color: false });
    });

    it('should format single line stdout', () => {
      const output = formatter.stdout('PASS tests/test.ts');
      expect(output).toBe('| PASS tests/test.ts');
    });

    it('should format multi-line stdout', () => {
      const output = formatter.stdout('line 1\nline 2\nline 3');
      expect(output).toBe('| line 1\n| line 2\n| line 3');
    });

    it('should handle empty string', () => {
      const output = formatter.stdout('');
      expect(output).toBe('| ');
    });
  });

  describe('stderr()', () => {
    let formatter: TerminalFormatter;
    
    beforeEach(() => {
      formatter = new TerminalFormatter({ color: false });
    });

    it('should format stderr with error marker', () => {
      const output = formatter.stderr('npm ERR! Something went wrong');
      expect(output).toContain('[ERR]');
      expect(output).toContain('npm ERR! Something went wrong');
    });

    it('should format multi-line stderr', () => {
      const output = formatter.stderr('error 1\nerror 2');
      const lines = output.split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('[ERR]');
      expect(lines[1]).toContain('[ERR]');
    });
  });

  describe('exitCode()', () => {
    let formatter: TerminalFormatter;
    
    beforeEach(() => {
      formatter = new TerminalFormatter({ color: false });
    });

    it('should format success exit code', () => {
      const output = formatter.exitCode(0, 1234);
      expect(output).toContain('exit 0');
      expect(output).toContain('1.2s');
      expect(output).toContain('[OK]');
    });

    it('should format failure exit code', () => {
      const output = formatter.exitCode(1, 500);
      expect(output).toContain('exit 1');
      expect(output).toContain('500ms');
      expect(output).toContain('[FAIL]');
    });

    it('should format milliseconds correctly', () => {
      expect(formatter.exitCode(0, 42)).toContain('42ms');
      expect(formatter.exitCode(0, 999)).toContain('999ms');
    });

    it('should format seconds correctly', () => {
      expect(formatter.exitCode(0, 1000)).toContain('1.0s');
      expect(formatter.exitCode(0, 2500)).toContain('2.5s');
    });

    it('should format minutes correctly', () => {
      expect(formatter.exitCode(0, 65000)).toContain('1m5s');
      expect(formatter.exitCode(0, 125000)).toContain('2m5s');
    });

    it('should use green checkmark for success with color', () => {
      const formatter = new TerminalFormatter({ color: true });
      const output = formatter.exitCode(0, 100);
      expect(output).toContain('✓');
      expect(output).toContain('\x1b[32m'); // Green
    });

    it('should use red X for failure with color', () => {
      const formatter = new TerminalFormatter({ color: true });
      const output = formatter.exitCode(1, 100);
      expect(output).toContain('✗');
      expect(output).toContain('\x1b[31m'); // Red
    });
  });

  describe('timeout()', () => {
    it('should format timeout message', () => {
      const formatter = new TerminalFormatter({ color: false });
      const output = formatter.timeout(60000);
      expect(output).toContain('TIMEOUT');
      expect(output).toContain('1m0s'); // 60000ms = 1 minute
      expect(output).toContain('[FAIL]');
    });

    it('should use red color for timeout', () => {
      const formatter = new TerminalFormatter({ color: true });
      const output = formatter.timeout(30000);
      expect(output).toContain('\x1b[31m'); // Red
    });
  });

  describe('activity()', () => {
    it('should return activity indicator', () => {
      const formatter = new TerminalFormatter({ color: false });
      expect(formatter.activity()).toBe('| ·');
    });
  });

  describe('cycleStart()', () => {
    let formatter: TerminalFormatter;
    
    beforeEach(() => {
      formatter = new TerminalFormatter({ color: false });
    });

    it('should create cycle start header', () => {
      const output = formatter.cycleStart(42);
      expect(output).toContain('Terminal Mode');
      expect(output).toContain('Cycle 42');
      expect(output).toContain('┏');
      expect(output).toContain('┗');
    });

    it('should include task when provided', () => {
      const output = formatter.cycleStart(42, 'Implement user auth');
      expect(output).toContain('Task: Implement user auth');
    });

    it('should truncate long tasks', () => {
      const longTask = 'A'.repeat(100);
      const output = formatter.cycleStart(42, longTask);
      expect(output).toContain('...');
      expect(output.length).toBeLessThan(longTask.length + 200);
    });
  });

  describe('cycleSummary()', () => {
    let formatter: TerminalFormatter;
    
    beforeEach(() => {
      formatter = new TerminalFormatter({ color: false });
    });

    it('should create summary with all stats', () => {
      const data: CycleSummaryData = {
        cycle: 42,
        commandCount: 10,
        successCount: 8,
        failedCount: 2,
        totalDurationMs: 5000,
      };
      const output = formatter.cycleSummary(data);
      
      expect(output).toContain('Cycle 42 Complete');
      expect(output).toContain('Commands: 10');
      expect(output).toContain('Success: 8');
      expect(output).toContain('Failed: 2');
      expect(output).toContain('5.0s');
    });

    it('should show checkmark for all success', () => {
      const data: CycleSummaryData = {
        cycle: 42,
        commandCount: 5,
        successCount: 5,
        failedCount: 0,
        totalDurationMs: 1000,
      };
      const output = formatter.cycleSummary(data);
      expect(output).toContain('✓');
    });

    it('should show X for any failures', () => {
      const data: CycleSummaryData = {
        cycle: 42,
        commandCount: 5,
        successCount: 4,
        failedCount: 1,
        totalDurationMs: 1000,
      };
      const output = formatter.cycleSummary(data);
      expect(output).toContain('✗');
    });
  });

  describe('commandLimitWarning()', () => {
    it('should format warning message', () => {
      const formatter = new TerminalFormatter({ color: false });
      const output = formatter.commandLimitWarning(47, 50);
      expect(output).toContain('47/50');
      expect(output).toContain('3 commands remaining');
      expect(output).toContain('⚠');
    });
  });

  describe('commandHistory()', () => {
    let formatter: TerminalFormatter;
    
    beforeEach(() => {
      formatter = new TerminalFormatter({ color: false });
    });

    it('should create history table', () => {
      const commands: CommandEntry[] = [
        { index: 1, role: 'research', command: 'grep auth src/', exitCode: 0, durationMs: 50 },
        { index: 2, role: 'engineering', command: 'npm test', exitCode: 0, durationMs: 1500 },
      ];
      const output = formatter.commandHistory(42, commands);
      
      expect(output).toContain('Command History');
      expect(output).toContain('Cycle 42');
      expect(output).toContain('grep auth src/');
      expect(output).toContain('npm test');
    });

    it('should handle empty history', () => {
      const output = formatter.commandHistory(42, []);
      expect(output).toContain('Command History');
      // Should still render the table structure
      expect(output).toContain('┏');
    });
  });

  describe('executionResult()', () => {
    let formatter: TerminalFormatter;
    
    beforeEach(() => {
      formatter = new TerminalFormatter({ color: false });
    });

    it('should format complete result with stdout', () => {
      const result: ExecutionResult = {
        command: 'echo hello',
        exitCode: 0,
        stdout: 'hello',
        stderr: '',
        durationMs: 10,
        truncated: false,
      };
      const output = formatter.executionResult(result);
      
      expect(output).toContain('> echo hello');
      expect(output).toContain('| hello');
      expect(output).toContain('exit 0');
    });

    it('should include stderr when present', () => {
      const result: ExecutionResult = {
        command: 'npm install bad',
        exitCode: 1,
        stdout: '',
        stderr: 'npm ERR! 404',
        durationMs: 1000,
        truncated: false,
      };
      const output = formatter.executionResult(result);
      
      expect(output).toContain('[ERR]');
      expect(output).toContain('npm ERR! 404');
      expect(output).toContain('[FAIL]');
    });

    it('should indicate truncation', () => {
      const result: ExecutionResult = {
        command: 'cat largefile',
        exitCode: 0,
        stdout: 'partial output',
        stderr: '',
        durationMs: 100,
        truncated: true,
      };
      const output = formatter.executionResult(result);
      
      expect(output).toContain('truncated');
    });
  });
});

describe('createTerminalFormatter()', () => {
  it('should create formatter with default options', () => {
    const formatter = createTerminalFormatter();
    expect(formatter).toBeInstanceOf(TerminalFormatter);
  });

  it('should pass options to formatter', () => {
    const formatter = createTerminalFormatter({ color: false });
    const output = formatter.command('test');
    expect(output).not.toContain('\x1b[');
  });
});

describe('shouldUseColor()', () => {
  it('should return a boolean', () => {
    const result = shouldUseColor();
    expect(typeof result).toBe('boolean');
  });
});
