/**
 * Export utilities for observability data.
 *
 * Handles file export with auto-format detection from extension,
 * overwrite confirmation, and proper error handling.
 *
 * @see Issue #94 for specification
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import chalk from 'chalk';

/** Supported export formats */
export type ExportFormat = 'csv' | 'json' | 'tsv';

/** Valid file extensions for export */
const EXTENSION_MAP: Record<string, ExportFormat> = {
  '.csv': 'csv',
  '.json': 'json',
  '.tsv': 'tsv',
};

/**
 * Detect export format from file extension.
 *
 * @param filePath - File path to analyze
 * @returns Detected format or null if unsupported
 */
export function detectFormat(filePath: string): ExportFormat | null {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_MAP[ext] ?? null;
}

/**
 * Get list of supported extensions for error messages.
 */
export function getSupportedExtensions(): string[] {
  return Object.keys(EXTENSION_MAP);
}

/**
 * Prompt user for overwrite confirmation.
 *
 * @param filePath - File that exists
 * @returns true if user confirms overwrite
 */
export function confirmOverwrite(filePath: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      chalk.yellow(`⚠️  File ${filePath} exists. Overwrite? [y/N] `),
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      }
    );
  });
}

/**
 * Escape a value for CSV output.
 * Handles quotes, commas, and newlines.
 *
 * @param value - Value to escape
 * @returns Escaped string safe for CSV
 */
export function escapeCSV(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Convert an array of objects to CSV format.
 *
 * @param data - Array of objects with consistent keys
 * @param headers - Column headers (keys to extract)
 * @returns CSV string with headers and rows
 */
export function toCSV<T extends { [key: string]: string | number | boolean | null | undefined }>(
  data: readonly T[],
  headers: readonly (keyof T)[]
): string {
  const lines: string[] = [];

  // Header row
  lines.push(headers.map((h) => escapeCSV(String(h))).join(','));

  // Data rows
  for (const row of data) {
    const values = headers.map((h) => escapeCSV(row[h] as string | number | boolean | null | undefined));
    lines.push(values.join(','));
  }

  return `${lines.join('\n')  }\n`;
}

/**
 * Convert an array of objects to TSV format.
 *
 * @param data - Array of objects with consistent keys
 * @param headers - Column headers (keys to extract)
 * @returns TSV string with headers and rows
 */
export function toTSV<T extends { [key: string]: string | number | boolean | null | undefined }>(
  data: readonly T[],
  headers: readonly (keyof T)[]
): string {
  const lines: string[] = [];

  // Header row
  lines.push(headers.map((h) => String(h)).join('\t'));

  // Data rows
  for (const row of data) {
    const values = headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      // Replace tabs and newlines in TSV
      return String(val).replace(/[\t\n\r]/g, ' ');
    });
    lines.push(values.join('\t'));
  }

  return `${lines.join('\n')  }\n`;
}

/**
 * Write data to a file with proper error handling.
 *
 * @param filePath - Destination file path
 * @param content - Content to write
 * @throws Error if write fails
 */
export function writeFile(filePath: string, content: string): void {
  // Ensure parent directory exists
  const dir = path.dirname(filePath);
  if (dir && dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Check if a file exists.
 *
 * @param filePath - File path to check
 * @returns true if file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Export interface for cycle data (CSV/TSV export).
 * Flattened structure for tabular export.
 */
export interface CycleExportRow {
  cycle: number;
  role: string;
  timestamp: string;
  tokens_input: number;
  tokens_output: number;
  tokens_total: number;
  cost: number;
  duration_ms: number;
  status: 'success' | 'failure';
  model: string;
  error: string | undefined;
  [key: string]: string | number | undefined;
}

/**
 * Export interface for by-role summary (CSV/TSV export).
 */
export interface RoleExportRow {
  role: string;
  cycles: number;
  tokens_input: number;
  tokens_output: number;
  tokens_total: number;
  cost: number;
  avg_cost: number;
  avg_duration_ms: number | undefined;
  [key: string]: string | number | undefined;
}

/**
 * Export interface for cost summary (CSV/TSV export).
 */
export interface CostExportRow {
  period: string;
  cost: number;
  cycles: number;
  [key: string]: string | number;
}

/** CSV headers for cycle exports */
export const CYCLE_HEADERS = [
  'cycle',
  'role',
  'timestamp',
  'tokens_input',
  'tokens_output',
  'tokens_total',
  'cost',
  'duration_ms',
  'status',
  'model',
  'error',
] as const;

/** CSV headers for role exports */
export const ROLE_HEADERS = [
  'role',
  'cycles',
  'tokens_input',
  'tokens_output',
  'tokens_total',
  'cost',
  'avg_cost',
  'avg_duration_ms',
] as const;

/** CSV headers for cost exports */
export const COST_HEADERS = [
  'period',
  'cost',
  'cycles',
] as const;
