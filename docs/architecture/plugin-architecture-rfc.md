# Plugin & Extension Architecture RFC

> **Author:** 🎨 The Architect (Design)
> **Date:** 2026-02-04
> **Status:** PROPOSAL
> **Sprint:** Sprint 1 prerequisite
> **Relates to:** Issue #7 (auto-update propagation), Issue #17 (embedding memory), TPL-001/002 (template system)

---

## 1. Problem Statement

ADA ships with 10 built-in roles and a fixed dispatch protocol. To become a platform (not just a tool), we need:

1. **Custom roles** — Teams need domain-specific roles (e.g., `security-auditor`, `ml-engineer`, `ux-researcher`)
2. **Custom actions** — Existing roles need extensible action sets (e.g., Engineering + `deploy_to_k8s`)
3. **Custom memory backends** — Production teams need persistent storage beyond flat files (Postgres, Redis, S3)
4. **Lifecycle hooks** — Observability, notifications, audit trails, custom triggers
5. **Template marketplace** — Community sharing of role definitions, playbooks, and team configurations

The current architecture is rigid: roles are hardcoded in `roster.json`, memory is file-only, and there's no hook system. This RFC defines the extension points that make ADA composable.

---

## 2. Design Principles

| Principle                  | Description                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| **Zero-config by default** | ADA works out of the box with no plugins. Plugins add capabilities, never requirements.           |
| **Explicit over magic**    | Plugin registration is declarative (`ada.plugins.json`), not auto-discovered from `node_modules`. |
| **Type-safe contracts**    | All plugin interfaces are TypeScript interfaces with strict typing.                               |
| **Fail-open**              | A broken plugin logs a warning and is skipped — never crashes the dispatch cycle.                 |
| **Sandboxed**              | Plugins cannot modify other plugins' state or bypass the rotation protocol.                       |
| **Composable**             | Multiple plugins can provide hooks for the same lifecycle event (ordered by priority).            |

---

## 3. Plugin Interface

### 3.1 Base Plugin Contract

```typescript
/**
 * Base interface all ADA plugins must implement.
 * Plugins are loaded once at dispatch startup and persist for the cycle.
 */
export interface AdaPlugin {
  /** Unique plugin identifier (npm-style: @scope/name or plain name) */
  readonly name: string;

  /** SemVer version string */
  readonly version: string;

  /** Human-readable description */
  readonly description: string;

  /** Minimum @ada/core version required */
  readonly minCoreVersion?: string;

  /**
   * Called once when the plugin is loaded.
   * Use for setup: validate config, establish connections, warm caches.
   * Throwing here disables the plugin for this cycle (logged, not fatal).
   */
  setup?(config: PluginConfig): Promise<void>;

  /**
   * Called when the dispatch cycle ends (success or failure).
   * Use for cleanup: close connections, flush buffers.
   */
  teardown?(): Promise<void>;
}

/** Plugin-specific configuration passed from ada.plugins.json */
export type PluginConfig = Record<string, unknown>;
```

### 3.2 Lifecycle Hook Plugin

```typescript
/**
 * Provides lifecycle hooks into the dispatch cycle.
 * All hooks are optional — implement only what you need.
 */
export interface LifecyclePlugin extends AdaPlugin {
  /** Before context is loaded (modify config, inject state) */
  onBeforeLoad?(config: AdaConfig): Promise<AdaConfig>;

  /** After context is loaded, before role executes */
  onBeforeCycle?(context: Readonly<DispatchContext>): Promise<void>;

  /** After role executes, before state is persisted */
  onAfterAction?(
    context: Readonly<DispatchContext>,
    result: Readonly<ActionResult>
  ): Promise<void>;

  /** After rotation advances (new role is set) */
  onAfterCycle?(result: Readonly<DispatchResult>): Promise<void>;

  /** When compression is triggered */
  onCompress?(content: string, version: number): Promise<string | undefined>;

  /** When an error occurs during dispatch */
  onError?(error: Error, phase: DispatchPhase): Promise<void>;
}

/** Dispatch phases for error context */
export type DispatchPhase =
  | 'load'
  | 'execute'
  | 'memory-update'
  | 'compression'
  | 'rotation'
  | 'commit';
```

