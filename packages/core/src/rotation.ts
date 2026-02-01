/**
 * @ada/core — Rotation logic
 *
 * Manages the role rotation state machine:
 * reading current state, determining the active role,
 * advancing to the next role, and persisting state.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type {
  Role,
  RoleId,
  Roster,
  RotationState,
  RotationHistoryEntry,
} from "./types.js";

/** Maximum number of history entries to retain */
const MAX_HISTORY = 10;

/**
 * Read the rotation state from disk.
 *
 * @param statePath - Path to rotation.json
 * @returns The current rotation state
 */
export async function readRotationState(
  statePath: string
): Promise<RotationState> {
  const raw = await fs.readFile(statePath, "utf-8");
  return JSON.parse(raw) as RotationState;
}

/**
 * Write the rotation state to disk.
 *
 * @param statePath - Path to rotation.json
 * @param state - The state to persist
 */
export async function writeRotationState(
  statePath: string,
  state: RotationState
): Promise<void> {
  const dir = path.dirname(statePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
}

/**
 * Read the roster configuration from disk.
 *
 * @param rosterPath - Path to roster.json
 * @returns The parsed roster
 */
export async function readRoster(rosterPath: string): Promise<Roster> {
  const raw = await fs.readFile(rosterPath, "utf-8");
  return JSON.parse(raw) as Roster;
}

/**
 * Determine the current role based on rotation state and roster.
 *
 * @param state - Current rotation state
 * @param roster - Team roster with rotation order
 * @returns The role that should act this cycle, or null if roster is empty
 */
export function getCurrentRole(
  state: RotationState,
  roster: Roster
): Role | null {
  const { rotation_order, roles } = roster;

  if (rotation_order.length === 0) {
    return null;
  }

  // Ensure index is within bounds
  const safeIndex = state.current_index % rotation_order.length;
  const roleId = rotation_order[safeIndex];

  // Find the full role definition
  const role = roles.find((r) => r.id === roleId);
  return role ?? null;
}

/**
 * Get the role ID at the current rotation index.
 *
 * @param state - Current rotation state
 * @param roster - Team roster
 * @returns The current role ID
 */
export function getCurrentRoleId(
  state: RotationState,
  roster: Roster
): RoleId | null {
  const { rotation_order } = roster;

  if (rotation_order.length === 0) {
    return null;
  }

  const safeIndex = state.current_index % rotation_order.length;
  return rotation_order[safeIndex] ?? null;
}

/**
 * Advance the rotation to the next role.
 *
 * Creates a new state with:
 * - Incremented current_index (wraps around)
 * - Updated last_role and last_run
 * - Incremented cycle_count
 * - New history entry (trimmed to MAX_HISTORY)
 *
 * @param state - Current rotation state
 * @param roster - Team roster (for rotation_order length)
 * @param actionDescription - Brief description of what was done this cycle
 * @returns New rotation state (does not mutate input)
 */
export function advanceRotation(
  state: RotationState,
  roster: Roster,
  actionDescription?: string
): RotationState {
  const { rotation_order } = roster;

  if (rotation_order.length === 0) {
    return state;
  }

  const currentIndex = state.current_index % rotation_order.length;
  const currentRole = rotation_order[currentIndex]!;
  const nextIndex = (currentIndex + 1) % rotation_order.length;
  const now = new Date().toISOString();
  const newCycleCount = state.cycle_count + 1;

  const historyEntry: RotationHistoryEntry = {
    role: currentRole,
    timestamp: now,
    cycle: newCycleCount,
    ...(actionDescription ? { action: actionDescription } : {}),
  };

  // Keep only the last MAX_HISTORY entries
  const newHistory = [...state.history, historyEntry].slice(-MAX_HISTORY);

  return {
    current_index: nextIndex,
    last_role: currentRole,
    last_run: now,
    cycle_count: newCycleCount,
    history: newHistory,
  };
}

/**
 * Get a human-readable summary of the current rotation state.
 *
 * @param state - Current rotation state
 * @param roster - Team roster
 * @returns Formatted summary string
 */
export function getRotationSummary(
  state: RotationState,
  roster: Roster
): string {
  const role = getCurrentRole(state, roster);
  const lines: string[] = [];

  lines.push("📊 Rotation Status");
  lines.push("─────────────────────");

  if (role) {
    lines.push(`Current role: ${role.emoji} ${role.name} (${role.title})`);
  } else {
    lines.push("Current role: (none — empty rotation)");
  }

  lines.push(`Cycle count:  ${state.cycle_count}`);
  lines.push(`Last role:    ${state.last_role ?? "(none)"}`);
  lines.push(`Last run:     ${state.last_run ?? "(never)"}`);

  if (state.history.length > 0) {
    lines.push("");
    lines.push(`Recent history (last ${state.history.length}):`);
    for (const entry of state.history.slice(-5)) {
      const roleInfo = roster.roles.find((r) => r.id === entry.role);
      const emoji = roleInfo?.emoji ?? "❓";
      const action = entry.action ? ` — ${entry.action}` : "";
      lines.push(`  #${entry.cycle} ${emoji} ${entry.role}${action}`);
    }
  }

  return lines.join("\n");
}
