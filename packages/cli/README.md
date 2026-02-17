# @ada-ai/cli

> CLI tool for Autonomous Dev Agents — set up and run AI agent teams on any repo.

## Installation

```bash
npm install -g @ada-ai/cli
```

## Quick Start

```bash
# Initialize agent team in your repo
cd my-project
ada init

# Check team status
ada status

# Run one dispatch cycle
ada run

# View configuration
ada config show
```

## Commands

### `ada init`

Initialize an autonomous agent team in the current repository.

```bash
ada init                    # Interactive setup
ada init --template web-app # Use a specific template
ada init --no-prompt        # Use all defaults
ada init --dir ./my-agents  # Custom agents directory
```

### `ada run`

Execute one dispatch cycle as the current role.

```bash
ada run                     # Run one cycle
ada run --dry-run           # Preview without executing
ada run --watch             # Run continuously
ada run --interval 45       # Set watch interval (minutes)
```

### `ada status`

Show the current rotation state, team info, and memory bank summary.

```bash
ada status                  # Human-readable output
ada status --json           # Machine-readable JSON
```

### `ada config`

View and edit agent team configuration.

```bash
ada config show             # Display current config
ada config edit             # Open roster.json in $EDITOR
ada config path             # Print agents directory path
```

## Executor Backends

ADA supports multiple executor backends for agent execution. The executor determines which CLI tool is used to execute agent actions.

### Available Executors

- **clawdbot** (default) — Uses Clawdbot for agent execution
- **claude-code** — Uses Claude Code CLI for agent execution (Issue #64)
- **codex** — Uses OpenAI Codex CLI for agent execution

### Selecting an Executor

You can select an executor in several ways:

1. **CLI flag** (per-cycle):
   ```bash
   ada dispatch start --executor claude-code
   ada dispatch start --executor codex
   ```

2. **Environment variable** (persistent):
   ```bash
   export ADA_EXECUTOR=claude-code
   export ADA_EXECUTOR=codex
   ada dispatch start
   ```

3. **Default**: If not specified, ADA uses `clawdbot`.

### Claude Code Integration

To use Claude Code as the executor:

1. **Install Claude Code CLI**:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. **Configure Claude Code** with your API keys (follow Claude Code documentation)

3. **Use Claude Code executor**:
   ```bash
   ada dispatch start --executor claude-code
   ```

   Or set it as default:
   ```bash
   export ADA_EXECUTOR=claude-code
   ```

**Note**: Executor integrations are optional. ADA's rotation, memory bank, and coordination layer work with any executor backend.

### Codex Integration

To use Codex as the executor:

1. **Install Codex CLI** (follow OpenAI Codex CLI installation instructions)

2. **Configure Codex** with your API keys

3. **Use Codex executor**:
   ```bash
   ada dispatch start --executor codex
   ```

   Or set it as default:
   ```bash
   export ADA_EXECUTOR=codex
   ```

## License

MIT
