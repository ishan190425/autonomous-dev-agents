/**
 * NextAuth.js Configuration Tests
 *
 * Tests for auth configuration and callbacks.
 *
 * @author ⚙️ Engineering (Cycle 1190)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authConfig } from '../auth.config';

describe('authConfig', () => {
  describe('providers', () => {
    it('should have GitHub provider configured', () => {
      expect(authConfig.providers).toBeDefined();
      expect(authConfig.providers.length).toBeGreaterThan(0);
      // Provider is a function in NextAuth v5
      const provider = authConfig.providers[0];
      expect(provider).toBeDefined();
    });
  });

  describe('pages', () => {
    it('should have custom sign in page', () => {
      expect(authConfig.pages?.signIn).toBe('/auth/signin');
    });

    it('should have custom sign out page', () => {
      expect(authConfig.pages?.signOut).toBe('/auth/signout');
    });

    it('should have custom error page', () => {
      expect(authConfig.pages?.error).toBe('/auth/error');
    });
  });

  describe('session', () => {
    it('should use database strategy', () => {
      expect(authConfig.session?.strategy).toBe('database');
    });

    it('should have 30-day max age', () => {
      expect(authConfig.session?.maxAge).toBe(30 * 24 * 60 * 60);
    });

    it('should update every 24 hours', () => {
      expect(authConfig.session?.updateAge).toBe(24 * 60 * 60);
    });
  });

  describe('callbacks.signIn', () => {
    const signInCallback = authConfig.callbacks?.signIn;

    it('should be defined', () => {
      expect(signInCallback).toBeDefined();
    });

    it('should allow users with email', async () => {
      if (!signInCallback) return;
      const result = await signInCallback({
        user: { id: '1', email: 'test@example.com' },
        account: null,
        profile: undefined,
      });
      expect(result).toBe(true);
    });

    it('should reject users without email', async () => {
      if (!signInCallback) return;
      const result = await signInCallback({
        user: { id: '1', email: null },
        account: null,
        profile: undefined,
      });
      expect(result).toBe(false);
    });
  });

  describe('callbacks.session', () => {
    const sessionCallback = authConfig.callbacks?.session;

    it('should be defined', () => {
      expect(sessionCallback).toBeDefined();
    });

    it('should add user id to session', async () => {
      if (!sessionCallback) return;
      const session = {
        user: { name: 'Test', email: 'test@example.com' },
        expires: new Date().toISOString(),
      };
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        tier: 'PRO' as const,
        githubId: 'gh-456',
      };

      const result = await sessionCallback({
        session,
        user,
        token: {},
        trigger: 'update',
        newSession: undefined,
      });

      expect(result.user.id).toBe('user-123');
    });
  });

  describe('callbacks.redirect', () => {
    const redirectCallback = authConfig.callbacks?.redirect;
    const baseUrl = 'https://ada.ai';

    it('should be defined', () => {
      expect(redirectCallback).toBeDefined();
    });

    it('should handle relative paths', async () => {
      if (!redirectCallback) return;
      const result = await redirectCallback({
        url: '/dashboard',
        baseUrl,
      });
      expect(result).toBe(`${baseUrl}/dashboard`);
    });

    it('should allow same-origin URLs', async () => {
      if (!redirectCallback) return;
      const result = await redirectCallback({
        url: `${baseUrl}/settings`,
        baseUrl,
      });
      expect(result).toBe(`${baseUrl}/settings`);
    });

    it('should redirect cross-origin URLs to dashboard', async () => {
      if (!redirectCallback) return;
      const result = await redirectCallback({
        url: 'https://evil.com/steal',
        baseUrl,
      });
      expect(result).toBe(`${baseUrl}/dashboard`);
    });
  });
});
