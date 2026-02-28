/**
 * @ada/cli — Login Command
 *
 * Authenticate CLI with ADA SaaS platform via GitHub OAuth.
 * Opens browser for OAuth flow, captures token via local callback server.
 *
 * Usage:
 *   ada login              Start OAuth flow
 *   ada login --status     Check current auth status
 *   ada login --logout     Clear stored credentials
 *
 * Environment:
 *   ADA_API_URL         API base URL (default: https://api.ada.dev)
 *   ADA_TOKEN           Skip browser flow, use token directly
 *
 * Credentials stored in: ~/.ada/credentials.json
 *
 * @author ⚙️ Engineering (C1290)
 * @see Sprint 3 AUTH-4 — `ada login` CLI command
 */

import { Command } from 'commander';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

// ============================================================================
// Types
// ============================================================================

/**
 * Stored credentials structure
 */
interface Credentials {
  /** API access token */
  token: string;
  /** Token expiration timestamp (ms) */
  expiresAt: number;
  /** Refresh token for token renewal */
  refreshToken: string | undefined;
  /** User info from OAuth */
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | undefined;
    tier: string;
  } | undefined;
  /** When credentials were last updated */
  updatedAt: number;
}

/**
 * OAuth callback data from browser
 */
interface OAuthCallbackData {
  code: string | undefined;
  state: string | undefined;
  error: string | undefined;
  error_description: string | undefined;
}

/**
 * Token exchange response from API
 */
interface TokenExchangeResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
    tier: string;
  };
}

// ============================================================================
// Constants
// ============================================================================

const ADA_DIR = join(homedir(), '.ada');
const CREDENTIALS_FILE = join(ADA_DIR, 'credentials.json');
const DEFAULT_API_URL = 'https://api.ada.dev';
const CALLBACK_PORT = 9876;
const CALLBACK_PATH = '/callback';
const STATE_LENGTH = 32;
const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get API base URL from environment or default
 */
function getApiUrl(): string {
  return process.env.ADA_API_URL || DEFAULT_API_URL;
}

/**
 * Ensure ~/.ada directory exists
 */
