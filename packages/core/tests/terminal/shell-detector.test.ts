/**
 * Shell Detector Tests
 *
 * @see docs/engineering/terminal-mode-technical-spec.md §2
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  detectShell,
  validateShell,
  getShellType,
  isSupported,
} from '../../src/terminal/shell-detector.js';
import { TerminalError } from '../../src/terminal/types.js';

describe('shell-detector', () => {
  describe('getShellType', () => {
    it('detects bash from path', () => {
      expect(getShellType('/bin/bash')).toBe('bash');
      expect(getShellType('/usr/bin/bash')).toBe('bash');
      expect(getShellType('/opt/homebrew/bin/bash')).toBe('bash');
    });

    it('detects zsh from path', () => {
      expect(getShellType('/bin/zsh')).toBe('zsh');
      expect(getShellType('/usr/bin/zsh')).toBe('zsh');
    });

    it('detects sh from path', () => {
      expect(getShellType('/bin/sh')).toBe('sh');
      expect(getShellType('/usr/bin/sh')).toBe('sh');
    });

    it('returns unknown for unsupported shells', () => {
      expect(getShellType('/bin/fish')).toBe('unknown');
      expect(getShellType('/bin/nushell')).toBe('unknown');
      expect(getShellType('/bin/pwsh')).toBe('unknown');
    });
  });

  describe('isSupported', () => {
    it('returns true for supported shells', () => {
      expect(isSupported('bash')).toBe(true);
      expect(isSupported('zsh')).toBe(true);
      expect(isSupported('sh')).toBe(true);
    });

    it('returns false for unsupported shells', () => {
      expect(isSupported('fish')).toBe(false);
      expect(isSupported('nushell')).toBe(false);
      expect(isSupported('unknown')).toBe(false);
    });
  });

  describe('validateShell', () => {
    it('validates existing bash shell', async () => {
      // /bin/sh should exist on most systems
      const result = await validateShell('/bin/sh', true);
      expect(result.path).toBe('/bin/sh');
      expect(result.type).toBe('sh');
      expect(result.detected).toBe(true);
    });

    it('throws for non-existent shell', async () => {
      await expect(validateShell('/nonexistent/shell', false)).rejects.toThrow(
        TerminalError
      );
    });
  });

  describe('detectShell', () => {
    const originalEnv = process.env.SHELL;

    afterEach(() => {
      process.env.SHELL = originalEnv;
    });

    it('uses override when provided', async () => {
      const result = await detectShell({ override: '/bin/sh' });
      expect(result.path).toBe('/bin/sh');
      expect(result.detected).toBe(false); // User-specified
    });

    it('uses $SHELL when set to supported shell', async () => {
      process.env.SHELL = '/bin/sh';
      const result = await detectShell();
      expect(result.type).toBe('sh');
      expect(result.detected).toBe(true);
    });

    it('falls back for unsupported $SHELL', async () => {
      process.env.SHELL = '/bin/fish';
      // Should fall back to /bin/bash (may fail if bash not installed, but sh should work)
      const result = await detectShell({ fallback: '/bin/sh' });
      expect(result.type).toBe('sh');
    });

    it('uses fallback when $SHELL unset', async () => {
      delete process.env.SHELL;
      const result = await detectShell({ fallback: '/bin/sh' });
      expect(result.path).toBe('/bin/sh');
    });
  });
});
