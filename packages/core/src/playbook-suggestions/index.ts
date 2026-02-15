/**
 * @ada-ai/core — Playbook Suggestions Module
 *
 * Pattern-to-playbook automation for self-improving agent teams.
 * Transforms Reflexion patterns into actionable playbook amendments.
 *
 * @module playbook-suggestions
 * @see docs/frontier/pattern-to-playbook-automation-spec-c449.md
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type {
  SuggestionType,
  SuggestionStatus,
  ConfidenceTier,
  PlaybookSuggestion,
  CreateSuggestionInput,
  SuggestionConfig,
  ListSuggestionsOptions,
  SuggestionStats,
  ValidationResult,
  ApplyResult,
  RejectResult,
} from './types.js';

export { DEFAULT_SUGGESTION_CONFIG } from './types.js';

// ─── Store ───────────────────────────────────────────────────────────────────

export { SuggestionStore } from './store.js';

// ─── Generator ───────────────────────────────────────────────────────────────

export {
  SuggestionGenerator,
  createSuggestionGenerator,
} from './generator.js';
