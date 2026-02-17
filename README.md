# 🤖 ADA — Autonomous Dev Agents

[![Discord](https://img.shields.io/badge/Discord-Join%20Server-5865F2?logo=discord&logoColor=white)](https://discord.gg/5NCHGJAz)
![Views](https://komarev.com/ghpvc/?username=ishan190425-autonomous-dev-agents&label=Views&color=brightgreen&style=flat)
![Next Agent](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fishan190425%2Fautonomous-dev-agents%2Fmaster%2Fagents%2Fstate%2Frotation.json&query=%24.next_role_title&label=Next%20Agent&color=blueviolet&style=flat)
![Cycle](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fishan190425%2Fautonomous-dev-agents%2Fmaster%2Fagents%2Fstate%2Frotation.json&query=%24.cycle_count&label=Dispatch%20Cycles&color=blue&style=flat)

> **Ship software with autonomous AI dev teams.**

ADA lets you set up a team of AI agents that autonomously manage your software project — from strategy and research to product specs, engineering, ops, and design. Each agent has a specialized role, a playbook, and a shared memory bank for continuity.

- 🎯 **Multi-role agent teams** — Not just a code bot. A CEO, researcher, PM, engineer, ops lead, and designer working in rotation.
- 🔄 **Autonomous dispatch loop** — Heartbeat-driven cycles where each role reads context, acts, and updates shared memory.
- 🧠 **Persistent memory** — A shared memory bank gives agents continuity across sessions, with automatic compression and archiving.

---

## Quick Start

```bash
# Install the CLI
npm install -g @ada-ai/cli

# Initialize agent team in your repo
cd my-project
ada init

# Run one dispatch cycle
ada run

# Check team status
ada status
```

## How It Works

```
┌──────────────────────────────────────────────┐
│              Heartbeat Trigger                │
│         (every N minutes via cron/CI)         │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│           ADA Dispatch Protocol               │
│                                               │
│  1. Load rotation state → who am I?           │
│  2. Read memory bank → what's happening?      │
│  3. Read my playbook → what can I do?         │
│  4. Check GitHub (issues, PRs) → what's new?  │
│  5. Pick & execute ONE action                 │
│  6. Update memory bank                        │
│  7. Advance rotation → next role              │
│  8. Commit & push                             │
└──────────────────────────────────────────────┘
```

Each cycle, the agent becomes one role. After acting, it rotates to the next. Over a full rotation, every aspect of your project gets attention:

| Cycle | Role           | What It Does                                      |
| ----- | -------------- | ------------------------------------------------- |
| 0     | 👔 CEO         | Sets strategy, analyzes market, defines direction |
| 1     | 🔬 Research    | Scouts technologies, evaluates feasibility        |
| 2     | 📦 Product     | Writes specs, creates feature issues, prioritizes |
| 3     | 📋 Scrum       | Plans sprints, tracks progress, unblocks          |
| 4     | ⚙️ Engineering | Writes code, creates PRs, reviews                 |
| 5     | 🛡️ Ops         | Merges PRs, fixes CI, enforces standards          |
| 6     | 🎨 Design      | Reviews APIs, proposes architecture               |

## Features

### CLI (`@ada-ai/cli`)

- `ada init` — Bootstrap agent team with interactive setup
- `ada run` — Execute one dispatch cycle (or `--watch` for continuous)
- `ada status` — See rotation state, team info, memory summary
- `ada config` — View and edit team configuration

### Core Library (`@ada-ai/core`)

- TypeScript types for roles, rosters, rotation, and memory
- Rotation state machine with history tracking
- Memory bank read/write/compress/archive
- Dispatch protocol orchestration

### Templates

- Pre-configured agent teams for different project types
- Customizable playbooks, roster, and rules
- Extensible — add your own roles and actions

### Web Dashboard (coming soon)

- Real-time cycle monitoring
- Memory bank viewer with search
- Role configuration UI
- Metrics and analytics

## Cost Optimization

ADA automatically selects the most cost-effective LLM model for each role, saving ~14% compared to using a single model for all operations.

| Model  | Usage | Roles                                  | Cost |
| ------ | ----- | -------------------------------------- | ---- |
| Haiku  | 35%   | Scrum, Evangelist, Ops (routine tasks) | $    |
| Sonnet | 62%   | Engineering, Product, Research, Design | $$   |
| Opus   | 3%    | CEO (critical decisions only)          | $$$  |

### How It Works

When you run `ada dispatch start`, ADA automatically selects the optimal model based on the current role. No configuration required — it just works.

```
🚀 Cycle 730 Started

  Role:      🎨 The Architect
  Model:     ⚖️ sonnet (auto)
```

### Power User Overrides

For specific cycles where you need a different model:

```bash
# Force Opus for a critical decision
ada dispatch start --model=opus

# Force Haiku for a routine task
ada dispatch start --model=haiku
```

Or set environment variables for persistent overrides:

| Variable             | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `ADA_MODEL_ROUTING`  | Enable/disable auto-routing (default: `true`)            |
| `ADA_MODEL_OVERRIDE` | Force specific model: `haiku`, `sonnet`, or `opus`       |
| `ADA_MODEL_FALLBACK` | Enable fallback escalation on failures (default: `true`) |

For deployment configuration, see [Railway deployment docs](docs/deployment/railway.md).

## Notifications

ADA can send notifications to Slack, Telegram, and Discord when agents complete their cycles. This keeps you informed about agent activity without constantly checking the repository.

### Quick Setup

```bash
# Configure Slack
ada config notifications set slack <webhook-url>

# Configure Telegram
ada config notifications set telegram <bot-token> <chat-id>

# Configure Discord
ada config notifications set discord <webhook-url>

# Test a notification
ada config notifications test slack
ada config notifications test telegram
ada config notifications test discord

# View current configuration
ada config notifications show
```

### Slack Setup

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From scratch"**
3. Name your app (e.g., "ADA Notifications") and select your workspace
4. In the app settings, go to **"Incoming Webhooks"**
5. Toggle **"Activate Incoming Webhooks"** to ON
6. Click **"Add New Webhook to Workspace"**
7. Choose the channel where you want notifications
8. Copy the webhook URL (format: `https://hooks.slack.com/services/T.../B.../...`)
9. Configure in ADA:
   ```bash
   ada config notifications set slack https://hooks.slack.com/services/T.../B.../...
   ```

### Telegram Setup

1. Open Telegram and search for **[@BotFather](https://t.me/botfather)**
2. Send `/newbot` and follow the prompts to create a bot
3. Copy the bot token (format: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)
4. Get your chat ID:
   - For personal chats: Use [@userinfobot](https://t.me/userinfobot) — it will show your user ID
   - For groups/channels: Add [@getidsbot](https://t.me/getidsbot) to the group/channel
   - Or visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates` and look for `chat.id`
5. Configure in ADA:
   ```bash
   ada config notifications set telegram <bot-token> <chat-id>
   ```

### Discord Setup

1. Open your Discord server
2. Go to **Server Settings** → **Integrations** → **Webhooks**
3. Click **"New Webhook"**
4. Configure:
   - Name (e.g., "ADA Notifications")
   - Channel where notifications should be sent
   - Optional: Set an avatar
5. Click **"Copy Webhook URL"** (format: `https://discord.com/api/webhooks/.../...`)
6. Configure in ADA:
   ```bash
   ada config notifications set discord https://discord.com/api/webhooks/.../...
   ```

### Managing Notifications

```bash
# Enable all notifications
ada config notifications enable

# Enable a specific channel
ada config notifications enable slack
ada config notifications enable telegram
ada config notifications enable discord

# Disable all notifications
ada config notifications disable

# Disable a specific channel
ada config notifications disable slack
```

### What Gets Notified

When an agent completes a cycle (`ada dispatch complete`), notifications include:
- **Cycle number** and **role** (emoji + name)
- **Commit subject** and **body** (the action description)
- **Commit SHA** and **role ID**

Each channel formats messages differently:
- **Slack**: Block Kit format with expandable sections
- **Telegram**: Markdown-formatted message
- **Discord**: Rich embed with color coding based on outcome

### Security

Notification credentials are stored in `agents/config.json`. For security:

1. **Add to `.gitignore`** (if not already there):
   ```bash
   echo "agents/config.json" >> .gitignore
   ```

2. **Use environment variables** (recommended for CI/CD):
   ```json
   {
     "notifications": {
       "channels": {
         "slack": {
           "webhookUrl": "${SLACK_WEBHOOK_URL}"
         },
         "telegram": {
           "botToken": "${TELEGRAM_BOT_TOKEN}",
           "chatId": "${TELEGRAM_CHAT_ID}"
         }
       }
     }
   }
   ```

The system automatically resolves environment variables in config values.

## Dogfooding 🐕

**ADA builds itself.** This repo has its own agent team in `agents/` that runs the ADA dispatch protocol to develop the ADA product. It's the first and most active customer of its own framework.

## Case Study: Social Trade

[Social Trade](https://github.com/ishan190425/social-trade) is ADA's proof-of-concept customer — a real project where autonomous agents manage the full development lifecycle, from market research to code implementation to CI/CD.

## Architecture

```
autonomous-dev-agents/
├── agents/          ← ADA's own agent team (dogfooding)
├── packages/
│   ├── cli/         ← @ada-ai/cli — the CLI tool
│   └── core/        ← @ada-ai/core — shared library
├── apps/
│   └── web/         ← Marketing site + dashboard (planned)
├── templates/       ← Template files for `ada init`
└── docs/            ← Business, product, research, architecture docs
```

## Pricing

|                  | Free     | Pro        | Enterprise |
| ---------------- | -------- | ---------- | ---------- |
| CLI tool         | ✅       | ✅         | ✅         |
| All templates    | ✅       | ✅         | ✅         |
| Local execution  | ✅       | ✅         | ✅         |
| Web dashboard    | —        | ✅         | ✅         |
| Cycle analytics  | —        | ✅         | ✅         |
| Custom roles     | —        | —          | ✅         |
| SSO & team mgmt  | —        | —          | ✅         |
| Priority support | —        | —          | ✅         |
| **Price**        | **Free** | **$19/mo** | **$99/mo** |

## Community

Join the ADA community to discuss autonomous development, get help, and share your experiences:

- 🎮 **[Discord Server](https://discord.gg/5NCHGJAz)** — Chat with the team, ask questions, share feedback
- 🐛 **[GitHub Issues](https://github.com/ishan190425/autonomous-dev-agents/issues)** — Report bugs, request features
- 📢 **[GitHub Discussions](https://github.com/ishan190425/autonomous-dev-agents/discussions)** — Longer-form conversations

## Contributing

ADA is open source. Contributions welcome!

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes (TypeScript strict, tests required)
4. Run checks: `npm run typecheck && npm test`
5. Open a PR targeting `main`

See [agents/rules/RULES.md](agents/rules/RULES.md) for coding standards.

## Development

```bash
# Clone and install
git clone https://github.com/ishan190425/autonomous-dev-agents.git
cd autonomous-dev-agents
npm install

# Type check all packages
npm run typecheck

# Run tests
npm test

# Build all packages
npm run build

# Run CLI in dev mode
npm run dev -- status
```

## License

### Open Source (AGPLv3)

ADA's core framework is licensed under **GNU Affero General Public License v3.0 (AGPLv3)**.

This means you're free to:

- ✅ Use ADA for any purpose, including commercial projects
- ✅ Modify the source code
- ✅ Self-host ADA on your own infrastructure
- ✅ Distribute your modifications

**Important:** If you modify ADA and offer it as a hosted service (SaaS), you must publish your modifications under AGPLv3. This protects the open source community while allowing commercial use.

### Commercial Licensing

The following components are available under a separate commercial license:

- **Web Dashboard** (`apps/web`) — Real-time monitoring, analytics, and team management UI
- **Hosted Execution** — Cloud-based agent execution services
- **Enterprise Features** — SSO, advanced team management, custom roles, priority support

This dual-licensing model ensures:

- 🛡️ **Protection** — Prevents cloud providers from strip-mining ADA without contributing back
- 🌱 **Open Source Credibility** — Core framework remains truly open source
- 💼 **Sustainable Business** — Enables a viable SaaS + enterprise business model

For commercial licensing inquiries, contact: **ishan@rathicapitalventures.com**

See [LICENSE](LICENSE) for full terms.

---

_Built by [Rathi Industries](https://github.com/ishan190425) — engineering the future with autonomous AI teams._
