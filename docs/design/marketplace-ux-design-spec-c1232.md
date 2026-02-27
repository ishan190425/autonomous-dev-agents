# Community Playbook Marketplace — UX Design Specification

> **Author:** 🎨 The Architect (C1232)
> **Date:** 2026-02-27
> **Related Issue:** #187
> **Complements:** `docs/product/community-playbook-marketplace-spec-c1227.md`
> **Sprint:** Sprint 4+ (post-SaaS launch)
> **Status:** Draft

---

## Overview

This specification defines the visual and interaction design for the **Community Playbook Marketplace** CLI experience. It complements the Product spec (C1227) with terminal UI components, wireframes, error states, and accessibility guidelines.

The marketplace must feel like a **natural extension** of the existing ADA CLI — consistent with `ada init`, `ada status`, and `ada dispatch` in visual language and interaction patterns.

---

## Design Principles

### 1. Terminal-Native

The marketplace is experienced entirely in the terminal. No web fallback required for core workflows. Every interaction should feel as fluid as `npm install` or `gh repo clone`.

### 2. Information Density

Developers want data, not decoration. Show relevant details at a glance: rating, downloads, last update, role count. Hide less-critical info behind `--verbose` or `ada marketplace info`.

### 3. Progressive Disclosure

- **Browse:** Summary cards (1-line per playbook)
- **Info:** Full details (multi-line card)
- **Install:** Step-by-step with confirmation

### 4. Fail Gracefully

Every error state includes: what went wrong, why, and what to do next. No cryptic messages.

---

## Terminal UI Component Library

### Marketplace Card (Compact)

Used in `ada marketplace browse` and `ada marketplace search` results.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  📦 react-typescript-pro                        ★★★★☆ 4.2  ⬇ 1,234     │
│  @jane-dev · 8 roles · Updated 2d ago · web-app, frontend               │
│  Full-stack React + TypeScript template with specialized roles          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Component Structure:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  {EMOJI} {NAME}                        {STARS} {RATING}  ⬇ {DOWNLOADS} │
│  @{AUTHOR} · {ROLE_COUNT} roles · Updated {AGO} · {CATEGORIES}         │
│  {DESCRIPTION_TRUNCATED_80_CHARS}                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

**Chalk Implementation:**

```typescript
const compactCard = (playbook: Playbook) => `
┌${'─'.repeat(76)}┐
│  ${chalk.cyan('📦')} ${chalk.bold.white(playbook.name.padEnd(36))} ${renderStars(playbook.rating)} ${chalk.yellow(playbook.rating.toFixed(1))}  ${chalk.dim('⬇')} ${chalk.green(formatNumber(playbook.downloads).padStart(6))} │
│  ${chalk.dim('@' + playbook.author.padEnd(12))} · ${chalk.blue(playbook.roleCount + ' roles')} · Updated ${chalk.dim(timeAgo(playbook.updatedAt))} · ${chalk.dim(playbook.categories.slice(0, 2).join(', '))} │
│  ${chalk.white(truncate(playbook.description, 72).padEnd(72))} │
└${'─'.repeat(76)}┘
`;
```

### Marketplace Card (Detailed)

Used in `ada marketplace info <playbook-id>`.

```
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║   📦  react-typescript-pro                                      v1.2.0  ║
║   ══════════════════════════════════════════════════════════════════════ ║
║                                                                          ║
║   Full-stack React + TypeScript template with 8 specialized roles       ║
║   including Frontend, API, Testing, and DevOps.                         ║
║                                                                          ║
║   ┌─────────────────────────────────────────────────────────────────┐   ║
║   │  Author      @jane-dev                                          │   ║
║   │  Rating      ★★★★☆ 4.2 (47 reviews)                             │   ║
║   │  Downloads   1,234                                              │   ║
║   │  License     MIT                                                │   ║
║   │  Updated     2 days ago (Feb 25, 2026)                         │   ║
║   │  ADA Version >=1.0.0                                           │   ║
║   └─────────────────────────────────────────────────────────────────┘   ║
║                                                                          ║
║   Roles                                                                  ║
║   ─────                                                                  ║
║   • frontend    React component development                             ║
║   • api         Express/Fastify backend routes                          ║
║   • testing     Vitest + Playwright setup                               ║
║   • devops      CI/CD and deployment                                    ║
║   • docs        Documentation and README                                ║
║   • design      UI/UX specifications                                    ║
║   • pm          Product management                                      ║
║   • qa          Quality assurance                                       ║
║                                                                          ║
║   Tags                                                                   ║
║   ────                                                                   ║
║   react · typescript · nextjs · tailwind · vitest · playwright          ║
║                                                                          ║
║   ┌─────────────────────────────────────────────────────────────────┐   ║
║   │  ada marketplace install react-typescript-pro                   │   ║
║   └─────────────────────────────────────────────────────────────────┘   ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### Rating Stars Component

```typescript
const renderStars = (rating: number): string => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;

  return (
    chalk.yellow('★'.repeat(fullStars)) +
    chalk.yellow(halfStar ? '½' : '') +
    chalk.dim('☆'.repeat(emptyStars))
  );
};

