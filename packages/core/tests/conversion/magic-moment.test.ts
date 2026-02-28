/**
 * @fileoverview Unit tests for Magic Moment Detection
 *
 * Tests AC-5.1.1 and AC-5.1.2 from C1267.
 */

import { describe, it, expect } from 'vitest';
import {
  type DispatchContext,
  type Artifact,
  ARTIFACT_PATTERNS,
  ACTION_PATTERNS,
  DefaultMagicMomentDetector,
  createMagicMomentDetector,
  detectMagicMoment,
} from '../../src/conversion/magic-moment.js';

// ============================================================================
// AC-5.1.1: Pattern Matching Works
// ============================================================================

describe('Artifact Detection Patterns', () => {
  describe('PR Detection', () => {
    it('should detect "Created pull request #123"', () => {
      const { artifacts, isMagicMoment } = detectMagicMoment(
        'Created pull request #123',
        { cycle: 1, role: 'engineering' }
      );

      expect(artifacts.some(a => a.type === 'pr')).toBe(true);
      expect(isMagicMoment).toBe(true);
    });

    it('should detect "PR #45 created"', () => {
      const { artifacts, isMagicMoment } = detectMagicMoment(
        'PR #45 created',
        { cycle: 1, role: 'engineering' }
      );

      expect(artifacts.some(a => a.type === 'pr')).toBe(true);
      expect(isMagicMoment).toBe(true);
    });

    it('should detect GitHub PR URL', () => {
      const { artifacts, isMagicMoment } = detectMagicMoment(
        'Check out https://github.com/user/repo/pull/67',
        { cycle: 1, role: 'engineering' }
      );

      expect(artifacts.some(a => a.type === 'pr')).toBe(true);
      expect(isMagicMoment).toBe(true);
    });

    it('should detect PR from action text', () => {
      const { artifacts } = detectMagicMoment(
        '',
        { cycle: 1, role: 'engineering', action: 'Created PR #100 — feat: add new feature' }
      );

      expect(artifacts.some(a => a.type === 'pr')).toBe(true);
    });
  });

  describe('Issue Detection', () => {
    it('should detect "Created issue #89"', () => {
      const { artifacts, isMagicMoment } = detectMagicMoment(
        'Created issue #89',
        { cycle: 1, role: 'product' }
      );

      expect(artifacts.some(a => a.type === 'issue')).toBe(true);
      expect(isMagicMoment).toBe(true);
    });

    it('should detect "Issue #101 created"', () => {
      const { artifacts, isMagicMoment } = detectMagicMoment(
        'Issue #101 created',
        { cycle: 1, role: 'product' }
      );

      expect(artifacts.some(a => a.type === 'issue')).toBe(true);
      expect(isMagicMoment).toBe(true);
    });

    it('should detect GitHub issue URL', () => {
      const { artifacts, isMagicMoment } = detectMagicMoment(
        'See https://github.com/user/repo/issues/102',
        { cycle: 1, role: 'product' }
      );

      expect(artifacts.some(a => a.type === 'issue')).toBe(true);
      expect(isMagicMoment).toBe(true);
    });
  });

  describe('Comment Detection', () => {
    it('should detect "Commented on #103"', () => {
      const { artifacts, isMagicMoment } = detectMagicMoment(
        'Commented on #103',
        { cycle: 1, role: 'ops' }
      );

      expect(artifacts.some(a => a.type === 'comment')).toBe(true);
      expect(isMagicMoment).toBe(true);
    });

    it('should detect "Added comment to issue #104"', () => {
      const { artifacts, isMagicMoment } = detectMagicMoment(
        'Added comment to issue #104',
        { cycle: 1, role: 'ops' }
      );

      expect(artifacts.some(a => a.type === 'comment')).toBe(true);
      expect(isMagicMoment).toBe(true);
    });
  });

  describe('Doc Detection', () => {
    it('should detect "Updated README.md"', () => {
      const { artifacts, isMagicMoment } = detectMagicMoment(
        'Updated README.md',
        { cycle: 1, role: 'docs' }
      );

      expect(artifacts.some(a => a.type === 'doc')).toBe(true);
      // Docs alone are NOT magic moments
      expect(isMagicMoment).toBe(false);
    });

    it('should detect documentation updates', () => {
      const { artifacts } = detectMagicMoment(
        'Created documentation for the new feature',
        { cycle: 1, role: 'docs' }
      );

      expect(artifacts.some(a => a.type === 'doc')).toBe(true);
    });
  });
});

