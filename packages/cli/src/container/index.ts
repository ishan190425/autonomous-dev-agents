/**
 * ADA Container Module
 *
 * Core functionality for running ADA as a container service:
 * - Environment validation
 * - Health endpoint server
 * - Cron-based dispatch scheduler
 * - Permission mode enforcement
 *
 * @module container
 * @author ⚙️ Engineering | Cycle 717 | Phase 1 Container MVP
 */

export { validateEnv, type ContainerConfig } from './env.js';
export { startHealthServer, type HealthStatus } from './health.js';
export { startScheduler, stopScheduler, type SchedulerConfig } from './scheduler.js';
