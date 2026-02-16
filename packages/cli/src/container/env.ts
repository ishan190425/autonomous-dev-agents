/**
 * Container Environment Validation
 *
 * Validates all required and optional environment variables on startup.
 * Fails fast with clear error messages per Product spec C714.
 *
 * @module container/env
 * @author ⚙️ Engineering | Cycle 717 | Phase 1 Container MVP
 */

/**
 * Container configuration derived from environment variables
 */
export interface ContainerConfig {
  /** GitHub Personal Access Token (required) */
  githubToken: string;

  /** Target repository in owner/repo format (required) */
  githubRepo: string;

  /** Anthropic API key for LLM access (required) */
  anthropicApiKey: string;

  /** Dispatch cycle interval (default: 15m) */
  dispatchInterval: string;

  /** Permission mode: read-only or read-write (default: read-write) */
  rolesMode: 'read-only' | 'read-write';

  /** Log level: debug, info, or warn (default: info) */
  logLevel: 'debug' | 'info' | 'warn';

  /** Health endpoint port (default: 8080) */
  healthPort: number;
}

/**
 * Validation error with field name and message
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  success: boolean;
  config?: ContainerConfig;
  errors?: ValidationError[];
}

/**
 * Validates GitHub token format
 * Must start with 'ghp_' (classic) or 'github_pat_' (fine-grained)
 */
function validateGitHubToken(token: string | undefined): ValidationError | null {
  if (!token) {
    return { field: 'GITHUB_TOKEN', message: 'GITHUB_TOKEN is required but not set' };
  }
  if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
    return {
      field: 'GITHUB_TOKEN',
      message: "GITHUB_TOKEN must start with 'ghp_' (classic) or 'github_pat_' (fine-grained)",
    };
  }
  return null;
}

/**
 * Validates GitHub repo format (owner/repo)
 */
function validateGitHubRepo(repo: string | undefined): ValidationError | null {
  if (!repo) {
    return { field: 'GITHUB_REPO', message: 'GITHUB_REPO is required but not set' };
  }
  const repoPattern = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/;
  if (!repoPattern.test(repo)) {
    return {
      field: 'GITHUB_REPO',
      message: "GITHUB_REPO must be in 'owner/repo' format (e.g., 'ishan190425/myproject')",
    };
  }
  return null;
}

/**
 * Validates Anthropic API key format
 * Must start with 'sk-ant-'
 */
function validateAnthropicKey(key: string | undefined): ValidationError | null {
  if (!key) {
    return { field: 'ANTHROPIC_API_KEY', message: 'ANTHROPIC_API_KEY is required but not set' };
  }
  if (!key.startsWith('sk-ant-')) {
    return {
      field: 'ANTHROPIC_API_KEY',
      message: "ANTHROPIC_API_KEY must start with 'sk-ant-'",
    };
  }
  return null;
}

/**
 * Validates dispatch interval format (e.g., 15m, 30m, 1h)
 */
function validateDispatchInterval(interval: string): ValidationError | null {
  const intervalPattern = /^[0-9]+(m|h)$/;
  if (!intervalPattern.test(interval)) {
    return {
      field: 'ADA_DISPATCH_INTERVAL',
      message: 'ADA_DISPATCH_INTERVAL must be in format: 15m, 30m, 1h, etc.',
    };
  }
  return null;
}

/**
 * Validates roles mode
 */
function validateRolesMode(mode: string): ValidationError | null {
  if (mode !== 'read-only' && mode !== 'read-write') {
    return {
      field: 'ADA_ROLES_MODE',
      message: "ADA_ROLES_MODE must be 'read-only' or 'read-write'",
    };
  }
  return null;
}

/**
 * Validates log level
 */
function validateLogLevel(level: string): ValidationError | null {
  if (level !== 'debug' && level !== 'info' && level !== 'warn') {
    return {
      field: 'ADA_LOG_LEVEL',
      message: "ADA_LOG_LEVEL must be 'debug', 'info', or 'warn'",
    };
  }
  return null;
}

/**
 * Validates all environment variables and returns container configuration
 *
 * @returns ValidationResult with either config or errors
 */
export function validateEnv(): ValidationResult {
  const errors: ValidationError[] = [];

  // Required variables
  const githubTokenError = validateGitHubToken(process.env.GITHUB_TOKEN);
  if (githubTokenError) errors.push(githubTokenError);

  const githubRepoError = validateGitHubRepo(process.env.GITHUB_REPO);
  if (githubRepoError) errors.push(githubRepoError);

  const anthropicKeyError = validateAnthropicKey(process.env.ANTHROPIC_API_KEY);
  if (anthropicKeyError) errors.push(anthropicKeyError);

  // Optional variables with defaults
  const dispatchInterval = process.env.ADA_DISPATCH_INTERVAL || '15m';
  const dispatchIntervalError = validateDispatchInterval(dispatchInterval);
  if (dispatchIntervalError) errors.push(dispatchIntervalError);

  const rolesMode = process.env.ADA_ROLES_MODE || 'read-write';
  const rolesModeError = validateRolesMode(rolesMode);
  if (rolesModeError) errors.push(rolesModeError);

  const logLevel = process.env.ADA_LOG_LEVEL || 'info';
  const logLevelError = validateLogLevel(logLevel);
  if (logLevelError) errors.push(logLevelError);

  const healthPort = parseInt(process.env.ADA_HEALTH_PORT || '8080', 10);
  if (isNaN(healthPort) || healthPort < 1 || healthPort > 65535) {
    errors.push({
      field: 'ADA_HEALTH_PORT',
      message: 'ADA_HEALTH_PORT must be a valid port number (1-65535)',
    });
  }

  // Return result
  if (errors.length > 0) {
    return { success: false, errors };
  }

  // At this point, required env vars are validated
  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = process.env.GITHUB_REPO;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!githubToken || !githubRepo || !anthropicApiKey) {
    // This should never happen after validation, but satisfies TypeScript
    return { success: false, errors: [{ field: 'unknown', message: 'Unexpected validation state' }] };
  }

  return {
    success: true,
    config: {
      githubToken,
      githubRepo,
      anthropicApiKey,
      dispatchInterval,
      rolesMode: rolesMode as 'read-only' | 'read-write',
      logLevel: logLevel as 'debug' | 'info' | 'warn',
      healthPort,
    },
  };
}

/**
 * Validates environment and exits with code 1 if validation fails
 * Use this in container entrypoint for fail-fast behavior
 *
 * @returns ContainerConfig if validation passes
 * @throws Exits process with code 1 if validation fails
 */
export function validateEnvOrExit(): ContainerConfig {
  const result = validateEnv();

  if (!result.success) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Environment validation failed',
        errors: result.errors,
      })
    );
    process.exit(1);
  }

  const config = result.config;
  if (!config) {
    // Should never happen after success check
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Unexpected: validation passed but no config returned',
      })
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Environment validation passed',
      config: {
        githubRepo: config.githubRepo,
        dispatchInterval: config.dispatchInterval,
        rolesMode: config.rolesMode,
        logLevel: config.logLevel,
        healthPort: config.healthPort,
        // Omit secrets from logs
      },
    })
  );

  return config;
}