### 3.3 Role Plugin

```typescript
/**
 * Provides custom role definitions.
 * Roles are registered into the roster at load time.
 */
export interface RolePlugin extends AdaPlugin {
  /** Return custom role definitions to add to the roster */
  getRoles(): CustomRoleDefinition[];
}

export interface CustomRoleDefinition {
  /** Role definition (id, name, emoji, focus, actions) */
  readonly role: Role;

  /** Playbook content (markdown) — injected as if from playbooks/<id>.md */
  readonly playbook: string;

  /**
   * Where in the rotation to insert this role.
   * - 'append': Add to end of rotation (default)
   * - 'after:<roleId>': Insert after a specific role
   * - 'before:<roleId>': Insert before a specific role
   * - number: Explicit index position
   */
  readonly position?:
    | 'append'
    | `after:${string}`
    | `before:${string}`
    | number;

  /** npm packages this role's actions depend on */
  readonly dependencies?: readonly string[];

  /** Initial role state for the memory bank */
  readonly initialState?: {
    readonly working_on: string;
    readonly context: Record<string, string>;
  };
}
```

### 3.4 Memory Backend Plugin

```typescript
/**
 * Provides alternative memory storage backends.
 * Replaces or augments the default file-based memory bank.
 */
export interface MemoryPlugin extends AdaPlugin {
  /** Read the memory bank content */
  readBank(): Promise<string>;

  /** Write the memory bank content */
  writeBank(content: string): Promise<void>;

  /** Archive the current bank (for compression) */
  archiveBank(version: number): Promise<string>;

  /** List available archives */
  listArchives(): Promise<MemoryArchiveInfo[]>;

  /** Restore a specific archive */
  restoreArchive(archiveId: string): Promise<string>;
}

export interface MemoryArchiveInfo {
  readonly id: string;
  readonly version: number;
  readonly timestamp: string;
  readonly sizeBytes: number;
}
```

### 3.5 Embedding Provider Plugin

```typescript
/**
 * Provides custom embedding generation for semantic memory search.
 * Replaces the default TF-IDF provider with production-grade embeddings.
 *
 * @see Issue #17 — Phase 2 integration
 */
export interface EmbeddingPlugin extends AdaPlugin {
  /** Return an EmbeddingProvider implementation */
  getProvider(): EmbeddingProvider;

  /** Return a VectorStore implementation (optional — defaults to InMemoryVectorStore) */
  getVectorStore?(): VectorStore;
}
```

---

## 4. Plugin Configuration

### 4.1 Configuration File: `ada.plugins.json`

Lives at the project root alongside `package.json`. Explicit registration — no auto-discovery.

```json
{
  "$schema": "https://ada.dev/schemas/plugins.json",
  "plugins": [
    {
      "name": "@ada/plugin-slack-notifications",
      "version": "^1.0.0",
      "enabled": true,
      "config": {
        "webhookUrl": "${SLACK_WEBHOOK_URL}",
        "channel": "#ada-updates",
        "notifyOn": ["cycle-complete", "error", "compression"]
      }
    },
    {
      "name": "@ada/plugin-postgres-memory",
      "version": "^1.0.0",
      "config": {
        "connectionString": "${DATABASE_URL}",
        "tableName": "ada_memory_bank"
      }
    },
    {
      "name": "./plugins/security-auditor",
      "config": {
        "scanDepth": "moderate"
      }
    }
  ]
}
```

### 4.2 Configuration Rules

| Feature                   | Behavior                                                              |
| ------------------------- | --------------------------------------------------------------------- |
| **Environment variables** | `${VAR_NAME}` syntax expanded at load time                            |
| **Local plugins**         | `./path` resolves relative to project root                            |
| **npm plugins**           | Resolved from `node_modules`                                          |
| **Ordering**              | Plugins execute hooks in array order (first registered, first called) |
| **Enabled flag**          | `false` skips the plugin entirely (default: `true`)                   |
| **Config validation**     | Plugins validate their own config in `setup()`                        |