// ============================================================================
// AC-5.1.2: Magic Moment Flag
// ============================================================================

describe('isMagicMoment', () => {
  const detector = createMagicMomentDetector();

  it('should return true if any artifact is PR', () => {
    const artifacts: Artifact[] = [
      { type: 'pr', createdAt: new Date() },
    ];

    expect(detector.isMagicMoment(artifacts)).toBe(true);
  });

  it('should return true if any artifact is issue', () => {
    const artifacts: Artifact[] = [
      { type: 'issue', createdAt: new Date() },
    ];

    expect(detector.isMagicMoment(artifacts)).toBe(true);
  });

  it('should return true if any artifact is comment', () => {
    const artifacts: Artifact[] = [
      { type: 'comment', createdAt: new Date() },
    ];

    expect(detector.isMagicMoment(artifacts)).toBe(true);
  });

  it('should return false for doc-only artifacts', () => {
    const artifacts: Artifact[] = [
      { type: 'doc', createdAt: new Date() },
    ];

    expect(detector.isMagicMoment(artifacts)).toBe(false);
  });

  it('should return false for commit-only artifacts', () => {
    const artifacts: Artifact[] = [
      { type: 'commit', createdAt: new Date() },
    ];

    expect(detector.isMagicMoment(artifacts)).toBe(false);
  });

  it('should return false for empty artifacts', () => {
    expect(detector.isMagicMoment([])).toBe(false);
  });

  it('should return true if mixed artifacts include a magic moment type', () => {
    const artifacts: Artifact[] = [
      { type: 'doc', createdAt: new Date() },
      { type: 'commit', createdAt: new Date() },
      { type: 'pr', createdAt: new Date() },
    ];

    expect(detector.isMagicMoment(artifacts)).toBe(true);
  });
});

// ============================================================================
// DefaultMagicMomentDetector
// ============================================================================

describe('DefaultMagicMomentDetector', () => {
  const detector = new DefaultMagicMomentDetector();

  describe('detectArtifacts', () => {
    it('should detect multiple artifact types in one output', () => {
      const output = `
        Created pull request #100
        Also created issue #101 for follow-up
      `;
      const context: DispatchContext = { cycle: 1, role: 'engineering' };

      const artifacts = detector.detectArtifacts(output, context);

      expect(artifacts.some(a => a.type === 'pr')).toBe(true);
      expect(artifacts.some(a => a.type === 'issue')).toBe(true);
    });

    it('should only detect one artifact per type', () => {
      const output = `
        Created pull request #100
        Also opened PR #101
        And another PR #102
      `;
      const context: DispatchContext = { cycle: 1, role: 'engineering' };

      const artifacts = detector.detectArtifacts(output, context);
      const prArtifacts = artifacts.filter(a => a.type === 'pr');

      // Should only have one PR artifact (deduped by type)
      expect(prArtifacts).toHaveLength(1);
    });

    it('should prefer action text over output text', () => {
      const context: DispatchContext = {
        cycle: 1,
        role: 'engineering',
        action: '⚙️ PR #123 — Added new feature',
      };

      const artifacts = detector.detectArtifacts('', context);

      expect(artifacts.some(a => a.type === 'pr')).toBe(true);
    });

    it('should handle empty output gracefully', () => {
      const context: DispatchContext = { cycle: 1, role: 'engineering' };
      const artifacts = detector.detectArtifacts('', context);

      expect(artifacts).toEqual([]);
    });

    it('should handle output with no artifacts', () => {
      const context: DispatchContext = { cycle: 1, role: 'engineering' };
      const artifacts = detector.detectArtifacts(
        'Just did some refactoring work',
        context
      );

      expect(artifacts).toEqual([]);
    });
  });
});

