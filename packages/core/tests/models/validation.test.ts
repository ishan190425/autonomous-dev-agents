import { describe, it, expect } from 'vitest';
import {
  validateDispatchOutput,
  isValidPrUrl,
  isValidCommitMessage,
  parseDispatchOutput,
  calculateQualityScore,
} from '../../src/models/validation.js';
import type { DispatchOutput } from '../../src/models/types.js';

describe('Validation', () => {
  describe('validateDispatchOutput', () => {
    const validOutput: DispatchOutput = {
      action: '🌌 Implemented model router for role-based LLM selection',
      roleState: 'Last: Model router implementation. Next: Integration with dispatch.',
      memoryUpdates: ['Updated Current Status', 'Updated Frontier state'],
    };

    it('should pass valid output', () => {
      const result = validateDispatchOutput(validOutput, 'frontier');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail on missing action', () => {
      const output = { ...validOutput, action: '' };
      const result = validateDispatchOutput(output, 'frontier');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing action');
      expect(result.suggestedTrigger).toBe('incomplete_output');
    });

    it('should fail on short action', () => {
      const output = { ...validOutput, action: 'Short' };
      const result = validateDispatchOutput(output, 'frontier');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too short');
    });

    it('should fail on missing role state', () => {
      const output = { ...validOutput, roleState: '' };
      const result = validateDispatchOutput(output, 'frontier');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('role state');
    });

    it('should fail on empty memory updates', () => {
      const output = { ...validOutput, memoryUpdates: [] };
      const result = validateDispatchOutput(output, 'frontier');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('memory updates');
    });

    it('should fail on invalid PR URL', () => {
      const output = { ...validOutput, prUrl: 'not-a-url' };
      const result = validateDispatchOutput(output, 'engineering');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('PR URL');
      expect(result.suggestedTrigger).toBe('format_error');
    });

    it('should fail on non-conventional commit message', () => {
      const output = { ...validOutput, commitMessage: 'added some stuff' };
      const result = validateDispatchOutput(output, 'engineering');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('conventional');
    });

    it('should pass with valid PR URL', () => {
      const output = {
        ...validOutput,
        prUrl: 'https://github.com/ishan190425/autonomous-dev-agents/pull/160',
      };
      const result = validateDispatchOutput(output, 'engineering');
      expect(result.valid).toBe(true);
    });

    it('should pass with valid conventional commit', () => {
      const output = {
        ...validOutput,
        commitMessage: 'feat(core): add model router module',
      };
      const result = validateDispatchOutput(output, 'engineering');
      expect(result.valid).toBe(true);
    });
  });

  describe('isValidPrUrl', () => {
    it('should accept valid GitHub PR URL', () => {
      expect(isValidPrUrl('https://github.com/user/repo/pull/123')).toBe(true);
    });

    it('should accept valid org PR URL', () => {
      expect(isValidPrUrl('https://github.com/ishan190425/autonomous-dev-agents/pull/159')).toBe(
        true
      );
    });

    it('should reject non-GitHub URLs', () => {
      expect(isValidPrUrl('https://gitlab.com/user/repo/pull/123')).toBe(false);
    });

    it('should reject malformed URLs', () => {
      expect(isValidPrUrl('github.com/user/repo/pull/123')).toBe(false);
    });

    it('should reject issue URLs', () => {
      expect(isValidPrUrl('https://github.com/user/repo/issues/123')).toBe(false);
    });

    it('should reject PR URLs without number', () => {
      expect(isValidPrUrl('https://github.com/user/repo/pull/')).toBe(false);
    });
  });

  describe('isValidCommitMessage', () => {
    it('should accept feat with scope', () => {
      expect(isValidCommitMessage('feat(core): add model router')).toBe(true);
    });

    it('should accept fix with scope', () => {
      expect(isValidCommitMessage('fix(cli): resolve dispatch bug')).toBe(true);
    });

    it('should accept docs with scope', () => {
      expect(isValidCommitMessage('docs(agents): update DISPATCH.md')).toBe(true);
    });

    it('should accept chore with scope', () => {
      expect(isValidCommitMessage('chore(deps): update dependencies')).toBe(true);
    });

    it('should accept test without scope', () => {
      expect(isValidCommitMessage('test: add router tests')).toBe(true);
    });

    it('should accept ci without scope', () => {
      expect(isValidCommitMessage('ci: update workflow')).toBe(true);
    });

    it('should reject non-conventional messages', () => {
      expect(isValidCommitMessage('Added some new features')).toBe(false);
    });

    it('should reject missing description', () => {
      expect(isValidCommitMessage('feat(core):')).toBe(false);
    });

    it('should reject unknown type', () => {
      expect(isValidCommitMessage('update(core): something')).toBe(false);
    });
  });

  describe('parseDispatchOutput', () => {
    it('should parse JSON output', () => {
      const json = JSON.stringify({
        action: 'Test action description here',
        roleState: 'Current state update',
        memoryUpdates: ['Update 1', 'Update 2'],
      });

      const result = parseDispatchOutput(json, 'engineering');
      expect(result).toBeDefined();
      if (result) {
        expect(result.action).toBe('Test action description here');
        expect(result.memoryUpdates).toHaveLength(2);
      }
    });

    it('should parse markdown-style output', () => {
      const markdown = `
## Action
Implemented new feature for the system

## Role State
Last: Did the thing. Next: Do another thing.

## Memory Updates
- Updated Current Status
- Updated Role State
      `;

      const result = parseDispatchOutput(markdown, 'engineering');
      expect(result).toBeDefined();
      if (result) {
        expect(result.action).toContain('Implemented new feature');
        expect(result.roleState).toContain('Last: Did the thing');
        expect(result.memoryUpdates.length).toBeGreaterThan(0);
      }
    });

    it('should return null for unparseable output', () => {
      const result = parseDispatchOutput('Just some random text', 'engineering');
      expect(result).toBeNull();
    });
  });

  describe('calculateQualityScore', () => {
    it('should score complete output highly', () => {
      const output: DispatchOutput = {
        action: '🌌 Implemented model router for role-based LLM selection with infrastructure patterns',
        roleState: 'Last: Model router implementation. Next: Integration.',
        memoryUpdates: ['Updated Current Status', 'Updated Frontier state'],
        prUrl: 'https://github.com/user/repo/pull/160',
        commitMessage: 'feat(core): add model router',
      };

      const score = calculateQualityScore(output, 'frontier');
      expect(score).toBeGreaterThanOrEqual(90);
    });

    it('should score minimal output lower', () => {
      const output: DispatchOutput = {
        action: 'Did something',
        roleState: 'Updated',
        memoryUpdates: ['One update'],
      };

      const score = calculateQualityScore(output, 'frontier');
      expect(score).toBeLessThan(80);
    });

    it('should give bonus for role-relevant keywords', () => {
      const withKeyword: DispatchOutput = {
        action: 'Implemented prototype for new platform infrastructure',
        roleState: 'State update',
        memoryUpdates: ['Update'],
      };

      const withoutKeyword: DispatchOutput = {
        action: 'Did some work on the codebase today',
        roleState: 'State update',
        memoryUpdates: ['Update'],
      };

      const scoreWith = calculateQualityScore(withKeyword, 'frontier');
      const scoreWithout = calculateQualityScore(withoutKeyword, 'frontier');

      expect(scoreWith).toBeGreaterThan(scoreWithout);
    });

    it('should cap at 100', () => {
      const perfectOutput: DispatchOutput = {
        action:
          '🌌 Implemented prototype for new platform infrastructure system architecture with innovation and comprehensive testing',
        roleState: 'Complete state with all details',
        memoryUpdates: ['Update 1', 'Update 2', 'Update 3'],
        prUrl: 'https://github.com/user/repo/pull/160',
        commitMessage: 'feat(core): add amazing feature',
      };

      const score = calculateQualityScore(perfectOutput, 'frontier');
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