// Output examples:
// 5.0 → ★★★★★
// 4.2 → ★★★★☆
// 3.5 → ★★★½☆
// 2.0 → ★★☆☆☆
```

### Search Results Header

```
╭──────────────────────────────────────────────────────────────────────────╮
│  🔍 Search: "react typescript"                                          │
│  Found 23 playbooks · Sorted by: relevance                              │
╰──────────────────────────────────────────────────────────────────────────╯
```

### Category Browser

```
╭──────────────────────────────────────────────────────────────────────────╮
│  📂 Categories                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   🌐 Web App (45)        🔧 API/Backend (32)      💻 CLI Tool (18)       │
│   📚 Library (24)        📱 Mobile (12)           ☁️  DevOps (28)         │
│   📖 Documentation (15)  🔬 Data Science (8)                            │
│                                                                          │
│   Use: ada marketplace browse --category=web-app                        │
│                                                                          │
╰──────────────────────────────────────────────────────────────────────────╯
```

### Installation Progress

```
╭──────────────────────────────────────────────────────────────────────────╮
│  📦 Installing: react-typescript-pro v1.2.0                             │
╰──────────────────────────────────────────────────────────────────────────╯

  ✓ Validated compatibility (ADA >=1.0.0)
  ✓ Downloaded package (2.3 KB)
  ● Installing roles...
    ├── ✓ frontend.md
    ├── ✓ api.md
    ├── ✓ testing.md
    ├── ● devops.md (writing...)
    ├── ◌ docs.md
    ├── ◌ design.md
    ├── ◌ pm.md
    └── ◌ qa.md

  Progress: ████████████░░░░░░░░ 60%
```

### Conflict Resolution Prompt

```
╭──────────────────────────────────────────────────────────────────────────╮
│  ⚠️  Conflict Detected                                                   │
╰──────────────────────────────────────────────────────────────────────────╯

  Role 'frontend' already exists in your project.

  ┌────────────────────────────────────────────────────────────────────────┐
  │  Your current playbook:                                                │
  │  • Last modified: 3 days ago                                          │
  │  • 45 lines, 3 custom rules                                           │
  │                                                                        │
  │  Marketplace playbook:                                                 │
  │  • Version: 1.2.0                                                     │
  │  • 78 lines, 5 rules, React 18 patterns                               │
  └────────────────────────────────────────────────────────────────────────┘

  What would you like to do?

  › ⬇ Replace    Overwrite with marketplace version (backup created)
    🔀 Merge     Open diff editor to combine both
    ⏭ Skip      Keep your current playbook
    📝 Rename   Install as 'frontend-marketplace'
```

### Success Message

```
╭──────────────────────────────────────────────────────────────────────────╮
│  ✅ Successfully installed react-typescript-pro                         │
╰──────────────────────────────────────────────────────────────────────────╯

  Installed 8 roles to agents/playbooks/

  Next steps:
  ┌────────────────────────────────────────────────────────────────────────┐
  │  1. Review installed playbooks:   cat agents/playbooks/frontend.md    │
  │  2. Update roster if needed:      ada roster edit                     │
  │  3. Start your first cycle:       ada dispatch start                  │
  └────────────────────────────────────────────────────────────────────────┘

  💡 Tip: Run 'ada marketplace review react-typescript-pro' after trying it!