### 4.3 CLI Integration

```bash
# List installed plugins and their status
ada plugins list

# Add a plugin (updates ada.plugins.json + installs)
ada plugins add @ada/plugin-slack-notifications

# Remove a plugin
ada plugins remove @ada/plugin-slack-notifications

# Check plugin health
ada plugins check
```

---

## 5. Plugin Registry & Loading

### 5.1 Registry

```typescript
/**
 * Central registry for loaded plugins.
 * Manages lifecycle and provides typed hook access.
 */
export interface PluginRegistry {
  /** Register a plugin instance */
  register(plugin: AdaPlugin, config?: PluginConfig): Promise<void>;

  /** Unregister and teardown a plugin */
  unregister(pluginName: string): Promise<void>;

  /** Get all registered plugins */
  list(): readonly RegisteredPlugin[];

  /** Get all plugins implementing a specific hook */
  getHookProviders<H extends LifecycleHookName>(
    hook: H
  ): LifecyclePlugin[H] extends Function ? LifecyclePlugin[] : never;

  /** Get the active memory plugin (if any) */
  getMemoryPlugin(): MemoryPlugin | null;

  /** Get the active embedding plugin (if any) */
  getEmbeddingPlugin(): EmbeddingPlugin | null;

  /** Get all role plugins */
  getRolePlugins(): readonly RolePlugin[];

  /** Setup all registered plugins (called once at cycle start) */
  setupAll(): Promise<PluginSetupReport>;

  /** Teardown all registered plugins (called at cycle end) */
  teardownAll(): Promise<void>;
}

export interface RegisteredPlugin {
  readonly plugin: AdaPlugin;
  readonly config: PluginConfig;
  readonly status: 'active' | 'disabled' | 'error';
  readonly error?: string;
}

export interface PluginSetupReport {
  readonly total: number;
  readonly active: number;
  readonly disabled: number;
  readonly errors: ReadonlyArray<{ name: string; error: string }>;
}

export type LifecycleHookName =
  | 'onBeforeLoad'
  | 'onBeforeCycle'
  | 'onAfterAction'
  | 'onAfterCycle'
  | 'onCompress'
  | 'onError';
```

### 5.2 Loading Strategy

```
ada run
  │
  ├─ 1. Read ada.plugins.json
  ├─ 2. Resolve plugin modules (npm / local path)
  ├─ 3. Instantiate plugins
  ├─ 4. Call setup() on each (catch errors → disable plugin)
  ├─ 5. Merge custom roles into roster
  ├─ 6. Load context (triggers onBeforeLoad hooks)
  ├─ 7. Execute cycle (triggers onBeforeCycle → action → onAfterAction)
  ├─ 8. Advance rotation (triggers onAfterCycle)
  └─ 9. Call teardown() on each plugin
```

### 5.3 Error Isolation

```typescript
/**
 * Execute a lifecycle hook across all providers with error isolation.
 * A failing plugin is disabled for the rest of the cycle — never crashes dispatch.
 */
async function executeHook<H extends LifecycleHookName>(
  registry: PluginRegistry,
  hook: H,
  ...args: Parameters<NonNullable<LifecyclePlugin[H]>>
): Promise<void> {
  const providers = registry.getHookProviders(hook);
  for (const provider of providers) {
    try {
      const fn = provider[hook] as Function;
      await fn.apply(provider, args);
    } catch (error) {
      logger.warn(`Plugin ${provider.name} failed on ${hook}: ${error}`);
      // Disable plugin for remainder of cycle
      registry.disablePlugin(provider.name, String(error));
    }
  }
}
```

---

## 6. Plugin Types: Concrete Examples

### 6.1 Notification Plugin (LifecyclePlugin)

