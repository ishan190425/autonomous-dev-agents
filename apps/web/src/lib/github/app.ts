import jwt from 'jsonwebtoken';
import { AUTH_ENV } from '@/lib/auth/config';

/**
 * Generate a GitHub App JWT for authenticating as the app.
 * Valid for 10 minutes (GitHub maximum).
 */
export function getAppJWT(): string {
  const appId = AUTH_ENV.GITHUB_APP_ID;
  const privateKey = AUTH_ENV.GITHUB_APP_PRIVATE_KEY;

  if (!appId || !privateKey) {
    throw new Error('GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY must be set');
  }

  const now = Math.floor(Date.now() / 1000);

  return jwt.sign(
    {
      iat: now - 60, // issued 60s ago to account for clock drift
      exp: now + 600, // expires in 10 minutes
      iss: appId,
    },
    privateKey.replace(/\\n/g, '\n'),
    { algorithm: 'RS256' }
  );
}

/**
 * Get an installation access token for a specific GitHub App installation.
 */
export async function getInstallationToken(
  installationId: number
): Promise<string> {
  const appJwt = getAppJWT();

  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Failed to get installation token: ${res.status} ${body}`
    );
  }

  const data = await res.json();
  return data.token;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  default_branch: string;
  owner: {
    avatar_url: string;
    login: string;
  };
  private: boolean;
}

/**
 * List repositories accessible to a GitHub App installation.
 */
export async function listInstallationRepos(
  installationId: number
): Promise<GitHubRepo[]> {
  const token = await getInstallationToken(installationId);

  const repos: GitHubRepo[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/installation/repositories?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Failed to list installation repos: ${res.status} ${body}`
      );
    }

    const data = await res.json();
    repos.push(...data.repositories);

    if (repos.length >= data.total_count) break;
    page++;
  }

  return repos;
}

/**
 * Fetch a file's content from a GitHub repo using the installation token.
 * Returns the decoded UTF-8 content, or null if the file doesn't exist.
 */
export async function getRepoFileContent(
  installationId: number,
  fullName: string,
  path: string,
  ref?: string
): Promise<string | null> {
  const token = await getInstallationToken(installationId);

  const url = new URL(
    `https://api.github.com/repos/${fullName}/contents/${path}`
  );
  if (ref) url.searchParams.set('ref', ref);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    next: { revalidate: 30 }, // cache for 30s
  });

  if (res.status === 404) return null;

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch ${path}: ${res.status} ${body}`);
  }

  const data = await res.json();

  if (data.encoding === 'base64' && data.content) {
    return Buffer.from(data.content, 'base64').toString('utf-8');
  }

  return data.content ?? null;
}

/**
 * Fetch and parse a JSON file from a GitHub repo.
 * Returns null if the file doesn't exist or can't be parsed.
 */
export async function getRepoJsonFile<T = unknown>(
  installationId: number,
  fullName: string,
  path: string,
  ref?: string
): Promise<T | null> {
  const content = await getRepoFileContent(installationId, fullName, path, ref);
  if (!content) return null;

  try {
    return JSON.parse(content) as T;
  } catch {
    console.error(`[GitHub] Failed to parse JSON at ${fullName}/${path}`);
    return null;
  }
}
