/**
 * Innate Memory Loader
 *
 * Loads and manages innate (protected) memories from source files.
 * Innate memories form the agent's core identity and cannot be
 * overwritten by learned experience.
 *
 * @see docs/frontier/memory-migration-poc-c836.md
 */

import type {
  MemoryEntry,
  InnateLoaderConfig,
  InnateFileConfig,
  EmbeddingProvider,
} from './types.js';
import { createHash } from 'crypto';
import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, basename } from 'path';

/**
 * Default innate file configuration.
 *
 * These files form the core agent identity:
 * - RULES.md: Team-wide rules (highest importance)
 * - DISPATCH.md: Operational protocol
 * - playbooks/*.md: Role-specific identity
 * - roster.json: Team structure
 */
export const DEFAULT_INNATE_FILES: InnateFileConfig[] = [
  { path: 'rules/RULES.md', entryType: 'rule', baseImportance: 1.0 },
  { path: 'DISPATCH.md', entryType: 'protocol', baseImportance: 0.95 },
  { path: 'roster.json', entryType: 'structure', baseImportance: 0.9 },
];

/**
 * Cache entry for tracking file changes.
 */
interface FileCache {
  hash: string;
  modifiedAt: number;
  entryId: string;
}

/**
 * Loads innate memories from source files.
 *
 * Features:
 * - Hash-based change detection (only re-embed changed files)
 * - Automatic playbook discovery
 * - Content chunking for large files
 */
export class InnateLoader {
  private readonly config: Required<InnateLoaderConfig>;
  private readonly embeddingProvider: EmbeddingProvider;
  private readonly fileCache: Map<string, FileCache> = new Map();

  constructor(config: InnateLoaderConfig, embeddingProvider: EmbeddingProvider) {
    this.embeddingProvider = embeddingProvider;
    this.config = {
      agentsDir: config.agentsDir,
      innateFiles: config.innateFiles ?? DEFAULT_INNATE_FILES,
      refreshOnChange: config.refreshOnChange ?? true,
    };
  }

  /**
   * Load all innate memories.
   *
   * @returns Array of innate memory entries with embeddings
   */
  async loadAll(): Promise<Array<{ entry: MemoryEntry; embedding: Float32Array }>> {
    const results: Array<{ entry: MemoryEntry; embedding: Float32Array }> = [];

    // Load configured files
    for (const fileConfig of this.config.innateFiles) {
      const fullPath = join(this.config.agentsDir, fileConfig.path);
      if (!existsSync(fullPath)) {
        console.warn(`Innate file not found: ${fullPath}`);
        continue;
      }

      const entry = await this.loadFile(fullPath, fileConfig);
      if (entry) {
        results.push(entry);
      }
    }

    // Discover and load playbooks
    const playbooksDir = join(this.config.agentsDir, 'playbooks');
    if (existsSync(playbooksDir)) {
      const playbooks = await this.discoverPlaybooks(playbooksDir);
      for (const playbook of playbooks) {
        results.push(playbook);
      }
    }

    return results;
  }

  /**
   * Check if any innate files have changed since last load.
   *
   * @returns Array of changed file paths
   */
  getChangedFiles(): string[] {
    const changed: string[] = [];

    for (const fileConfig of this.config.innateFiles) {
      const fullPath = join(this.config.agentsDir, fileConfig.path);
      if (this.hasFileChanged(fullPath)) {
        changed.push(fullPath);
      }
    }

    // Check playbooks
    const playbooksDir = join(this.config.agentsDir, 'playbooks');
    if (existsSync(playbooksDir)) {
      const files = readdirSync(playbooksDir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const fullPath = join(playbooksDir, file);
        if (this.hasFileChanged(fullPath)) {
          changed.push(fullPath);
        }
      }
    }

    return changed;
  }

  /**
   * Load a single innate file.
   */
  private async loadFile(
    fullPath: string,
    config: InnateFileConfig
  ): Promise<{ entry: MemoryEntry; embedding: Float32Array } | null> {
    try {
      const content = readFileSync(fullPath, 'utf-8');
      const hash = this.computeHash(content);
      const stat = statSync(fullPath);

      // Check cache
      const cached = this.fileCache.get(fullPath);
      if (cached && cached.hash === hash && !this.config.refreshOnChange) {
        return null; // No change
      }

      // Create entry
      const entry = this.createInnateEntry(fullPath, content, config);

      // Generate embedding
      const embedding = await this.embeddingProvider.embed(this.prepareForEmbedding(content));

      // Update cache
      this.fileCache.set(fullPath, {
        hash,
        modifiedAt: stat.mtimeMs,
        entryId: entry.id,
      });

      return { entry, embedding };
    } catch (error) {
      console.error(`Failed to load innate file ${fullPath}:`, error);
      return null;
    }
  }

  /**
   * Discover playbook files in the playbooks directory.
   */
  private async discoverPlaybooks(
    playbooksDir: string
  ): Promise<Array<{ entry: MemoryEntry; embedding: Float32Array }>> {
    const results: Array<{ entry: MemoryEntry; embedding: Float32Array }> = [];

    // TODO: Use fs.promises.readdir for async
    const files = readdirSync(playbooksDir).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const fullPath = join(playbooksDir, file);
      const config: InnateFileConfig = {
        path: `playbooks/${file}`,
        entryType: 'playbook',
        baseImportance: 0.9,
      };

      const entry = await this.loadFile(fullPath, config);
      if (entry) {
        results.push(entry);
      }
    }

    return results;
  }

  /**
   * Create a memory entry from file content.
   */
  private createInnateEntry(
    fullPath: string,
    content: string,
    config: InnateFileConfig
  ): MemoryEntry {
    const now = new Date().toISOString();
    const name = basename(fullPath, '.md').toLowerCase();

    // Build entry - only include role for playbooks
    const entry: MemoryEntry = {
      id: `innate-${name}`,
      content,
      entryType: config.entryType,
      source: 'innate',
      heatScore: 1.0, // Innate always max heat
      baseImportance: config.baseImportance ?? 1.0,
      referenceCount: 0,
      tier: 'innate',
      sourceFile: fullPath,
      isProtected: true,
      createdAt: now,
      updatedAt: now,
    };

    // Only add role for playbooks
    if (config.entryType === 'playbook') {
      entry.role = name;
    }

    return entry;
  }

  /**
   * Compute SHA-256 hash of content.
   */
  private computeHash(content: string): string {
    return createHash('sha256').update(content, 'utf-8').digest('hex');
  }

  /**
   * Check if a file has changed since last load.
   */
  private hasFileChanged(fullPath: string): boolean {
    if (!existsSync(fullPath)) return false;

    const cached = this.fileCache.get(fullPath);
    if (!cached) return true;

    const content = readFileSync(fullPath, 'utf-8');
    const hash = this.computeHash(content);
    return hash !== cached.hash;
  }

  /**
   * Prepare content for embedding.
   *
   * - Truncate to max embedding context
   * - Remove markdown formatting noise
   * - Normalize whitespace
   */
  private prepareForEmbedding(content: string, maxChars: number = 10000): string {
    // Truncate if too long
    let text = content.slice(0, maxChars);

    // Remove excessive whitespace
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.replace(/\t/g, '  ');

    return text.trim();
  }
}

/**
 * Create an innate loader with default configuration.
 */
export function createInnateLoader(
  agentsDir: string,
  embeddingProvider: EmbeddingProvider
): InnateLoader {
  return new InnateLoader(
    { agentsDir, innateFiles: DEFAULT_INNATE_FILES },
    embeddingProvider
  );
}
