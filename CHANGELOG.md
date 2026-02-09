# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-alpha.1] - 2026-02-20

> 🚀 **First public alpha release!**
>
> ADA was built with ADA — 240+ autonomous dispatch cycles, 37 PRs merged, zero human commits to the agent code.

### Added

#### CLI (`@ada/cli`)

- `ada init` — Interactive setup for agent teams in any repository
- `ada run` — Execute one dispatch cycle (or `--watch` for continuous mode)
- `ada status` — View rotation state, team info, and memory summary
- `ada config` — View and edit team configuration
- `ada memory list` — List recent memory bank entries
- `ada memory search <query>` — Semantic search across memory bank

#### Core Library (`@ada/core`)

- **Rotation System** — Full role rotation state machine with history tracking
- **Memory Bank** — Shared memory with read/write/compress/archive operations
- **Dispatch Protocol** — Orchestration for heartbeat-driven autonomous cycles
- **Cognitive Memory** — Three-phase implementation:
  - Phase 1: Real-time MemoryStream with decay scoring (Generative Agents)
  - Phase 2: Importance scoring with LLM-based evaluation
  - Phase 3: Semantic search with OpenAI embeddings
- **Reflexion Integration** — Self-improving agent patterns:
  - Phase 1a: Reflection types, utilities, graceful degradation
  - Phase 1b: Dispatch integration for reflection context (PR #114)

#### Templates

- Default agent roster with 10 specialized roles
- Role playbooks for CEO, Research, Product, Scrum, QA, Engineering, Ops, Design, Growth, Frontier
- Pre-configured rules (RULES.md) for autonomous operation
- Memory bank structure with compression protocol

#### Documentation

- 116 docs covering architecture, research, product specs, and processes
- Getting Started guide with quick start commands
- Comprehensive README with architecture diagrams

#### Infrastructure

- GitHub Actions CI with lint, typecheck, and test gates
- npm publish workflow with tag-triggered releases
- GitHub issue and PR templates
- Discord community server (`discord.gg/5NCHGJAz`)

### Changed

- N/A (initial release)

### Fixed

- N/A (initial release)

### Security

- AGPL-3.0 license for open source protection

---

## [0.1.0] - 2026-02-02

> 🏗️ **Internal development release**

### Added

- Initial monorepo structure with npm workspaces
- Basic CLI scaffolding with Commander.js
- Core types for rosters, roles, and rotation
- Agent team bootstrap (the team that built this release)

---

## Development History

This changelog was created at Cycle 240. For the complete development history, see:

- **Agent dispatch cycles:** 240+ autonomous cycles across 10 roles
- **Pull requests merged:** 37
- **Tests:** 859 (256 CLI + 603 core)
- **Docs created:** 116

The ADA agent team has been dogfooding since Cycle 1. Every feature was specified, implemented, tested, and shipped by autonomous agents.

---

_📦 Product (The PM) — Cycle 240_
