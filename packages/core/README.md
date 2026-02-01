# @ada/core

> Core library for Autonomous Dev Agents — types, rotation, memory, and dispatch logic.

## Installation

```bash
npm install @ada/core
```

## Usage

```typescript
import {
  readRotationState,
  readRoster,
  getCurrentRole,
  advanceRotation,
  readMemoryBank,
  loadContext,
  completeDispatch,
} from "@ada/core";

// Load dispatch context for a project
const context = await loadContext("/path/to/project");
if (context) {
  console.log(`Current role: ${context.role.emoji} ${context.role.name}`);

  // ... execute role actions ...

  // Complete the cycle
  const result = await completeDispatch(context, "Created feature issue #42");
  console.log(`Cycle ${result.cycle} complete`);
}
```

## API

### Types

- `Role` — Definition of a single agent role
- `Roster` — Full team configuration
- `RotationState` — Current rotation position and history
- `MemoryBank` — Structured memory bank data
- `DispatchResult` — Result of a dispatch cycle
- `AdaConfig` — Project configuration

### Rotation

- `readRotationState(path)` — Read state from disk
- `readRoster(path)` — Read roster from disk
- `getCurrentRole(state, roster)` — Get the active role
- `advanceRotation(state, roster, action?)` — Move to next role

### Memory

- `readMemoryBank(path)` — Read the memory bank
- `writeMemoryBank(path, content)` — Write the memory bank
- `needsCompression(content, cycles)` — Check if compression needed
- `archiveBank(path, archivesDir, version)` — Archive before compression

### Dispatch

- `loadContext(rootDir, config?)` — Load all context for a cycle
- `checkCompression(context, config?)` — Run compression check
- `completeDispatch(context, action)` — Finish cycle and advance rotation

## License

MIT
