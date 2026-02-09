/**
 * Tests for `ada insights` command
 *
 * ⚙️ Engineering — Cycle 273
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

describe('ada insights', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directory with agents structure
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ada-insights-test-'));
    await fs.mkdir(path.join(tempDir, 'agents/state'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('insights list', () => {
    it('handles empty history gracefully', async () => {
      const rotationState = {
        current_index: 0,
        last_role: 'ceo',
        last_run: new Date().toISOString(),
        cycle_count: 1,
        history: [],
      };
      await fs.writeFile(
        path.join(tempDir, 'agents/state/rotation.json'),
        JSON.stringify(rotationState)
      );

      const result = execSync(
        `node dist/index.js insights list -d ${tempDir}`,
        { cwd: path.join(__dirname, '../../../'), encoding: 'utf-8' }
      );

      expect(result).toContain('No rotation history found');
    });

    it('outputs JSON when requested', async () => {
      const rotationState = {
        current_index: 0,
        last_role: 'ceo',
        last_run: new Date().toISOString(),
        cycle_count: 1,
        history: [],
      };
      await fs.writeFile(
        path.join(tempDir, 'agents/state/rotation.json'),
        JSON.stringify(rotationState)
      );

      const result = execSync(
        `node dist/index.js insights list -d ${tempDir} --json`,
        { cwd: path.join(__dirname, '../../../'), encoding: 'utf-8' }
      );

      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('insights');
      expect(parsed).toHaveProperty('count');
      expect(parsed.count).toBe(0);
    });

    it('respects --cycles option', async () => {
      const history = Array.from({ length: 20 }, (_, i) => ({
        role: ['ceo', 'engineering', 'qa'][i % 3],
        timestamp: new Date().toISOString(),
        cycle: i + 1,
        action: `Action ${i + 1}`,
      }));
      const rotationState = {
        current_index: 0,
        last_role: 'ceo',
        last_run: new Date().toISOString(),
        cycle_count: 20,
        history,
      };
      await fs.writeFile(
        path.join(tempDir, 'agents/state/rotation.json'),
        JSON.stringify(rotationState)
      );

      const result = execSync(
        `node dist/index.js insights list -d ${tempDir} --cycles 10`,
        { cwd: path.join(__dirname, '../../../'), encoding: 'utf-8' }
      );

      expect(result).toContain('Analyzed 10 cycles');
    });
  });

  describe('insights retro', () => {
    it('outputs markdown format', async () => {
      const rotationState = {
        current_index: 0,
        last_role: 'ceo',
        last_run: new Date().toISOString(),
        cycle_count: 1,
        history: [
          {
            role: 'ceo',
            timestamp: new Date().toISOString(),
            cycle: 1,
            action: 'Test action',
          },
        ],
      };
      await fs.writeFile(
        path.join(tempDir, 'agents/state/rotation.json'),
        JSON.stringify(rotationState)
      );

      const result = execSync(
        `node dist/index.js insights retro -d ${tempDir}`,
        { cwd: path.join(__dirname, '../../../'), encoding: 'utf-8' }
      );

      expect(result).toContain('Cross-Role Insights for Retrospective');
      expect(result).toContain('## 🔗 Cross-Role Insights');
    });

    it('outputs JSON with markdown when requested', async () => {
      const rotationState = {
        current_index: 0,
        last_role: 'ceo',
        last_run: new Date().toISOString(),
        cycle_count: 1,
        history: [],
      };
      await fs.writeFile(
        path.join(tempDir, 'agents/state/rotation.json'),
        JSON.stringify(rotationState)
      );

      const result = execSync(
        `node dist/index.js insights retro -d ${tempDir} --json`,
        { cwd: path.join(__dirname, '../../../'), encoding: 'utf-8' }
      );

      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('markdown');
      expect(parsed).toHaveProperty('insights');
    });
  });

  describe('insights --help', () => {
    it('shows help text', () => {
      const result = execSync('node dist/index.js insights --help', {
        cwd: path.join(__dirname, '../../../'),
        encoding: 'utf-8',
      });

      expect(result).toContain('Detect cross-role patterns');
      expect(result).toContain('list');
      expect(result).toContain('retro');
      expect(result).toContain('issue');
    });
  });
});
