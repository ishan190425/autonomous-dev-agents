/**
 * @ada/core — Dispatch protocol logic
 *
 * Orchestrates a single dispatch cycle:
 * load context → determine role → execute → update memory → advance rotation.
 *
 * Phase 2 adds MemoryStream integration for automatic action logging.
 */

import * as path from 'node:path';
import type {
  AdaConfig,
  DispatchResult,
  Role,
  Roster,
  RotationState,
} from './types.js';
import { DEFAULT_CONFIG } from './types.js';
import {
  readRotationState,
  readRoster,
  getCurrentRole,
  advanceRotation,
  writeRotationState,
} from './rotation.js';
import {
  readMemoryBank,
  writeMemoryBank,
  updateBankHeader,
  needsCompression,
  archiveBank,
  extractVersion,
  extractCycle,
} from './memory.js';
import {
  MemoryStream,
  createMemoryStream,
  extractIssueRefs,
  extractPRRefs,
  calculateDefaultImportance,
  type StreamEntryType,
} from './memory-stream.js';

/** Context loaded in Phase 1 of the dispatch protocol */
export interface DispatchContext {
  /** Current rotation state */
  readonly state: RotationState;
  /** Team roster */
  readonly roster: Roster;
  /** Active role for this cycle */
  readonly role: Role;
  /** Memory bank content */
  readonly memoryBank: string;
  /** Resolved file paths */
  readonly paths: {
    readonly root: string;
    readonly roster: string;
    readonly state: string;
    readonly memoryBank: string;
    readonly archives: string;
    readonly playbook: string;
    readonly stream: string;
  };
  /** MemoryStream instance for structured logging (Phase 2) — undefined if disabled */
  readonly memoryStream: MemoryStream | undefined;
}

/**
 * Options for loadContext() — Phase 2.
 */
export interface LoadContextOptions {
  /** Enable MemoryStream integration (default: true) */
  enableMemoryStream?: boolean;

  /** Custom stream path (default: agents/memory/stream.jsonl) */
  streamPath?: string;
}

/**
 * Phase 2 completion options for completeDispatch().
 *
 * Supports both simple string (backward compatible) and rich metadata.
 */
export interface CompleteDispatchOptions {
  /** Action description (required) */
  action: string;

  /** Optional: Importance score (1-10). Auto-calculated if omitted. */
  importance?: number;

  /** Optional: Entry type. Defaults to 'action'. */
  type?: StreamEntryType;

  /** Optional: Semantic tags for filtering */
  tags?: string[];

  /** Optional: Issue references (auto-extracted from action if omitted) */
  issueRefs?: number[];

  /** Optional: PR references (auto-extracted from action if omitted) */
  prRefs?: number[];

  /** Optional: Additional content beyond action description */
  content?: string;

  /** Optional: Skip memory logging (for special cases) */
  skipMemoryLog?: boolean;
}

/**
 * Resolve file paths for the dispatch protocol.
 *
 * @param rootDir - Root directory of the project
 * @param config - ADA configuration (uses defaults if not provided)
 * @param roleId - Current role ID (for playbook path)
 * @param streamPath - Custom stream path (optional)
 * @returns Resolved paths object
 */
export function resolvePaths(
  rootDir: string,
  roleId: string,
  config: Partial<AdaConfig> = {},
  streamPath?: string
): DispatchContext['paths'] {
  const agentsDir = config.agentsDir ?? DEFAULT_CONFIG.agentsDir;
  const agents = path.join(rootDir, agentsDir);

  return {
    root: rootDir,
    roster: path.join(agents, 'roster.json'),
    state: path.join(agents, 'state', 'rotation.json'),
    memoryBank: path.join(agents, 'memory', 'bank.md'),
    archives: path.join(agents, 'memory', 'archives'),
    playbook: path.join(agents, 'playbooks', `${roleId}.md`),
    stream: streamPath ?? path.join(agents, 'memory', 'stream.jsonl'),
  };
}

/**
 * Phase 1: Load all context needed for a dispatch cycle.
 *
 * Reads rotation state, roster, determines current role,
 * and loads the memory bank. Phase 2 adds optional MemoryStream.
 *
 * @param rootDir - Root directory of the project
 * @param config - Optional ADA configuration overrides
 * @param options - Optional context loading options (Phase 2)
 * @returns Loaded dispatch context, or null if no roles are configured
 */
