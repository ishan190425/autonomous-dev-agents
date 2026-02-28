/**
 * API Middleware Utility Tests
 *
 * @author 🌌 The Frontier (C1286)
 */

import { describe, it, expect } from 'vitest';
import {
  isApiRoute,
  isVersionedApiRoute,
  parseApiVersion,
  getVersionInfo,
  extractWorkspaceId,
  extractAgentId,
  parsePaginationParams,
  calculatePagination,
  CORS_HEADERS,
  addCorsHeaders,
} from '../middleware';
import { API_VERSIONS } from '../types';

describe('Route Matching', () => {
  describe('isApiRoute', () => {
    it('should match versioned API routes', () => {
      expect(isApiRoute('/api/v1/workspaces')).toBe(true);
      expect(isApiRoute('/api/v2/agents')).toBe(true);
    });

    it('should not match non-versioned routes', () => {
      expect(isApiRoute('/api/auth/callback')).toBe(false);
      expect(isApiRoute('/dashboard')).toBe(false);
    });
  });

  describe('isVersionedApiRoute', () => {
    it('should match full versioned routes', () => {
      expect(isVersionedApiRoute('/api/v1/workspaces')).toBe(true);
      expect(isVersionedApiRoute('/api/v1/workspaces/123/agents')).toBe(true);
    });

    it('should not match incomplete version paths', () => {
      expect(isVersionedApiRoute('/api/v')).toBe(false);
      expect(isVersionedApiRoute('/api/v1')).toBe(false); // no trailing /
    });
  });
});

describe('Version Parsing', () => {
  describe('parseApiVersion', () => {
    it('should parse v1 from pathname', () => {
      expect(parseApiVersion('/api/v1/workspaces')).toBe('v1');
      expect(parseApiVersion('/api/v1/workspaces/123')).toBe('v1');
    });

    it('should return null for unsupported versions', () => {
      expect(parseApiVersion('/api/v99/workspaces')).toBe(null);
    });

    it('should return null for non-versioned routes', () => {
      expect(parseApiVersion('/api/auth/callback')).toBe(null);
      expect(parseApiVersion('/dashboard')).toBe(null);
    });
  });

  describe('getVersionInfo', () => {
    it('should return version info for v1', () => {
      const info = getVersionInfo('v1');
      expect(info.version).toBe('v1');
      expect(info.deprecated).toBe(false);
    });
  });

  describe('API_VERSIONS', () => {
    it('should have v1 defined', () => {
      expect(API_VERSIONS.v1).toBeDefined();
      expect(API_VERSIONS.v1.version).toBe('v1');
    });
  });
});

describe('URL Parsing', () => {
  describe('extractWorkspaceId', () => {
    it('should extract workspace ID from path', () => {
      expect(extractWorkspaceId('/api/v1/workspaces/ws_123')).toBe('ws_123');
      expect(extractWorkspaceId('/api/v1/workspaces/ws_123/agents')).toBe('ws_123');
    });

    it('should return null when no workspace in path', () => {
      expect(extractWorkspaceId('/api/v1/billing')).toBe(null);
      expect(extractWorkspaceId('/api/v1/webhooks')).toBe(null);
    });
  });

  describe('extractAgentId', () => {
    it('should extract agent ID from path', () => {
      expect(extractAgentId('/api/v1/workspaces/ws_123/agents/agent_456')).toBe(
        'agent_456'
      );
    });

    it('should return null when no agent in path', () => {
      expect(extractAgentId('/api/v1/workspaces/ws_123')).toBe(null);
    });
  });
});

describe('Pagination', () => {
  describe('parsePaginationParams', () => {
    it('should parse page and pageSize from params', () => {
      const params = new URLSearchParams('page=2&pageSize=50');
      const result = parsePaginationParams(params);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(50);
    });

    it('should use defaults when params missing', () => {
      const params = new URLSearchParams();
      const result = parsePaginationParams(params);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should enforce minimum page of 1', () => {
      const params = new URLSearchParams('page=-5');
      const result = parsePaginationParams(params);
      expect(result.page).toBe(1);
    });

    it('should enforce maximum pageSize of 100', () => {
      const params = new URLSearchParams('pageSize=500');
      const result = parsePaginationParams(params);
      expect(result.pageSize).toBe(100);
    });

    it('should enforce minimum pageSize of 1', () => {
      const params = new URLSearchParams('pageSize=0');
      const result = parsePaginationParams(params);
      expect(result.pageSize).toBe(1);
    });
  });

  describe('calculatePagination', () => {
    it('should calculate pagination for first page', () => {
      const result = calculatePagination(1, 20, 100);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalItems).toBe(100);
      expect(result.totalPages).toBe(5);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(false);
      expect(result.offset).toBe(0);
    });

    it('should calculate pagination for middle page', () => {
      const result = calculatePagination(3, 20, 100);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
      expect(result.offset).toBe(40);
    });

    it('should calculate pagination for last page', () => {
      const result = calculatePagination(5, 20, 100);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
      expect(result.offset).toBe(80);
    });

    it('should handle single page', () => {
      const result = calculatePagination(1, 20, 5);
      expect(result.totalPages).toBe(1);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });

    it('should handle empty results', () => {
      const result = calculatePagination(1, 20, 0);
      expect(result.totalPages).toBe(0);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });
  });
});

describe('CORS', () => {
  describe('CORS_HEADERS', () => {
    it('should define required CORS headers', () => {
      expect(CORS_HEADERS['Access-Control-Allow-Origin']).toBe('*');
      expect(CORS_HEADERS['Access-Control-Allow-Methods']).toContain('GET');
      expect(CORS_HEADERS['Access-Control-Allow-Methods']).toContain('POST');
      expect(CORS_HEADERS['Access-Control-Allow-Headers']).toContain('Authorization');
    });
  });

  describe('addCorsHeaders', () => {
    it('should add CORS headers to Headers object', () => {
      const headers = new Headers();
      addCorsHeaders(headers);

      expect(headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
    });
  });
});
