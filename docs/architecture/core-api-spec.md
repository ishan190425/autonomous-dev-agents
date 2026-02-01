# @ada/core API Specification v1.0

> **Author:** 🎨 The Architect  
> **Date:** 2026-01-30  
> **Status:** Draft  
> **Version:** 1.0

## Overview

The `@ada/core` library provides the foundational API for autonomous dev agent teams. It handles role rotation, memory management, dispatch coordination, and provides TypeScript types for the entire ADA ecosystem.

**Design Principles:**

- **Async-first:** All I/O operations return Promises
- **Type-safe:** Full TypeScript coverage with strict mode
- **Immutable:** State objects are readonly, mutations return new objects
- **Composable:** Clean separation between reading, processing, and writing
- **Error-resilient:** Graceful handling of missing files, corrupted data

---

## Core Types

### Role Definition

```typescript
interface Role {
  readonly id: RoleId;
  readonly name: string;        // "The Builder"
  readonly title: string;       // "Lead Engineer"
  readonly emoji: string;       // "⚙️"
  readonly focus: readonly string[];
  readonly actions: readonly RoleAction[];
  readonly memory_bank?: string;
}

type RoleId = 'ceo' | 'engineering' | 'ops' | ... | (string & {});
```

**Design Notes:**

- `readonly` prevents accidental mutations
- `RoleId` union provides autocomplete while allowing custom roles
- `actions` array enables dynamic capability discovery

### Team Roster

```typescript
interface Roster {
  readonly company: string;
  readonly product: string;
  readonly tagline: string;
  readonly roles: readonly Role[];
  readonly rotation_order: readonly RoleId[];
}
```

**Design Notes:**

- Simple flat structure, easy to serialize/deserialize
- `rotation_order` separate from roles for flexibility
- Immutable by default

### Rotation State Machine

```typescript
interface RotationState {
  current_index: number;
  last_role: RoleId | null;
  last_run: string | null; // ISO timestamp
  cycle_count: number;
  history: RotationHistoryEntry[];
}

interface RotationHistoryEntry {
  readonly role: RoleId;
  readonly timestamp: string; // ISO timestamp
  readonly cycle: number;
  readonly action?: string; // Brief description
}
```

**Design Notes:**

- State is mutable (CLI needs to update it)
- History provides audit trail and debugging
- `null` values indicate "never ran" state

---

## Rotation API

### Core Functions

```typescript
// State management
function readRotationState(statePath: string): Promise<RotationState>;
function writeRotationState(
  statePath: string,
  state: RotationState
): Promise<void>;
function readRoster(rosterPath: string): Promise<Roster>;

// Role resolution
function getCurrentRole(state: RotationState, roster: Roster): Role | null;
function getCurrentRoleId(state: RotationState, roster: Roster): RoleId | null;

// State transitions
function advanceRotation(
  state: RotationState,
  roster: Roster,
  actionDescription?: string
): RotationState;

// Utility
function getRotationSummary(state: RotationState, roster: Roster): string;
```

**Usage Example:**

```typescript
import {
  readRotationState,
  readRoster,
  getCurrentRole,
  advanceRotation,
} from "@ada/core";

const state = await readRotationState("./agents/state/rotation.json");
const roster = await readRoster("./agents/roster.json");
const currentRole = getCurrentRole(state, roster);

if (currentRole) {
  console.log(`Current role: ${currentRole.emoji} ${currentRole.name}`);

  // After executing an action:
  const newState = advanceRotation(state, roster, "Implemented feature X");
  await writeRotationState("./agents/state/rotation.json", newState);
}
```

**Design Notes:**

- Pure functions where possible (advanceRotation)
- Async I/O separated from sync business logic
- Clear error handling (returns null for empty rosters)

---

## Memory API

### Core Functions

```typescript
// File operations
function readMemoryBank(bankPath: string): Promise<string>;
function writeMemoryBank(bankPath: string, content: string): Promise<void>;

// Analysis
function countLines(content: string): number;
function needsCompression(
  content: string,
  cyclesSinceCompression: number,
  lineThreshold?: number,
  cycleThreshold?: number
): boolean;

// Compression workflow
function archiveBank(
  bankPath: string,
  archivesDir: string,
  version: number
): Promise<string>;

function extractVersion(content: string): number;
function extractCycle(content: string): number;
function updateBankHeader(
  content: string,
  cycle: number,
  version?: number
): string;
```

**Usage Example:**

```typescript
import { readMemoryBank, needsCompression, archiveBank } from "@ada/core";

const content = await readMemoryBank("./agents/memory/bank.md");
const shouldCompress = needsCompression(content, 5);

if (shouldCompress) {
  const version = extractVersion(content);
  await archiveBank(
    "./agents/memory/bank.md",
    "./agents/memory/archives",
    version
  );

  // Compress content here (implementation-specific)
  const compressedContent = compressMemoryBank(content);
  const updatedContent = updateBankHeader(
    compressedContent,
    cycle,
    version + 1
  );

  await writeMemoryBank("./agents/memory/bank.md", updatedContent);
}
```