```typescript
// @ada/plugin-slack-notifications
import type {
  LifecyclePlugin,
  PluginConfig,
  DispatchContext,
  DispatchResult,
} from '@ada/core';

export default class SlackNotificationPlugin implements LifecyclePlugin {
  name = '@ada/plugin-slack-notifications';
  version = '1.0.0';
  description = 'Post dispatch cycle summaries to Slack';

  private webhookUrl!: string;
  private channel!: string;

  async setup(config: PluginConfig): Promise<void> {
    this.webhookUrl = config.webhookUrl as string;
    this.channel = config.channel as string;
    if (!this.webhookUrl) throw new Error('webhookUrl is required');
  }

  async onAfterCycle(result: Readonly<DispatchResult>): Promise<void> {
    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: this.channel,
        text: `${result.roleName} completed cycle ${result.cycle}: ${result.action}`,
      }),
    });
  }
}
```

### 6.2 Custom Role Plugin (RolePlugin)

```typescript
// @ada/plugin-security-auditor
import type { RolePlugin, CustomRoleDefinition } from '@ada/core';

export default class SecurityAuditorPlugin implements RolePlugin {
  name = '@ada/plugin-security-auditor';
  version = '1.0.0';
  description = 'Adds a Security Auditor role to the agent team';

  getRoles(): CustomRoleDefinition[] {
    return [
      {
        role: {
          id: 'security',
          name: 'The Sentinel',
          title: 'Security Auditor',
          emoji: '🔐',
          focus: [
            'dependency_audit',
            'code_scanning',
            'secrets_detection',
            'supply_chain',
          ],
          actions: [
            'run_audit',
            'file_security_issue',
            'review_dependencies',
            'check_secrets',
          ],
        },
        playbook: `# 🔐 Security Auditor Playbook
You are The Sentinel, responsible for the security posture of this project.

## Actions
1. **Run Audit** — npm audit, check for known CVEs
2. **File Security Issue** — Create issues for vulnerabilities found
3. **Review Dependencies** — Evaluate new deps for security risk
4. **Check Secrets** — Scan for leaked credentials or API keys
`,
        position: 'after:ops',
        dependencies: ['npm-audit-resolver'],
        initialState: {
          working_on: 'Initial security baseline assessment',
          context: { lastAudit: 'never' },
        },
      },
    ];
  }
}
```

### 6.3 Memory Backend Plugin (MemoryPlugin)

```typescript
// @ada/plugin-postgres-memory
import type { MemoryPlugin, PluginConfig, MemoryArchiveInfo } from '@ada/core';
import { Pool } from 'pg';

export default class PostgresMemoryPlugin implements MemoryPlugin {
  name = '@ada/plugin-postgres-memory';
  version = '1.0.0';
  description =
    'Store memory bank in PostgreSQL for durability and team sharing';

  private pool!: Pool;
  private tableName!: string;

  async setup(config: PluginConfig): Promise<void> {
    this.pool = new Pool({
      connectionString: config.connectionString as string,
    });
    this.tableName = (config.tableName as string) || 'ada_memory_bank';
    await this.ensureTable();
  }

  async readBank(): Promise<string> {
    const result = await this.pool.query(
      `SELECT content FROM ${this.tableName} WHERE is_current = true LIMIT 1`
    );
    return result.rows[0]?.content || '';
  }

  async writeBank(content: string): Promise<void> {
    await this.pool.query(
      `UPDATE ${this.tableName} SET content = $1, updated_at = NOW() WHERE is_current = true`,
      [content]
    );
  }

  async archiveBank(version: number): Promise<string> {
    const id = `archive-v${version}-${Date.now()}`;
    await this.pool.query(
      `INSERT INTO ${this.tableName} (id, content, version, is_current) 
       SELECT $1, content, $2, false FROM ${this.tableName} WHERE is_current = true`,
      [id, version]
    );
    return id;
  }

  async listArchives(): Promise<MemoryArchiveInfo[]> {
    const result = await this.pool.query(
      `SELECT id, version, updated_at, length(content) as size 
       FROM ${this.tableName} WHERE is_current = false ORDER BY updated_at DESC`
    );
    return result.rows.map(r => ({
      id: r.id,
      version: r.version,
      timestamp: r.updated_at.toISOString(),
      sizeBytes: r.size,
    }));
  }

  async restoreArchive(archiveId: string): Promise<string> {
    const result = await this.pool.query(
      `SELECT content FROM ${this.tableName} WHERE id = $1`,
      [archiveId]
    );
    return result.rows[0]?.content || '';
  }

  async teardown(): Promise<void> {
    await this.pool.end();
  }

  private async ensureTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        content TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        is_current BOOLEAN DEFAULT false,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }
}
```