```

---

## Color Palette

### Semantic Colors (Consistent with C1222 Design System)

| Purpose        | Color      | Chalk Code         | Usage                          |
| -------------- | ---------- | ------------------ | ------------------------------ |
| Primary action | Cyan       | `chalk.cyan`       | Playbook names, install button |
| Success        | Green      | `chalk.green`      | Checkmarks, download counts    |
| Warning        | Yellow     | `chalk.yellow`     | Stars, conflicts, cautions     |
| Error          | Red        | `chalk.red`        | Failures, critical warnings    |
| Info           | Blue       | `chalk.blue`       | Role counts, metadata          |
| Muted          | Gray       | `chalk.dim`        | Timestamps, secondary text     |
| Emphasis       | White Bold | `chalk.bold.white` | Titles, headers                |
| Interactive    | Magenta    | `chalk.magenta`    | Selected items, prompts        |

### Accessibility (Color-Blind Safe)

Following C1222 patterns:

- **Shape + Color:** Stars (★☆) + yellow, checkmarks (✓) + green
- **Text labels:** "Installed" not just green dot
- **High contrast:** All text readable on dark/light terminals
- **NO_COLOR support:** Graceful degradation without colors

```typescript
const useColor = !process.env.NO_COLOR && process.stdout.isTTY;

const success = useColor ? chalk.green('✓') : '[OK]';
```

---

## Wireframes

### W1: Browse Default View

Command: `ada marketplace browse`

```
╭──────────────────────────────────────────────────────────────────────────╮
│  📦 ADA Playbook Marketplace                                            │
│  Discover and install community playbook templates                      │
╰──────────────────────────────────────────────────────────────────────────╯

  📂 Categories
  ─────────────
  🌐 Web App (45)        🔧 API/Backend (32)      💻 CLI Tool (18)
  📚 Library (24)        📱 Mobile (12)           ☁️  DevOps (28)
  📖 Documentation (15)  🔬 Data Science (8)

  🔥 Trending This Week
  ─────────────────────

┌──────────────────────────────────────────────────────────────────────────┐
│  📦 react-typescript-pro                        ★★★★★ 4.8  ⬇ 1,234     │
│  @jane-dev · 8 roles · Updated 2d ago · web-app, frontend               │
│  Full-stack React + TypeScript template with specialized roles          │
└──────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────┐
│  📦 api-express-starter                         ★★★★☆ 4.2  ⬇ 892       │
│  @api-guru · 5 roles · Updated 1w ago · api-backend                     │
│  Express.js API with auth, testing, and deployment roles                │
└──────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────┐
│  📦 rust-cli-minimal                            ★★★★☆ 4.5  ⬇ 567       │
│  @rust-ada · 4 roles · Updated 3d ago · cli-tool                        │
│  Minimal Rust CLI template with builder and tester roles                │
└──────────────────────────────────────────────────────────────────────────┘

  Showing 3 of 182 playbooks · ada marketplace browse --all
```

### W2: Search Results

Command: `ada marketplace search "react hooks"`

```
╭──────────────────────────────────────────────────────────────────────────╮
│  🔍 Search: "react hooks"                                               │
│  Found 12 playbooks · Sorted by: relevance                              │
╰──────────────────────────────────────────────────────────────────────────╯

┌──────────────────────────────────────────────────────────────────────────┐
│  📦 react-hooks-patterns                        ★★★★★ 4.9  ⬇ 2,341     │
│  @hooks-master · 6 roles · Updated 1d ago · web-app, frontend           │
│  Modern React Hooks patterns with custom hook development role          │
└──────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────┐
│  📦 react-query-stack                           ★★★★☆ 4.4  ⬇ 1,123     │
│  @data-fetcher · 5 roles · Updated 4d ago · web-app, api-backend        │
│  React Query + TanStack Router with hooks-first architecture            │
└──────────────────────────────────────────────────────────────────────────┘

  Page 1 of 2 · --page=2 for next
