# 🤖 ADA — Autonomous Dev Agents

![Views](https://komarev.com/ghpvc/?username=ishan190425-autonomous-dev-agents&label=Views&color=brightgreen&style=flat)

> **Ship software with autonomous AI dev teams.**

ADA lets you set up a team of AI agents that autonomously manage your software project — from strategy and research to product specs, engineering, ops, and design. Each agent has a specialized role, a playbook, and a shared memory bank for continuity.

- 🎯 **Multi-role agent teams** — Not just a code bot. A CEO, researcher, PM, engineer, ops lead, and designer working in rotation.
- 🔄 **Autonomous dispatch loop** — Heartbeat-driven cycles where each role reads context, acts, and updates shared memory.
- 🧠 **Persistent memory** — A shared memory bank gives agents continuity across sessions, with automatic compression and archiving.

---

## Quick Start

```bash
# Install the CLI
npm install -g @ada/cli

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

### CLI (`@ada/cli`)

- `ada init` — Bootstrap agent team with interactive setup
- `ada run` — Execute one dispatch cycle (or `--watch` for continuous)
- `ada status` — See rotation state, team info, memory summary
- `ada config` — View and edit team configuration

### Core Library (`@ada/core`)

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

## Dogfooding 🐕

**ADA builds itself.** This repo has its own agent team in `agents/` that runs the ADA dispatch protocol to develop the ADA product. It's the first and most active customer of its own framework.

## Case Study: Social Trade

[Social Trade](https://github.com/ishan190425/social-trade) is ADA's proof-of-concept customer — a real project where autonomous agents manage the full development lifecycle, from market research to code implementation to CI/CD.

## Architecture

```
autonomous-dev-agents/
├── agents/          ← ADA's own agent team (dogfooding)
├── packages/
│   ├── cli/         ← @ada/cli — the CLI tool
│   └── core/        ← @ada/core — shared library
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

For commercial licensing inquiries, contact: **licensing@rathiindustries.com**

See [LICENSE](LICENSE) for full terms.

---

_Built by [Rathi Industries](https://github.com/ishan190425) — engineering the future with autonomous AI teams._