// ============================================================================
// Convenience Functions
// ============================================================================

describe('createMagicMomentDetector', () => {
  it('should create a DefaultMagicMomentDetector', () => {
    const detector = createMagicMomentDetector();

    expect(detector).toBeInstanceOf(DefaultMagicMomentDetector);
  });
});

describe('detectMagicMoment', () => {
  it('should return both artifacts and isMagicMoment flag', () => {
    const result = detectMagicMoment('Created pull request #123', {
      cycle: 1,
      role: 'engineering',
    });

    expect(result.artifacts).toBeDefined();
    expect(typeof result.isMagicMoment).toBe('boolean');
    expect(result.isMagicMoment).toBe(true);
  });

  it('should work with action-only context', () => {
    const result = detectMagicMoment('', {
      cycle: 1,
      role: 'engineering',
      action: 'Created Issue #50 for bug tracking',
    });

    expect(result.artifacts.some(a => a.type === 'issue')).toBe(true);
    expect(result.isMagicMoment).toBe(true);
  });
});

// ============================================================================
// Pattern Constants
// ============================================================================

describe('ARTIFACT_PATTERNS', () => {
  it('should have patterns for all artifact types', () => {
    expect(ARTIFACT_PATTERNS.pr).toBeDefined();
    expect(ARTIFACT_PATTERNS.issue).toBeDefined();
    expect(ARTIFACT_PATTERNS.comment).toBeDefined();
    expect(ARTIFACT_PATTERNS.doc).toBeDefined();
    expect(ARTIFACT_PATTERNS.commit).toBeDefined();
  });

  it('should have multiple patterns per type for robustness', () => {
    expect(ARTIFACT_PATTERNS.pr.length).toBeGreaterThanOrEqual(2);
    expect(ARTIFACT_PATTERNS.issue.length).toBeGreaterThanOrEqual(2);
    expect(ARTIFACT_PATTERNS.comment.length).toBeGreaterThanOrEqual(2);
  });
});

describe('ACTION_PATTERNS', () => {
  it('should have patterns for all artifact types', () => {
    expect(ACTION_PATTERNS.pr).toBeDefined();
    expect(ACTION_PATTERNS.issue).toBeDefined();
    expect(ACTION_PATTERNS.comment).toBeDefined();
    expect(ACTION_PATTERNS.doc).toBeDefined();
    expect(ACTION_PATTERNS.commit).toBeDefined();
  });
});

// ============================================================================
// Real-World Dispatch Action Examples
// ============================================================================

describe('Real-World Action Examples', () => {
  it('should detect magic moment from typical Engineering action', () => {
    const action = '⚙️ PR #264 API SDK TESTS + URL FIX (C1260) — Engineering added 67 comprehensive unit tests';
    const { isMagicMoment } = detectMagicMoment('', {
      cycle: 1260,
      role: 'engineering',
      action,
    });

    expect(isMagicMoment).toBe(true);
  });

  it('should detect magic moment from typical Product action', () => {
    const action = '📦 Created Issue #155 — SaaS Container tracking';
    const { isMagicMoment } = detectMagicMoment('', {
      cycle: 1000,
      role: 'product',
      action,
    });

    expect(isMagicMoment).toBe(true);
  });

  it('should NOT detect magic moment from documentation-only action', () => {
    const action = '🎨 SPRINT 3 ONBOARDING INTEGRATION SPEC (C1262) — Created docs/design/sprint3-onboarding-integration-spec.md';
    const { isMagicMoment } = detectMagicMoment('', {
      cycle: 1262,
      role: 'design',
      action,
    });

    // Doc creation is not a magic moment
    expect(isMagicMoment).toBe(false);
  });

  it('should detect comment from Ops action', () => {
    const action = '🛡️ Commented on #155, #183 with merge confirmation';
    const { artifacts, isMagicMoment } = detectMagicMoment('', {
      cycle: 1261,
      role: 'ops',
      action,
    });

    expect(artifacts.some(a => a.type === 'comment')).toBe(true);
    expect(isMagicMoment).toBe(true);
  });
});
