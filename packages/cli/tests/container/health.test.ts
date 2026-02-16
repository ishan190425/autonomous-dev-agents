/**
 * Container Health Endpoint Tests
 *
 * Unit tests for health endpoint server.
 * Per QA test plan C716: 6 tests for health endpoint.
 *
 * @author ⚙️ Engineering | Cycle 717 | Phase 1 Container MVP
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  startHealthServer,
  stopHealthServer,
  getHealthStatus,
  recordCycleComplete,
  markHealthy,
  resetHealthState,
} from '../../src/container/health.js';

describe('Container Health Endpoint', () => {
  beforeEach(() => {
    resetHealthState();
  });

  afterEach(async () => {
    await stopHealthServer();
  });

  describe('Health Status', () => {
    it('returns starting status initially', () => {
      const status = getHealthStatus();

      expect(status.status).toBe('starting');
      expect(status.lastCycle).toBe(0);
      expect(status.lastCycleTime).toBeNull();
    });

    it('returns healthy status after markHealthy()', () => {
      markHealthy();
      const status = getHealthStatus();

      expect(status.status).toBe('healthy');
    });

    it('increments lastCycle after recordCycleComplete()', () => {
      recordCycleComplete();
      const status = getHealthStatus();

      expect(status.lastCycle).toBe(1);
      expect(status.lastCycleTime).toBeTruthy();
    });

    it('includes uptime in response', () => {
      const status = getHealthStatus();

      expect(status.uptime).toBeTruthy();
      expect(typeof status.uptime).toBe('string');
    });

    it('includes startTime in ISO format', () => {
      const status = getHealthStatus();

      expect(status.startTime).toBeTruthy();
      // Should be valid ISO date
      expect(new Date(status.startTime).toISOString()).toBe(status.startTime);
    });
  });

  describe('Health Server', () => {
    it('starts on specified port', async () => {
      const port = 9999;
      const server = await startHealthServer(port);

      expect(server).toBeTruthy();
      expect(server.listening).toBe(true);
    });

    it('responds to GET /health', async () => {
      const port = 9998;
      await startHealthServer(port);

      // Make HTTP request
      const response = await globalThis.fetch(`http://localhost:${port}/health`);

      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toContain('application/json');

      const body = await response.json();
      expect(body.status).toBeDefined();
      expect(body.lastCycle).toBeDefined();
      expect(body.uptime).toBeDefined();
    });

    it('returns 404 for non-health endpoints', async () => {
      const port = 9997;
      await startHealthServer(port);

      const response = await globalThis.fetch(`http://localhost:${port}/other`);

      expect(response.status).toBe(404);
    });
  });
});