```

### W3: Category Filtered Browse

Command: `ada marketplace browse --category=devops`

```
╭──────────────────────────────────────────────────────────────────────────╮
│  ☁️  DevOps Playbooks                                                    │
│  28 playbooks for CI/CD, infrastructure, and deployment                 │
╰──────────────────────────────────────────────────────────────────────────╯

  Sort: › Popular   Recent   Rating   Downloads

┌──────────────────────────────────────────────────────────────────────────┐
│  📦 k8s-gitops-standard                         ★★★★★ 4.7  ⬇ 3,456     │
│  @infra-team · 7 roles · Updated 1w ago · devops                        │
│  Kubernetes + ArgoCD GitOps workflow with SRE and platform roles        │
└──────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────┐
│  📦 terraform-aws-modules                       ★★★★☆ 4.3  ⬇ 2,100     │
│  @cloud-native · 5 roles · Updated 3d ago · devops                      │
│  AWS infrastructure as code with security and cost optimization         │
└──────────────────────────────────────────────────────────────────────────┘
```

### W4: Playbook Details

Command: `ada marketplace info react-typescript-pro`

```
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║   📦  react-typescript-pro                                      v1.2.0  ║
║   ══════════════════════════════════════════════════════════════════════ ║
║                                                                          ║
║   Full-stack React + TypeScript template with 8 specialized roles       ║
║   including Frontend, API, Testing, and DevOps. Built for teams that    ║
║   want production-ready patterns from day one.                          ║
║                                                                          ║
║   ┌─────────────────────────────────────────────────────────────────┐   ║
║   │  Author      @jane-dev (verified)                               │   ║
║   │  Rating      ★★★★★ 4.8 (127 reviews)                            │   ║
║   │  Downloads   1,234 total · 89 this week                         │   ║
║   │  License     MIT                                                │   ║
║   │  Updated     2 days ago (Feb 25, 2026)                         │   ║
║   │  ADA Version >=1.0.0                                           │   ║
║   │  Size        4.2 KB (8 files)                                  │   ║
║   └─────────────────────────────────────────────────────────────────┘   ║
║                                                                          ║
║   Roles (8)                                                              ║
║   ─────────                                                              ║
║   • frontend    React component development & hooks patterns            ║
║   • api         Express/Fastify backend routes & middleware             ║
║   • testing     Vitest unit + Playwright E2E setup                      ║
║   • devops      GitHub Actions CI/CD & Vercel deployment                ║
║   • docs        Documentation, README, and API docs                     ║
║   • design      UI/UX specifications & component library                ║
║   • pm          Product management & sprint planning                    ║
║   • qa          Quality assurance & test coverage                       ║
║                                                                          ║
║   Rules Included (3)                                                     ║
║   ──────────────────                                                     ║
║   • react-conventions.md — React 18 coding standards                    ║
║   • testing-requirements.md — Coverage thresholds & test patterns       ║
║   • commit-standards.md — Conventional commits for React projects       ║
║                                                                          ║
║   Tags                                                                   ║
║   ────                                                                   ║
║   react · typescript · nextjs · tailwind · vitest · playwright · vercel ║
║                                                                          ║
║   Recent Reviews                                                         ║
║   ──────────────                                                         ║
║   ★★★★★ "Saved us weeks of setup time. The testing role is excellent."  ║
║         — @dev-sarah, 3 days ago                                        ║
║                                                                          ║
║   ★★★★☆ "Great foundation, needed minor tweaks for our monorepo."       ║
║         — @mono-mike, 1 week ago                                        ║
║                                                                          ║
║   ┌─────────────────────────────────────────────────────────────────┐   ║
║   │  ada marketplace install react-typescript-pro                   │   ║
║   └─────────────────────────────────────────────────────────────────┘   ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### W5: Installation Dry Run

Command: `ada marketplace install react-typescript-pro --dry-run`

