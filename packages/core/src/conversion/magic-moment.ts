/**
 * @fileoverview Magic Moment Detection
 *
 * Detects when agent cycles create visible output (PRs, issues, comments).
 * These "magic moments" are critical activation metrics.
 * Implements Magic Moment Detection from ADR C1266.
 *
 * @see docs/architecture/adr-trial-conversion-platform-c1266.md
 */

import type { Artifact } from './events.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Context for a dispatch cycle, used for artifact detection.
 */
export interface DispatchContext {
  /** Cycle number */
  cycle: number;
  /** Role that ran the cycle */
  role: string;
  /** Action description from dispatch */
  action?: string;
  /** Full dispatch output/log */
  output?: string;
  /** Duration of the cycle in milliseconds */
  durationMs?: number;
}

/**
 * Interface for detecting magic moment artifacts.
 */
export interface MagicMomentDetector {
  /**
   * Detect artifacts created during a dispatch cycle.
   */
  detectArtifacts(dispatchOutput: string, context: DispatchContext): Artifact[];

  /**
   * Check if the detected artifacts constitute a "magic moment".
   * Magic moments are visible outputs: PRs, issues, or comments.
   */
  isMagicMoment(artifacts: Artifact[]): boolean;
}

// ============================================================================
// Detection Patterns
// ============================================================================

/**
 * Regex patterns for detecting different artifact types.
 * Multiple patterns per type for robustness.
 */
export const ARTIFACT_PATTERNS: Record<Artifact['type'], RegExp[]> = {
  pr: [
    /Created pull request #(\d+)/i,
    /PR #(\d+) created/i,
    /Opened PR #(\d+)/i,
    /github\.com\/[^/]+\/[^/]+\/pull\/(\d+)/,
    /Pull request:.*#(\d+)/i,
    /\bPR\s+#(\d+)\b/i,
  ],
  issue: [
    /Created issue #(\d+)/i,
    /Issue #(\d+) created/i,
    /Opened issue #(\d+)/i,
    /github\.com\/[^/]+\/[^/]+\/issues\/(\d+)/,
    /Filed issue #(\d+)/i,
  ],
  comment: [
    /Commented on #(\d+)/i,
    /Added comment to issue #(\d+)/i,
    /Added comment to PR #(\d+)/i,
    /Left comment on #(\d+)/i,
    /Comment added to #(\d+)/i,
  ],
  doc: [
    /Updated ([^\s]+\.md)/i,
    /Created documentation/i,
    /Added docs for/i,
    /Documentation updated/i,
    /Updated README/i,
    /docs\//i,
  ],
  commit: [
    /Committed [a-f0-9]{7,40}/i,
    /commit [a-f0-9]{7,40}/i,
    /Pushed commit/i,
  ],
};

/**
 * Action text patterns that indicate artifact creation.
 * Used to detect artifacts from the action description.
 */
export const ACTION_PATTERNS: Record<Artifact['type'], RegExp[]> = {
  pr: [
    /PR\s*#\d+/i,
    /pull request/i,
    /created PR/i,
    /opened PR/i,
    /merged PR/i,
  ],
  issue: [
    /Issue\s*#\d+/i,
    /created issue/i,
    /opened issue/i,
    /filed issue/i,
  ],
  comment: [
    /commented/i,
    /added comment/i,
    /left comment/i,
  ],
  doc: [
    /updated.*\.md/i,
    /documentation/i,
    /created.*spec/i,
    /created.*doc/i,
  ],
  commit: [
    /committed/i,
    /pushed/i,
  ],
};

// ============================================================================
// Default Implementation
// ============================================================================

/**
 * Default magic moment detector using regex patterns.
 */
