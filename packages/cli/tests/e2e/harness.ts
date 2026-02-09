/**
 * E2E Test Harness
 *
 * Provides isolated sandbox environments for CLI end-to-end testing.
 * Each test gets a fresh git repository with proper isolation.
 *
 * Based on Issue #34: feat(qa): E2E Testing Infrastructure
 *
 * @module
 */

import { execSync, spawn } from 'child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

/** Result from running a CLI command */
export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

/** Options for sandbox creation */
export interface SandboxOptions {
  /** Initialize as git repository (default: true) */
  git?: boolean;
  /** Git user email for commits */
  gitEmail?: string;
  /** Git user name for commits */
  gitName?: string;
  /** Create initial commit (default: true if git is true) */
  initialCommit?: boolean;
}

/**
 * E2E Test Sandbox
 *
 * Creates an isolated temporary directory with a git repository
 * for testing CLI commands in a clean environment.
 */
export class Sandbox {
  /** Path to the sandbox directory */
  readonly path: string;

  /** Path to the CLI binary (resolved from monorepo root) */
  private readonly cliPath: string;

  /** Whether the sandbox has been cleaned up */
  private cleaned = false;

  constructor(options: SandboxOptions = {}) {
    const {
      git = true,
      gitEmail = 'test@ada.dev',
      gitName = 'ADA E2E Test',
      initialCommit = true,
    } = options;

    // Create isolated temp directory
    this.path = mkdtempSync(join(tmpdir(), 'ada-e2e-'));

    // Resolve CLI path from monorepo root
    // During tests, we use ts-node to run the CLI source directly
    this.cliPath = resolve(__dirname, '../../src/index.ts');

    // Initialize git if requested
    if (git) {
      this.exec('git init');
      this.exec(`git config user.email "${gitEmail}"`);
      this.exec(`git config user.name "${gitName}"`);

      if (initialCommit) {
        // Create a file and initial commit so we have a valid repo state
        writeFileSync(join(this.path, 'README.md'), '# Test Repository\n');
        this.exec('git add .');
        this.exec('git commit -m "Initial commit"');
      }
    }
  }

  /**
   * Run a shell command in the sandbox
   */
  exec(command: string, options: { encoding?: 'utf-8' | 'utf8' | 'ascii' | 'buffer' } = {}): string {
    return execSync(command, {
      cwd: this.path,
      encoding: options.encoding ?? 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  }

  /**
   * Run an ADA CLI command in the sandbox
   *
   * Uses tsx to run the CLI source directly for faster testing
   * and accurate stack traces.
   */
  ada(args: string[], options: { timeout?: number } = {}): Promise<CliResult> {
    const { timeout = 30_000 } = options;

    return new Promise((resolve) => {
      const stdout: string[] = [];
      const stderr: string[] = [];

      const proc = spawn('npx', ['tsx', this.cliPath, ...args], {
        cwd: this.path,
        env: {
          ...process.env,
          // Disable color output for predictable test assertions
          NO_COLOR: '1',
          FORCE_COLOR: '0',
          // Prevent interactive prompts
          CI: '1',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      proc.stdout?.on('data', (data) => stdout.push(data.toString()));
      proc.stderr?.on('data', (data) => stderr.push(data.toString()));

      const timer = globalThis.setTimeout(() => {
        proc.kill('SIGKILL');
        resolve({
          stdout: stdout.join(''),
          stderr: `${stderr.join('')  }\n[TIMEOUT]`,
          exitCode: 124,
          success: false,
        });
      }, timeout);

      proc.on('close', (code) => {
        globalThis.clearTimeout(timer);
        resolve({
          stdout: stdout.join(''),
          stderr: stderr.join(''),
          exitCode: code ?? 1,
          success: code === 0,
        });
      });

      proc.on('error', (err) => {
        globalThis.clearTimeout(timer);
        resolve({
          stdout: stdout.join(''),
          stderr: `${stderr.join('')  }\n[ERROR] ${err.message}`,
          exitCode: 1,
          success: false,
        });
      });
    });
  }

  /**
   * Check if a file exists in the sandbox
   */
  exists(relativePath: string): boolean {
    return existsSync(join(this.path, relativePath));
  }

  /**
   * Read a file from the sandbox
   */
  read(relativePath: string): string {
    return readFileSync(join(this.path, relativePath), 'utf-8');
  }

  /**
   * Read and parse a JSON file from the sandbox
   */
  readJson<T = unknown>(relativePath: string): T {
    return JSON.parse(this.read(relativePath));
  }

  /**
   * Write a file to the sandbox
   */
  write(relativePath: string, content: string): void {
    writeFileSync(join(this.path, relativePath), content);
  }

  /**
   * Get the full path to a file in the sandbox
   */
  resolve(relativePath: string): string {
    return join(this.path, relativePath);
  }

  /**
   * Clean up the sandbox (remove temp directory)
   *
   * Called automatically in tests via afterEach hooks,
   * but can be called manually if needed.
   */
  cleanup(): void {
    if (this.cleaned) return;
    this.cleaned = true;
    rmSync(this.path, { recursive: true, force: true });
  }
}

/**
 * Create a sandbox for use in a test
 *
 * @example
 * ```ts
 * describe('ada init', () => {
 *   let sandbox: Sandbox;
 *
 *   beforeEach(() => {
 *     sandbox = createSandbox();
 *   });
 *
 *   afterEach(() => {
 *     sandbox.cleanup();
 *   });
 *
 *   it('creates agent directory', async () => {
 *     const result = await sandbox.ada(['init']);
 *     expect(result.success).toBe(true);
 *     expect(sandbox.exists('agents/DISPATCH.md')).toBe(true);
 *   });
 * });
 * ```
 */
export function createSandbox(options?: SandboxOptions): Sandbox {
  return new Sandbox(options);
}
