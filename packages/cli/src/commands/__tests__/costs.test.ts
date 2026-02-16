/**
 * Tests for `ada costs` command
 *
 * Validates cost tracking CLI commands including:
 * - Quick cost summary display
 * - JSON output for scripting
 * - Export to CSV/TSV/JSON files
 *
 * @see packages/cli/src/commands/costs.ts
 * @see Issue #69 — Observability specification
 * @see Issue #94 — Export specification
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { costsCommand } from '../costs.js';

// Mock console to capture output
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('costs command', () => {
  beforeEach(() => {
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  afterEach(() => {
    mockConsoleLog.mockReset();
    mockConsoleError.mockReset();
  });

  describe('command structure', () => {
    it('should have correct name', () => {
      expect(costsCommand.name()).toBe('costs');
    });

    it('should have description about cost checking', () => {
      expect(costsCommand.description()).toContain('cost');
    });

    it('should have --dir option with default', () => {
      const dirOption = costsCommand.options.find((opt) => opt.long === '--dir');
      expect(dirOption).toBeDefined();
      expect(dirOption?.defaultValue).toBe('agents');
    });

    it('should have --json option', () => {
      const jsonOption = costsCommand.options.find((opt) => opt.long === '--json');
      expect(jsonOption).toBeDefined();
    });

    it('should have --export option', () => {
      const exportOption = costsCommand.options.find((opt) => opt.long === '--export');
      expect(exportOption).toBeDefined();
    });

    it('should have --force option', () => {
      const forceOption = costsCommand.options.find((opt) => opt.long === '--force');
      expect(forceOption).toBeDefined();
    });

    it('should have short alias -d for --dir', () => {
      const dirOption = costsCommand.options.find((opt) => opt.short === '-d');
      expect(dirOption).toBeDefined();
      expect(dirOption?.long).toBe('--dir');
    });

    it('should have short alias -e for --export', () => {
      const exportOption = costsCommand.options.find((opt) => opt.short === '-e');
      expect(exportOption).toBeDefined();
      expect(exportOption?.long).toBe('--export');
    });

    it('should have short alias -f for --force', () => {
      const forceOption = costsCommand.options.find((opt) => opt.short === '-f');
      expect(forceOption).toBeDefined();
      expect(forceOption?.long).toBe('--force');
    });
  });
});

describe('costs command integration', () => {
  // These tests require mocking metrics manager and file system

  it.skip('should show empty state when no metrics exist', async () => {
    // TODO: Mock createMetricsManager to return empty cycles
    // Verify "No cost data collected yet" message
  });

  it.skip('should show cost breakdown with today/week/total', async () => {
    // TODO: Mock createMetricsManager with cycle data
    // Verify output contains Today, This week, All time, Avg/cycle
  });

  it.skip('should output JSON when --json flag is provided', async () => {
    // TODO: Mock createMetricsManager with cycle data
    // Verify output is valid JSON with today, week, total, avgPerCycle, model
  });

  it.skip('should export to CSV when --export costs.csv is provided', async () => {
    // TODO: Mock createMetricsManager and writeFile
    // Verify CSV format with headers
  });

  it.skip('should export to TSV when --export costs.tsv is provided', async () => {
    // TODO: Mock createMetricsManager and writeFile
    // Verify TSV format with tabs
  });

  it.skip('should export to JSON when --export costs.json is provided', async () => {
    // TODO: Mock createMetricsManager and writeFile
    // Verify JSON format with all cost data
  });

  it.skip('should prompt for overwrite confirmation when file exists', async () => {
    // TODO: Mock fileExists to return true
    // Verify confirmation prompt is shown
  });

  it.skip('should skip confirmation when --force is provided', async () => {
    // TODO: Mock fileExists to return true
    // Verify no confirmation prompt with --force
  });

  it.skip('should reject unsupported export extensions', async () => {
    // TODO: Try to export to .txt
    // Verify error about unsupported extension
  });

  it.skip('should calculate today cost correctly', async () => {
    // TODO: Mock cycles spanning multiple days
    // Verify only today's cycles are included in today cost
  });

  it.skip('should calculate week cost correctly', async () => {
    // TODO: Mock cycles spanning multiple weeks
    // Verify only last 7 days are included in week cost
  });

  it.skip('should handle metrics manager errors gracefully', async () => {
    // TODO: Mock createMetricsManager to throw
    // Verify user-friendly error message
  });
});
