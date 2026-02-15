/**
 * Tests for PR Workflow module
 *
 * @see Issue #128 — Agent PR Workflow
 * @see docs/design/pr-workflow-cli-ux-spec-c625.md
 * @see docs/product/pr-workflow-user-stories-c630.md
 */

import { describe, it, expect } from 'vitest';
import {
  classifyFile,
  generateActionSlug,
  generateBranchName,
  validateBranchName,
  generatePRTitle,
  generatePRBody,
} from '../src/pr-workflow.js';

describe('pr-workflow', () => {
  // ─── File Classification (US-128-2) ────────────────────────────────────────

  describe('classifyFile', () => {
    describe('code files', () => {
      it('classifies TypeScript files as code', () => {
        expect(classifyFile('src/index.ts')).toBe('code');
        expect(classifyFile('packages/cli/src/commands/dispatch.ts')).toBe('code');
      });

      it('classifies JavaScript files as code', () => {
        expect(classifyFile('lib/utils.js')).toBe('code');
        expect(classifyFile('config.mjs')).toBe('code');
        expect(classifyFile('config.cjs')).toBe('code');
      });

      it('classifies test files as code', () => {
        expect(classifyFile('src/__tests__/pr-workflow.test.ts')).toBe('code');
        expect(classifyFile('tests/unit/memory.spec.ts')).toBe('code');
      });

      it('classifies CI workflows as code', () => {
        expect(classifyFile('.github/workflows/ci.yml')).toBe('code');
        expect(classifyFile('.github/workflows/release.yaml')).toBe('code');
      });

      it('classifies package.json as code', () => {
        expect(classifyFile('package.json')).toBe('code');
        expect(classifyFile('packages/cli/package.json')).toBe('code');
      });

      it('classifies TypeScript config as code', () => {
        expect(classifyFile('tsconfig.json')).toBe('code');
        expect(classifyFile('tsconfig.build.json')).toBe('code');
      });

      it('classifies Python files as code', () => {
        expect(classifyFile('scripts/build.py')).toBe('code');
      });

      it('classifies other languages as code', () => {
        expect(classifyFile('main.go')).toBe('code');
        expect(classifyFile('lib.rs')).toBe('code');
        expect(classifyFile('app.rb')).toBe('code');
      });
    });

    describe('doc files', () => {
      it('classifies markdown files as doc', () => {
        expect(classifyFile('README.md')).toBe('doc');
        expect(classifyFile('docs/design/spec.md')).toBe('doc');
      });

      it('classifies agent state files as doc', () => {
        expect(classifyFile('agents/memory/bank.md')).toBe('doc');
        expect(classifyFile('agents/state/rotation.json')).toBe('doc');
        expect(classifyFile('agents/roster.json')).toBe('doc');
      });

      it('classifies docs directory files as doc', () => {
        expect(classifyFile('docs/business/roadmap.md')).toBe('doc');
        expect(classifyFile('docs/research/findings.md')).toBe('doc');
      });
    });

    describe('unknown files', () => {
      it('classifies unknown extensions as unknown', () => {
        expect(classifyFile('data.csv')).toBe('unknown');
        expect(classifyFile('image.png')).toBe('unknown');
      });
    });

    describe('edge cases', () => {
      it('handles Windows path separators', () => {
        expect(classifyFile('agents\\memory\\bank.md')).toBe('doc');
        expect(classifyFile('src\\index.ts')).toBe('code');
      });

      it('is case-insensitive for extensions', () => {
        expect(classifyFile('README.MD')).toBe('doc');
        expect(classifyFile('INDEX.TS')).toBe('code');
      });
    });
  });

  // ─── Branch Name Generation (US-128-3) ─────────────────────────────────────

  describe('generateActionSlug', () => {
    it('converts to lowercase', () => {
      expect(generateActionSlug('PR WORKFLOW CLI UX SPEC')).toBe('pr-workflow-cli-ux-spec');
    });

    it('removes emojis', () => {
      expect(generateActionSlug('🎨 PR WORKFLOW CLI UX SPEC')).toBe('pr-workflow-cli-ux-spec');
      expect(generateActionSlug('⚙️ Heat Scoring CLI Integration')).toBe('heat-scoring-cli-integration');
      expect(generateActionSlug('🔍 E2E Testing Setup')).toBe('e2e-testing-setup');
    });

    it('replaces non-alphanumeric with hyphens', () => {
      expect(generateActionSlug('Fix: memory bug #123')).toBe('fix-memory-bug-123');
      expect(generateActionSlug("User's profile (beta)")).toBe('user-s-profile-beta');
    });

    it('removes leading and trailing hyphens', () => {
      expect(generateActionSlug('---test---')).toBe('test');
      expect(generateActionSlug('🎨 Test')).toBe('test');
    });

    it('truncates to 50 characters', () => {
      const longAction = 'Very long action description that exceeds fifty characters total and keeps going';
      const slug = generateActionSlug(longAction);
      expect(slug.length).toBeLessThanOrEqual(50);
      expect(slug.endsWith('-')).toBe(false);
    });

    it('handles edge cases', () => {
      expect(generateActionSlug('')).toBe('');
      expect(generateActionSlug('🎨🔍⚙️')).toBe('');
      expect(generateActionSlug('test123')).toBe('test123');
    });
  });

  describe('generateBranchName', () => {
    it('follows convention: ada/c{cycle}-{role}-{slug}', () => {
      expect(generateBranchName(625, 'design', '🎨 PR WORKFLOW CLI UX SPEC')).toBe(
        'ada/c625-design-pr-workflow-cli-ux-spec'
      );
    });

    it('lowercases role ID', () => {
      expect(generateBranchName(630, 'Engineering', 'Heat Scoring')).toBe(
        'ada/c630-engineering-heat-scoring'
      );
    });

    it('handles various action formats', () => {
      expect(generateBranchName(100, 'qa', '🔍 E2E Testing Setup')).toBe(
        'ada/c100-qa-e2e-testing-setup'
      );
      expect(generateBranchName(500, 'ops', 'R-014 Rule Addition')).toBe(
        'ada/c500-ops-r-014-rule-addition'
      );
    });
  });

  describe('validateBranchName', () => {
    describe('valid branches', () => {
      it('accepts ada/ prefix', () => {
        expect(validateBranchName('ada/c625-design-spec')).toEqual({ valid: true });
      });

      it('accepts feat/ prefix', () => {
        expect(validateBranchName('feat/heat-scoring')).toEqual({ valid: true });
      });

      it('accepts fix/ prefix', () => {
        expect(validateBranchName('fix/memory-leak')).toEqual({ valid: true });
      });

      it('accepts docs/ prefix', () => {
        expect(validateBranchName('docs/update-readme')).toEqual({ valid: true });
      });

      it('accepts refactor/ prefix', () => {
        expect(validateBranchName('refactor/dispatch-cleanup')).toEqual({ valid: true });
      });

      it('accepts ci/ prefix', () => {
        expect(validateBranchName('ci/add-coverage')).toEqual({ valid: true });
      });
    });

    describe('invalid branches', () => {
      it('rejects missing prefix', () => {
        const result = validateBranchName('my-branch');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('must start with');
      });

      it('rejects invalid prefix', () => {
        const result = validateBranchName('feature/test');
        expect(result.valid).toBe(false);
      });

      it('rejects uppercase characters', () => {
        const result = validateBranchName('feat/MyFeature');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('lowercase');
      });

      it('rejects spaces', () => {
        const result = validateBranchName('feat/my feature');
        expect(result.valid).toBe(false);
      });

      it('rejects special characters', () => {
        const result = validateBranchName('feat/test@123');
        expect(result.valid).toBe(false);
      });

      it('rejects branches exceeding 100 characters', () => {
        const longBranch = `ada/${  'a'.repeat(100)}`;
        const result = validateBranchName(longBranch);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('100 characters');
      });
    });
  });

  // ─── PR Title Generation ───────────────────────────────────────────────────

  describe('generatePRTitle', () => {
    it('preserves conventional commit format', () => {
      expect(generatePRTitle('feat(cli): add PR workflow support', 'engineering')).toBe(
        'feat(cli): add PR workflow support'
      );
    });

    it('normalizes case in conventional commits', () => {
      expect(generatePRTitle('FEAT(CLI): Add PR workflow', 'engineering')).toBe(
        'feat(cli): add PR workflow'
      );
    });

    it('infers scope from role when no conventional prefix', () => {
      expect(generatePRTitle('🎨 PR Workflow UX Spec', 'design')).toBe(
        'chore(design): pR Workflow UX Spec'
      );
    });

    it('removes emojis', () => {
      const title = generatePRTitle('⚙️ feat(cli): heat scoring', 'engineering');
      expect(title).not.toContain('⚙️');
      expect(title).toContain('feat(cli)');
    });

    it('maps roles to appropriate scopes', () => {
      expect(generatePRTitle('Test work', 'qa')).toContain('(qa)');
      expect(generatePRTitle('Test work', 'ops')).toContain('(ops)');
      expect(generatePRTitle('Test work', 'research')).toContain('(research)');
    });
  });

  // ─── PR Body Generation ────────────────────────────────────────────────────

  describe('generatePRBody', () => {
    it('includes summary, cycle info, and checklist', () => {
      const body = generatePRBody({
        cycle: 625,
        role: 'design',
        action: 'PR Workflow UX Specification',
      });

      expect(body).toContain('## Summary');
      expect(body).toContain('PR Workflow UX Specification');
      expect(body).toContain('## Cycle');
      expect(body).toContain('**Cycle:** 625');
      expect(body).toContain('🎨 Design');
      expect(body).toContain('## Checklist');
      expect(body).toContain('Generated by `ada dispatch complete --pr`');
    });

    it('includes related issues when provided', () => {
      const body = generatePRBody({
        cycle: 630,
        role: 'engineering',
        action: 'Heat scoring implementation',
        issues: [118, 128],
      });

      expect(body).toContain('## Related Issues');
      expect(body).toContain('Relates to #118');
      expect(body).toContain('Relates to #128');
    });

    it('auto-extracts issue refs from action', () => {
      const body = generatePRBody({
        cycle: 630,
        role: 'engineering',
        action: 'Implement feature per #118 and #128',
      });

      expect(body).toContain('Relates to #118');
      expect(body).toContain('Relates to #128');
    });

    it('includes custom body content', () => {
      const body = generatePRBody({
        cycle: 630,
        role: 'engineering',
        action: 'Test action',
        body: 'Additional details here',
      });

      expect(body).toContain('## Details');
      expect(body).toContain('Additional details here');
    });

    it('removes emojis from action in body', () => {
      const body = generatePRBody({
        cycle: 625,
        role: 'design',
        action: '🎨 PR Workflow UX Spec',
      });

      // Should contain clean action without emoji
      expect(body).toContain('PR Workflow UX Spec');
      // Emoji should be removed from the summary
      const summarySection = body.split('## Cycle')[0];
      expect(summarySection).not.toContain('🎨');
    });
  });
});
