/**
 * Tests for `ada heat` command
 *
 * Validates heat scoring CLI commands including:
 * - Summary display
 * - List with filtering
 * - Decay operations
 * - Boost operations
 *
 * @see packages/cli/src/commands/heat.ts
 * @see Issue #118 — Heat Scoring Implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { heatCommand } from '../heat.js';

// Mock console.log to capture output
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('heat command', () => {
  beforeEach(() => {
    mockConsoleLog.mockClear();
  });

  afterEach(() => {
    mockConsoleLog.mockReset();
  });

  describe('command structure', () => {
    it('should have correct name', () => {
      expect(heatCommand.name()).toBe('heat');
    });

    it('should have description', () => {
      expect(heatCommand.description()).toContain('Heat scoring');
    });

    it('should have --dir option', () => {
      const dirOption = heatCommand.options.find((opt) => opt.long === '--dir');
      expect(dirOption).toBeDefined();
    });

    it('should have --json option', () => {
      const jsonOption = heatCommand.options.find((opt) => opt.long === '--json');
      expect(jsonOption).toBeDefined();
    });

    it('should have list subcommand', () => {
      const listCmd = heatCommand.commands.find((cmd) => cmd.name() === 'list');
      expect(listCmd).toBeDefined();
    });

    it('should have decay subcommand', () => {
      const decayCmd = heatCommand.commands.find((cmd) => cmd.name() === 'decay');
      expect(decayCmd).toBeDefined();
    });

    it('should have boost subcommand', () => {
      const boostCmd = heatCommand.commands.find((cmd) => cmd.name() === 'boost');
      expect(boostCmd).toBeDefined();
    });

    it('should have get subcommand', () => {
      const getCmd = heatCommand.commands.find((cmd) => cmd.name() === 'get');
      expect(getCmd).toBeDefined();
    });
  });

  describe('list subcommand options', () => {
    it('should have --tier option', () => {
      const listCmd = heatCommand.commands.find((cmd) => cmd.name() === 'list');
      const tierOption = listCmd?.options.find((opt) => opt.long === '--tier');
      expect(tierOption).toBeDefined();
    });

    it('should have --limit option', () => {
      const listCmd = heatCommand.commands.find((cmd) => cmd.name() === 'list');
      const limitOption = listCmd?.options.find((opt) => opt.long === '--limit');
      expect(limitOption).toBeDefined();
    });
  });

  describe('decay subcommand options', () => {
    it('should have --dry-run option', () => {
      const decayCmd = heatCommand.commands.find((cmd) => cmd.name() === 'decay');
      const dryRunOption = decayCmd?.options.find((opt) => opt.long === '--dry-run');
      expect(dryRunOption).toBeDefined();
    });

    it('should have --no-dry-run option', () => {
      const decayCmd = heatCommand.commands.find((cmd) => cmd.name() === 'decay');
      const noDryRunOption = decayCmd?.options.find((opt) => opt.long === '--no-dry-run');
      expect(noDryRunOption).toBeDefined();
    });
  });

  describe('boost subcommand options', () => {
    it('should have --amount option', () => {
      const boostCmd = heatCommand.commands.find((cmd) => cmd.name() === 'boost');
      const amountOption = boostCmd?.options.find((opt) => opt.long === '--amount');
      expect(amountOption).toBeDefined();
    });

    it('should require entityId argument', () => {
      const boostCmd = heatCommand.commands.find((cmd) => cmd.name() === 'boost');
      // Commander stores arguments with their details
      expect(boostCmd?._args.length).toBe(1);
      expect(boostCmd?._args[0].name()).toBe('entityId');
    });
  });
});

describe('heat command integration', () => {
  // Use vi.hoisted to define mocks before module mocking runs
  const { mockStore, mockStats, mockLoad, mockGetAllWithScores, mockGetByTier, mockDecay, mockGet, mockIncrement } = vi.hoisted(() => {
    const mockStats = vi.fn();
    const mockLoad = vi.fn();
    const mockGetAllWithScores = vi.fn();
    const mockGetByTier = vi.fn();
    const mockDecay = vi.fn();
    const mockGet = vi.fn();
    const mockIncrement = vi.fn();

    const mockStore = {
      load: mockLoad,
      stats: mockStats,
      getAllWithScores: mockGetAllWithScores,
      getByTier: mockGetByTier,
      decay: mockDecay,
      get: mockGet,
      increment: mockIncrement,
    };

    return { mockStore, mockStats, mockLoad, mockGetAllWithScores, mockGetByTier, mockDecay, mockGet, mockIncrement };
  });

  // Mock createHeatStore to return our controlled mock store
  vi.mock('@ada-ai/core/heat', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@ada-ai/core/heat')>();
    return {
      ...actual,
      createHeatStore: vi.fn(() => mockStore),
    };
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoad.mockResolvedValue(0);
    mockConsoleLog.mockClear();
  });

  it('should show empty state when no heat store exists', async () => {
    mockStats.mockReturnValue({
      total: 0,
      byClass: { innate: 0, learned: 0, episodic: 0 },
      byTier: { hot: 0, warm: 0, cold: 0 },
      averageHeat: 0,
      averageReferences: 0,
    });

    // Parse through parent command to inherit options
    await heatCommand.parseAsync(['node', 'heat', '--dir', '/tmp/test'], { from: 'node' });

    expect(mockLoad).toHaveBeenCalled();
    expect(mockStats).toHaveBeenCalled();
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('No entries'));
  });

  it('should list entries sorted by score descending', async () => {
    const mockEntries = [
      { id: 'entry-1', memoryClass: 'learned', baseImportance: 0.8, referenceCount: 10, lastAccessedAt: Date.now(), createdAt: Date.now() - 1000, heatScore: 0.9, tier: 'hot' },
      { id: 'entry-2', memoryClass: 'episodic', baseImportance: 0.5, referenceCount: 3, lastAccessedAt: Date.now() - 86400000, createdAt: Date.now() - 10000, heatScore: 0.5, tier: 'warm' },
      { id: 'entry-3', memoryClass: 'innate', baseImportance: 0.3, referenceCount: 1, lastAccessedAt: Date.now() - 604800000, createdAt: Date.now() - 100000, heatScore: 0.2, tier: 'cold' },
    ];
    mockGetAllWithScores.mockReturnValue(mockEntries);

    // Parse through parent command — subcommands inherit parent options
    await heatCommand.parseAsync(['node', 'heat', '--dir', '/tmp/test', 'list'], { from: 'node' });

    expect(mockLoad).toHaveBeenCalled();
    expect(mockGetAllWithScores).toHaveBeenCalled();
    // Should display entries (entry-1 first due to highest score)
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('entry-1'));
  });

  it('should filter by tier when --tier is provided', async () => {
    const hotEntries = [
      { id: 'hot-entry', memoryClass: 'learned', baseImportance: 0.9, referenceCount: 20, lastAccessedAt: Date.now(), createdAt: Date.now() - 500, heatScore: 0.95, tier: 'hot' },
    ];
    mockGetByTier.mockReturnValue(hotEntries);

    // Parse through parent command with subcommand options
    await heatCommand.parseAsync(['node', 'heat', '--dir', '/tmp/test', 'list', '--tier', 'hot'], { from: 'node' });

    expect(mockGetByTier).toHaveBeenCalledWith('hot');
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('hot-entry'));
  });

  it('should perform dry-run decay by default', async () => {
    mockDecay.mockResolvedValue({
      processed: 5,
      tierChanges: [
        { id: 'entry-1', oldTier: 'hot', newTier: 'warm', oldScore: 0.8, newScore: 0.55 },
      ],
      archived: [],
      timestamp: Date.now(),
    });

    // Parse through parent command — decay defaults to dry-run
    await heatCommand.parseAsync(['node', 'heat', '--dir', '/tmp/test', 'decay'], { from: 'node' });

    expect(mockDecay).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Would apply'));
  });

  it('should apply decay when --no-dry-run is specified', async () => {
    mockDecay.mockResolvedValue({
      processed: 5,
      tierChanges: [
        { id: 'entry-1', oldTier: 'warm', newTier: 'cold', oldScore: 0.55, newScore: 0.25 },
      ],
      archived: ['old-entry'],
      timestamp: Date.now(),
    });

    // Parse through parent command with --no-dry-run flag
    await heatCommand.parseAsync(['node', 'heat', '--dir', '/tmp/test', 'decay', '--no-dry-run'], { from: 'node' });

    expect(mockDecay).toHaveBeenCalledWith(expect.objectContaining({ dryRun: false }));
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Applied changes'));
  });

  it('should boost entry score and update tier if threshold crossed', async () => {
    const entry = {
      id: 'boost-target',
      memoryClass: 'learned' as const,
      baseImportance: 0.6,
      referenceCount: 3,
      lastAccessedAt: Date.now() - 100000,
      createdAt: Date.now() - 1000000,
    };
    const updatedEntry = { ...entry, referenceCount: 4, lastAccessedAt: Date.now() };

    mockGet.mockReturnValue(entry);
    mockIncrement.mockResolvedValue(updatedEntry);
    mockGetAllWithScores.mockReturnValue([
      { ...updatedEntry, heatScore: 0.75, tier: 'hot' },
    ]);

    // Parse through parent command with boost subcommand and target
    await heatCommand.parseAsync(['node', 'heat', '--dir', '/tmp/test', 'boost', 'boost-target'], { from: 'node' });

    expect(mockGet).toHaveBeenCalledWith('boost-target');
    expect(mockIncrement).toHaveBeenCalledWith('boost-target', true);
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Boosted'));
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('References: 3 → 4'));
  });
});
