/**
 * @ada/core — Dispatch protocol logic
 *
 * Orchestrates a single dispatch cycle:
 * load context → determine role → execute → update memory → advance rotation.
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
  };
}

/**
 * Resolve file paths for the dispatch protocol.
 *
 * @param rootDir - Root directory of the project
 * @param config - ADA configuration (uses defaults if not provided)
 * @param roleId - Current role ID (for playbook path)
 * @returns Resolved paths object
 */
export function resolvePaths(
  rootDir: string,
  roleId: string,
  config: Partial<AdaConfig> = {}
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
  };
}

/**
 * Phase 1: Load all context needed for a dispatch cycle.
 *
 * Reads rotation state, roster, determines current role,
 * and loads the memory bank.
 *
 * @param rootDir - Root directory of the project
 * @param config - Optional ADA configuration overrides
 * @returns Loaded dispatch context, or null if no roles are configured
 */
export async function loadContext(
  rootDir: string,
  config: Partial<AdaConfig> = {}
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

  const paths = resolvePaths(rootDir, role.id, config);
  const memoryBank = await readMemoryBank(paths.memoryBank);

  return {
    state,
    roster,
    role,
    memoryBank,
    paths,
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
 * @param context - Current dispatch context
 * @param actionDescription - What was done this cycle
 * @returns The dispatch result
 */
export async function completeDispatch(
  context: DispatchContext,
  actionDescription: string
): Promise<DispatchResult> {
  const newState = advanceRotation(
    context.state,
    context.roster,
    actionDescription
  );
  await writeRotationState(context.paths.state, newState);

  return {
    success: true,
    role: context.role.id,
    roleName: context.role.name,
    cycle: newState.cycle_count,
    action: actionDescription,
    timestamp: newState.last_run || new Date().toISOString(),
    modifiedFiles: [context.paths.state, context.paths.memoryBank],
  };
}