### 6.4 Embedding Provider Plugin (EmbeddingPlugin)

```typescript
// @ada/plugin-openai-embeddings
import type {
  EmbeddingPlugin,
  EmbeddingProvider,
  VectorStore,
} from '@ada/core';
import OpenAI from 'openai';

export default class OpenAIEmbeddingPlugin implements EmbeddingPlugin {
  name = '@ada/plugin-openai-embeddings';
  version = '1.0.0';
  description = 'Use OpenAI text-embedding-3-small for semantic memory search';

  private client!: OpenAI;

  async setup(config: PluginConfig): Promise<void> {
    this.client = new OpenAI({ apiKey: config.apiKey as string });
  }

  getProvider(): EmbeddingProvider {
    return {
      name: 'openai-text-embedding-3-small',
      dimensions: 1536,
      embed: async (text: string) => {
        const response = await this.client.embeddings.create({
          model: 'text-embedding-3-small',
          input: text,
        });
        return response.data[0].embedding;
      },
      embedBatch: async (texts: string[]) => {
        const response = await this.client.embeddings.create({
          model: 'text-embedding-3-small',
          input: texts,
        });
        return response.data.map(d => d.embedding);
      },
    };
  }

  // No custom vector store — uses default InMemoryVectorStore
}
```

---

## 7. Dispatch Integration

### 7.1 Modified Dispatch Flow

The dispatch protocol (DISPATCH.md) gains plugin hooks at each phase:

```
Phase 0: Plugin Load
  → Read ada.plugins.json
  → Resolve & instantiate plugins
  → Call setup() on each
  → Merge custom roles into roster

Phase 1: Context Load
  → [hook: onBeforeLoad] — plugins can modify config
  → Load rotation state, roster (with merged roles), memory
  → If MemoryPlugin active: use it instead of fs read

Phase 2: Situational Awareness
  → [hook: onBeforeCycle] — plugins observe context

Phase 3: Execute
  → Role executes ONE action
  → [hook: onAfterAction] — plugins observe result

Phase 4: Memory Update
  → Update bank.md (via MemoryPlugin or fs)

Phase 5: Compression Check
  → [hook: onCompress] — plugins can provide custom compression
  → Archive via MemoryPlugin or fs

Phase 6: Evolution Check
  → (no plugin hooks — internal protocol)

Phase 7: State Update
  → Advance rotation
  → [hook: onAfterCycle] — plugins observe final result
  → Commit & push

Phase 8: Cleanup
  → Call teardown() on each plugin
```

### 7.2 Core API Changes

The `loadContext` and `completeDispatch` functions gain an optional `PluginRegistry` parameter:

```typescript
export async function loadContext(
  rootDir: string,
  config?: Partial<AdaConfig>,
  plugins?: PluginRegistry // NEW
): Promise<DispatchContext | null>;

export async function completeDispatch(
  context: DispatchContext,
  actionDescription: string,
  plugins?: PluginRegistry // NEW
): Promise<DispatchResult>;
```

This is backwards-compatible — existing code works without plugins.

---

## 8. Plugin Authoring & Publishing

### 8.1 Scaffold

```bash
# Create a new plugin project
ada plugins create my-plugin --type lifecycle

# Generates:
# my-plugin/
# ├── package.json        (name: @ada/plugin-my-plugin)
# ├── tsconfig.json
# ├── src/
# │   └── index.ts        (implements LifecyclePlugin)
# └── README.md
```

### 8.2 Package Convention

```json
{
  "name": "@ada/plugin-my-plugin",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "keywords": ["ada-plugin"],
  "ada": {
    "type": "lifecycle",
    "minCoreVersion": "1.0.0"
  }
}
```

### 8.3 Marketplace (Future — Phase 3)