```
╭──────────────────────────────────────────────────────────────────────────╮
│  📦 Dry Run: react-typescript-pro v1.2.0                                │
│  Preview installation without making changes                            │
╰──────────────────────────────────────────────────────────────────────────╯

  Compatibility Check
  ───────────────────
  ✓ ADA version 1.0.0 >= 1.0.0 required
  ✓ Node.js 20.0.0 >= 18.0.0 required
  ✓ agents/ directory exists

  Files to Create (8)
  ───────────────────
  agents/playbooks/
  ├── frontend.md      (2.1 KB) [NEW]
  ├── api.md           (1.8 KB) [NEW]
  ├── testing.md       (1.4 KB) [NEW]
  ├── devops.md        (1.2 KB) [NEW]
  ├── docs.md          (0.9 KB) [NEW]
  ├── design.md        (1.1 KB) [NEW]
  ├── pm.md            (1.0 KB) [NEW]
  └── qa.md            (0.8 KB) [NEW]

  agents/rules/
  ├── react-conventions.md    (1.2 KB) [NEW]
  ├── testing-requirements.md (0.8 KB) [NEW]
  └── commit-standards.md     (0.6 KB) [NEW]

  Roster Changes
  ──────────────
  + Adding 8 new roles to agents/roster.json
  + Updating rotation_order to include new roles

  Total: 11 files, 12.9 KB

  ┌────────────────────────────────────────────────────────────────────────┐
  │  Run without --dry-run to install                                     │
  │  ada marketplace install react-typescript-pro                         │
  └────────────────────────────────────────────────────────────────────────┘
```

### W6: Installation Confirmation

Command: `ada marketplace install react-typescript-pro`

```
╭──────────────────────────────────────────────────────────────────────────╮
│  📦 Install: react-typescript-pro v1.2.0                                │
╰──────────────────────────────────────────────────────────────────────────╯

  This will install 8 playbooks and 3 rules to your project.

  Files to create:
  ─────────────────
  agents/playbooks/   8 files (10.3 KB)
  agents/rules/       3 files (2.6 KB)

  Roster changes:
  ─────────────────
  + 8 new roles added to rotation

  ┌────────────────────────────────────────────────────────────────────────┐
  │  ? Proceed with installation? (Y/n)                                   │
  └────────────────────────────────────────────────────────────────────────┘
```

### W7: Publishing Flow

Command: `ada marketplace pack`

```
╭──────────────────────────────────────────────────────────────────────────╮
│  📤 Pack Playbooks for Publishing                                       │
╰──────────────────────────────────────────────────────────────────────────╯

  Detected 10 playbooks in agents/playbooks/

  Select roles to include:
  ────────────────────────

  ✓ ceo           CEO / Founder role
  ✓ engineering   Lead Engineer with TypeScript focus
  ✓ qa            QA & Test Lead
  › ✓ product     Product Lead
    ✓ scrum       Scrum Master
    ◯ ops         DevOps (internal-only, skip)
    ✓ design      API & System Designer
    ◯ research    Research (project-specific, skip)
    ✓ frontier    Platform & Innovation
    ◯ growth      Growth & Fundraising (skip)

  ↑/↓ to move · space to toggle · enter to confirm

  Selected: 7 roles
```

Command: `ada marketplace publish ./my-playbook.tar.gz`

```
╭──────────────────────────────────────────────────────────────────────────╮
│  📤 Publish to Marketplace                                              │
╰──────────────────────────────────────────────────────────────────────────╯

  Package: my-playbook.tar.gz (4.2 KB)

  Validation
  ──────────
  ✓ Manifest (ada-playbook.json) valid
  ✓ README.md present
  ✓ No secrets detected
  ✓ All playbooks valid markdown
  ✓ File size within limits

  ┌────────────────────────────────────────────────────────────────────────┐
  │  Name         my-awesome-template                                     │
  │  Version      1.0.0                                                   │
  │  Roles        7                                                       │
  │  Rules        2                                                       │
  │  Categories   web-app, api-backend                                    │
  │  License      MIT                                                     │
  └────────────────────────────────────────────────────────────────────────┘

  ? Confirm publish to ADA Marketplace? (Y/n)

  ✓ Authenticating with GitHub... (@your-username)
  ✓ Uploading package...
  ✓ Published successfully!

  ╭──────────────────────────────────────────────────────────────────────╮
  │  🎉 Published: my-awesome-template v1.0.0                            │
  │                                                                      │
  │  View: ada marketplace info my-awesome-template                      │
  │  Share: https://ada.dev/marketplace/my-awesome-template              │
  ╰──────────────────────────────────────────────────────────────────────╯
```

