/**
 * @ada/core — Memory bank unit tests
 *
 * Tests for memory bank management:
 * countLines, needsCompression, extractVersion, extractCycle, updateBankHeader
 */

import { describe, it, expect } from 'vitest';
import {
  countLines,
  needsCompression,
  extractVersion,
  extractCycle,
  updateBankHeader,
} from '../../src/memory.js';

// ─── countLines ───────────────────────────────────────────────────────────────

describe('countLines', () => {
  it('returns 0 for empty string', () => {
    expect(countLines('')).toBe(0);
  });

  it('returns 1 for a single line without newline', () => {
    expect(countLines('hello')).toBe(1);
  });

  it('returns 2 for a single line with trailing newline', () => {
    // 'hello\n' splits into ['hello', ''] = 2 elements
    expect(countLines('hello\n')).toBe(2);
  });

  it('counts multiple lines correctly', () => {
    const content = 'line 1\nline 2\nline 3';
    expect(countLines(content)).toBe(3);
  });

  it('counts lines in a typical memory bank header', () => {
    const content = [
      '# Memory Bank',
      '',
      '> Last updated: today',
      '---',
      '',
    ].join('\n');

    expect(countLines(content)).toBe(5);
  });
});

// ─── needsCompression ─────────────────────────────────────────────────────────

describe('needsCompression', () => {
  it('returns false for small content with few cycles', () => {
    const content = 'short\ncontent\n';
    expect(needsCompression(content, 3)).toBe(false);
  });

  it('returns true when content exceeds line threshold', () => {
    const content = Array.from({ length: 201 }, (_, i) => `line ${i}`).join('\n');
    expect(needsCompression(content, 0)).toBe(true);
  });

  it('returns true when exactly at the threshold + 1', () => {
    // Default threshold is 200 lines
    const content = Array.from({ length: 202 }, (_, i) => `line ${i}`).join('\n');
    expect(needsCompression(content, 0)).toBe(true);
  });

  it('returns false when at exactly the threshold', () => {
    const content = Array.from({ length: 200 }, (_, i) => `line ${i}`).join('\n');
    expect(needsCompression(content, 0)).toBe(false);
  });

  it('returns true when cycle threshold reached', () => {
    const content = 'short\n';
    expect(needsCompression(content, 10)).toBe(true);
  });

  it('returns false when just under cycle threshold', () => {
    const content = 'short\n';
    expect(needsCompression(content, 9)).toBe(false);
  });

  it('respects custom line threshold', () => {
    const content = Array.from({ length: 51 }, (_, i) => `line ${i}`).join('\n');
    expect(needsCompression(content, 0, 50)).toBe(true);
    expect(needsCompression(content, 0, 100)).toBe(false);
  });

  it('respects custom cycle threshold', () => {
    const content = 'short\n';
    expect(needsCompression(content, 5, 200, 5)).toBe(true);
    expect(needsCompression(content, 4, 200, 5)).toBe(false);
  });

  it('triggers when either condition is met (lines)', () => {
    const content = Array.from({ length: 250 }, (_, i) => `line ${i}`).join('\n');
    expect(needsCompression(content, 0)).toBe(true); // lines exceeded, cycles not
  });

  it('triggers when either condition is met (cycles)', () => {
    const content = 'short\n';
    expect(needsCompression(content, 15)).toBe(true); // cycles exceeded, lines not
  });
});

// ─── extractVersion ───────────────────────────────────────────────────────────

describe('extractVersion', () => {
  it('extracts version from standard bank header', () => {
    const content = '> **Last updated:** 2026-02-04 | **Cycle:** 32 | **Version:** 3';
    expect(extractVersion(content)).toBe(3);
  });

  it('extracts single-digit version', () => {
    const content = '**Version:** 1';
    expect(extractVersion(content)).toBe(1);
  });

  it('extracts multi-digit version', () => {
    const content = '**Version:** 42';
    expect(extractVersion(content)).toBe(42);
  });

  it('returns 1 when no version is found', () => {
    const content = '# Memory Bank\nNo version here';
    expect(extractVersion(content)).toBe(1);
  });

  it('returns 1 for empty string', () => {
    expect(extractVersion('')).toBe(1);
  });

  it('extracts first version if multiple appear', () => {
    const content = '**Version:** 5\n**Version:** 10';
    expect(extractVersion(content)).toBe(5);
  });
});

// ─── extractCycle ─────────────────────────────────────────────────────────────

describe('extractCycle', () => {
  it('extracts cycle from standard bank header', () => {
    const content = '> **Last updated:** 2026-02-04 | **Cycle:** 32 | **Version:** 3';
    expect(extractCycle(content)).toBe(32);
  });

  it('extracts single-digit cycle', () => {
    const content = '**Cycle:** 1';
    expect(extractCycle(content)).toBe(1);
  });

  it('extracts large cycle numbers', () => {
    const content = '**Cycle:** 999';
    expect(extractCycle(content)).toBe(999);
  });

  it('returns 0 when no cycle is found', () => {
    const content = '# Memory Bank\nNo cycle here';
    expect(extractCycle(content)).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(extractCycle('')).toBe(0);
  });
});

// ─── updateBankHeader ─────────────────────────────────────────────────────────

describe('updateBankHeader', () => {
  const sampleHeader = [
    '# 🧠 Memory Bank',
    '',
    '> **Last updated:** 2026-02-04 18:00:00 EST | **Cycle:** 30 | **Version:** 2',
    '',
    '---',
    '',
    '## Current Status',
  ].join('\n');

  it('updates the cycle number', () => {
    const result = updateBankHeader(sampleHeader, 33);

    expect(result).toContain('**Cycle:** 33');
    expect(result).not.toContain('**Cycle:** 30');
  });

  it('updates the last updated timestamp', () => {
    const result = updateBankHeader(sampleHeader, 33);

    // Should have a new ISO timestamp, not the old one
    expect(result).not.toContain('2026-02-04 18:00:00 EST');
    expect(result).toContain('**Last updated:**');
  });

  it('updates the version when provided', () => {
    const result = updateBankHeader(sampleHeader, 33, 3);

    expect(result).toContain('**Version:** 3');
    expect(result).not.toContain('**Version:** 2');
  });

  it('does not update version when not provided', () => {
    const result = updateBankHeader(sampleHeader, 33);

    expect(result).toContain('**Version:** 2'); // unchanged
  });

  it('preserves the rest of the content', () => {
    const result = updateBankHeader(sampleHeader, 33);

    expect(result).toContain('# 🧠 Memory Bank');
    expect(result).toContain('## Current Status');
    expect(result).toContain('---');
  });
});
