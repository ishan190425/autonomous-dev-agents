/**
 * Unit tests for template bundling in npm package.
 *
 * These tests validate that templates are correctly bundled
 * with the CLI package for npm distribution.
 *
 * **Related Issue:** #150 — bug(cli): `ada init` fails on npm-installed CLI
 *
 * **Context:**
 * - In monorepo dev: Templates at `../../templates/` work fine
 * - In npm install: Templates must be bundled inside CLI package
 *
 * **Fix Criteria (from Research C679):**
 * 1. Templates exist at `packages/cli/templates/`
 * 2. package.json includes `"templates"` in files array
 * 3. Path resolution uses `__dirname/../templates/` (not `../../templates/`)
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CLI package root (packages/cli/)
 */
const CLI_ROOT = path.resolve(__dirname, '../..');

/**
 * Where templates should live for npm bundling.
 * After fix: packages/cli/templates/agents/
 */
const BUNDLED_TEMPLATES_PATH = path.join(CLI_ROOT, 'templates', 'agents');

/**
 * Monorepo templates path (current, works in dev only).
 */
const MONOREPO_TEMPLATES_PATH = path.resolve(CLI_ROOT, '..', '..', 'templates', 'agents');

/**
 * Required template files that must exist for ada init to work.
 */
const REQUIRED_TEMPLATE_FILES = [
  'DISPATCH.md',
  'roster.json',
  'state/rotation.json',
  'memory/bank.md',
  'rules/RULES.md',
];

describe('template bundling — #150 regression tests', () => {
  describe('template file existence', () => {
    /**
     * This test documents the current state.
     * After #150 fix, this should pass with BUNDLED_TEMPLATES_PATH.
     */
    it('templates exist in monorepo (current development setup)', () => {
      // This is the current state — works in dev, fails in npm
      expect(fs.existsSync(MONOREPO_TEMPLATES_PATH)).toBe(true);

      for (const file of REQUIRED_TEMPLATE_FILES) {
        const filePath = path.join(MONOREPO_TEMPLATES_PATH, file);
        expect(
          fs.existsSync(filePath),
          `Missing template file: ${file}`
        ).toBe(true);
      }
    });

    /**
     * After #150 fix, this test should pass.
     * Currently expected to FAIL until fix is implemented.
     *
     * @todo Enable this test after Engineering implements #150 fix
     */
    it.skip('templates exist in CLI package (npm bundled setup)', () => {
      expect(
        fs.existsSync(BUNDLED_TEMPLATES_PATH),
        'Templates should be bundled at packages/cli/templates/agents/'
      ).toBe(true);

      for (const file of REQUIRED_TEMPLATE_FILES) {
        const filePath = path.join(BUNDLED_TEMPLATES_PATH, file);
        expect(
          fs.existsSync(filePath),
          `Missing bundled template file: ${file}`
        ).toBe(true);
      }
    });
  });

  describe('package.json configuration', () => {
    it('package.json files array includes dist', () => {
      const packageJsonPath = path.join(CLI_ROOT, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      expect(packageJson.files).toContain('dist');
    });

    /**
     * After #150 fix, this test should pass.
     * Currently expected to FAIL until fix is implemented.
     *
     * @todo Enable this test after Engineering implements #150 fix
     */
    it.skip('package.json files array includes templates', () => {
      const packageJsonPath = path.join(CLI_ROOT, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      expect(
        packageJson.files,
        'files array should include "templates" for npm bundling'
      ).toContain('templates');
    });
  });

  describe('template content validation', () => {
    it('DISPATCH.md contains agent dispatch protocol', () => {
      const dispatchPath = path.join(MONOREPO_TEMPLATES_PATH, 'DISPATCH.md');
      const content = fs.readFileSync(dispatchPath, 'utf-8');

      expect(content).toContain('Agent Dispatch Protocol');
      expect(content).toContain('Phase 1');
      expect(content).toContain('Heartbeat Cycle');
    });

    it('roster.json has valid structure', () => {
      const rosterPath = path.join(MONOREPO_TEMPLATES_PATH, 'roster.json');
      const roster = JSON.parse(fs.readFileSync(rosterPath, 'utf-8'));

      expect(roster).toHaveProperty('company');
      expect(roster).toHaveProperty('product');
      expect(roster).toHaveProperty('roles');
      expect(roster).toHaveProperty('rotation_order');
      expect(Array.isArray(roster.roles)).toBe(true);
      expect(roster.roles.length).toBeGreaterThan(0);
    });

    it('rotation.json has initial state structure', () => {
      const rotationPath = path.join(MONOREPO_TEMPLATES_PATH, 'state', 'rotation.json');
      const rotation = JSON.parse(fs.readFileSync(rotationPath, 'utf-8'));

      expect(rotation).toHaveProperty('current_index');
      expect(rotation).toHaveProperty('cycle_count');
      expect(rotation).toHaveProperty('history');
      expect(rotation.current_index).toBe(0);
      expect(rotation.cycle_count).toBe(0);
    });
  });
});

describe('npm pack simulation', () => {
  /**
   * Validates what would be included in npm package.
   *
   * @todo After #150 fix, verify templates are in pack output
   */
  it('documents current npm pack behavior', () => {
    const packageJsonPath = path.join(CLI_ROOT, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    // Current state: only dist is included
    const currentFiles = packageJson.files || [];

    // This assertion documents the gap (current state)
    expect(currentFiles).toEqual(['dist']);

    // After fix, update assertion to:
    // expect(currentFiles).toEqual(expect.arrayContaining(['dist', 'templates']));
  });
});