### W8: Review Submission

Command: `ada marketplace review react-typescript-pro --rating=5`

```
╭──────────────────────────────────────────────────────────────────────────╮
│  ⭐ Review: react-typescript-pro                                        │
╰──────────────────────────────────────────────────────────────────────────╯

  Your rating: ★★★★★ (5/5)

  ? Write a review (optional, max 500 chars):
  ┌────────────────────────────────────────────────────────────────────────┐
  │ Saved us weeks of setup time. The testing role patterns are exactly   │
  │ what we needed for our React 18 project. Highly recommend!            │
  │                                                                       │
  └────────────────────────────────────────────────────────────────────────┘
  127/500 characters

  ? Submit review? (Y/n)

  ✓ Review submitted!

  ╭──────────────────────────────────────────────────────────────────────╮
  │  Thank you for your feedback! Your review helps other developers.   │
  ╰──────────────────────────────────────────────────────────────────────╯
```

---

## Error States

### E1: Network Error

```
╭──────────────────────────────────────────────────────────────────────────╮
│  ❌ Connection Failed                                                   │
╰──────────────────────────────────────────────────────────────────────────╯

  Could not connect to the ADA Marketplace.

  ┌────────────────────────────────────────────────────────────────────────┐
  │  Error: ECONNREFUSED marketplace.ada.dev:443                         │
  └────────────────────────────────────────────────────────────────────────┘

  Possible causes:
  • No internet connection
  • Marketplace service temporarily unavailable
  • Firewall blocking outbound connections

  Try again: ada marketplace browse
  Check status: https://status.ada.dev
```

### E2: Playbook Not Found

```
╭──────────────────────────────────────────────────────────────────────────╮
│  ❌ Playbook Not Found                                                  │
╰──────────────────────────────────────────────────────────────────────────╯

  No playbook found with name: "react-typescript-wrong"

  Did you mean?
  • react-typescript-pro
  • react-typescript-minimal
  • react-typescript-hooks

  Search: ada marketplace search "react typescript"
```

### E3: Version Incompatibility

```
╭──────────────────────────────────────────────────────────────────────────╮
│  ⚠️  Compatibility Warning                                              │
╰──────────────────────────────────────────────────────────────────────────╯

  This playbook requires ADA >=2.0.0
  Your version: 1.0.0

  Options:
  1. Update ADA:     npm install -g @ada-ai/cli@latest
  2. Force install:  ada marketplace install <id> --force
     (⚠️  May cause issues with incompatible features)

  View changelog: ada changelog 2.0.0
```

### E4: Authentication Required

```
╭──────────────────────────────────────────────────────────────────────────╮
│  🔐 Authentication Required                                             │
╰──────────────────────────────────────────────────────────────────────────╯

  Publishing to the marketplace requires GitHub authentication.

  ┌────────────────────────────────────────────────────────────────────────┐
  │  ada auth login                                                       │
  └────────────────────────────────────────────────────────────────────────┘

  This will open GitHub in your browser to authorize ADA.
```

### E5: Validation Failed

```
╭──────────────────────────────────────────────────────────────────────────╮
│  ❌ Validation Failed                                                   │
╰──────────────────────────────────────────────────────────────────────────╯

  Your playbook package failed validation:

  ┌────────────────────────────────────────────────────────────────────────┐
  │  ✗ Line 23: Possible API key detected in frontend.md                 │
  │    → Remove: "STRIPE_KEY=sk_live_..."                                │
  │                                                                       │
  │  ✗ Missing required field: ada-playbook.json → license               │
  │    → Add: "license": "MIT" (or your chosen license)                  │
  │                                                                       │
  │  ✗ File too large: devops.md (2.3 MB, max 500 KB)                    │
  │    → Split into multiple files or remove binary content              │
  └────────────────────────────────────────────────────────────────────────┘

  Fix these issues and run: ada marketplace pack --validate
```

---

## Keyboard Navigation

### Browse/Search Results

| Key       | Action                    |
| --------- | ------------------------- |
| `↑` / `k` | Previous playbook         |
| `↓` / `j` | Next playbook             |
| `Enter`   | View playbook details     |
| `i`       | Install selected playbook |
| `/`       | Focus search              |
| `c`       | Filter by category        |
| `s`       | Change sort order         |
| `q`       | Quit / back               |

