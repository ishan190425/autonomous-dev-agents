/**
 * Container Health Endpoint
 *
 * HTTP server providing health check endpoint for container orchestrators.
 * Returns status, cycle count, and uptime per Product spec C714.
 *
 * GET /health → {"status": "healthy", "lastCycle": 42, "uptime": "2h 15m"}
 *
 * @module container/health
 * @author ⚙️ Engineering | Cycle 717 | Phase 1 Container MVP
 */

import { createServer, Server, IncomingMessage, ServerResponse } from 'http';

/**
 * Health status response
 */
export interface HealthStatus {
  /** Container health status */
  status: 'healthy' | 'unhealthy' | 'starting';

  /** Last completed dispatch cycle number */
  lastCycle: number;

  /** Human-readable uptime string */
  uptime: string;

  /** ISO timestamp of last cycle completion */
  lastCycleTime: string | null;

  /** Container start time */
  startTime: string;
}

/**
 * Mutable state for health tracking
 */
interface HealthState {
  cycleCount: number;
  lastCycleTime: string | null;
  startTime: Date;
  status: 'healthy' | 'unhealthy' | 'starting';
}

let healthState: HealthState = {
  cycleCount: 0,
  lastCycleTime: null,
  startTime: new Date(),
  status: 'starting',
};

let healthServer: Server | null = null;

/**
 * Formats uptime in human-readable form
 */
function formatUptime(startTime: Date): string {
  const seconds = Math.floor((Date.now() - startTime.getTime()) / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ${seconds % 60}s`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/**
 * Gets current health status
 */
export function getHealthStatus(): HealthStatus {
  return {
    status: healthState.status,
    lastCycle: healthState.cycleCount,
    uptime: formatUptime(healthState.startTime),
    lastCycleTime: healthState.lastCycleTime,
    startTime: healthState.startTime.toISOString(),
  };
}

/**
 * Updates health state after a dispatch cycle
 */
export function recordCycleComplete(): void {
  healthState.cycleCount++;
  healthState.lastCycleTime = new Date().toISOString();
  healthState.status = 'healthy';
}

/**
 * Marks container as healthy (after startup)
 */
export function markHealthy(): void {
  healthState.status = 'healthy';
}

/**
 * Marks container as unhealthy
 */
export function markUnhealthy(): void {
  healthState.status = 'unhealthy';
}

/**
 * Resets health state (for testing)
 */
export function resetHealthState(): void {
  healthState = {
    cycleCount: 0,
    lastCycleTime: null,
    startTime: new Date(),
    status: 'starting',
  };
}

/**
 * HTTP request handler
 */
function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  // Only handle GET /health
  if (req.method !== 'GET' || req.url !== '/health') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  const status = getHealthStatus();
  const statusCode = status.status === 'unhealthy' ? 503 : 200;

  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  });
  res.end(JSON.stringify(status));
}

/**
 * Starts the health endpoint server
 *
 * @param port - Port to listen on (default: 8080)
 * @returns Promise that resolves when server is listening
 */
export function startHealthServer(port: number = 8080): Promise<Server> {
  return new Promise((resolve, reject) => {
    if (healthServer) {
      resolve(healthServer);
      return;
    }

    healthServer = createServer(handleRequest);

    healthServer.on('error', (err) => {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Health server error',
          error: err.message,
        })
      );
      reject(err);
    });

    healthServer.listen(port, () => {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Health server started on port ${port}`,
        })
      );
      if (healthServer) {
        resolve(healthServer);
      }
    });
  });
}

/**
 * Stops the health server
 */
export function stopHealthServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!healthServer) {
      resolve();
      return;
    }

    healthServer.close(() => {
      healthServer = null;
      resolve();
    });
  });
}
