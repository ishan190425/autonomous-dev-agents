# Contributing to ADA

Thanks for your interest in contributing to ADA (Autonomous Dev Agents)! This guide will help you get started.

## Development Setup

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x (ships with Node 18+)
- **Git**
- **GitHub CLI** (`gh`) — for PR workflows

### Clone & Install

```bash
git clone https://github.com/ishan190425/autonomous-dev-agents.git
cd autonomous-dev-agents
npm install
```

### Build & Test

```bash
# Type check all packages
npm run typecheck

# Run tests
npm test

# Build all packages
npm run build

# Run CLI in dev mode
npm run dev -- status
```

## Project Structure

```
autonomous-dev-agents/
├── agents/          ← ADA's own agent team (dogfooding)
├── packages/
│   ├── cli/         ← @ada-ai/cli — the CLI tool
│   └── core/        ← @ada-ai/core — shared library
├── apps/
│   └── web/         ← Dashboard (Next.js)
├── templates/       ← Template files for `ada init`
└── docs/            ← Business, product, research, architecture docs
```

This is an **npm workspaces monorepo**. Build order: `core` → `cli` → `web`.

## How to Contribute

### 1. Pick an Issue

Browse [open issues](https://github.com/ishan190425/autonomous-dev-agents/issues). Issues labeled `good first issue` are great starting points.

### 2. Create a Branch

```bash
git checkout -b feat/my-feature
# or: fix/my-bugfix, docs/my-docs, refactor/my-refactor
```

Branch naming follows [R-005](agents/rules/RULES.md#r-005-branch-strategy).

### 3. Make Your Changes

- Follow the [coding standards](#coding-standards) below
- Write tests for new functionality
- Update relevant documentation

### 4. Run Checks

```bash
npm run typecheck && npm test
```

### 5. Open a PR

```bash
git push -u origin feat/my-feature
gh pr create --title "feat(cli): add my feature" --body "Closes #NNN"
```

PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/) format.

## Coding Standards

All code follows the rules in [agents/rules/RULES.md](agents/rules/RULES.md). Key points:

- **TypeScript strict mode** — no `any` types unless justified
- **Conventional commits** — `<type>(<scope>): <description>`
- **JSDoc** on all exported functions
- **Prefer `interface`** for object shapes, `type` for unions
- **Prefer `readonly`** where mutation is not needed
- **Abstract base classes** over code duplication (R-015)

## Adding New Roles

Roles are defined in `agents/roster.json` and each role has a playbook in `agents/playbooks/`.

1. Add the role definition to `roster.json`:

   ```json
   {
     "id": "security",
     "name": "The Guardian",
     "title": "Security Lead",
     "emoji": "🔒",
     "focus": ["security", "compliance"],
     "actions": ["security_audit", "dependency_review"]
   }
   ```

2. Add the role ID to `rotation_order` in `roster.json`

3. Create a playbook at `agents/playbooks/security.md` describing the role's available actions

4. If adding a new `RoleId`, update the type in `packages/core/src/types.ts` (custom strings are allowed via the `(string & {})` union)

## Adding Playbooks

Playbooks live in `agents/playbooks/` and define what actions a role can take each cycle. See existing playbooks for the expected format.

## Contributing to Core

The `@ada-ai/core` package contains the dispatch protocol, rotation logic, memory system, and type definitions.

- **Types**: `packages/core/src/types.ts`
- **Dispatch**: `packages/core/src/dispatch.ts`
- **Rotation**: `packages/core/src/rotation.ts`
- **Memory**: `packages/core/src/memory.ts`
- **Agent executors**: `packages/core/src/agent.ts`

When modifying core, ensure backward compatibility — the CLI and web packages depend on it.

## Testing

- **Framework**: [Vitest](https://vitest.dev/)
- Tests live alongside source in `__tests__/` directories or in `tests/`
- Run: `npm test` (all packages) or `npm test --workspace=packages/core` (specific package)

## License

By contributing, you agree that your contributions will be licensed under the AGPLv3 license. See [LICENSE](LICENSE) for details.

## Questions?

- Open a [GitHub Discussion](https://github.com/ishan190425/autonomous-dev-agents/discussions)
- Join the [Discord](https://discord.gg/5NCHGJAz)
