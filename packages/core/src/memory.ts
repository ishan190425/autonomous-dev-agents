/**
 * @ada/core — Memory bank management
 *
 * Read, write, and compress the shared memory bank
 * that provides continuity between agent cycles.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * Read the memory bank file as a string.
 *
 * @param bankPath - Path to bank.md
 * @returns The raw markdown content of the memory bank
 */
export async function readMemoryBank(bankPath: string): Promise<string> {
  try {
    return await fs.readFile(bankPath, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return "";
    }
    throw err;
  }
}

/**
 * Write content to the memory bank file.
 *
 * @param bankPath - Path to bank.md
 * @param content - The markdown content to write
 */
export async function writeMemoryBank(
  bankPath: string,
  content: string
): Promise<void> {
  const dir = path.dirname(bankPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(bankPath, content, "utf-8");
}

/**
 * Count the number of lines in the memory bank.
 *
 * @param content - Memory bank content
 * @returns Number of lines
 */
export function countLines(content: string): number {
  if (content.length === 0) return 0;
  return content.split("\n").length;
}

/**
 * Check whether the memory bank needs compression.
 *
 * Compression is triggered when:
 * - The bank exceeds the line threshold (default 200)
 * - More than N cycles have passed since last compression
 *
 * @param content - Current bank content
 * @param cyclesSinceCompression - Number of cycles since last compression
 * @param lineThreshold - Line count threshold (default 200)
 * @param cycleThreshold - Cycle count threshold (default 10)
 * @returns Whether compression should be triggered
 */
export function needsCompression(
  content: string,
  cyclesSinceCompression: number,
  lineThreshold: number = 200,
  cycleThreshold: number = 10
): boolean {
  const lines = countLines(content);
  return lines > lineThreshold || cyclesSinceCompression >= cycleThreshold;
}

/**
 * Archive the current memory bank before compression.
 *
 * Copies the bank to `archives/bank-YYYY-MM-DD-vN.md`.
 *
 * @param bankPath - Path to the current bank.md
 * @param archivesDir - Path to the archives directory
 * @param version - Current bank version number
 * @returns Path to the created archive file
 */
export async function archiveBank(
  bankPath: string,
  archivesDir: string,
  version: number
): Promise<string> {
  await fs.mkdir(archivesDir, { recursive: true });

  const date = new Date().toISOString().split("T")[0];
  const archiveName = `bank-${date}-v${version}.md`;
  const archivePath = path.join(archivesDir, archiveName);

  const content = await fs.readFile(bankPath, "utf-8");
  await fs.writeFile(archivePath, content, "utf-8");

  return archivePath;
}

/**
 * Extract the version number from memory bank content.
 *
 * Looks for `**Version:** N` pattern in the header.
 *
 * @param content - Memory bank content
 * @returns The version number, or 1 if not found
 */
export function extractVersion(content: string): number {
  const match = content.match(/\*\*Version:\*\*\s*(\d+)/);
  return match ? parseInt(match[1]!, 10) : 1;
}

/**
 * Extract the cycle number from memory bank content.
 *
 * Looks for `**Cycle:** N` pattern in the header.
 *
 * @param content - Memory bank content
 * @returns The cycle number, or 0 if not found
 */
export function extractCycle(content: string): number {
  const match = content.match(/\*\*Cycle:\*\*\s*(\d+)/);
  return match ? parseInt(match[1]!, 10) : 0;
}

/**
 * Update the header metadata in the memory bank.
 *
 * @param content - Current bank content
 * @param cycle - New cycle number
 * @param version - New version number (optional, only on compression)
 * @returns Updated content with new header metadata
 */
export function updateBankHeader(
  content: string,
  cycle: number,
  version?: number
): string {
  const now = new Date().toISOString();

  let updated = content.replace(
    /\*\*Last updated:\*\*[^|]*\|/,
    `**Last updated:** ${now} |`
  );

  updated = updated.replace(/\*\*Cycle:\*\*\s*\d+/, `**Cycle:** ${cycle}`);

  if (version !== undefined) {
    updated = updated.replace(
      /\*\*Version:\*\*\s*\d+/,
      `**Version:** ${version}`
    );
  }

  return updated;
}
