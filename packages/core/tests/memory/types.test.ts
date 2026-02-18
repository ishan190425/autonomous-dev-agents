/**
 * Memory Module Type Tests
 *
 * Verifies type exports and basic type safety for the memory system.
 */

import { describe, it, expect } from 'vitest';
import type {
  MemoryEntry,
  MemoryEntryType,
  MemoryTier,
  MemorySearchOptions,
  MemoryStoreOptions,
  EmbeddingProvider,
  InnateFileConfig,
} from '../../src/memory/types.js';

describe('Memory Module Types', () => {
  describe('MemoryEntry', () => {
    it('should accept valid innate entry', () => {
      const entry: MemoryEntry = {
        id: 'innate-rules',
        content: '# RULES.md\nR-001: Read memory bank before acting.',
        entryType: 'rule',
        source: 'innate',
        heatScore: 1.0,
        baseImportance: 1.0,
        referenceCount: 0,
        tier: 'innate',
        isProtected: true,
        sourceFile: 'agents/rules/RULES.md',
        createdAt: '2026-02-18T00:00:00Z',
        updatedAt: '2026-02-18T00:00:00Z',
      };

      expect(entry.tier).toBe('innate');
      expect(entry.isProtected).toBe(true);
    });

    it('should accept valid learned entry', () => {
      const entry: MemoryEntry = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        content: 'Sprint 3: Goal is SaaS Container Complete.',
        entryType: 'context',
        source: 'dispatch',
        role: 'ceo',
        cycle: 846,
        heatScore: 0.85,
        baseImportance: 0.7,
        referenceCount: 5,
        lastReferencedAt: '2026-02-18T01:30:00Z',
        tier: 'warm',
        isProtected: false,
        createdAt: '2026-02-17T00:00:00Z',
        updatedAt: '2026-02-18T01:30:00Z',
        tags: ['sprint', 'status'],
      };

      expect(entry.tier).toBe('warm');
      expect(entry.isProtected).toBe(false);
    });
  });

  describe('MemoryEntryType', () => {
    it('should include all entry types', () => {
      const types: MemoryEntryType[] = [
        'observation',
        'decision',
        'lesson',
        'context',
        'rule',
        'playbook',
        'protocol',
        'structure',
      ];

      expect(types).toHaveLength(8);
    });
  });

  describe('MemoryTier', () => {
    it('should include all tiers', () => {
      const tiers: MemoryTier[] = ['innate', 'hot', 'warm', 'cold'];
      expect(tiers).toHaveLength(4);
    });
  });

  describe('MemorySearchOptions', () => {
    it('should accept partial options', () => {
      const options: MemorySearchOptions = {
        limit: 5,
        includeInnate: true,
      };

      expect(options.limit).toBe(5);
    });

    it('should accept full options', () => {
      const options: MemorySearchOptions = {
        limit: 10,
        includeInnate: true,
        entryTypes: ['lesson', 'decision'],
        roles: ['frontier', 'engineering'],
        tiers: ['hot', 'warm'],
        minHeatScore: 0.5,
        tags: ['sprint-3'],
      };

      expect(options.entryTypes).toHaveLength(2);
    });
  });

  describe('MemoryStoreOptions', () => {
    it('should accept minimal config', () => {
      const options: MemoryStoreOptions = {
        dbPath: './memory.db',
      };

      expect(options.dbPath).toBe('./memory.db');
    });

    it('should accept full config', () => {
      const options: MemoryStoreOptions = {
        dbPath: './memory.db',
        embeddingDimension: 384,
        enableHeatDecay: true,
        heatDecayIntervalMs: 3600000,
        heatDecayFactor: 0.95,
        coldTierThreshold: 0.1,
        hotTierThreshold: 0.8,
      };

      expect(options.embeddingDimension).toBe(384);
    });
  });

  describe('EmbeddingProvider interface', () => {
    it('should define required properties', () => {
      const mockProvider: EmbeddingProvider = {
        name: 'mock-provider',
        dimension: 384,
        embed: (text: string) => {
          void text;
          return Promise.resolve(new Float32Array(384));
        },
        embedBatch: (texts: string[]) =>
          Promise.resolve(texts.map(() => new Float32Array(384))),
      };

      expect(mockProvider.name).toBe('mock-provider');
      expect(mockProvider.dimension).toBe(384);
    });
  });

  describe('InnateFileConfig', () => {
    it('should configure innate files', () => {
      const config: InnateFileConfig = {
        path: 'rules/RULES.md',
        entryType: 'rule',
        baseImportance: 1.0,
      };

      expect(config.entryType).toBe('rule');
    });
  });
});