**Design Notes:**

- String-based API (flexible content format)
- Compression logic separated from I/O
- Header metadata extraction via regex (simple, reliable)

---

## Dispatch API

### High-Level Orchestration

```typescript
interface DispatchContext {
  readonly agentsDir: string;
  readonly config: AdaConfig;
  readonly roster: Roster;
  readonly state: RotationState;
  readonly role: Role;
  readonly memoryContent: string;
}

interface DispatchResult {
  readonly success: boolean;
  readonly role: RoleId;
  readonly roleName: string;
  readonly cycle: number;
  readonly action: string;
  readonly timestamp: string;
  readonly modifiedFiles: readonly string[];
  readonly error?: string;
}

// Main orchestration functions
function loadContext(
  cwd: string,
  config?: Partial<AdaConfig>
): Promise<DispatchContext | null>;
function completeDispatch(
  context: DispatchContext,
  actionDescription: string
): Promise<DispatchResult>;
function checkCompression(context: DispatchContext): Promise<boolean>;
```

**Usage Example:**

```typescript
import { loadContext, completeDispatch, checkCompression } from "@ada/core";

const context = await loadContext(process.cwd());
if (!context) {
  throw new Error("No ADA configuration found. Run `ada init` first.");
}

console.log(`Acting as: ${context.role.name}`);

// Execute some action here...
const actionTaken = "Created API specification document";

// Handle compression if needed
await checkCompression(context);

// Complete the cycle
const result = await completeDispatch(context, actionTaken);
console.log(`Cycle ${result.cycle} complete: ${result.action}`);
```

**Design Notes:**

- Context object provides all needed data in one place
- Result object provides audit trail
- Compression check separate from dispatch (can run independently)

---

## Configuration API

### ADA Configuration

```typescript
interface AdaConfig {
  readonly agentsDir: string; // "agents/"
  readonly templatesDir: string; // "templates/"
  readonly repo?: string; // "owner/name"
  readonly defaultBranch: string; // "main"
  readonly maxHistory: number; // 10
  readonly compressionThreshold: number; // 200 lines
}

const DEFAULT_CONFIG: AdaConfig = {
  agentsDir: "agents/",
  templatesDir: "templates/",
  defaultBranch: "main",
  maxHistory: 10,
  compressionThreshold: 200,
};
```

**Design Notes:**

- Simple flat configuration object
- Sensible defaults provided
- Readonly to prevent accidental mutations

---

## Error Handling Strategy

### Error Types

```typescript
// File system errors
class AdaFileError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly cause?: Error
  ) {
    super(message);
  }
}

// Configuration errors
class AdaConfigError extends Error {
  constructor(message: string, public readonly configPath?: string) {
    super(message);
  }
}

// State corruption errors
class AdaStateError extends Error {
  constructor(message: string, public readonly statePath?: string) {
    super(message);
  }
}
```

### Error Conventions

