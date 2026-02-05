/**
 * Regression tests for `ada init` command.
 *
 * Issue #16: ESM __dirname compatibility.
 * The CLI uses ESM ("type": "module") but was referencing the CJS-only
 * __dirname global, causing a ReferenceError at runtime.
 */

import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

describe('ada init — ESM compatibility (#16)', () => {
  it('should resolve __dirname via import.meta.url without throwing', () => {
    // This is the exact pattern used in init.ts — verifies it works in ESM context
    const filename = fileURLToPath(import.meta.url);
    const dirname = path.dirname(filename);

    expect(typeof dirname).toBe('string');
    expect(dirname.length).toBeGreaterThan(0);
    expect(path.isAbsolute(dirname)).toBe(true);
  });

  it('should resolve the CLI package root from the commands directory', () => {
    // Mirrors the logic in copyTemplateFiles():
    //   const cliRoot = path.dirname(path.dirname(__dirname));
    // From dist/commands/ → going up 2 levels → packages/cli/
    const filename = fileURLToPath(import.meta.url);
    const dirname = path.dirname(filename);
    const cliRoot = path.dirname(path.dirname(dirname));

    // cliRoot should be a valid directory path
    expect(typeof cliRoot).toBe('string');
    expect(path.isAbsolute(cliRoot)).toBe(true);
  });

  it('should resolve templates directory from CLI root', () => {
    // Full path resolution chain from init.ts:
    //   cliRoot = ../../ from dist/commands/
    //   templatesDir = cliRoot/../../templates
    //   templateSource = templatesDir/agents
    const filename = fileURLToPath(import.meta.url);
    const dirname = path.dirname(filename);
    const cliRoot = path.dirname(path.dirname(dirname));
    const templatesDir = path.join(cliRoot, '..', '..', 'templates');
    const templateSource = path.join(templatesDir, 'agents');

    // Verify the path chain resolves to valid absolute paths (no undefined segments)
    expect(path.isAbsolute(templatesDir)).toBe(true);
    expect(path.isAbsolute(templateSource)).toBe(true);
    expect(templateSource).toContain('templates');
    expect(templateSource).toContain('agents');
  });

  it('should not use CJS __dirname global directly', async () => {
    // Read the init.ts source and verify it imports fileURLToPath
    const { readFile } = await import('node:fs/promises');
    const initSource = await readFile(
      path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        '..',
        'init.ts'
      ),
      'utf-8'
    );

    // Must import fileURLToPath for ESM __dirname
    expect(initSource).toContain("import { fileURLToPath } from 'node:url'");
    expect(initSource).toContain('fileURLToPath(import.meta.url)');

    // Should define __dirname at module scope (not use the CJS global directly in function body)
    expect(initSource).toContain('const __dirname = path.dirname(__filename)');
  });
});
