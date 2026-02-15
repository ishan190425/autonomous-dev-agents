/**
 * @ada-ai/core — Playbook Suggestions Tests
 *
 * Tests for pattern-to-playbook automation.
 * Covers types, store, and generator.
 *
 * @see docs/frontier/pattern-to-playbook-automation-spec-c449.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  SuggestionStore,
  SuggestionGenerator,
  createSuggestionGenerator,
  DEFAULT_SUGGESTION_CONFIG,
  type CreateSuggestionInput,
  type ReflexionPattern,
} from '../src/index.js';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

function createTestInput(
  overrides: Partial<CreateSuggestionInput> = {}
): CreateSuggestionInput {
  return {
    patternId: 'pattern-001',
    patternConfidence: 0.82,
    targetPlaybook: 'agents/playbooks/qa.md',
    targetSection: '## Quality Bar',
    suggestionType: 'add',
    suggestedText: '- Test implication check required',
    rationale: 'Cross-role testing pattern detected',
    sourceReflections: ['C431-Scrum', 'C432-QA', 'C434-Ops'],
    contributingRoles: ['scrum', 'qa', 'ops'],
    ...overrides,
  };
}

function createTestPattern(
  overrides: Partial<ReflexionPattern> = {}
): ReflexionPattern {
  return {
    id: 'pattern-001',
    theme: 'testing',
    description: 'Testing is a cross-cutting concern',
    keywords: ['testing', 'test', 'quality'],
    confidence: 0.82,
    sourceCluster: {
      id: 'cluster-001',
      keywords: ['testing', 'test', 'quality'],
      reflectionIds: ['C431', 'C432', 'C434', 'C435'],
      roleDistribution: { scrum: 1, qa: 1, ops: 1, design: 1 },
      size: 4,
      recentCount: 4,
      cohesion: 0.75,
    },
    crossRole: true,
    roles: ['design', 'ops', 'qa', 'scrum'], // Sorted alphabetically
    suggestedLesson:
      'Every role should consider test implications before merging changes',
    status: 'candidate',
    detectedAt: Date.now(),
    ...overrides,
  };
}

// ─── Store Tests ────────────────────────────────────────────────────────────

describe('SuggestionStore', () => {
  let testDir: string;
  let store: SuggestionStore;

  beforeEach(async () => {
    testDir = join(tmpdir(), `ada-test-${Date.now()}-${Math.random()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create a minimal playbook for apply tests
    const playbookDir = join(testDir, 'agents/playbooks');
    await fs.mkdir(playbookDir, { recursive: true });
    await fs.writeFile(
      join(playbookDir, 'qa.md'),
      '# QA Playbook\n\n## Quality Bar\n\n- Existing item\n\n## Next Section\n\nMore content'
    );

    store = new SuggestionStore(testDir);
    await store.init();
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('create', () => {
    it('creates a suggestion with generated ID', async () => {
      const input = createTestInput();
      const suggestion = await store.create(input);

      expect(suggestion.id).toMatch(/^sug-\d{3}$/);
      expect(suggestion.status).toBe('pending');
      expect(suggestion.generatedAt).toBeDefined();
      expect(suggestion.patternId).toBe(input.patternId);
      expect(suggestion.targetPlaybook).toBe(input.targetPlaybook);
    });

    it('increments ID counter for multiple suggestions', async () => {
      const s1 = await store.create(createTestInput());
      const s2 = await store.create(createTestInput({ patternId: 'pattern-002' }));
      const s3 = await store.create(createTestInput({ patternId: 'pattern-003' }));

      expect(s1.id).toBe('sug-001');
      expect(s2.id).toBe('sug-002');
      expect(s3.id).toBe('sug-003');
    });

    it('throws on invalid input', async () => {
      const badInput = createTestInput({ targetPlaybook: '/etc/passwd' });

      await expect(store.create(badInput)).rejects.toThrow(
        /Target playbook must be in/
      );
    });
  });

  describe('get', () => {
    it('retrieves a suggestion by ID', async () => {
      const created = await store.create(createTestInput());
      const retrieved = await store.get(created.id);

      expect(retrieved).toMatchObject({
        id: created.id,
        patternId: created.patternId,
      });
    });

    it('returns null for non-existent ID', async () => {
      const result = await store.get('sug-999');
      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await store.create(
        createTestInput({ patternId: 'p1', patternConfidence: 0.9 })
      );
      await store.create(
        createTestInput({ patternId: 'p2', patternConfidence: 0.75 })
      );
      await store.create(
        createTestInput({
          patternId: 'p3',
          patternConfidence: 0.85,
          targetPlaybook: 'agents/playbooks/engineering.md',
        })
      );
    });

    it('lists all pending suggestions', async () => {
      const pending = await store.list({ status: 'pending' });
      expect(pending).toHaveLength(3);
    });

    it('filters by target playbook', async () => {
      const filtered = await store.list({
        targetPlaybook: 'agents/playbooks/engineering.md',
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].patternId).toBe('p3');
    });

    it('filters by minimum confidence', async () => {
      const high = await store.list({ minConfidence: 0.85 });
      expect(high).toHaveLength(2);
    });

    it('sorts by confidence descending', async () => {
      const sorted = await store.list({
        sortBy: 'confidence',
        sortOrder: 'desc',
      });
      expect(sorted[0].patternConfidence).toBe(0.9);
      expect(sorted[2].patternConfidence).toBe(0.75);
    });

    it('limits results', async () => {
      const limited = await store.list({ limit: 2 });
      expect(limited).toHaveLength(2);
    });
  });

  describe('apply', () => {
    it('applies an add suggestion to playbook', async () => {
      const suggestion = await store.create(createTestInput());
      const result = await store.apply(suggestion.id, 'qa', 639);

      expect(result.success).toBe(true);
      expect(result.suggestion.status).toBe('applied');
      expect(result.suggestion.appliedBy).toBe('qa');
      expect(result.suggestion.appliedCycle).toBe(639);
      expect(result.diff).toContain('+');

      // Verify playbook was modified
      const playbookContent = await fs.readFile(
        join(testDir, 'agents/playbooks/qa.md'),
        'utf-8'
      );
      expect(playbookContent).toContain('Test implication check required');
    });

    it('fails for non-existent suggestion', async () => {
      const result = await store.apply('sug-999', 'qa', 639);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('fails for already applied suggestion', async () => {
      const suggestion = await store.create(createTestInput());
      await store.apply(suggestion.id, 'qa', 639);

      const result = await store.apply(suggestion.id, 'ops', 640);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not pending');
    });
  });

  describe('reject', () => {
    it('rejects a suggestion with reason', async () => {
      const suggestion = await store.create(createTestInput());
      const result = await store.reject(
        suggestion.id,
        'ops',
        'Already covered in RULES.md'
      );

      expect(result.success).toBe(true);
      expect(result.suggestion.status).toBe('rejected');
      expect(result.suggestion.rejectedBy).toBe('ops');
      expect(result.suggestion.rejectionReason).toBe(
        'Already covered in RULES.md'
      );
    });

    it('requires a reason', async () => {
      const suggestion = await store.create(createTestInput());
      const result = await store.reject(suggestion.id, 'ops', '');

      expect(result.success).toBe(false);
      expect(result.error).toContain('reason is required');
    });
  });

  describe('validate', () => {
    it('validates a correct input', () => {
      const input = createTestInput();
      const result = store.validate(input);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects low confidence', () => {
      const input = createTestInput({ patternConfidence: 0.5 });
      const result = store.validate(input);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        `Confidence 0.5 below minimum ${DEFAULT_SUGGESTION_CONFIG.minConfidence}`
      );
    });

    it('rejects invalid target directory', () => {
      const input = createTestInput({ targetPlaybook: 'src/main.ts' });
      const result = store.validate(input);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Target playbook'))).toBe(
        true
      );
    });

    it('warns about few source reflections', () => {
      const input = createTestInput({ sourceReflections: ['C431'] });
      const result = store.validate(input);

      expect(result.warnings).toContain(
        'Few source reflections may indicate weak pattern'
      );
    });
  });

  describe('stats', () => {
    it('calculates statistics correctly', async () => {
      // Create mixed suggestions
      const s1 = await store.create(
        createTestInput({ patternId: 'p1', patternConfidence: 0.8 })
      );
      await store.create(
        createTestInput({ patternId: 'p2', patternConfidence: 0.9 })
      );
      const s3 = await store.create(
        createTestInput({ patternId: 'p3', patternConfidence: 0.7 })
      );

      // Apply one, reject one
      await store.apply(s1.id, 'qa', 639);
      await store.reject(s3.id, 'ops', 'Not relevant');

      const stats = await store.stats();

      expect(stats.total).toBe(3);
      expect(stats.byStatus.pending).toBe(1);
      expect(stats.byStatus.applied).toBe(1);
      expect(stats.byStatus.rejected).toBe(1);
      expect(stats.acceptanceRate).toBe(0.5); // 1 applied / 2 decided
      expect(stats.averageConfidence).toBeCloseTo(0.8, 1);
    });
  });

  describe('isDuplicate', () => {
    it('detects duplicate suggestions', async () => {
      await store.create(createTestInput());

      const isDup = await store.isDuplicate({
        targetPlaybook: 'agents/playbooks/qa.md',
        targetSection: '## Quality Bar',
        suggestedText: '- Test implication check required',
      });

      expect(isDup).toBe(true);
    });

    it('allows different suggestions', async () => {
      await store.create(createTestInput());

      const isDup = await store.isDuplicate({
        targetPlaybook: 'agents/playbooks/qa.md',
        targetSection: '## Quality Bar',
        suggestedText: '- Something completely different',
      });

      expect(isDup).toBe(false);
    });
  });

  describe('pendingCount', () => {
    it('counts pending suggestions', async () => {
      await store.create(createTestInput({ patternId: 'p1' }));
      await store.create(createTestInput({ patternId: 'p2' }));
      const s3 = await store.create(createTestInput({ patternId: 'p3' }));

      await store.apply(s3.id, 'qa', 639);

      const count = await store.pendingCount();
      expect(count).toBe(2);
    });
  });
});

// ─── Generator Tests ────────────────────────────────────────────────────────

describe('SuggestionGenerator', () => {
  let testDir: string;
  let generator: SuggestionGenerator;

  beforeEach(async () => {
    testDir = join(tmpdir(), `ada-gen-test-${Date.now()}-${Math.random()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create playbook directories
    const playbookDir = join(testDir, 'agents/playbooks');
    await fs.mkdir(playbookDir, { recursive: true });
    await fs.writeFile(
      join(playbookDir, 'qa.md'),
      '# QA Playbook\n\n## Quality Bar\n\n- Existing\n'
    );

    generator = await createSuggestionGenerator(testDir);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('fromPattern', () => {
    it('generates suggestion from valid pattern', async () => {
      const pattern = createTestPattern();
      const suggestion = await generator.fromPattern(pattern);

      expect(suggestion).not.toBeNull();
      if (suggestion) {
        expect(suggestion.patternId).toBe(pattern.id);
        expect(suggestion.patternConfidence).toBe(pattern.confidence);
        if (pattern.suggestedLesson) {
          expect(suggestion.suggestedText).toContain(pattern.suggestedLesson);
        }
      }
    });

    it('returns null for low confidence pattern', async () => {
      const pattern = createTestPattern({ confidence: 0.5 });
      const suggestion = await generator.fromPattern(pattern);

      expect(suggestion).toBeNull();
    });

    it('returns null for duplicate pattern', async () => {
      const pattern = createTestPattern();

      const first = await generator.fromPattern(pattern);
      expect(first).not.toBeNull();

      // Second attempt with same pattern should detect duplicate
      const second = await generator.fromPattern(pattern);
      expect(second).toBeNull();
    });
  });

  describe('processPatterns', () => {
    it('processes multiple patterns', async () => {
      const patterns = [
        createTestPattern({ id: 'p1', confidence: 0.9 }),
        createTestPattern({
          id: 'p2',
          confidence: 0.75,
          theme: 'documentation',
          suggestedLesson: 'Always document decisions',
        }),
        createTestPattern({
          id: 'p3',
          confidence: 0.5, // Should be filtered
          theme: 'weak',
        }),
      ];

      const suggestions = await generator.processPatterns(patterns);

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].patternConfidence).toBe(0.9); // Highest first
    });
  });

  describe('getConfidenceTier', () => {
    it('classifies confidence tiers correctly', () => {
      expect(generator.getConfidenceTier(0.95)).toBe('auto');
      expect(generator.getConfidenceTier(0.85)).toBe('high');
      expect(generator.getConfidenceTier(0.75)).toBe('moderate');
      expect(generator.getConfidenceTier(0.6)).toBe('weak');
    });
  });

  describe('shouldGenerateSuggestion', () => {
    it('returns true for patterns above threshold', () => {
      const highPattern = createTestPattern({ confidence: 0.8 });
      expect(generator.shouldGenerateSuggestion(highPattern)).toBe(true);
    });

    it('returns false for patterns below threshold', () => {
      const lowPattern = createTestPattern({ confidence: 0.5 });
      expect(generator.shouldGenerateSuggestion(lowPattern)).toBe(false);
    });
  });
});

// ─── Integration Tests ──────────────────────────────────────────────────────

describe('Playbook Suggestions Integration', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `ada-integ-${Date.now()}-${Math.random()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create realistic playbook structure
    const playbookDir = join(testDir, 'agents/playbooks');
    await fs.mkdir(playbookDir, { recursive: true });

    await fs.writeFile(
      join(playbookDir, 'qa.md'),
      `# 🔍 QA Playbook

## Mission

Quality assurance for ADA.

## Quality Bar

- Every PR must pass tests
- Code coverage must stay above 85%

## Best Practices

- Review test coverage before approving
`
    );

    // Also create design playbook (may be targeted by sorted role list)
    await fs.writeFile(
      join(playbookDir, 'design.md'),
      `# 🎨 Design Playbook

## Mission

API and system design for ADA.

## Quality Bar

- Every API should have clear documentation

## Best Practices

- Consider developer experience
`
    );
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('full flow: pattern → suggestion → apply', async () => {
    // 1. Generator creates suggestion from pattern
    const generator = await createSuggestionGenerator(testDir);
    const pattern = createTestPattern();

    const suggestion = await generator.fromPattern(pattern);
    expect(suggestion).not.toBeNull();
    if (!suggestion) throw new Error('Suggestion should not be null');
    expect(suggestion.status).toBe('pending');

    // 2. Store can list pending
    const store = generator.getStore();
    const pending = await store.list({ status: 'pending' });
    expect(pending).toHaveLength(1);

    // 3. Apply the suggestion
    const result = await store.apply(suggestion.id, 'qa', 639);
    expect(result.success).toBe(true);

    // 4. Verify playbook updated (design.md is targeted because 'design' is first alphabetically)
    const playbook = await fs.readFile(
      join(testDir, 'agents/playbooks/design.md'),
      'utf-8'
    );
    expect(playbook).toContain(
      'Every role should consider test implications'
    );

    // 5. Verify suggestion moved to applied
    const appliedList = await store.list({ status: 'applied' });
    expect(appliedList).toHaveLength(1);
    expect(appliedList[0].appliedBy).toBe('qa');

    // 6. Stats reflect the change
    const stats = await store.stats();
    expect(stats.total).toBe(1);
    expect(stats.byStatus.applied).toBe(1);
    expect(stats.acceptanceRate).toBe(1);
  });
});