export class DefaultMagicMomentDetector implements MagicMomentDetector {
  /**
   * Detect artifacts from dispatch output and context.
   */
  detectArtifacts(dispatchOutput: string, context: DispatchContext): Artifact[] {
    const artifacts: Artifact[] = [];
    const seenTypes = new Set<Artifact['type']>();

    // Check action field for explicit artifact references
    if (context.action) {
      for (const [type, patterns] of Object.entries(ACTION_PATTERNS)) {
        if (seenTypes.has(type as Artifact['type'])) continue;
        
        for (const pattern of patterns) {
          if (pattern.test(context.action)) {
            const title = this.extractTitle(context.action, type as Artifact['type']);
            const artifact: Artifact = {
              type: type as Artifact['type'],
              createdAt: new Date(),
            };
            if (title !== undefined) {
              artifact.title = title;
            }
            artifacts.push(artifact);
            seenTypes.add(type as Artifact['type']);
            break;
          }
        }
      }
    }

    // Pattern matching on full output
    const textToScan = dispatchOutput || '';
    for (const [type, patterns] of Object.entries(ARTIFACT_PATTERNS)) {
      if (seenTypes.has(type as Artifact['type'])) continue;

      for (const pattern of patterns) {
        const match = pattern.exec(textToScan);
        if (match) {
          const url = this.extractUrl(textToScan, type as Artifact['type'], match);
          const artifact: Artifact = {
            type: type as Artifact['type'],
            createdAt: new Date(),
          };
          if (url !== undefined) {
            artifact.url = url;
          }
          artifacts.push(artifact);
          seenTypes.add(type as Artifact['type']);
          break; // One match per type is enough
        }
      }
    }

    return artifacts;
  }

  /**
   * Check if artifacts constitute a magic moment.
   * Magic moment = any visible output (PR, issue, or comment).
   * Docs and commits alone don't count as magic moments.
   */
  isMagicMoment(artifacts: Artifact[]): boolean {
    const magicTypes: Artifact['type'][] = ['pr', 'issue', 'comment'];
    return artifacts.some((a) => magicTypes.includes(a.type));
  }

  /**
   * Extract a title from the action text.
   */
  private extractTitle(
    action: string,
    type: Artifact['type']
  ): string | undefined {
    // Try to extract a meaningful title after the artifact reference
    const patterns: { [key: string]: RegExp } = {
      pr: /PR\s*#\d+[:\s—–-]+(.+?)(?:\.|$)/i,
      issue: /Issue\s*#\d+[:\s—–-]+(.+?)(?:\.|$)/i,
      comment: /[Cc]ommented?[:\s]+(.+?)(?:\.|$)/i,
      doc: /[Cc]reated?\s+(.+\.md)/i,
      commit: /[Cc]ommit(?:ted)?[:\s]+(.+?)(?:\.|$)/i,
    };

    const pattern = patterns[type];
    if (pattern !== undefined) {
      const match = pattern.exec(action);
      if (match !== null && match[1] !== undefined) {
        return match[1].trim();
      }
    }
    return undefined;
  }

  /**
   * Extract URL from the output text.
   */
  private extractUrl(
    text: string,
    type: Artifact['type'],
    match: RegExpExecArray
  ): string | undefined {
    // If the match contains a GitHub URL, use it
    if (match[0].includes('github.com')) {
      return match[0];
    }

    // Try to find a GitHub URL near the match
    const urlPatterns: Record<string, RegExp | undefined> = {
      pr: /https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/,
      issue: /https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+/,
      comment: /https:\/\/github\.com\/[^/]+\/[^/]+\/(?:issues|pull)\/\d+#issuecomment-\d+/,
      doc: undefined,
      commit: /https:\/\/github\.com\/[^/]+\/[^/]+\/commit\/[a-f0-9]+/,
    };

    const urlPattern = urlPatterns[type];
    if (urlPattern !== undefined) {
      const urlMatch = urlPattern.exec(text);
      if (urlMatch) {
        return urlMatch[0];
      }
    }

    return undefined;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create the default magic moment detector.
 */
export function createMagicMomentDetector(): MagicMomentDetector {
  return new DefaultMagicMomentDetector();
}

/**
 * Convenience function to detect and check for magic moment in one call.
 */
export function detectMagicMoment(
  dispatchOutput: string,
  context: DispatchContext
): { artifacts: Artifact[]; isMagicMoment: boolean } {
  const detector = createMagicMomentDetector();
  const artifacts = detector.detectArtifacts(dispatchOutput, context);
  return {
    artifacts,
    isMagicMoment: detector.isMagicMoment(artifacts),
  };
}
