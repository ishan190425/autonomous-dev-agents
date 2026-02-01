# ADA CLI Specification v1.0

> **Package:** `@ada/cli`  
> **Binary:** `ada`  
> **Target:** Node.js 18+ (ESM, TypeScript)

---

## Overview

The ADA CLI is the primary interface for developers to initialize, run, and manage autonomous agent teams on any repository. It provides local execution with optional cloud orchestration.

## Command Structure

```bash
ada <command> [options] [args]
```

### Global Options

- `--config <path>` — Custom config file path (default: `./agents/config.json`)
- `--verbose, -v` — Verbose logging
- `--help, -h` — Show help
- `--version, -V` — Show version

---

## Core Commands

### `ada init` — Initialize Agent Team

**Purpose:** Bootstrap autonomous agent team in any repository.

**Usage:**

```bash
ada init [options] [template]
```

**Options:**

- `--template, -t <name>` — Use specific template (default: interactive)
- `--team-size <size>` — Team size: small|medium|large (affects default roles)
- `--focus <area>` — Primary focus: product|engineering|research|ops
- `--overwrite, -f` — Overwrite existing agent configuration

**Interactive Prompts:**

1. **Project type?** `web-app | cli-tool | api-service | mobile-app | library | other`
2. **Team size?** `solo (3 roles) | small (5 roles) | medium (7 roles) | large (full 8 roles)`
3. **Primary focus?** `product | engineering | ops | balanced`
4. **LLM provider?** `anthropic | openai | together | local`
5. **Execution mode?** `local | clawdbot | hybrid`

**Generated Files:**

```
agents/
├── config.json              ← Team configuration
├── roster.json              ← Role definitions
├── state/
│   └── rotation.json        ← Current rotation state
├── memory/
│   └── bank.md              ← Shared memory
├── rules/
│   └── RULES.md             ← Team rules
└── playbooks/
    ├── ceo.md
    ├── product.md
    ├── engineering.md
    └── ... (based on team size)
```

**User Stories:**

- **As a solo developer,** I want to run `ada init` in my repo and get a minimal agent team that helps with product and ops tasks I can't handle alone.
- **As a small team lead,** I want to customize which roles my agent team includes based on what human roles I already have covered.
- **As an enterprise developer,** I want to initialize ADA with our internal LLM and custom role templates.

---

### `ada run` — Execute Agent Cycles

**Purpose:** Run autonomous agent dispatch cycles.

**Usage:**

```bash
ada run [options]
```

**Options:**

- `--continuous, -c` — Run continuously (default: single cycle)
- `--interval <minutes>` — Interval for continuous mode (default: 30)
- `--role <role-id>` — Run specific role only
- `--cycles <count>` — Run specific number of cycles
- `--dry-run` — Preview actions without executing

**Behavior:**

1. Read current rotation state
2. Load role playbook and memory bank
3. Execute role's cycle (GitHub API, file operations)
4. Update memory bank and rotation state
5. Commit changes (if any)

**Output Example:**

```
🏭 ADA Cycle 47 - Engineering (⚙️ The Builder)
├── 📖 Reading memory bank...
├── 🔍 Checking GitHub state... (12 open issues, 3 PRs)
├── ⚡ Action: Implement ada status command
├── 📝 Created PR #15: feat(cli): add ada status command
├── 🧠 Updated memory bank
└── ✅ Cycle complete (1m 23s)

Next: 🛡️ Ops (in 30 minutes)
```

---

### `ada status` — Show Team Status

**Purpose:** Display current agent team state and recent activity.

**Usage:**

```bash
ada status [options]
```

**Options:**

- `--detailed, -d` — Show detailed memory bank info
- `--cycles <count>` — Show recent cycles (default: 5)
- `--json` — Output as JSON

**Output Example:**

```
🏭 ADA Team Status

Current Role: 🛡️ Ops (The Guardian)
Last Run: 2026-01-30 14:30:22 EST (23 minutes ago)
Cycle Count: 47

📊 Recent Activity:
Cycle 47 | ⚙️ Engineering | feat(cli): add ada status command
Cycle 46 | 📦 Product     | Created Issue #14: Add dashboard wireframes
Cycle 45 | 🔬 Research    | docs(research): LangChain vs CrewAI analysis
Cycle 44 | 👔 CEO         | Updated business plan with Q1 OKRs
Cycle 43 | 🚀 Growth      | docs(fundraising): investor research

🧠 Memory Bank: 156 lines (v2, last compressed 3 cycles ago)
📈 Project Health: 18 issues, 6 PRs, 2 active threads

Next Cycle: ⚙️ Engineering in 7 minutes
```

