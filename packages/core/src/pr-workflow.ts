/**
 * @ada/core — PR Workflow
 *
 * Implements R-014 (Agent PR Workflow) support:
 * - Branch name generation from cycle/role/action
 * - Code change detection
 * - PR creation utilities
 *
 * @see Issue #128
 * @see R-014 in agents/rules/RULES.md
 * @see docs/design/pr-workflow-cli-ux-spec-c625.md
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Result of code change detection.
 */
export interface CodeChangeResult {
  /** Whether code files were modified */
  hasCodeChanges: boolean;
  /** Whether docs/agent state files were modified */
  hasDocChanges: boolean;
  /** List of modified code files */
  codeFiles: string[];
  /** List of modified doc/state files */
  docFiles: string[];
  /** All modified files */
  allFiles: string[];
}

/**
 * PR creation options.
 */
export interface PRCreationOptions {
  /** Cycle number */
  cycle: number;
  /** Role ID (lowercase) */
  role: string;
  /** Action description */
  action: string;
  /** Custom branch name (overrides auto-generation) */
  branch?: string;
  /** Create as draft PR */
  draft?: boolean;
  /** Base branch (default: main) */
  base?: string;
  /** Additional body content */
  body?: string;
  /** Related issue numbers */
  issues?: number[];
}

/**
 * PR creation result.
 */
export interface PRCreationResult {
  /** Whether PR was created successfully */
  success: boolean;
  /** PR number (if successful) */
  number?: number;
  /** PR URL (if successful) */
  url?: string;
  /** Branch name used */
  branch: string;
  /** Commit SHA */
  commitSha?: string;
  /** Error message (if failed) */
  error?: string;
}

// ─── File Classification ─────────────────────────────────────────────────────

/**
 * Patterns that indicate code files (require PR per R-014).
 */
const CODE_PATTERNS: RegExp[] = [
  /\.(ts|tsx|js|jsx|mjs|cjs)$/i,    // TypeScript/JavaScript
  /\.(py|pyw)$/i,                     // Python
  /\.(go|rs|rb|java|kt|swift)$/i,    // Other languages
  /\.test\.(ts|tsx|js|jsx)$/i,       // Test files
  /\.spec\.(ts|tsx|js|jsx)$/i,       // Spec files
  /^\.github\/workflows\//,           // CI workflows
  /package\.json$/,                   // Package config
  /tsconfig.*\.json$/,               // TypeScript config
  /\.eslintrc/,                       // ESLint config
  /vitest\.config/,                   // Vitest config
];

/**
 * Patterns that indicate docs/agent state (can bypass PR).
 */
const DOC_PATTERNS: RegExp[] = [
  /\.md$/i,                           // Markdown docs
  /^agents\//,                        // Agent state
  /^docs\//,                          // Documentation
  /\.txt$/i,                          // Text files
];

/**
 * Classify a file as code or documentation.
 */
export function classifyFile(filePath: string): 'code' | 'doc' | 'unknown' {
  // Normalize path separators
  const normalized = filePath.replace(/\\/g, '/');

  // Check doc patterns first (agent state takes precedence)
  for (const pattern of DOC_PATTERNS) {
    if (pattern.test(normalized)) {
      return 'doc';
    }
  }

  // Check code patterns
  for (const pattern of CODE_PATTERNS) {
    if (pattern.test(normalized)) {
      return 'code';
    }
  }

  return 'unknown';
}

// ─── Branch Name Generation ──────────────────────────────────────────────────

/**
 * Generate a slug from an action description.
 *
 * Rules (per UX spec):
 * 1. Lowercase
 * 2. Remove emoji and special characters
 * 3. Replace spaces with hyphens
 * 4. Truncate to 50 characters at word boundary
 * 5. Remove trailing hyphens
 *
 * @param action - Action description
 * @returns Kebab-case slug (max 50 chars)
 */
export function generateActionSlug(action: string): string {
  return action
    // Remove emojis
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    // Remove emoji modifiers and components
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '')
    // Convert to lowercase
    .toLowerCase()
    // Replace non-alphanumeric with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading hyphens
    .replace(/^-+/, '')
    // Remove trailing hyphens
    .replace(/-+$/, '')
    // Truncate at word boundary (50 chars)
    .substring(0, 50)
    // Remove trailing hyphens after truncation
    .replace(/-+$/, '');
}

/**
 * Generate a branch name following the convention:
 * ada/c{cycle}-{role}-{action-slug}
 *
 * @param cycle - Current dispatch cycle number
 * @param role - Role ID (lowercase)
 * @param action - Action description
 * @returns Branch name
 */
export function generateBranchName(
  cycle: number,
  role: string,
  action: string
): string {
  const slug = generateActionSlug(action);
  const roleId = role.toLowerCase();
  return `ada/c${cycle}-${roleId}-${slug}`;
}

/**
 * Validate a custom branch name.
 *
 * Valid prefixes: ada/, feat/, fix/, docs/, refactor/, ci/
 * Characters: lowercase letters, numbers, hyphens, slashes
 * Max length: 100 characters
 *
 * @param branch - Branch name to validate
 * @returns Object with valid flag and optional error message
 */
