/**
 * @ada/core — Type definitions for Autonomous Dev Agents
 *
 * These types define the core data model for the ADA agent framework:
 * roles, rosters, rotation state, memory banks, and dispatch results.
 */

// ─── Role Types ──────────────────────────────────────────────────────────────

/** Standard role identifiers */
export type RoleId =
  | 'ceo'
  | 'research'
  | 'product'
  | 'scrum'
  | 'engineering'
  | 'ops'
  | 'design'
  | (string & {}); // Allow custom role IDs while keeping autocomplete

/** Actions a role can perform */
export type RoleAction =
  | 'write_business_plans'
  | 'swot_analysis'
  | 'market_research'
  | 'strategic_review'
  | 'partnership_strategy'
  | 'create_research_issues'
  | 'write_research_docs'
  | 'comment_on_feasibility'
  | 'evaluate_approaches'
  | 'create_feature_issues'
  | 'write_specs'
  | 'prioritize_backlog'
  | 'define_personas'
  | 'create_sprint_issues'
  | 'update_project_board'
  | 'write_retros'
  | 'unblock_team'
  | 'write_code'
  | 'create_prs'
  | 'code_review'
  | 'architect_systems'
  | 'merge_prs'
  | 'fix_ci'
  | 'add_rules'
  | 'enforce_standards'
  | 'update_ci'
  | 'write_api_specs'
  | 'review_interfaces'
  | 'create_design_docs'
  | 'define_protocols'
  | (string & {}); // Allow custom actions

/** Definition of a single role in the agent team */
export interface Role {
  /** Unique identifier for the role */
  readonly id: RoleId;
  /** Display name (e.g., "The Builder") */
  readonly name: string;
  /** Title (e.g., "Lead Engineer") */
  readonly title: string;
  /** Emoji for display */
  readonly emoji: string;
  /** Focus areas for this role */
  readonly focus: readonly string[];
  /** Available actions this role can take */
  readonly actions: readonly RoleAction[];
  /** Optional path to role-specific memory bank */
  readonly memory_bank?: string;
}

// ─── Roster Types ────────────────────────────────────────────────────────────

/** The full team roster configuration */
export interface Roster {
  /** Company/org name */
  readonly company: string;
  /** Product name and tagline */
  readonly product: string;
  /** Short tagline */
  readonly tagline: string;
  /** All defined roles */
  readonly roles: readonly Role[];
  /** Order in which roles rotate */
  readonly rotation_order: readonly RoleId[];
}

// ─── Rotation State ──────────────────────────────────────────────────────────

// ─── Reflection Types (Reflexion Pattern) ───────────────────────────────────

/** Outcome of an action for reflection tracking */
export type ReflectionOutcome = 'success' | 'partial' | 'blocked' | 'unknown';

/**
 * Reflexion-style self-critique attached to a dispatch cycle.
 * See: Shinn et al. (2023) — "Reflexion: Language Agents with Verbal Reinforcement Learning"
 */
export interface Reflection {
  /** How did the action turn out? */
  readonly outcome: ReflectionOutcome;
  /** What aspect of the approach was effective? (max 100 chars) */
  readonly whatWorked?: string;
  /** What would you do differently next time? (max 100 chars) */
  readonly whatToImprove?: string;
  /** Any insight worth remembering? (max 150 chars) */
  readonly lessonLearned?: string;
}

/** A single entry in the rotation history */
export interface RotationHistoryEntry {
  /** Role that acted */
  readonly role: RoleId;
  /** ISO timestamp of when the cycle ran */
  readonly timestamp: string;
  /** Cycle number */
  readonly cycle: number;
  /** Brief description of the action taken */
  readonly action?: string;
  /** Self-critique reflection on the action (Phase 1a: Reflexion) */
  readonly reflection?: Reflection;
}

