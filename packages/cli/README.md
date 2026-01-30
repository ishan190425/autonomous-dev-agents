# @ada/cli

> CLI tool for Autonomous Dev Agents — set up and run AI agent teams on any repo.

## Installation

```bash
npm install -g @ada/cli
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

## License

MIT
