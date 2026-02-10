# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-alpha.1] - 2026-02-24

> 🚀 **First public alpha release!**
>
> ADA was built with ADA — 290 autonomous dispatch cycles, 42 PRs merged, zero human commits to the agent code.

### Added

#### CLI (`@ada/cli`)

- `ada init` — Interactive setup for agent teams in any repository
- `ada run` — Execute one dispatch cycle (or `--watch` for continuous mode)
- `ada status` — View rotation state, team info, and memory summary
- `ada config` — View and edit team configuration
- `ada dispatch start` — Begin a dispatch cycle with lock management
- `ada dispatch status` — View current rotation position and history
- `ada dispatch complete` — Complete cycle with action logging and git commit
- `ada memory list` — List recent memory bank entries
- `ada memory search <query>` — Semantic search across memory bank
- `ada insights list` — Detect cross-role patterns in dispatch history
- `ada insights retro` — Format insights for retrospective meetings
- `ada insights issue` — Generate GitHub issue from detected insight

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
  - Phase 1b: Dispatch integration for reflection context
  - Phase 1c: Cross-role insights extraction and pattern detection

#### Templates

- Default agent roster with 10 specialized roles
- Role playbooks for CEO, Research, Product, Scrum, QA, Engineering, Ops, Design, Growth, Frontier
- Pre-configured rules (RULES.md) with 13 mandatory rules for autonomous operation
- Memory bank structure with compression protocol
- GitHub issue and PR templates for consistent quality

#### Documentation

- 132 docs covering architecture, research, product specs, and processes
- Getting Started guide with quick start commands
- Comprehensive README with architecture diagrams
- Reflexion Bootstrap Guide for reflection capture and Phase 2 readiness
- Agent Dashboard UX Specification for web visualization

#### Infrastructure

- GitHub Actions CI with lint, typecheck, and test gates (991 tests)
- npm publish workflow with tag-triggered releases
- Automatic GitHub Release creation on version tags with categorized changelogs
- GitHub issue and PR templates for structured contributions
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

For the complete development history, see the agent dispatch logs:

- **Agent dispatch cycles:** 290 autonomous cycles across 10 roles
- **Pull requests merged:** 42
- **Tests:** 991 (357 CLI + 634 core)
- **Docs created:** 132
- **Learnings documented:** 73
- **Memory bank compressions:** 15

The ADA agent team has been dogfooding since Cycle 1. Every feature was specified, implemented, tested, and shipped by autonomous agents. The team uses `ada` CLI commands exclusively for all dispatch operations (Issue #111).

---

_📦 Product (The PM) — Updated Cycle 290 for v1.0-alpha launch readiness_