- **Missing files:** Return `null` or empty values (not errors)
- **Corrupted data:** Throw specific error types
- **Invalid config:** Throw `AdaConfigError` with helpful message
- **Network issues:** Let underlying errors bubble up (don't wrap)

**Example:**

```typescript
// Good: Returns null for missing files
function readRotationState(path: string): Promise<RotationState | null>;

// Good: Throws for corrupted JSON
function parseRoster(content: string): Roster; // throws AdaConfigError

// Good: Lets filesystem errors bubble up
function writeMemoryBank(path: string, content: string): Promise<void>;
```

---

## Plugin Architecture (Future)

### Plugin Interface

```typescript
interface AdaPlugin {
  readonly name: string;
  readonly version: string;
  readonly description: string;

  // Lifecycle hooks
  onBeforeCycle?(context: DispatchContext): Promise<void>;
  onAfterAction?(
    context: DispatchContext,
    result: DispatchResult
  ): Promise<void>;
  onRoleChange?(oldRole: RoleId, newRole: RoleId): Promise<void>;
  onCompress?(content: string): Promise<string>;
}

// Plugin registry
interface PluginRegistry {
  register(plugin: AdaPlugin): void;
  unregister(pluginName: string): void;
  list(): readonly AdaPlugin[];
  getHooks<T extends keyof AdaPlugin>(hookName: T): AdaPlugin[T][];
}
```

**Design Notes:**

- Optional lifecycle hooks (plugins implement what they need)
- Simple registry pattern
- Type-safe hook access
- Future expansion without breaking changes

### Custom Roles via Plugins

```typescript
interface CustomRoleDefinition {
  readonly role: Role;
  readonly playbook: string; // Markdown content
  readonly dependencies?: string[]; // Required packages/tools
}

interface RolePlugin extends AdaPlugin {
  getRoles(): CustomRoleDefinition[];
}
```

---

## Migration & Versioning Strategy

### Schema Evolution

```typescript
interface SchemaVersion {
  readonly version: string; // "1.0.0"
  readonly migration?: (old: unknown) => unknown;
}

// Migration registry
const MIGRATIONS: Record<string, SchemaVersion> = {
  "1.0.0": { version: "1.0.0" },
  "1.1.0": {
    version: "1.1.0",
    migration: (old) => ({ ...old, newField: "defaultValue" }),
  },
};
```

**Design Notes:**

- Simple versioning in config files
- Migration functions transform old → new format
- Backwards compatibility maintained where possible

### Breaking Change Policy

- **Major version:** Breaking API changes (rare)
- **Minor version:** New features, optional fields
- **Patch version:** Bug fixes, no schema changes

---

## Performance Considerations

### File I/O Optimization

- **Batch reads:** Load all config files in parallel
- **Lazy loading:** Only read memory bank when needed
- **Caching:** In-memory cache for frequently accessed configs
- **Streaming:** Large memory banks read in chunks

### Memory Usage

- **Immutable objects:** Prevent memory leaks from retained references
- **History limits:** Cap rotation history at configurable size
- **Content compression:** Archive old memory banks

### TypeScript Performance

- **Barrel exports:** Clean public API surface
- **Interface segregation:** Small, focused interfaces
- **Generic constraints:** Constrain types for better inference

---

## Testing Strategy

### Unit Tests

```typescript
// Pure function testing
describe("advanceRotation", () => {
  it("should increment cycle count", () => {
    const state: RotationState = {
      /* ... */
    };
    const roster: Roster = {
      /* ... */
    };
    const result = advanceRotation(state, roster, "test action");
    expect(result.cycle_count).toBe(state.cycle_count + 1);
  });
});

// Async I/O testing with mocks
describe("readRotationState", () => {
  it("should parse valid JSON", async () => {
    const mockFs = jest.mocked(fs);
    mockFs.readFile.mockResolvedValue('{"cycle_count": 5}');

    const result = await readRotationState("./test.json");
    expect(result.cycle_count).toBe(5);
  });
});
```

### Integration Tests

- **Full dispatch cycle:** Load context → execute → save state
- **File system integration:** Real files, temporary directories
- **Error scenarios:** Missing files, corrupted JSON, permission errors

### Property-Based Testing

- **State transitions:** Rotation advancement is deterministic
- **Serialization roundtrips:** JSON.parse(JSON.stringify(x)) === x
- **Memory bank parsing:** Header extraction works for all valid formats

---

## Documentation Requirements

### JSDoc Standards

````typescript
/**
 * Advance the agent rotation to the next role.
 *
 * Creates a new rotation state with the next role active,
 * updated timestamps, and history entry added.
 *
 * @param state - Current rotation state
 * @param roster - Team roster with rotation order
 * @param actionDescription - Brief description of action taken this cycle
 * @returns New rotation state (does not mutate input)
 *
 * @example
 * ```typescript
 * const newState = advanceRotation(currentState, roster, "Fixed bug #123");
 * console.log(`Advanced to cycle ${newState.cycle_count}`);
 * ```
 */
export function advanceRotation(
  state: RotationState,
  roster: Roster,
  actionDescription?: string
): RotationState;
````

### API Documentation

- **All public functions:** Complete JSDoc with examples
- **Type definitions:** Clear descriptions for each field
- **Error conditions:** When functions throw vs return null
- **Usage patterns:** Common workflows with code examples

---

## Future Considerations

### Web Dashboard Integration

- **Read-only API:** Dashboard queries state without mutations
- **Real-time updates:** WebSocket or SSE for live cycle monitoring
- **Authentication:** Token-based API access for dashboard

### Cloud Synchronization

- **State replication:** Sync rotation state across team members
- **Conflict resolution:** Handle concurrent cycle executions
- **Backup strategies:** Automatic memory bank backups

### Enterprise Features

- **Multi-tenant:** Support for multiple teams/projects
- **Audit logging:** Detailed action logs for compliance
- **Access control:** Role-based permissions for team management

---

**Design Philosophy:** _Simple things should be simple, complex things should be possible._

The @ada/core API prioritizes developer experience through clean types, predictable behavior, and comprehensive error handling. Every function should be self-explanatory, and the most common use cases should require minimal code.

---

**Version History:**

- v1.0 (2026-01-30): Initial API specification

**Next Review:** When implementing plugin system or web dashboard integration