- **Discovery:** `ada plugins search "security"`
- **Install:** `ada plugins add @ada/plugin-security-auditor`
- **Publish:** `ada plugins publish` (standard npm publish)
- **Registry:** npm (default) + ADA Hub registry (future)

---

## 9. Architecture Decisions

| ID      | Decision                                           | Rationale                                                                |
| ------- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| PLG-001 | Explicit registration via `ada.plugins.json`       | Prevents surprises; team controls what runs in their repo                |
| PLG-002 | Fail-open error isolation                          | Broken plugin ≠ broken dispatch. Autonomous teams can't afford downtime. |
| PLG-003 | Single memory plugin at a time                     | Memory is the source of truth — multiple writers cause corruption        |
| PLG-004 | Hooks execute in registration order                | Predictable behavior; teams control priority via array position          |
| PLG-005 | Optional `PluginRegistry` parameter (not required) | 100% backwards compatible — zero breaking changes                        |
| PLG-006 | Plugin types extend base `AdaPlugin`               | Composition over inheritance; implement only what you need               |
| PLG-007 | `@ada/plugin-*` npm naming convention              | Discoverability via npm search and `ada plugins search`                  |
| PLG-008 | Environment variable expansion in config           | Secrets stay in env, not in committed config files                       |

---

## 10. Implementation Plan

### Phase 1: Core Plugin Infrastructure (Sprint 1)

**Scope:** Plugin interfaces, registry, loading, and lifecycle management.

1. Add plugin type definitions to `@ada/core` (`packages/core/src/plugin.ts`)
2. Implement `PluginRegistry` class
3. Implement `loadPlugins()` from `ada.plugins.json`
4. Wire hooks into `loadContext` and `completeDispatch`
5. Add `ada plugins list` CLI command
6. Write tests for registry, loading, and hook execution

**Estimate:** 2-3 engineering cycles

### Phase 2: Role & Memory Plugins (Sprint 1-2)

**Scope:** Custom roles and alternative memory backends.

1. Implement roster merging for `RolePlugin` custom roles
2. Implement memory backend swapping for `MemoryPlugin`
3. Wire `EmbeddingPlugin` into `SemanticMemoryManager`
4. Add `ada plugins add/remove` CLI commands
5. Build reference notification plugin (`@ada/plugin-slack-notifications`)

**Estimate:** 3-4 engineering cycles

### Phase 3: Marketplace & Scaffold (Sprint 2+)

**Scope:** Plugin authoring tools and discovery.

1. `ada plugins create` scaffolding command
2. Plugin validation and health check
3. ADA Hub plugin registry
4. Community plugin showcase

**Estimate:** 4-5 engineering cycles

---

## 11. Open Questions

| #   | Question                                                                                                   | For Role    |
| --- | ---------------------------------------------------------------------------------------------------------- | ----------- |
| Q1  | Should plugins be able to veto a role's action (return `false` from `onBeforeCycle`)?                      | Product     |
| Q2  | Do we support plugin-to-plugin communication (e.g., memory plugin emitting events to notification plugin)? | Engineering |
| Q3  | Should the memory plugin interface support structured queries (not just read/write string)?                | Frontier    |
| Q4  | How do plugins interact with the existing `SemanticMemoryManager`?                                         | Frontier    |

---

## 12. Success Metrics

- **Adoption:** 3+ community plugins published within 60 days of v1.0-alpha
- **Reliability:** Zero dispatch failures caused by plugin errors (fail-open works)
- **Extensibility:** Security, notification, and database plugins demonstrated
- **DX:** Plugin scaffold → working plugin in <30 minutes

---

## 13. References

- [Core API Spec v1.0](./core-api-spec.md) — Current API surface
- [Template System Design](./template-system-design.md) — Template marketplace integration
- [Embedding Memory Spec](./embedding-memory-spec.md) — Semantic memory foundation
- Issue #7 — Auto-update propagation (plugin updates)
- Issue #8 — Notification integration (lifecycle plugin use case)
- Issue #17 — Embedding memory (EmbeddingPlugin interface)

---

_"Make the simple things simple, and the complex things possible."_
_— 🎨 The Architect_