/** Current rotation state — tracks where we are in the cycle */
export interface RotationState {
  /** Index into the roster's rotation_order array */
  current_index: number;
  /** Role that acted last (null if no cycles run) */
  last_role: RoleId | null;
  /** ISO timestamp of last run (null if no cycles run) */
  last_run: string | null;
  /** Total number of completed cycles */
  cycle_count: number;
  /** Recent history (last N entries) */
  history: RotationHistoryEntry[];
  /** Display title for the next role (e.g., "⚙️ engineering") — for README badges */
  next_role_title?: string;
  /** Whether dispatch is paused */
  paused?: boolean;
  /** ISO timestamp when pause was set */
  paused_at?: string;
  /** Reason for pausing (optional) */
  pause_reason?: string;
}

// ─── Memory Bank Types ───────────────────────────────────────────────────────

/** Per-role state stored in the memory bank */
export interface RoleState {
  /** Last action this role took */
  last_action: string | null;
  /** What the role is currently working on */
  working_on: string | null;
  /** Extra context (varies by role) */
  context: Record<string, string>;
}

/** An architecture decision record */
export interface ArchitectureDecision {
  /** Decision ID (e.g., "ADR-001") */
  readonly id: string;
  /** What was decided */
  readonly decision: string;
  /** Why it was decided */
  readonly rationale: string;
  /** ISO date */
  readonly date: string;
  /** Which role made the decision */
  readonly author: string;
}

/** A lesson learned entry */
export interface LessonLearned {
  /** Lesson number */
  readonly number: number;
  /** The lesson */
  readonly lesson: string;
  /** Context / when it happened */
  readonly context: string;
  /** ISO date */
  readonly date: string;
}

/** Structured memory bank data */
export interface MemoryBank {
  /** Last updated ISO timestamp */
  last_updated: string | null;
  /** Current cycle number */
  cycle: number;
  /** Bank version (incremented on compression) */
  version: number;
  /** Current sprint info */
  sprint: {
    name: string;
    goal: string;
    items: string[];
  };
  /** In-progress work */
  in_progress: string[];
  /** Current blockers */
  blockers: string[];
  /** Architecture decisions */
  decisions: ArchitectureDecision[];
  /** Per-role state */
  role_states: Record<RoleId, RoleState>;
  /** Lessons learned */
  lessons: LessonLearned[];
  /** Project metrics */
  metrics: {
    total_issues: number;
    open_prs: number;
    merged_prs: number;
    completed_cycles: number;
    test_count: number;
  };
}

// ─── Dispatch Types ──────────────────────────────────────────────────────────

/** Result of a single dispatch cycle */
export interface DispatchResult {
  /** Whether the cycle completed successfully */
  readonly success: boolean;
  /** Role that acted this cycle */
  readonly role: RoleId;
  /** Role display name */
  readonly roleName: string;
  /** Cycle number */
  readonly cycle: number;
  /** Action that was taken (brief description) */
  readonly action: string;
  /** ISO timestamp when cycle completed */
  readonly timestamp: string;
  /** Any files that were modified */
  readonly modifiedFiles: readonly string[];
  /** Error message if success is false */
  readonly error?: string;
}

// ─── Configuration Types ─────────────────────────────────────────────────────

/** ADA project configuration */
export interface AdaConfig {
  /** Path to the agents directory (default: "agents/") */
  readonly agentsDir: string;
  /** Path to the templates directory (default: "templates/") */
  readonly templatesDir: string;
  /** GitHub repo in owner/name format */
  readonly repo?: string;
  /** Default branch name */
  readonly defaultBranch: string;
  /** Maximum history entries to keep */
  readonly maxHistory: number;
  /** Memory bank compression threshold (lines) */
  readonly compressionThreshold: number;
}

/** Default configuration values */
export const DEFAULT_CONFIG: AdaConfig = {
  agentsDir: 'agents/',
  templatesDir: 'templates/',
  defaultBranch: 'main',
  maxHistory: 10,
  compressionThreshold: 200,
} as const;
