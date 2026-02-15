/**
 * @ada/core — HeatIntegratedStream Tests (Issue #118 — Memory Stream Integration)
 *
 * Tests for the integrated memory stream that combines MemoryStream + HeatStore.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  HeatIntegratedStream,
  createHeatIntegratedStream,
} from '../../src/heat-integrated-stream.js';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

const TEST_DIR = path.join(process.cwd(), 'test-output', 'heat-integrated');

function setupTestDir(): void {
  fs.mkdirSync(path.join(TEST_DIR, 'memory'), { recursive: true });
}

function cleanupTestDir(): void {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('HeatIntegratedStream', () => {
  beforeEach(() => {
    cleanupTestDir();
    setupTestDir();
  });

  afterEach(() => {
    cleanupTestDir();
  });

  describe('constructor', () => {
    it('creates an instance with default config', () => {
      const stream = new HeatIntegratedStream(TEST_DIR);
      expect(stream).toBeInstanceOf(HeatIntegratedStream);
      expect(stream.isHeatEnabled()).toBe(true);
    });

    it('respects enableHeat config', () => {
      const stream = new HeatIntegratedStream(TEST_DIR, { enableHeat: false });
      expect(stream.isHeatEnabled()).toBe(false);
    });
  });

  describe('createHeatIntegratedStream', () => {
    it('creates and initializes a stream', async () => {
      const stream = await createHeatIntegratedStream(TEST_DIR);
      expect(stream).toBeInstanceOf(HeatIntegratedStream);
    });
  });

  describe('log', () => {
    it('creates a stream entry', async () => {
      const stream = await createHeatIntegratedStream(TEST_DIR);

      const entry = await stream.log({
        cycle: 100,
        role: 'engineering',
        action: 'Test action',
        content: 'Test content for memory entry',
        importance: 8,
      });

      expect(entry.id).toBeDefined();
      expect(entry.cycle).toBe(100);
      expect(entry.role).toBe('engineering');
      expect(entry.action).toBe('Test action');
      expect(entry.importance).toBe(8);
    });

    it('creates a corresponding heat entry', async () => {
      const stream = await createHeatIntegratedStream(TEST_DIR);

      const entry = await stream.log({
        cycle: 100,
        role: 'engineering',
        action: 'Test action',
        content: 'Test content',
        importance: 8,
      });

      const heatStore = stream.getHeatStore();
      const heatEntry = heatStore.get(entry.id);

      expect(heatEntry).toBeDefined();
      expect(heatEntry?.id).toBe(entry.id);
      expect(heatEntry?.baseImportance).toBe(0.8); // 8/10
      expect(heatEntry?.memoryClass).toBe('learned'); // default
      expect(heatEntry?.referenceCount).toBe(0);
    });

    it('respects custom memoryClass', async () => {
      const stream = await createHeatIntegratedStream(TEST_DIR);

      const entry = await stream.log({
        cycle: 100,
        role: 'qa',
        action: 'Observation',
        content: 'Transient observation',
        importance: 5,
        memoryClass: 'episodic',
      });

      const heatStore = stream.getHeatStore();
      const heatEntry = heatStore.get(entry.id);

      expect(heatEntry?.memoryClass).toBe('episodic');
    });

    it('respects skipHeat option', async () => {
      const stream = await createHeatIntegratedStream(TEST_DIR);

      const entry = await stream.log({
        cycle: 100,
        role: 'ops',
        action: 'Temp action',
        content: 'No heat needed',
        importance: 3,
        skipHeat: true,
      });

      const heatStore = stream.getHeatStore();
      const heatEntry = heatStore.get(entry.id);

      expect(heatEntry).toBeNull();
    });

    it('does not create heat entry when heat disabled', async () => {
      const stream = await createHeatIntegratedStream(TEST_DIR, {
        enableHeat: false,
      });

      const entry = await stream.log({
        cycle: 100,
        role: 'engineering',
        action: 'Test',
        content: 'Test',
        importance: 8,
      });

      const heatStore = stream.getHeatStore();
      const heatEntry = heatStore.get(entry.id);

      expect(heatEntry).toBeNull();
    });
  });

  describe('search', () => {
    it('returns results with combined scores when heat enabled', async () => {
      const stream = await createHeatIntegratedStream(TEST_DIR);

      // Log some entries
      await stream.log({
        cycle: 100,
        role: 'engineering',
        action: 'Implement heat scoring',
        content: 'Added heat calculation module with decay',
        importance: 9,
      });

      await stream.log({
        cycle: 101,
        role: 'engineering',
        action: 'Add heat tests',
        content: 'Unit tests for heat calculation',
        importance: 7,
      });

      const results = await stream.search('heat scoring');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].semanticScore).toBeDefined();
      expect(results[0].heatScore).toBeDefined();
      expect(results[0].heatTier).toBeDefined();
      expect(results[0].combinedScore).toBeDefined();
    });

    it('returns semantic-only results when withHeat=false', async () => {
      const stream = await createHeatIntegratedStream(TEST_DIR);

      await stream.log({
        cycle: 100,
        role: 'engineering',
        action: 'Test entry',
        content: 'Some test content',
        importance: 8,
      });

      const results = await stream.search('test', { withHeat: false });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].semanticScore).toBeDefined();
      expect(results[0].heatScore).toBeUndefined();
      expect(results[0].heatTier).toBeUndefined();
      // Combined equals semantic when no heat
      expect(results[0].combinedScore).toBe(results[0].semanticScore);
    });

    it('filters by heat tier', async () => {
      const stream = await createHeatIntegratedStream(TEST_DIR);

      // Log an entry (will be hot initially)
      await stream.log({
        cycle: 100,
        role: 'engineering',
        action: 'Hot entry',
        content: 'Fresh and important',
        importance: 10,
      });

      // Search with minTier='hot'
      const hotResults = await stream.search('hot entry', { minTier: 'hot' });

      // Fresh entries with high importance should be hot
      expect(hotResults.length).toBeGreaterThan(0);
      expect(hotResults[0].heatTier).toBe('hot');
    });

    it('respects limit option', async () => {
      const stream = await createHeatIntegratedStream(TEST_DIR);

      // Log multiple entries
      for (let i = 0; i < 10; i++) {
        await stream.log({
          cycle: 100 + i,
          role: 'engineering',
          action: `Action ${i}`,
          content: `Content for action ${i}`,
          importance: 5,
        });
      }

      const results = await stream.search('action', { limit: 3 });
      expect(results.length).toBe(3);
    });
  });

  describe('boost', () => {
    it('increments reference count', async () => {
      const stream = await createHeatIntegratedStream(TEST_DIR);

      const entry = await stream.log({
        cycle: 100,
        role: 'engineering',
        action: 'Boostable entry',
        content: 'Will be boosted',
        importance: 7,
      });

      // Check initial reference count
      let heatEntry = stream.getHeatStore().get(entry.id);
      expect(heatEntry?.referenceCount).toBe(0);

      // Boost
      await stream.boost(entry.id);

      heatEntry = stream.getHeatStore().get(entry.id);
      expect(heatEntry?.referenceCount).toBe(1);

      // Boost multiple times
      await stream.boost(entry.id, 3);

      heatEntry = stream.getHeatStore().get(entry.id);
      expect(heatEntry?.referenceCount).toBe(4);
    });
  });

  describe('stats', () => {
    it('returns integrated stats', async () => {
      const stream = await createHeatIntegratedStream(TEST_DIR);

      // Log some entries
      await stream.log({
        cycle: 100,
        role: 'engineering',
        action: 'Entry 1',
        content: 'Content 1',
        importance: 9,
      });

      await stream.log({
        cycle: 101,
        role: 'qa',
        action: 'Entry 2',
        content: 'Content 2',
        importance: 6,
      });

      const stats = stream.stats();

      expect(stats.streamEntries).toBe(2);
      expect(stats.heatEntries).toBe(2);
      expect(stats.missingHeat).toBe(0);
      expect(stats.heatDistribution.hot).toBeGreaterThanOrEqual(0);
      expect(stats.averageHeat).toBeGreaterThan(0);
    });

    it('tracks entries missing heat', async () => {
      const stream = await createHeatIntegratedStream(TEST_DIR);

      // Log entry with heat
      await stream.log({
        cycle: 100,
        role: 'engineering',
        action: 'With heat',
        content: 'Has heat entry',
        importance: 8,
      });

      // Log entry without heat
      await stream.log({
        cycle: 101,
        role: 'ops',
        action: 'Without heat',
        content: 'Skipped heat',
        importance: 5,
        skipHeat: true,
      });

      const stats = stream.stats();

      expect(stats.streamEntries).toBe(2);
      expect(stats.heatEntries).toBe(1);
      expect(stats.missingHeat).toBe(1);
    });
  });

  describe('initializeMissingHeat', () => {
    it('creates heat entries for entries that lack them', async () => {
      const stream = await createHeatIntegratedStream(TEST_DIR);

      // Log entries without heat
      await stream.log({
        cycle: 100,
        role: 'engineering',
        action: 'Entry 1',
        content: 'Content 1',
        importance: 8,
        skipHeat: true,
      });

      await stream.log({
        cycle: 101,
        role: 'qa',
        action: 'Entry 2',
        content: 'Content 2',
        importance: 6,
        skipHeat: true,
      });

      // Check missing
      let stats = stream.stats();
      expect(stats.missingHeat).toBe(2);

      // Initialize missing heat
      const initialized = await stream.initializeMissingHeat();
      expect(initialized).toBe(2);

      // Check again
      stats = stream.stats();
      expect(stats.missingHeat).toBe(0);
      expect(stats.heatEntries).toBe(2);
    });

    it('skips entries that already have heat', async () => {
      const stream = await createHeatIntegratedStream(TEST_DIR);

      // Log entry with heat
      await stream.log({
        cycle: 100,
        role: 'engineering',
        action: 'With heat',
        content: 'Has heat',
        importance: 8,
      });

      // Initialize (should be 0 since all have heat)
      const initialized = await stream.initializeMissingHeat();
      expect(initialized).toBe(0);
    });
  });

  describe('setHeatEnabled', () => {
    it('toggles heat integration', async () => {
      const stream = await createHeatIntegratedStream(TEST_DIR);
      expect(stream.isHeatEnabled()).toBe(true);

      stream.setHeatEnabled(false);
      expect(stream.isHeatEnabled()).toBe(false);

      // Log entry when disabled
      const entry = await stream.log({
        cycle: 100,
        role: 'engineering',
        action: 'Disabled heat',
        content: 'Content',
        importance: 8,
      });

      const heatEntry = stream.getHeatStore().get(entry.id);
      expect(heatEntry).toBeNull();

      // Re-enable and log
      stream.setHeatEnabled(true);
      const entry2 = await stream.log({
        cycle: 101,
        role: 'engineering',
        action: 'Enabled heat',
        content: 'Content',
        importance: 8,
      });

      const heatEntry2 = stream.getHeatStore().get(entry2.id);
      expect(heatEntry2).toBeDefined();
    });
  });

  describe('runDecay', () => {
    it('runs decay pass on heat store', async () => {
      const stream = await createHeatIntegratedStream(TEST_DIR);

      await stream.log({
        cycle: 100,
        role: 'engineering',
        action: 'Entry',
        content: 'Content',
        importance: 8,
      });

      // Run decay (dry run)
      const result = await stream.runDecay(true);

      expect(result.processed).toBeGreaterThanOrEqual(0);
      expect(result.tierChanges).toBeDefined();
      expect(result.archived).toBeDefined();
    });
  });

  describe('getStream and getHeatStore', () => {
    it('exposes underlying components', async () => {
      const stream = await createHeatIntegratedStream(TEST_DIR);

      expect(stream.getStream()).toBeDefined();
      expect(stream.getHeatStore()).toBeDefined();
    });
  });
});
