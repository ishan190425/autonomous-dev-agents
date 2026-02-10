/**
 * @ada/core/terminal — Shell Detector
 *
 * Auto-detection and validation of shell environments for Terminal Mode.
 * Supports bash, zsh, and sh with graceful fallback.
 *
 * @see docs/engineering/terminal-mode-technical-spec.md §2
 * @packageDocumentation
 */

import { access, constants } from 'node:fs/promises';
import type {
  ShellConfig,
  ShellDetectorOptions,
  ShellType,
} from './types.js';
import { TerminalError } from './types.js';

/**
 * Supported shell types for Terminal Mode.
 */
const SUPPORTED_SHELLS: readonly ShellType[] = ['bash', 'zsh', 'sh'];

/**
 * Default fallback shell path.
 */
const DEFAULT_FALLBACK = '/bin/bash';

/**
 * Detect shell type from path string.
 *
 * @param path - Shell binary path
 * @returns Shell type or 'unknown' if not recognized
 */
export function getShellType(path: string): ShellType | 'unknown' {
  if (path.includes('bash')) return 'bash';
  if (path.includes('zsh')) return 'zsh';
  if (path.endsWith('/sh')) return 'sh';
  return 'unknown';
}

/**
 * Check if a shell type is supported.
 *
 * @param type - Shell type to check
 * @returns True if the shell type is supported
 */
export function isSupported(type: string): type is ShellType {
  return (SUPPORTED_SHELLS as readonly string[]).includes(type);
}

/**
 * Check if a file exists and is executable.
 *
 * @param path - Path to check
 * @returns True if the file exists and is executable
 */
async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a shell path and return its configuration.
 *
 * @param path - Shell binary path to validate
 * @param detected - Whether this was auto-detected (true) or user-specified (false)
 * @returns Validated shell configuration
 * @throws TerminalError if shell doesn't exist or isn't supported
 */
export async function validateShell(
  path: string,
  detected: boolean
): Promise<ShellConfig> {
  const exists = await isExecutable(path);
  if (!exists) {
    throw new TerminalError(
      `Shell not found or not executable: ${path}`,
      'SHELL_NOT_FOUND'
    );
  }

  const type = getShellType(path);
  if (type === 'unknown') {
    throw new TerminalError(
      `Unsupported shell type: ${path}. Supported: ${SUPPORTED_SHELLS.join(', ')}`,
      'SHELL_UNSUPPORTED'
    );
  }

  return { path, type, detected };
}

/**
 * Detect the shell to use for Terminal Mode.
 *
 * Detection order:
 * 1. If override provided via --shell flag, validate and use it
 * 2. Check $SHELL environment variable (most common case)
 * 3. Fall back to /bin/bash
 *
 * @param options - Detection options
 * @returns Detected shell configuration
 * @throws TerminalError if no valid shell can be found
 *
 * @example
 * ```typescript
 * // Auto-detect from environment
 * const shell = await detectShell();
 * console.log(shell.type); // 'zsh' (if $SHELL=/bin/zsh)
 *
 * // Override with specific shell
 * const bash = await detectShell({ override: '/bin/bash' });
 * console.log(bash.detected); // false (user-specified)
 * ```
 */
export async function detectShell(
  options: ShellDetectorOptions = {}
): Promise<ShellConfig> {
  // 1. If override provided, validate and use it
  if (options.override) {
    return validateShell(options.override, false);
  }

  // 2. Check $SHELL environment variable
  const shellEnv = process.env.SHELL;
  if (shellEnv) {
    const shellType = getShellType(shellEnv);
    if (isSupported(shellType)) {
      // Validate the path actually exists
      try {
        return await validateShell(shellEnv, true);
      } catch {
        // $SHELL is set but doesn't exist, continue to fallback
        console.warn(
          `Warning: $SHELL (${shellEnv}) not accessible, falling back to ${options.fallback || DEFAULT_FALLBACK}`
        );
      }
    } else {
      // Unsupported shell (fish, nushell, etc.)
      console.warn(
        `Warning: Unsupported shell (${shellEnv}). Falling back to ${options.fallback || DEFAULT_FALLBACK}. ` +
          `Supported shells: ${SUPPORTED_SHELLS.join(', ')}`
      );
    }
  }

  // 3. Fall back to configured fallback or /bin/bash
  const fallback = options.fallback || DEFAULT_FALLBACK;
  return validateShell(fallback, true);
}