---

### `ada config` — Manage Configuration

**Purpose:** View and edit agent team configuration.

**Usage:**

```bash
ada config [subcommand] [options]
```

**Subcommands:**

- `ada config show` — Show current configuration
- `ada config edit` — Open config in editor
- `ada config set <key> <value>` — Set configuration value
- `ada config get <key>` — Get configuration value

**Key Configuration:**

```json
{
  "llm_provider": "anthropic",
  "execution_mode": "local",
  "rotation_interval_minutes": 30,
  "continuous_mode": false,
  "memory_compression_threshold": 200,
  "github_integration": true,
  "commit_on_cycle": true
}
```

---

### `ada add-role` — Add Custom Role

**Purpose:** Add a new role to the agent team.

**Usage:**

```bash
ada add-role <role-id> [options]
```

**Options:**

- `--name <name>` — Role display name
- `--emoji <emoji>` — Role emoji
- `--focus <areas>` — Comma-separated focus areas
- `--template <path>` — Use custom playbook template
- `--after <role-id>` — Insert after specific role in rotation

**Interactive Prompts:**

1. **Role name?** (e.g., "Security Engineer")
2. **Role emoji?** (e.g., "🔒")
3. **Focus areas?** (e.g., "security, compliance, penetration_testing")
4. **Playbook template?** `security | qa | devrel | custom | blank`

---

### `ada compress` — Compress Memory

**Purpose:** Manually trigger memory bank compression.

**Usage:**

```bash
ada compress [options]
```

**Options:**

- `--force, -f` — Force compression even if not needed
- `--archive-only` — Archive without compressing

---

### `ada export` — Export Data

**Purpose:** Export cycle history, metrics, and team state.

**Usage:**

```bash
ada export [type] [options]
```

**Types:**

- `history` — Export cycle history as JSON
- `metrics` — Export team metrics
- `memory` — Export memory bank with archives
- `config` — Export complete team configuration

**Options:**

- `--output, -o <file>` — Output file path
- `--format <format>` — Output format: json|csv|markdown

---

## Template System

### Built-in Templates

| Template      | Description                   | Roles Included                           |
| ------------- | ----------------------------- | ---------------------------------------- |
| `minimal`     | Solo developer (3 roles)      | CEO, Engineering, Ops                    |
| `web-app`     | React/Next.js projects        | CEO, Product, Engineering, Ops, Design   |
| `api-service` | Backend API development       | CEO, Product, Engineering, Ops, Research |
| `cli-tool`    | Command-line tool development | CEO, Product, Engineering, Ops           |
| `mobile-app`  | React Native/mobile           | CEO, Product, Engineering, Ops, Design   |
| `library`     | Open-source library           | CEO, Engineering, Ops, Research          |
| `enterprise`  | Large team (all 8 roles)      | All roles included                       |

### Custom Templates

Templates are directories with:

```
templates/my-template/
├── template.json            ← Template metadata
├── roster.json             ← Default roles
├── config.json             ← Default configuration
├── playbooks/              ← Role playbooks
│   ├── custom-role.md
│   └── ...
└── rules/
    └── RULES.md            ← Custom rules
```

---

## Installation & Setup

### Global Installation

```bash
npm install -g @ada/cli
```

### Project Setup

```bash
cd my-project
ada init
ada run
```

### Configuration

- Config file: `agents/config.json`
- Global config: `~/.ada/config.json`
- Environment variables: `ADA_LLM_PROVIDER`, `ADA_EXECUTION_MODE`, etc.

---

## Integration Points

### GitHub

- Issue creation and management
- PR creation and reviews
- Repository state analysis
- Commit automation

### LLM Providers

- **Anthropic Claude** (recommended)
- **OpenAI GPT-4**
- **Together AI**
- **Local models** (via Ollama)

### Clawdbot

- Session management
- Tool orchestration
- Memory persistence
- Heartbeat execution

---

**Author:** 📦 The PM  
**Date:** 2026-01-30  
**Version:** 1.0
