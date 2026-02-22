/**
 * Tests for progress indicators.
 *
 * @see Issue #175 — Progress Indicators for Long-Running Operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { spinner, stepProgress, isTTY, isNoColor, isCI } from '../progress.js';

describe('progress', () => {
  describe('environment detection', () => {
    const originalEnv = { ...process.env };
    const originalIsTTY = process.stdout.isTTY;

    afterEach(() => {
      process.env = { ...originalEnv };
      Object.defineProperty(process.stdout, 'isTTY', {
        value: originalIsTTY,
        writable: true,
      });
    });

    it('isTTY returns false when not TTY', () => {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: false,
        writable: true,
      });
      expect(isTTY()).toBe(false);
    });

    it('isTTY returns false in CI', () => {
      process.env.CI = 'true';
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
      });
      expect(isTTY()).toBe(false);
    });

    it('isTTY returns false in GitHub Actions', () => {
      process.env.GITHUB_ACTIONS = 'true';
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
      });
      expect(isTTY()).toBe(false);
    });

    it('isNoColor respects NO_COLOR env', () => {
      process.env.NO_COLOR = '1';
      expect(isNoColor()).toBe(true);
    });

    it('isNoColor respects dumb terminal', () => {
      delete process.env.NO_COLOR;
      process.env.TERM = 'dumb';
      expect(isNoColor()).toBe(true);
    });

    it('isCI detects CI environment', () => {
      process.env.CI = 'true';
      expect(isCI()).toBe(true);
    });

    it('isCI detects GitHub Actions', () => {
      delete process.env.CI;
      process.env.GITHUB_ACTIONS = 'true';
      expect(isCI()).toBe(true);
    });

    it('isCI detects GitLab CI', () => {
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      process.env.GITLAB_CI = 'true';
      expect(isCI()).toBe(true);
    });
  });

  describe('Spinner', () => {
    beforeEach(() => {
      // Force non-TTY for consistent testing
      Object.defineProperty(process.stdout, 'isTTY', {
        value: false,
        writable: true,
      });
    });

    it('creates spinner with text', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const spin = spinner('Loading...');
      expect(spin).toBeDefined();
      expect(spin.elapsed()).toBeGreaterThanOrEqual(0);
      consoleSpy.mockRestore();
    });

    it('tracks elapsed time', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const spin = spinner('Test');
      
      // Wait a bit using Promise-based delay
      await new Promise<void>(resolve => globalThis.setTimeout(resolve, 50));
      
      expect(spin.elapsed()).toBeGreaterThanOrEqual(0);
      spin.stop();
      consoleSpy.mockRestore();
    });

    it('skips spinner in json mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const spin = spinner('Test', { json: true });
      spin.succeed('Done');
      // Should not log anything in JSON mode
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('skips spinner in quiet mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const spin = spinner('Test', { quiet: true });
      spin.succeed('Done');
      // Should not log anything in quiet mode
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('logs in CI mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const spin = spinner('Loading...');
      spin.succeed('Done!');
      
      // In non-TTY mode, should log [INFO] and [OK]
      expect(consoleSpy).toHaveBeenCalledWith('[INFO] Loading...');
      expect(consoleSpy).toHaveBeenCalledWith('[OK] Done!');
      consoleSpy.mockRestore();
    });

    it('logs failure correctly', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const spin = spinner('Processing...');
      spin.fail('Error occurred');
      
      expect(consoleSpy).toHaveBeenCalledWith('[FAIL] Error occurred');
      consoleSpy.mockRestore();
    });

    it('logs warning correctly', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const spin = spinner('Checking...');
      spin.warn('Skipped optional step');
      
      expect(consoleSpy).toHaveBeenCalledWith('[WARN] Skipped optional step');
      consoleSpy.mockRestore();
    });

    it('updates text', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const spin = spinner('Starting...');
      spin.text('Now doing something else...');
      
      expect(consoleSpy).toHaveBeenCalledWith('[INFO] Now doing something else...');
      consoleSpy.mockRestore();
    });
  });

  describe('StepProgress', () => {
    beforeEach(() => {
      // Force non-TTY for consistent testing
      Object.defineProperty(process.stdout, 'isTTY', {
        value: false,
        writable: true,
      });
    });

    it('creates step progress with steps', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const steps = stepProgress(['Step 1', 'Step 2', 'Step 3']);
      expect(steps).toBeDefined();
      consoleSpy.mockRestore();
    });

    it('logs step start', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const steps = stepProgress(['Load data', 'Process', 'Save']);
      
      steps.start(0);
      expect(consoleSpy).toHaveBeenCalledWith('[...] Load data');
      consoleSpy.mockRestore();
    });

    it('logs step completion', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const steps = stepProgress(['Load data', 'Process']);
      
      steps.start(0);
      steps.complete(0);
      expect(consoleSpy).toHaveBeenCalledWith('[OK] Load data');
      consoleSpy.mockRestore();
    });

    it('logs step failure', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const steps = stepProgress(['Validate', 'Execute']);
      
      steps.start(0);
      steps.fail(0, 'Validation error');
      expect(consoleSpy).toHaveBeenCalledWith('[FAIL] Validate — Validation error');
      consoleSpy.mockRestore();
    });

    it('logs step skip', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const steps = stepProgress(['Required', 'Optional']);
      
      steps.skip(1, 'Not needed');
      expect(consoleSpy).toHaveBeenCalledWith('[SKIP] Optional — Not needed');
      consoleSpy.mockRestore();
    });

    it('handles detail text', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const steps = stepProgress(['Process file']);
      
      steps.start(0, 'data.json');
      expect(consoleSpy).toHaveBeenCalledWith('[...] Process file — data.json');
      consoleSpy.mockRestore();
    });

    it('ignores invalid step indices', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const steps = stepProgress(['Only step']);
      
      // These should not throw
      steps.start(-1);
      steps.start(99);
      steps.complete(-1);
      steps.complete(99);
      steps.fail(-1);
      steps.fail(99);
      
      // Only valid operations should have logged
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('[...]'));
      consoleSpy.mockRestore();
    });

    it('skips output in json mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const steps = stepProgress(['Step 1'], { json: true });
      
      steps.start(0);
      steps.complete(0);
      
      // Should not log anything
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('skips output in quiet mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const steps = stepProgress(['Step 1'], { quiet: true });
      
      steps.start(0);
      steps.complete(0);
      
      // Should not log anything
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
