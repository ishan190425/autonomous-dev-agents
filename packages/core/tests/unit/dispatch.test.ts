/**
 * @ada/core — Dispatch logic unit tests
 *
 * Tests for the pure functions in the dispatch module:
 * resolvePaths (pure path resolution)
 */

import { describe, it, expect } from 'vitest';
import { resolvePaths } from '../../src/dispatch.js';

// ─── resolvePaths ─────────────────────────────────────────────────────────────

describe('resolvePaths', () => {
  it('resolves all paths relative to rootDir with default config', () => {
    const paths = resolvePaths('/home/user/project', 'engineering');

    expect(paths.root).toBe('/home/user/project');
    expect(paths.roster).toBe('/home/user/project/agents/roster.json');
    expect(paths.state).toBe(
      '/home/user/project/agents/state/rotation.json'
    );
    expect(paths.memoryBank).toBe(
      '/home/user/project/agents/memory/bank.md'
    );
    expect(paths.archives).toBe(
      '/home/user/project/agents/memory/archives'
    );
    expect(paths.playbook).toBe(
      '/home/user/project/agents/playbooks/engineering.md'
    );
  });

  it('uses the correct role ID for the playbook path', () => {
    const paths = resolvePaths('/root', 'product');

    expect(paths.playbook).toContain('product.md');
  });

  it('uses custom agentsDir from config', () => {
    const paths = resolvePaths('/root', 'ops', {
      agentsDir: '.ada/',
    });

    expect(paths.roster).toBe('/root/.ada/roster.json');
    expect(paths.state).toBe('/root/.ada/state/rotation.json');
    expect(paths.memoryBank).toBe('/root/.ada/memory/bank.md');
    expect(paths.archives).toBe('/root/.ada/memory/archives');
    expect(paths.playbook).toBe('/root/.ada/playbooks/ops.md');
  });

  it('handles rootDir with trailing slash', () => {
    // path.join normalizes this
    const paths = resolvePaths('/home/user/project/', 'ceo');

    expect(paths.root).toBe('/home/user/project/');
    expect(paths.roster).toContain('roster.json');
  });

  it('resolves playbook for custom role IDs', () => {
    const paths = resolvePaths('/root', 'my-custom-role');

    expect(paths.playbook).toBe(
      '/root/agents/playbooks/my-custom-role.md'
    );
  });
});