function ensureAdaDir(): void {
  if (!existsSync(ADA_DIR)) {
    mkdirSync(ADA_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Load stored credentials
 */
function loadCredentials(): Credentials | null {
  try {
    if (!existsSync(CREDENTIALS_FILE)) {
      return null;
    }
    const data = readFileSync(CREDENTIALS_FILE, 'utf-8');
    return JSON.parse(data) as Credentials;
  } catch {
    return null;
  }
}

/**
 * Save credentials to file with secure permissions
 */
function saveCredentials(creds: Credentials): void {
  ensureAdaDir();
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2), {
    mode: 0o600,
  });
}

/**
 * Delete stored credentials
 */
function deleteCredentials(): boolean {
  try {
    if (existsSync(CREDENTIALS_FILE)) {
      unlinkSync(CREDENTIALS_FILE);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Check if credentials are expired
 */
function isExpired(creds: Credentials): boolean {
  // Add 5 minute buffer
  return Date.now() > creds.expiresAt - 5 * 60 * 1000;
}

/**
 * Generate cryptographically secure state parameter
 */
function generateState(): string {
  return randomBytes(STATE_LENGTH).toString('hex');
}

/**
 * Parse URL query parameters
 */
function parseQueryParams(url: string): OAuthCallbackData {
  const urlObj = new URL(url, `http://localhost:${CALLBACK_PORT}`);
  return {
    code: urlObj.searchParams.get('code') ?? undefined,
    state: urlObj.searchParams.get('state') ?? undefined,
    error: urlObj.searchParams.get('error') ?? undefined,
    error_description: urlObj.searchParams.get('error_description') ?? undefined,
  };
}

/**
 * Open URL in default browser
 */
async function openBrowser(url: string): Promise<void> {
  const { exec } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execAsync = promisify(exec);

  const platform = process.platform;
  let command: string;

  switch (platform) {
    case 'darwin':
      command = `open "${url}"`;
      break;
    case 'win32':
      command = `start "${url}"`;
      break;
    default:
      // Linux and others
      command = `xdg-open "${url}" || sensible-browser "${url}" || x-www-browser "${url}"`;
  }

  await execAsync(command);
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(
  code: string,
  state: string
): Promise<TokenExchangeResponse> {
  const apiUrl = getApiUrl();

  const response = await fetch(`${apiUrl}/api/auth/cli/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      state,
      grant_type: 'authorization_code',
      redirect_uri: `http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}`,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message ||
        `Token exchange failed: ${response.status}`
    );
  }

  return response.json() as Promise<TokenExchangeResponse>;
}

// ============================================================================
// Command Actions
// ============================================================================

/**
 * Show current authentication status
 */
function showStatus(): void {
  const creds = loadCredentials();

  if (!creds) {
    console.log(`${colors.yellow}⚠${colors.reset}  Not logged in`);
    console.log(`\n   Run ${colors.cyan}ada login${colors.reset} to authenticate`);
    process.exit(1);
  }

  if (isExpired(creds)) {
    console.log(`${colors.red}✗${colors.reset}  Session expired`);
    console.log(`\n   Run ${colors.cyan}ada login${colors.reset} to re-authenticate`);
    process.exit(1);
  }

  const user = creds.user;
  const expiresIn = Math.floor((creds.expiresAt - Date.now()) / 1000 / 60);

  console.log(`${colors.green}✓${colors.reset}  Logged in as ${colors.bold}${user?.name || 'Unknown'}${colors.reset}`);
  console.log();
  console.log(`   ${colors.dim}Email:${colors.reset}    ${user?.email || 'N/A'}`);
  console.log(`   ${colors.dim}Tier:${colors.reset}     ${user?.tier || 'FREE'}`);
  console.log(`   ${colors.dim}Expires:${colors.reset}  ${expiresIn} minutes`);
  console.log(`   ${colors.dim}API:${colors.reset}      ${getApiUrl()}`);
}

/**
 * Clear stored credentials (logout)
 */
function handleLogout(): void {
  const deleted = deleteCredentials();

  if (deleted) {
    console.log(`${colors.green}✓${colors.reset}  Logged out successfully`);
  } else {
    console.log(`${colors.yellow}⚠${colors.reset}  No stored credentials found`);
  }
}

/**
 * Main login flow with browser-based OAuth
 */
async function handleLogin(options: { force?: boolean }): Promise<void> {
  // Check for existing valid credentials
  const existing = loadCredentials();
  if (existing && !isExpired(existing) && !options.force) {
    console.log(
      `${colors.green}✓${colors.reset}  Already logged in as ${colors.bold}${existing.user?.name}${colors.reset}`
    );
    console.log(`\n   Use ${colors.cyan}ada login --force${colors.reset} to re-authenticate`);
    return;
  }

  // Check for token in environment
  const envToken = process.env.ADA_TOKEN;
  if (envToken) {
    console.log(`${colors.cyan}→${colors.reset}  Using token from ADA_TOKEN environment variable`);
    // TODO: Validate token and get user info
    saveCredentials({
      token: envToken,
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
      refreshToken: undefined,
      user: undefined,
      updatedAt: Date.now(),
    });
    console.log(`${colors.green}✓${colors.reset}  Token saved`);
    return;
  }

  const apiUrl = getApiUrl();
  const state = generateState();
  const authUrl = `${apiUrl}/api/auth/cli/authorize?` +
    `state=${state}&` +
    `redirect_uri=${encodeURIComponent(`http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}`)}`;

  console.log(`${colors.cyan}→${colors.reset}  Starting OAuth flow...`);
  console.log();

  // Create promise that resolves when callback is received
  let callbackResolver: (data: OAuthCallbackData) => void;
  let callbackRejecter: (error: Error) => void;
  const callbackPromise = new Promise<OAuthCallbackData>((resolve, reject) => {
    callbackResolver = resolve;
    callbackRejecter = reject;
  });

  // Start local callback server
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (!req.url?.startsWith(CALLBACK_PATH)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const data = parseQueryParams(req.url);

    // Send success page
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ADA CLI Login</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 2rem;
            }
            .success { color: #4ade80; font-size: 4rem; }
            .error { color: #f87171; font-size: 4rem; }
            h1 { margin: 1rem 0 0.5rem; }
            p { color: #94a3b8; }
            code { background: rgba(255,255,255,0.1); padding: 0.2rem 0.5rem; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${
              data.error
                ? `<div class="error">✗</div><h1>Authentication Failed</h1><p>${data.error_description || data.error}</p>`
                : '<div class="success">✓</div><h1>Authenticated!</h1><p>You can close this window and return to <code>ada</code></p>'
            }
          </div>
        </body>
      </html>
    `);

    callbackResolver(data);
  });

  // Handle server errors
  server.on('error', (err: Error) => {
    callbackRejecter(new Error(`Callback server error: ${err.message}`));
  });

  // Start server
  await new Promise<void>((resolve, reject) => {
    server.listen(CALLBACK_PORT, '127.0.0.1', () => {
      resolve();
    });
    server.on('error', reject);
  });

  console.log(`   ${colors.dim}Listening on${colors.reset} http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}`);
  console.log();
  console.log(`   ${colors.bold}Opening browser...${colors.reset}`);
  console.log(`   ${colors.dim}If browser doesn't open, visit:${colors.reset}`);
  console.log(`   ${colors.cyan}${authUrl}${colors.reset}`);
  console.log();

  // Open browser
  try {
    await openBrowser(authUrl);
  } catch {
    console.log(`   ${colors.yellow}⚠${colors.reset}  Couldn't open browser automatically`);
  }

  console.log(`   ${colors.dim}Waiting for authentication...${colors.reset}`);

  // Wait for callback with timeout
  let callbackData: OAuthCallbackData;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Authentication timed out after 5 minutes'));
      }, CALLBACK_TIMEOUT_MS);
    });

    callbackData = await Promise.race([callbackPromise, timeoutPromise]);
  } finally {
    // Always close server
    server.close();
  }

  // Handle callback errors
  if (callbackData.error) {
    console.log();
    console.log(`${colors.red}✗${colors.reset}  Authentication failed: ${callbackData.error_description || callbackData.error}`);
    process.exit(1);
  }

  // Validate state parameter (CSRF protection)
  if (callbackData.state !== state) {
    console.log();
    console.log(`${colors.red}✗${colors.reset}  Invalid state parameter (possible CSRF attack)`);
    process.exit(1);
  }

  // Exchange code for token
  if (!callbackData.code) {
    console.log();
    console.log(`${colors.red}✗${colors.reset}  No authorization code received`);
    process.exit(1);
  }

  console.log();
  console.log(`${colors.cyan}→${colors.reset}  Exchanging code for token...`);

  try {
    const tokenData = await exchangeCodeForToken(callbackData.code, state);

    // Save credentials
    const credentials: Credentials = {
      token: tokenData.access_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      refreshToken: tokenData.refresh_token,
      user: {
        id: tokenData.user.id,
        name: tokenData.user.name,
        email: tokenData.user.email,
        avatarUrl: tokenData.user.image,
        tier: tokenData.user.tier,
      },
      updatedAt: Date.now(),
    };

    saveCredentials(credentials);

    console.log();
    console.log(
      `${colors.green}✓${colors.reset}  Logged in as ${colors.bold}${tokenData.user.name}${colors.reset}`
    );
    console.log();
    console.log(`   ${colors.dim}Email:${colors.reset} ${tokenData.user.email}`);
    console.log(`   ${colors.dim}Tier:${colors.reset}  ${tokenData.user.tier}`);
    console.log();
    console.log(`   ${colors.magenta}🎉 Ready to run managed cycles!${colors.reset}`);
  } catch (err) {
    console.log();
    console.log(
      `${colors.red}✗${colors.reset}  Token exchange failed: ${(err as Error).message}`
    );
    process.exit(1);
  }
}

// ============================================================================
// Command Definition
// ============================================================================

export const loginCommand = new Command('login')
  .description('Authenticate CLI with ADA SaaS platform')
  .option('--status', 'Show current authentication status')
  .option('--logout', 'Clear stored credentials')
  .option('--force', 'Force re-authentication even if already logged in')
  .action(async (options) => {
    try {
      if (options.status) {
        showStatus();
      } else if (options.logout) {
        handleLogout();
      } else {
        await handleLogin(options);
      }
    } catch (err) {
      console.error(`${colors.red}Error:${colors.reset} ${(err as Error).message}`);
      process.exit(1);
    }
  });

export default loginCommand;
