/**
 * Tests for heat reference tracker.
 *
 * @see packages/core/src/heat/reference-tracker.ts
 * @see docs/design/memory-heat-cli-spec-c629.md §4.2
 * @see Issue #113 — Cognitive Memory Architecture
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  extractReferences,
  trackActionReferences,
  trackMultipleReferences,
  formatTrackingResult,
} from '../../src/heat/reference-tracker.js';
import { HeatStore } from '../../src/heat/store.js';

describe('extractReferences', () => {
  describe('lesson references (L###)', () => {
    it('extracts single lesson reference', () => {
      const refs = extractReferences('Per L410, we should use heat scoring.');
      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({ ref: 'L410', type: 'lesson', id: 410 });
    });

    it('extracts multiple lesson references', () => {
      const refs = extractReferences('Based on L297 and L410, the pattern is clear.');
      expect(refs).toHaveLength(2);
      expect(refs.map((r) => r.ref)).toEqual(['L297', 'L410']);
    });

    it('handles lowercase lesson references', () => {
      const refs = extractReferences('per l410');
      // Lowercase 'l' doesn't match \bL(\d+)\b pattern (case sensitive)
      expect(refs).toHaveLength(0);
    });

    it('ignores lesson-like text in words', () => {
      // 'LOGICAL' contains 'L' but no number follows
      const refs = extractReferences('LOGICAL thinking required');
      expect(refs).toHaveLength(0);
    });
  });

  describe('decision references (ADR-###)', () => {
    it('extracts single ADR reference', () => {
      const refs = extractReferences('Per ADR-001, types flow downstream.');
      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({ ref: 'ADR-001', type: 'decision', id: 1 });
    });

    it('handles lowercase ADR', () => {
      const refs = extractReferences('per adr-001');
      expect(refs).toHaveLength(1);
      expect(refs[0].ref).toBe('ADR-001'); // Normalized to uppercase
    });

    it('extracts multiple ADR references', () => {
      const refs = extractReferences('ADR-001 supersedes ADR-002');
      expect(refs).toHaveLength(2);
    });
  });

  describe('issue references (####)', () => {
    it('extracts single issue reference', () => {
      const refs = extractReferences('Relates to #113');
      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({ ref: '#113', type: 'issue', id: 113 });
    });

    it('extracts multiple issue references', () => {
      const refs = extractReferences('Closes #113, relates to #118');
      expect(refs).toHaveLength(2);
      expect(refs.map((r) => r.ref)).toEqual(['#113', '#118']);
    });

    it('handles issue references in parens', () => {
      const refs = extractReferences('(#155)');
      expect(refs).toHaveLength(1);
      expect(refs[0].ref).toBe('#155');
    });
  });

  describe('cycle references (C###)', () => {
    it('extracts single cycle reference', () => {
      const refs = extractReferences('As noted in C776');
      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({ ref: 'C776', type: 'cycle', id: 776 });
    });

    it('extracts multiple cycle references', () => {
      const refs = extractReferences('C766 through C776 show progress');
      expect(refs).toHaveLength(2);
    });

    it('handles cycle in parentheses', () => {
      const refs = extractReferences('(C776)');
      expect(refs).toHaveLength(1);
    });
  });

  describe('mixed references', () => {
    it('extracts all reference types from action text', () => {
      const action =
        '🌌 DISPATCH HEAT INTEGRATION (C776) — Per L410 and ADR-001, implementing reference tracking. Relates to #113.';
      const refs = extractReferences(action);

      expect(refs).toHaveLength(4);
      expect(refs.map((r) => r.ref).sort()).toEqual(['#113', 'ADR-001', 'C776', 'L410']);
    });

    it('deduplicates repeated references', () => {
      const refs = extractReferences('L410 is important. As L410 shows...');
      expect(refs).toHaveLength(1);
    });

    it('handles empty string', () => {
      const refs = extractReferences('');
      expect(refs).toHaveLength(0);
    });

    it('handles text with no references', () => {
      const refs = extractReferences('Just some regular text without any references.');
      expect(refs).toHaveLength(0);
    });
  });
});

describe('trackActionReferences', () => {
  let tempDir: string;
  let heatPath: string;
  let store: HeatStore;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ada-heat-test-'));
    heatPath = path.join(tempDir, 'heat.jsonl');
    store = new HeatStore(heatPath);
    await store.load();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  it('creates new entries for first-time references', async () => {
    const result = await trackActionReferences('Per L410 and #113', store);

    expect(result.found).toHaveLength(2);
    expect(result.created).toContain('L410');
    expect(result.created).toContain('#113');
    expect(result.incremented).toHaveLength(0);

    // Verify entries exist
    const l410 = store.get('L410');
    expect(l410).not.toBeNull();
    expect(l410?.baseImportance).toBe(0.8); // lesson importance
    expect(l410?.memoryClass).toBe('learned');
    expect(l410?.referenceCount).toBe(1);

    const issue = store.get('#113');
    expect(issue).not.toBeNull();
    expect(issue?.baseImportance).toBe(0.6); // issue importance
  });

  it('increments existing entries on subsequent references', async () => {
    // First reference
    await trackActionReferences('L410 mentioned', store);

    // Second reference
    const result = await trackActionReferences('Per L410 again', store);

    expect(result.incremented).toContain('L410');
    expect(result.created).toHaveLength(0);

    const entry = store.get('L410');
    expect(entry?.referenceCount).toBe(2);
  });

  it('handles mixed new and existing references', async () => {
    // Create L410 first
    await trackActionReferences('L410', store);

    // Now reference L410 and new #113
    const result = await trackActionReferences('Per L410 and #113', store);

    expect(result.incremented).toContain('L410');
    expect(result.created).toContain('#113');
  });

  it('persists entries to file', async () => {
    await trackActionReferences('L410', store);

    // Create new store and load
    const newStore = new HeatStore(heatPath);
    await newStore.load();

    const entry = newStore.get('L410');
    expect(entry).not.toBeNull();
    expect(entry?.referenceCount).toBe(1);
  });

  it('assigns correct memory class by type', async () => {
    await trackActionReferences('L410 ADR-001 #113 C776', store);

    expect(store.get('L410')?.memoryClass).toBe('learned');
    expect(store.get('ADR-001')?.memoryClass).toBe('innate');
    expect(store.get('#113')?.memoryClass).toBe('learned');
    expect(store.get('C776')?.memoryClass).toBe('learned');
  });

  it('assigns correct base importance by type', async () => {
    await trackActionReferences('L410 ADR-001 #113 C776', store);

    expect(store.get('L410')?.baseImportance).toBe(0.8); // lesson
    expect(store.get('ADR-001')?.baseImportance).toBe(0.9); // decision
    expect(store.get('#113')?.baseImportance).toBe(0.6); // issue
    expect(store.get('C776')?.baseImportance).toBe(0.5); // cycle
  });

  it('returns empty result for text without references', async () => {
    const result = await trackActionReferences('No references here', store);

    expect(result.found).toHaveLength(0);
    expect(result.created).toHaveLength(0);
    expect(result.incremented).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });
});

describe('trackMultipleReferences', () => {
  let tempDir: string;
  let store: HeatStore;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ada-heat-test-'));
    store = new HeatStore(path.join(tempDir, 'heat.jsonl'));
    await store.load();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  it('tracks references from multiple text sources', async () => {
    const texts = ['Action: L410 referenced', 'Reflection: Also C776'];

    const result = await trackMultipleReferences(texts, store);

    expect(result.found).toHaveLength(2);
    expect(result.created).toContain('L410');
    expect(result.created).toContain('C776');
  });

  it('handles empty array', async () => {
    const result = await trackMultipleReferences([], store);
    expect(result.found).toHaveLength(0);
  });

  it('filters out empty strings', async () => {
    const texts = ['L410', '', 'C776', ''];
    const result = await trackMultipleReferences(texts, store);

    expect(result.created).toHaveLength(2);
  });

  it('deduplicates across texts', async () => {
    const texts = ['L410 mentioned', 'L410 again'];
    const result = await trackMultipleReferences(texts, store);

    // L410 appears in both but should only be created once
    expect(result.created).toEqual(['L410']);
    expect(store.get('L410')?.referenceCount).toBe(1);
  });
});

describe('formatTrackingResult', () => {
  it('formats created entries', () => {
    const result = {
      found: [],
      created: ['L410', '#113'],
      incremented: [],
      errors: [],
    };

    expect(formatTrackingResult(result)).toBe('created: L410, #113');
  });

  it('formats incremented entries', () => {
    const result = {
      found: [],
      created: [],
      incremented: ['L410', '#113'],
      errors: [],
    };

    expect(formatTrackingResult(result)).toBe('boosted: L410, #113');
  });

  it('formats mixed results', () => {
    const result = {
      found: [],
      created: ['L410'],
      incremented: ['#113'],
      errors: [],
    };

    expect(formatTrackingResult(result)).toBe('created: L410 | boosted: #113');
  });

  it('formats errors', () => {
    const result = {
      found: [],
      created: [],
      incremented: [],
      errors: ['BAD-REF'],
    };

    expect(formatTrackingResult(result)).toBe('errors: BAD-REF');
  });

  it('returns "no references tracked" for empty result', () => {
    const result = {
      found: [],
      created: [],
      incremented: [],
      errors: [],
    };

    expect(formatTrackingResult(result)).toBe('no references tracked');
  });
});
