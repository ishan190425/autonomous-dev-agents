import { test as base, Page, BrowserContext } from '@playwright/test';

/**
 * Session Mocking Fixture for Fast E2E Tests
 *
 * Provides a `mockSession` fixture that enables testing authenticated flows
 * without requiring real OAuth. Uses cookie and API route mocking.
 *
 * @see docs/qa/sprint3-testing-infrastructure-spec-c1149.md Section 5
 *
 * Usage:
 * ```typescript
 * import { test, expect } from '../fixtures/session.fixture';
 *
 * test.beforeEach(async ({ mockSession }) => {
 *   await mockSession({
 *     id: 'test-user-123',
 *     email: 'test@example.com',
 *     name: 'Test User',
 *     avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4',
 *     tier: 'pro',
 *   });
 * });
 *
 * test('shows user profile', async ({ page }) => {
 *   await page.goto('/dashboard');
 *   await expect(page.locator('text=Test User')).toBeVisible();
 * });
 * ```
 */

/** Mock user type for session fixtures */
export type MockUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  tier: 'free' | 'pro' | 'enterprise';
  githubId?: string;
  cyclesUsed?: number;
  cyclesLimit?: number;
  teamId?: string;
};

/** Default test users for common scenarios */
export const testUsers = {
  free: {
    id: 'test-user-free',
    email: 'free@ada-test.dev',
    name: 'Free User',
    avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4',
    tier: 'free' as const,
    cyclesUsed: 50,
    cyclesLimit: 100,
  },
  pro: {
    id: 'test-user-pro',
    email: 'pro@ada-test.dev',
    name: 'Pro User',
    avatarUrl: 'https://avatars.githubusercontent.com/u/2?v=4',
    tier: 'pro' as const,
    cyclesUsed: 500,
    cyclesLimit: -1, // Unlimited
  },
  enterprise: {
    id: 'test-user-enterprise',
    email: 'enterprise@ada-test.dev',
    name: 'Enterprise User',
    avatarUrl: 'https://avatars.githubusercontent.com/u/3?v=4',
    tier: 'enterprise' as const,
    cyclesUsed: 5000,
    cyclesLimit: -1,
    teamId: 'test-team-1',
  },
  admin: {
    id: 'test-admin',
    email: 'admin@ada-test.dev',
    name: 'Admin User',
    avatarUrl: 'https://avatars.githubusercontent.com/u/4?v=4',
    tier: 'enterprise' as const,
    cyclesUsed: 0,
    cyclesLimit: -1,
  },
};

/** Fixture type definitions */
type SessionFixture = {
  mockSession: (user: MockUser) => Promise<void>;
  mockSessionWithTeam: (user: MockUser, team: MockTeam) => Promise<void>;
  clearMockSession: () => Promise<void>;
};

/** Mock team for team-related tests */
export type MockTeam = {
  id: string;
  name: string;
  ownerId: string;
  plan: 'team' | 'enterprise';
  memberCount: number;
};

/**
 * Extended test with session mocking capabilities
 *
 * Provides:
 * - `mockSession(user)` — Set up a mocked authenticated session
 * - `mockSessionWithTeam(user, team)` — Set up session with team context
 * - `clearMockSession()` — Clear the mocked session
 */
export const test = base.extend<SessionFixture>({
  mockSession: async ({ page, context }, use) => {
    const mockSession = async (user: MockUser) => {
      await setupMockSession(page, context, user);
    };
    await use(mockSession);
  },

  mockSessionWithTeam: async ({ page, context }, use) => {
    const mockSessionWithTeam = async (user: MockUser, team: MockTeam) => {
      await setupMockSession(page, context, user, team);
    };
    await use(mockSessionWithTeam);
  },

  clearMockSession: async ({ page, context }, use) => {
    const clearMockSession = async () => {
      await context.clearCookies();
      await page.evaluate(() => {
        localStorage.removeItem('ada-session');
        sessionStorage.clear();
      });
    };
    await use(clearMockSession);
  },
});

/**
 * Set up mock session state
 *
 * 1. Sets session cookie
 * 2. Mocks /api/auth/session endpoint
 * 3. Sets localStorage auth state
 */
async function setupMockSession(
  page: Page,
  context: BrowserContext,
  user: MockUser,
  team?: MockTeam
): Promise<void> {
  const sessionData = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.avatarUrl,
      tier: user.tier,
      cyclesUsed: user.cyclesUsed ?? 0,
      cyclesLimit: user.cyclesLimit ?? 100,
      teamId: user.teamId ?? team?.id,
    },
    team: team
      ? {
          id: team.id,
          name: team.name,
          plan: team.plan,
          memberCount: team.memberCount,
        }
      : null,
    accessToken: `mock-token-${user.id}-${Date.now()}`,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };

  // Set mock session cookie
  await context.addCookies([
    {
      name: 'ada-session',
      value: Buffer.from(JSON.stringify(sessionData)).toString('base64'),
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'ada-session-exists',
      value: 'true',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  // Mock API session endpoint
  await page.route('**/api/auth/session', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: sessionData.user,
        team: sessionData.team,
        expires: new Date(sessionData.expiresAt).toISOString(),
      }),
    });
  });

  // Mock user endpoint
  await page.route('**/api/user', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(sessionData.user),
    });
  });

  // Mock team endpoint if team provided
  if (team) {
    await page.route('**/api/team', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(team),
      });
    });
  }

  // Navigate to page to set localStorage
  await page.goto('/');
  await page.evaluate((data) => {
    localStorage.setItem('ada-auth', JSON.stringify(data));
  }, sessionData);
}

// Re-export expect from Playwright
export { expect } from '@playwright/test';
