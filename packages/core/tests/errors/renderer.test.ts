/**
 * @file Tests for error rendering
 * @description Tests TTY, plain, and JSON error output formatting
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  shouldUseColors,
  shouldUseJson,
  detectRenderOptions,
  renderError,
} from '../../src/errors/renderer.js';
import { AdaError } from '../../src/errors/error.js';

describe('shouldUseColors', () => {
  const originalEnv = { ...process.env };
  const originalIsTTY = process.stdout.isTTY;

  afterEach(() => {
    process.env = { ...originalEnv };
    Object.defineProperty(process.stdout, 'isTTY', {
      value: originalIsTTY,
      writable: true,
    });
  });

  it('returns false when NO_COLOR is set', () => {
    process.env.NO_COLOR = '1';
    expect(shouldUseColors()).toBe(false);
  });

  it('returns true when FORCE_COLOR is set', () => {
    delete process.env.NO_COLOR;
    process.env.FORCE_COLOR = '1';
    expect(shouldUseColors()).toBe(true);
  });

  it('returns false in CI environment', () => {
    delete process.env.NO_COLOR;
    delete process.env.FORCE_COLOR;
    process.env.CI = 'true';
    expect(shouldUseColors()).toBe(false);
  });

  it('returns true for TTY when no env vars set', () => {
    delete process.env.NO_COLOR;
    delete process.env.FORCE_COLOR;
    delete process.env.CI;
    Object.defineProperty(process.stdout, 'isTTY', {
      value: true,
      writable: true,
    });
    expect(shouldUseColors()).toBe(true);
  });

  it('returns false for non-TTY when no env vars set', () => {
    delete process.env.NO_COLOR;
    delete process.env.FORCE_COLOR;
    delete process.env.CI;
    Object.defineProperty(process.stdout, 'isTTY', {
      value: false,
      writable: true,
    });
    expect(shouldUseColors()).toBe(false);
  });
});

describe('shouldUseJson', () => {
  const originalEnv = { ...process.env };
  const originalArgv = [...process.argv];

  afterEach(() => {
    process.env = { ...originalEnv };
    process.argv = [...originalArgv];
  });

  it('returns true when ADA_OUTPUT=json', () => {
    process.env.ADA_OUTPUT = 'json';
    expect(shouldUseJson()).toBe(true);
  });

  it('returns true when --json flag present', () => {
    process.env.ADA_OUTPUT = '';
    process.argv = ['node', 'ada', '--json'];
    expect(shouldUseJson()).toBe(true);
  });

  it('returns true when -j flag present', () => {
    process.env.ADA_OUTPUT = '';
    process.argv = ['node', 'ada', '-j'];
    expect(shouldUseJson()).toBe(true);
  });

  it('returns false when no json indicators', () => {
    delete process.env.ADA_OUTPUT;
    process.argv = ['node', 'ada', 'dispatch', 'start'];
    expect(shouldUseJson()).toBe(false);
  });
});

describe('detectRenderOptions', () => {
  const originalEnv = { ...process.env };
  const originalArgv = [...process.argv];

  beforeEach(() => {
    delete process.env.NO_COLOR;
    delete process.env.FORCE_COLOR;
    delete process.env.CI;
    delete process.env.ADA_OUTPUT;
    process.argv = ['node', 'ada'];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    process.argv = [...originalArgv];
  });

  it('detects JSON mode', () => {
    process.env.ADA_OUTPUT = 'json';
    const options = detectRenderOptions();
    expect(options.json).toBe(true);
  });

  it('detects CI environment', () => {
    process.env.CI = 'true';
    const options = detectRenderOptions();
    expect(options.ci).toBe(true);
  });
});

describe('renderError', () => {
  const error = new AdaError('ADA_NOT_INITIALIZED', {
    details: { missingFile: 'rotation.json' },
    context: { command: 'dispatch start' },
  });

  describe('JSON output', () => {
    it('renders valid JSON', () => {
      const output = renderError(error, { json: true });
      const parsed = JSON.parse(output);

      expect(parsed.ok).toBe(false);
      expect(parsed.error.code).toBe('ADA_NOT_INITIALIZED');
      expect(parsed.error.message).toBe(
        "This directory doesn't have an ADA agent team configured"
      );
      expect(parsed.error.details).toEqual({ missingFile: 'rotation.json' });
      expect(parsed.error.exitCode).toBe(3);
    });

    it('includes suggestions in JSON', () => {
      const output = renderError(error, { json: true });
      const parsed = JSON.parse(output);

      expect(parsed.error.suggestions).toBeInstanceOf(Array);
      expect(parsed.error.suggestions.length).toBeGreaterThan(0);
    });

    it('includes docs link in JSON', () => {
      const output = renderError(error, { json: true });
      const parsed = JSON.parse(output);

      expect(parsed.error.docs).toContain('ADA_NOT_INITIALIZED');
    });
  });

  describe('plain text output', () => {
    it('includes error code in header', () => {
      const output = renderError(error, { tty: false, color: false });

      expect(output).toContain('ERROR');
      expect(output).toContain('ADA_NOT_INITIALIZED');
    });

    it('includes message', () => {
      const output = renderError(error, { tty: false, color: false });

      expect(output).toContain(
        "This directory doesn't have an ADA agent team configured"
      );
    });

    it('includes details', () => {
      const output = renderError(error, { tty: false, color: false });

      expect(output).toContain('missingFile');
      expect(output).toContain('rotation.json');
    });

    it('includes fix suggestion', () => {
      const output = renderError(error, { tty: false, color: false });

      expect(output).toContain('Fix:');
      expect(output).toContain('ada init');
    });

    it('includes docs link', () => {
      const output = renderError(error, { tty: false, color: false });

      expect(output).toContain('Docs:');
      expect(output).toContain('ADA_NOT_INITIALIZED');
    });
  });

  describe('TTY output', () => {
    it('includes error symbol when color enabled (full TTY)', () => {
      const output = renderError(error, { tty: true, color: true });

      expect(output).toContain('✖');
    });

    it('includes error code in parentheses when color enabled', () => {
      const output = renderError(error, { tty: true, color: true });

      expect(output).toContain('(ADA_NOT_INITIALIZED)');
    });

    it('includes suggestion emoji when color enabled', () => {
      const output = renderError(error, { tty: true, color: true });

      expect(output).toContain('💡');
    });

    it('includes docs emoji when color enabled', () => {
      const output = renderError(error, { tty: true, color: true });

      expect(output).toContain('📖');
    });

    it('formats suggestions with arrows for secondary when color enabled', () => {
      const output = renderError(error, { tty: true, color: true });

      expect(output).toContain('→');
    });

    it('falls back to plain format when color disabled', () => {
      const output = renderError(error, { tty: true, color: false });

      expect(output).toContain('ERROR');
      expect(output).toContain('[ADA_NOT_INITIALIZED]');
    });
  });

  describe('colored output', () => {
    it('includes ANSI codes when color enabled', () => {
      const output = renderError(error, { tty: true, color: true });

      // Should contain ANSI escape codes (ESC [ digit m pattern)
      // eslint-disable-next-line no-control-regex
      expect(output).toMatch(/\x1b\[\d+m/);
    });

    it('no ANSI codes when color disabled', () => {
      const output = renderError(error, { tty: true, color: false });

      // Should not contain ANSI escape codes
      // eslint-disable-next-line no-control-regex
      expect(output).not.toMatch(/\x1b\[\d+m/);
    });
  });
});

describe('error rendering for different error types', () => {
  it('renders config errors', () => {
    const error = new AdaError('ADA_CORRUPT_STATE');
    const output = renderError(error, { json: true });
    const parsed = JSON.parse(output);

    expect(parsed.error.exitCode).toBe(3);
    expect(parsed.error.code).toBe('ADA_CORRUPT_STATE');
  });

  it('renders network errors', () => {
    const error = new AdaError('ADA_GITHUB_UNAUTHORIZED');
    const output = renderError(error, { json: true });
    const parsed = JSON.parse(output);

    expect(parsed.error.exitCode).toBe(5);
    // Check that there's a suggestion with gh auth login command
    expect(parsed.error.suggestions).toContainEqual(
      expect.objectContaining({
        command: 'gh auth login',
      })
    );
  });

  it('renders validation errors', () => {
    const error = new AdaError('ADA_MISSING_ACTION', {
      context: { command: 'dispatch complete' },
    });
    const output = renderError(error, { json: true });
    const parsed = JSON.parse(output);

    expect(parsed.error.exitCode).toBe(2);
    expect(parsed.error.context.command).toBe('dispatch complete');
  });

  it('renders git errors', () => {
    const error = new AdaError('ADA_GIT_DIRTY', {
      details: {
        files: ['agents/memory/bank.md', 'docs/new-feature.md'],
      },
    });
    const output = renderError(error, { json: true });
    const parsed = JSON.parse(output);

    expect(parsed.error.exitCode).toBe(6);
    expect(parsed.error.details.files).toContain('agents/memory/bank.md');
  });
});