export async function loadContext(
  rootDir: string,
  config: Partial<AdaConfig> = {},
  options: LoadContextOptions = {}
): Promise<DispatchContext | null> {
  const agentsDir = config.agentsDir ?? DEFAULT_CONFIG.agentsDir;
  const agents = path.join(rootDir, agentsDir);

  const statePath = path.join(agents, 'state', 'rotation.json');
  const rosterPath = path.join(agents, 'roster.json');

  const state = await readRotationState(statePath);
  const roster = await readRoster(rosterPath);
  const role = getCurrentRole(state, roster);

  if (!role) {
    return null;
  }

  const paths = resolvePaths(rootDir, role.id, config, options.streamPath);
  const memoryBank = await readMemoryBank(paths.memoryBank);

  // Phase 2: Create MemoryStream if enabled (default: true)
  let memoryStream: MemoryStream | undefined;
  if (options.enableMemoryStream !== false) {
    memoryStream = createMemoryStream(paths.stream);
  }

  return {
    state,
    roster,
    role,
    memoryBank,
    paths,
    memoryStream,
  };
}

/**
 * Phase 5: Check compression and archive if needed.
 *
 * @param context - Current dispatch context
 * @param config - ADA configuration
 * @returns Whether compression was performed
 */
export async function checkCompression(
  context: DispatchContext,
  config: Partial<AdaConfig> = {}
): Promise<boolean> {
  const threshold =
    config.compressionThreshold ?? DEFAULT_CONFIG.compressionThreshold;
  const currentCycle = context.state.cycle_count;
  const bankCycle = extractCycle(context.memoryBank);
  const cyclesSinceCompression = currentCycle - bankCycle;

  if (
    !needsCompression(context.memoryBank, cyclesSinceCompression, threshold)
  ) {
    return false;
  }

  // Archive current bank
  const version = extractVersion(context.memoryBank);
  await archiveBank(context.paths.memoryBank, context.paths.archives, version);

  // Note: actual compression logic (rewriting the bank) would be done
  // by the LLM agent, as it requires understanding the content.
  // We just update the header here.
  const compressed = updateBankHeader(
    context.memoryBank,
    currentCycle,
    version + 1
  );
  await writeMemoryBank(context.paths.memoryBank, compressed);

  return true;
}

/**
 * Phase 7: Advance rotation and persist state.
 *
 * Phase 2 enhancement: Accepts either a simple string (backward compatible)
 * or a CompleteDispatchOptions object for rich metadata logging.
 *
 * When MemoryStream is configured:
 * - Automatically logs the action to the stream
 * - Auto-extracts issue/PR refs if not provided
 * - Auto-calculates importance if not provided
 *
 * @param context - Current dispatch context
 * @param options - Action description (string) or completion options (object)
 * @returns The dispatch result
 */
export async function completeDispatch(
  context: DispatchContext,
  options: CompleteDispatchOptions | string
): Promise<DispatchResult> {
  // Normalize options — backward compatible with string form
  const opts: CompleteDispatchOptions =
    typeof options === 'string' ? { action: options } : options;

  // Phase 2: Log to MemoryStream if configured and not skipped
  if (context.memoryStream && !opts.skipMemoryLog) {
    const content = opts.content ?? opts.action;
    const type = opts.type ?? 'action';

    // Auto-extract refs if not provided
    const issueRefs = opts.issueRefs ?? extractIssueRefs(opts.action);
    const prRefs = opts.prRefs ?? extractPRRefs(opts.action);

    // Auto-calculate importance if not provided
    const importance =
      opts.importance ?? calculateDefaultImportance(opts.action, content, type);

    context.memoryStream.memoryLog({
      cycle: context.state.cycle_count + 1, // Next cycle (after advance)
      role: context.role.id,
      action: opts.action,
      content,
      importance,
      type,
      tags: opts.tags ?? [],
      issueRefs,
      prRefs,
    });
  }

  // Existing rotation logic
  const newState = advanceRotation(
    context.state,
    context.roster,
    opts.action
  );
  await writeRotationState(context.paths.state, newState);

  return {
    success: true,
    role: context.role.id,
    roleName: context.role.name,
    cycle: newState.cycle_count,
    action: opts.action,
    timestamp: newState.last_run || new Date().toISOString(),
    modifiedFiles: [context.paths.state, context.paths.memoryBank],
  };
}