### Multi-Select (Pack)

| Key     | Action           |
| ------- | ---------------- |
| `Space` | Toggle selection |
| `a`     | Select all       |
| `n`     | Select none      |
| `Enter` | Confirm          |

### Conflict Resolution

| Key       | Action               |
| --------- | -------------------- |
| `↑` / `↓` | Navigate options     |
| `Enter`   | Select highlighted   |
| `d`       | Show diff (if merge) |
| `?`       | Help                 |

---

## Accessibility

### Screen Reader Support

All interactive elements include aria-labels (via terminal escape codes where supported):

```typescript
// Announce current selection
console.log(`\x1b]0;ADA Marketplace - ${playbook.name}\x07`); // Window title

// Progress announcements
ora('Installing playbooks...').start();
```

### Reduced Motion

Respect `REDUCE_MOTION` environment variable:

```typescript
const spinner = process.env.REDUCE_MOTION
  ? { frames: ['...'], interval: 1000 }
  : {
      frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
      interval: 80,
    };
```

### High Contrast Mode

Detect and adapt:

```typescript
const highContrast = process.env.HIGH_CONTRAST === '1';

const highlight = highContrast
  ? chalk.bgWhite.black // Maximum contrast
  : chalk.bgBlue.white; // Standard
```

---

## Integration with Existing CLI

### Command Hierarchy

```
ada
├── init              (existing)
├── status            (existing)
├── dispatch          (existing)
├── memory            (existing)
├── roster            (existing)
└── marketplace       (NEW)
    ├── browse        Browse playbooks
    ├── search        Search playbooks
    ├── info          View playbook details
    ├── install       Install playbook
    ├── pack          Package playbooks
    ├── publish       Publish to marketplace
    ├── update        Update published playbook
    └── review        Review installed playbook
```

### Init Integration

During `ada init`, offer marketplace discovery:

```
  ╭────────────────────────────────────────────────────────────────────────╮
  │  💡 Start with a community template?                                  │
  │                                                                       │
  │  Instead of configuring from scratch, you can install a pre-built    │
  │  playbook template from the ADA Marketplace.                         │
  │                                                                       │
  │  › Yes, browse templates                                             │
  │    No, configure manually                                            │
  ╰────────────────────────────────────────────────────────────────────────╯
```

---

## Implementation Notes

### Component Reuse

Leverage existing C1222 design system components:

- Box borders (single/double line)
- Progress indicators (ora spinners)
- Selection lists (single/multi)
- Status messages (success/error/warning)
- Color palette (chalk implementations)

### Package Structure

```typescript
// packages/cli/src/commands/marketplace/
├── browse.ts       // Browse/category commands
├── search.ts       // Search command
├── info.ts         // Playbook details
├── install.ts      // Installation flow
├── pack.ts         // Package creation
├── publish.ts      // Publishing flow
├── review.ts       // Review submission
└── components/
    ├── PlaybookCard.ts      // Compact/detailed cards
    ├── CategoryGrid.ts      // Category browser
    ├── InstallProgress.ts   // Installation progress
    ├── ConflictPrompt.ts    // Conflict resolution
    └── ReviewForm.ts        // Review input
```

---

## Success Metrics

| Metric                   | Target | Measurement                           |
| ------------------------ | ------ | ------------------------------------- |
| Time to first install    | <60s   | From `ada marketplace browse` to done |
| Command discoverability  | >80%   | Users find commands without docs      |
| Error recovery rate      | >90%   | Users resolve errors on first attempt |
| Accessibility compliance | 100%   | NO_COLOR + screen reader tested       |
| Mobile SSH usability     | Good   | 80-char width renders correctly       |

---

## Related Documents

- `docs/product/community-playbook-marketplace-spec-c1227.md` — Product specification
- `docs/design/onboarding-wizard-ux-design-spec-c1222.md` — Onboarding UX (pattern reference)
- `docs/design/cli-design-system-c1202.md` — CLI design system components
- Issue #187 — Original feature request

---

_🎨 UX Design Specification by The Architect | C1232 | 2026-02-27_
