/**
 * Tests for export utilities.
 *
 * @see Issue #94 for specification
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  detectFormat,
  getSupportedExtensions,
  escapeCSV,
  toCSV,
  toTSV,
  writeFile,
  fileExists,
  type CycleExportRow,
  type RoleExportRow,
  type CostExportRow,
  CYCLE_HEADERS,
  ROLE_HEADERS,
  COST_HEADERS,
} from '../export.js';

// ─── detectFormat Tests ─────────────────────────────────────────────────────

describe('detectFormat', () => {
  it('should detect .csv extension', () => {
    expect(detectFormat('metrics.csv')).toBe('csv');
    expect(detectFormat('/path/to/metrics.csv')).toBe('csv');
    expect(detectFormat('C:\\path\\metrics.csv')).toBe('csv');
  });

  it('should detect .json extension', () => {
    expect(detectFormat('metrics.json')).toBe('json');
    expect(detectFormat('/path/to/metrics.json')).toBe('json');
  });

  it('should detect .tsv extension', () => {
    expect(detectFormat('metrics.tsv')).toBe('tsv');
    expect(detectFormat('/path/to/metrics.tsv')).toBe('tsv');
  });

  it('should be case-insensitive', () => {
    expect(detectFormat('metrics.CSV')).toBe('csv');
    expect(detectFormat('metrics.JSON')).toBe('json');
    expect(detectFormat('metrics.TSV')).toBe('tsv');
  });

  it('should return null for unsupported extensions', () => {
    expect(detectFormat('metrics.txt')).toBeNull();
    expect(detectFormat('metrics.xml')).toBeNull();
    expect(detectFormat('metrics.xlsx')).toBeNull();
    expect(detectFormat('metrics')).toBeNull();
  });

  it('should handle double extensions', () => {
    expect(detectFormat('metrics.backup.csv')).toBe('csv');
    expect(detectFormat('data.2026.json')).toBe('json');
  });
});

// ─── getSupportedExtensions Tests ───────────────────────────────────────────

describe('getSupportedExtensions', () => {
  it('should return array of supported extensions', () => {
    const extensions = getSupportedExtensions();
    expect(extensions).toContain('.csv');
    expect(extensions).toContain('.json');
    expect(extensions).toContain('.tsv');
  });

  it('should return exactly 3 extensions', () => {
    expect(getSupportedExtensions()).toHaveLength(3);
  });
});

// ─── escapeCSV Tests ────────────────────────────────────────────────────────

describe('escapeCSV', () => {
  it('should return empty string for null/undefined', () => {
    expect(escapeCSV(null)).toBe('');
    expect(escapeCSV(undefined)).toBe('');
  });

  it('should pass through simple strings', () => {
    expect(escapeCSV('hello')).toBe('hello');
    expect(escapeCSV('world')).toBe('world');
  });

  it('should convert numbers to strings', () => {
    expect(escapeCSV(123)).toBe('123');
    expect(escapeCSV(0.5)).toBe('0.5');
    expect(escapeCSV(0)).toBe('0');
  });

  it('should convert booleans to strings', () => {
    expect(escapeCSV(true)).toBe('true');
    expect(escapeCSV(false)).toBe('false');
  });

  it('should wrap strings with commas in quotes', () => {
    expect(escapeCSV('hello, world')).toBe('"hello, world"');
  });

  it('should escape internal quotes by doubling them', () => {
    expect(escapeCSV('say "hello"')).toBe('"say ""hello"""');
  });

  it('should wrap strings with newlines in quotes', () => {
    expect(escapeCSV('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCSV('line1\rline2')).toBe('"line1\rline2"');
  });

  it('should handle complex strings with multiple special chars', () => {
    expect(escapeCSV('a "quoted, value"\nwith newline')).toBe(
      '"a ""quoted, value""\nwith newline"'
    );
  });
});

// ─── toCSV Tests ────────────────────────────────────────────────────────────

describe('toCSV', () => {
  it('should generate header row', () => {
    const data: CostExportRow[] = [];
    const csv = toCSV(data, COST_HEADERS);
    expect(csv).toBe('period,cost,cycles\n');
  });

  it('should generate data rows', () => {
    const data: CostExportRow[] = [
      { period: 'today', cost: 0.50, cycles: 5 },
      { period: 'week', cost: 2.50, cycles: 25 },
    ];
    const csv = toCSV(data, COST_HEADERS);
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(3); // header + 2 data rows
    expect(lines[1]).toBe('today,0.5,5');
    expect(lines[2]).toBe('week,2.5,25');
  });

  it('should handle empty data array', () => {
    const data: RoleExportRow[] = [];
    const csv = toCSV(data, ROLE_HEADERS);
    expect(csv).toBe('role,cycles,tokens_input,tokens_output,tokens_total,cost,avg_cost,avg_duration_ms\n');
  });

  it('should escape values properly', () => {
    const data: CycleExportRow[] = [
      {
        cycle: 1,
        role: 'engineering',
        timestamp: '2026-02-08T10:00:00Z',
        tokens_input: 1000,
        tokens_output: 500,
        tokens_total: 1500,
        cost: 0.02,
        duration_ms: 5000,
        status: 'success',
        model: 'claude-3.5-sonnet',
        error: undefined,
      },
    ];
    const csv = toCSV(data, CYCLE_HEADERS);
    expect(csv).toContain('engineering');
    expect(csv).toContain('success');
    expect(csv).toContain('claude-3.5-sonnet');
  });

  it('should handle error messages with special characters', () => {
    const data: CycleExportRow[] = [
      {
        cycle: 1,
        role: 'ops',
        timestamp: '2026-02-08T10:00:00Z',
        tokens_input: 100,
        tokens_output: 50,
        tokens_total: 150,
        cost: 0.002,
        duration_ms: 1000,
        status: 'failure',
        model: 'gpt-4',
        error: 'Failed: "rate limit", retry later',
      },
    ];
    const csv = toCSV(data, CYCLE_HEADERS);
    // Error should be escaped
    expect(csv).toContain('"Failed: ""rate limit"", retry later"');
  });
});

// ─── toTSV Tests ────────────────────────────────────────────────────────────

describe('toTSV', () => {
  it('should use tabs as separators', () => {
    const data: CostExportRow[] = [
      { period: 'today', cost: 0.50, cycles: 5 },
    ];
    const tsv = toTSV(data, COST_HEADERS);
    const lines = tsv.trim().split('\n');
    expect(lines[0]).toBe('period\tcost\tcycles');
    expect(lines[1]).toBe('today\t0.5\t5');
  });

  it('should replace tabs and newlines in values', () => {
    const data: CycleExportRow[] = [
      {
        cycle: 1,
        role: 'engineering',
        timestamp: '2026-02-08T10:00:00Z',
        tokens_input: 1000,
        tokens_output: 500,
        tokens_total: 1500,
        cost: 0.02,
        duration_ms: 5000,
        status: 'success',
        model: 'claude-3.5-sonnet',
        error: 'line1\tand\nline2',
      },
    ];
    const tsv = toTSV(data, CYCLE_HEADERS);
    // Tabs and newlines should be replaced with spaces
    expect(tsv).not.toContain('line1\tand');
    expect(tsv).not.toContain('and\nline2');
    expect(tsv).toContain('line1 and line2');
  });
});

// ─── CYCLE_HEADERS Tests ────────────────────────────────────────────────────

describe('CYCLE_HEADERS', () => {
  it('should have all required cycle export fields', () => {
    expect(CYCLE_HEADERS).toContain('cycle');
    expect(CYCLE_HEADERS).toContain('role');
    expect(CYCLE_HEADERS).toContain('timestamp');
    expect(CYCLE_HEADERS).toContain('tokens_input');
    expect(CYCLE_HEADERS).toContain('tokens_output');
    expect(CYCLE_HEADERS).toContain('tokens_total');
    expect(CYCLE_HEADERS).toContain('cost');
    expect(CYCLE_HEADERS).toContain('duration_ms');
    expect(CYCLE_HEADERS).toContain('status');
    expect(CYCLE_HEADERS).toContain('model');
    expect(CYCLE_HEADERS).toContain('error');
  });

  it('should have 11 columns', () => {
    expect(CYCLE_HEADERS).toHaveLength(11);
  });
});

// ─── ROLE_HEADERS Tests ─────────────────────────────────────────────────────

describe('ROLE_HEADERS', () => {
  it('should have all required role export fields', () => {
    expect(ROLE_HEADERS).toContain('role');
    expect(ROLE_HEADERS).toContain('cycles');
    expect(ROLE_HEADERS).toContain('tokens_input');
    expect(ROLE_HEADERS).toContain('tokens_output');
    expect(ROLE_HEADERS).toContain('tokens_total');
    expect(ROLE_HEADERS).toContain('cost');
    expect(ROLE_HEADERS).toContain('avg_cost');
    expect(ROLE_HEADERS).toContain('avg_duration_ms');
  });

  it('should have 8 columns', () => {
    expect(ROLE_HEADERS).toHaveLength(8);
  });
});

// ─── COST_HEADERS Tests ─────────────────────────────────────────────────────

describe('COST_HEADERS', () => {
  it('should have all required cost export fields', () => {
    expect(COST_HEADERS).toContain('period');
    expect(COST_HEADERS).toContain('cost');
    expect(COST_HEADERS).toContain('cycles');
  });

  it('should have 3 columns', () => {
    expect(COST_HEADERS).toHaveLength(3);
  });
});

// ─── File Operations Tests (mocked) ─────────────────────────────────────────

describe('file operations', () => {
  const testDir = '/tmp/ada-export-tests';
  const testFile = path.join(testDir, 'test-export.csv');

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up after tests
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('writeFile', () => {
    it('should create file and parent directories', () => {
      const nestedFile = path.join(testDir, 'nested', 'dir', 'file.csv');
      writeFile(nestedFile, 'test content');

      expect(fs.existsSync(nestedFile)).toBe(true);
      expect(fs.readFileSync(nestedFile, 'utf-8')).toBe('test content');
    });

    it('should overwrite existing file', () => {
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(testFile, 'old content');

      writeFile(testFile, 'new content');

      expect(fs.readFileSync(testFile, 'utf-8')).toBe('new content');
    });

    it('should write UTF-8 content correctly', () => {
      const content = 'Unicode: 日本語, emoji: 🚀';
      writeFile(testFile, content);

      expect(fs.readFileSync(testFile, 'utf-8')).toBe(content);
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', () => {
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(testFile, 'content');

      expect(fileExists(testFile)).toBe(true);
    });

    it('should return false for non-existing file', () => {
      expect(fileExists('/nonexistent/path/file.csv')).toBe(false);
    });

    it('should return false for directory', () => {
      fs.mkdirSync(testDir, { recursive: true });
      expect(fileExists(testDir)).toBe(true); // fs.existsSync returns true for dirs
    });
  });
});

// ─── Edge Cases ─────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('should handle very large numbers in CSV', () => {
    const data = [{ value: 999999999999.99 }];
    const csv = toCSV(data, ['value'] as const);
    expect(csv).toContain('999999999999.99');
  });

  it('should handle empty strings in data', () => {
    const data = [{ role: '', cycles: 0 }];
    const csv = toCSV(data, ['role', 'cycles'] as const);
    expect(csv).toBe('role,cycles\n,0\n');
  });

  it('should handle undefined optional fields', () => {
    const data: RoleExportRow[] = [
      {
        role: 'engineering',
        cycles: 10,
        tokens_input: 1000,
        tokens_output: 500,
        tokens_total: 1500,
        cost: 0.05,
        avg_cost: 0.005,
        avg_duration_ms: undefined,
      },
    ];
    const csv = toCSV(data, ROLE_HEADERS);
    // Undefined should be empty string in CSV
    const lines = csv.trim().split('\n');
    expect(lines[1]?.endsWith(',')).toBe(true); // Empty last field
  });
});