export function validateBranchName(branch: string): {
  valid: boolean;
  error?: string;
} {
  const VALID_PREFIXES = ['ada/', 'feat/', 'fix/', 'docs/', 'refactor/', 'ci/'];
  const MAX_LENGTH = 100;

  if (branch.length > MAX_LENGTH) {
    return {
      valid: false,
      error: `Branch name exceeds ${MAX_LENGTH} characters`,
    };
  }

  const hasValidPrefix = VALID_PREFIXES.some((prefix) =>
    branch.startsWith(prefix)
  );
  if (!hasValidPrefix) {
    return {
      valid: false,
      error: `Branch must start with: ${VALID_PREFIXES.join(', ')}`,
    };
  }

  // Check for invalid characters (allow lowercase, numbers, hyphens, slashes)
  if (!/^[a-z0-9\-/]+$/.test(branch)) {
    return {
      valid: false,
      error:
        'Branch name can only contain lowercase letters, numbers, hyphens, and slashes',
    };
  }

  return { valid: true };
}

// ─── PR Title Generation ─────────────────────────────────────────────────────

/**
 * Generate a conventional commit style PR title from action.
 *
 * Extracts commit type if present, defaults to 'chore'.
 *
 * @param action - Action description
 * @param role - Role ID for scope hint
 * @returns Conventional commit style title
 */
export function generatePRTitle(action: string, role: string): string {
  // Clean the action (remove emojis, normalize whitespace)
  const cleaned = action
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Try to extract conventional commit prefix
  const conventionalMatch = cleaned.match(
    /^(feat|fix|docs|refactor|test|chore|ci|perf|style|build)(\([^)]+\))?:\s*(.+)/i
  );

  if (conventionalMatch) {
    const [, type, scope, desc] = conventionalMatch;
    const normalizedType = type!.toLowerCase();
    // Lowercase the scope (including parentheses)
    const normalizedScope = scope ? scope.toLowerCase() : '';
    // Capitalize first letter of description
    const normalizedDesc = desc!.charAt(0).toLowerCase() + desc!.slice(1);
    return `${normalizedType}${normalizedScope}: ${normalizedDesc}`;
  }

  // Default: infer scope from role
  const roleScope = getRoleScope(role);
  const desc = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  return `chore(${roleScope}): ${desc}`;
}

/**
 * Map role ID to conventional commit scope.
 */
function getRoleScope(role: string): string {
  const scopeMap: Record<string, string> = {
    ceo: 'agents',
    growth: 'marketing',
    research: 'research',
    frontier: 'research',
    product: 'product',
    scrum: 'agents',
    qa: 'qa',
    engineering: 'cli', // Most engineering work is CLI-related
    ops: 'ops',
    design: 'design',
  };
  return scopeMap[role.toLowerCase()] ?? 'agents';
}

// ─── PR Body Generation ──────────────────────────────────────────────────────

/**
 * Generate a PR body from cycle metadata.
 *
 * @param options - PR creation options
 * @returns Markdown PR body
 */
export function generatePRBody(options: PRCreationOptions): string {
  const { cycle, role, action, body, issues } = options;

  // Clean action for display
  const cleanAction = action
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  const lines: string[] = [
    '## Summary',
    '',
    cleanAction,
    '',
    '## Cycle',
    '',
    `- **Cycle:** ${cycle}`,
    `- **Role:** ${getRoleEmoji(role)} ${capitalize(role)}`,
    `- **Action:** ${cleanAction.substring(0, 100)}${cleanAction.length > 100 ? '...' : ''}`,
    '',
  ];

  // Add custom body content if provided
  if (body) {
    lines.push('## Details', '', body, '');
  }

  // Add issue references
  if (issues && issues.length > 0) {
    lines.push('## Related Issues', '');
    issues.forEach((issue) => {
      lines.push(`- Relates to #${issue}`);
    });
    lines.push('');
  }

  // Auto-extract issue refs from action if not provided
  if (!issues || issues.length === 0) {
    const extractedIssues = extractIssueRefs(action);
    if (extractedIssues.length > 0) {
      lines.push('## Related Issues', '');
      extractedIssues.forEach((issue) => {
        lines.push(`- Relates to #${issue}`);
      });
      lines.push('');
    }
  }

  lines.push(
    '## Checklist',
    '',
    '- [x] Conventional commit title',
    '- [ ] Tests included (if applicable)',
    '- [ ] Documentation updated (if applicable)',
    '',
    '---',
    '',
    '_Generated by `ada dispatch complete --pr`_'
  );

  return lines.join('\n');
}

/**
 * Extract issue references from text.
 */
function extractIssueRefs(text: string): number[] {
  const matches = text.matchAll(/#(\d+)/g);
  const refs = new Set<number>();
  for (const match of matches) {
    refs.add(parseInt(match[1]!, 10));
  }
  return Array.from(refs).sort((a, b) => a - b);
}

/**
 * Get emoji for a role.
 */
function getRoleEmoji(role: string): string {
  const emojiMap: Record<string, string> = {
    ceo: '👔',
    growth: '🚀',
    research: '🔬',
    frontier: '🌌',
    product: '📦',
    scrum: '📋',
    qa: '🔍',
    engineering: '⚙️',
    ops: '🛡️',
    design: '🎨',
  };
  return emojiMap[role.toLowerCase()] ?? '❓';
}

/**
 * Capitalize first letter.
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
