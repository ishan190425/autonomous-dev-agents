/**
 * @file Pre-flight Checks Tests
 * @description Unit tests for pre-flight environment validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runPreflightChecks,
  formatPreflightResults,
  type PreflightResults,
} from '../preflight.js';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock child_process for GitHub CLI check
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'node:child_process';

describe('preflight', () => {
  const mockExecSync = vi.mocked(execSync);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runPreflightChecks', () => {
    it('passes all checks in a valid git repo with gh CLI', async () => {
      // Mock gh CLI available
      mockExecSync.mockReturnValue('gh version 2.45.0 (2024-02-21)');

      // Use the monorepo root which has .git (walk up from packages/cli)
      const repoRoot = path.resolve(__dirname, '../../../../..');
      const results = await runPreflightChecks(repoRoot);

      expect(results.canProceed).toBe(true);
      expect(results.checks.length).toBeGreaterThanOrEqual(4);

      // Check Node.js version passes (we're running the test on 18+)
      const nodeCheck = results.checks.find((c) => c.name === 'Node.js Version');
      expect(nodeCheck?.passed).toBe(true);
    });

    it('fails when not in a git repository', async () => {
      // Mock gh CLI available
      mockExecSync.mockReturnValue('gh version 2.45.0');

      // Use /tmp which should not be a git repo
      const results = await runPreflightChecks('/tmp');

      // Should fail canProceed because git repo is required
      const gitCheck = results.checks.find((c) => c.name === 'Git Repository');
      expect(gitCheck?.passed).toBe(false);
      expect(gitCheck?.required).toBe(true);
      expect(results.canProceed).toBe(false);
    });

    it('warns but proceeds when gh CLI is not installed', async () => {
      // Mock gh CLI not found
      mockExecSync.mockImplementation(() => {
        throw new Error('command not found: gh');
      });

      // Use the monorepo root which has .git
      const repoRoot = path.resolve(__dirname, '../../../../..');
      const results = await runPreflightChecks(repoRoot);

      const ghCheck = results.checks.find((c) => c.name === 'GitHub CLI');
      expect(ghCheck?.passed).toBe(false);
      expect(ghCheck?.required).toBe(false);

      // Should still be able to proceed (gh is optional)
      expect(results.warnings).toBeGreaterThanOrEqual(1);
    });

    it('includes suggestion for failed checks', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('command not found: gh');
      });

      const results = await runPreflightChecks('/tmp');

      const gitCheck = results.checks.find((c) => c.name === 'Git Repository');
      expect(gitCheck?.suggestion).toContain('git init');

      const ghCheck = results.checks.find((c) => c.name === 'GitHub CLI');
      expect(ghCheck?.suggestion).toContain('https://cli.github.com');
    });
  });

  describe('formatPreflightResults', () => {
    it('formats passing results with green checkmarks', () => {
      const results: PreflightResults = {
        checks: [
          {
            name: 'Test Check',
            passed: true,
            required: true,
            message: 'All good',
            value: 'v1.0.0',
          },
        ],
        canProceed: true,
        warnings: 0,
      };

      const output = formatPreflightResults(results);

      expect(output).toContain('Test Check');
      expect(output).toContain('v1.0.0');
      expect(output).toContain('All pre-flight checks passed');
    });

    it('formats failed required checks with red X', () => {
      const results: PreflightResults = {
        checks: [
          {
            name: 'Git Repository',
            passed: false,
            required: true,
            message: 'Not a git repository',
            suggestion: 'Run git init',
          },
        ],
        canProceed: false,
        warnings: 0,
      };

      const output = formatPreflightResults(results);

      expect(output).toContain('Git Repository');
      expect(output).toContain('Not a git repository');
      expect(output).toContain('Run git init');
      expect(output).toContain('Pre-flight checks failed');
    });

    it('formats warnings with yellow warning icon', () => {
      const results: PreflightResults = {
        checks: [
          {
            name: 'Optional Check',
            passed: false,
            required: false,
            message: 'Not found but optional',
            suggestion: 'Install it',
          },
        ],
        canProceed: true,
        warnings: 1,
      };

      const output = formatPreflightResults(results);

      expect(output).toContain('Optional Check');
      expect(output).toContain('1 warning');
    });
  });

  describe('Node.js version check', () => {
    it('detects current Node.js version', async () => {
      mockExecSync.mockReturnValue('gh version 2.45.0');

      // Use the monorepo root
      const repoRoot = path.resolve(__dirname, '../../../../..');
      const results = await runPreflightChecks(repoRoot);

      const nodeCheck = results.checks.find((c) => c.name === 'Node.js Version');
      expect(nodeCheck).toBeDefined();
      expect(nodeCheck?.value).toMatch(/^v\d+\.\d+\.\d+$/);
    });
  });

  describe('package.json check', () => {
    it('detects package.json in the repo root', async () => {
      mockExecSync.mockReturnValue('gh version 2.45.0');

      // Run in repo root which has package.json
      const repoRoot = path.resolve(__dirname, '../../../../..');
      const results = await runPreflightChecks(repoRoot);

      const pkgCheck = results.checks.find((c) => c.name === 'package.json');
      expect(pkgCheck?.passed).toBe(true);
      expect(pkgCheck?.required).toBe(false);
    });
  });
});
