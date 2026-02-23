# Custom Role Builder UI — Feature Specification

> **Issue:** #176 | **Priority:** P2 | **Sprint:** 5+ | **Tier:** Enterprise
> **Author:** 📦 Product (C1157) | **Date:** 2026-02-23

---

## Overview

The Custom Role Builder UI enables Enterprise tier users to create, edit, and manage custom agent roles through a visual interface. This differentiates the Enterprise tier ($99/mo) from Pro ($19/mo) by providing self-service role customization without editing JSON/YAML files.

---

## Problem Statement

### Current State

- Roles are defined in `roster.json` — requires JSON editing
- Playbooks are markdown files — requires file system access
- Adding a role means:
  1. Edit `roster.json` to add role definition
  2. Create `agents/playbooks/<role>.md` file
  3. Add role to `rotation_order` array
  4. Optionally create role-specific memory bank
- This workflow requires developer knowledge and CLI access

### User Pain Points

1. **Non-technical users** can't customize roles without developer help
2. **Experimentation is slow** — edit files, commit, test, iterate
3. **No validation** — easy to make JSON syntax errors
4. **No preview** — can't see how role will behave before activating
5. **No versioning** — role changes overwrite previous versions

### Target Users

- **Enterprise Customers** — Large teams needing domain-specific roles
- **Agencies** — Managing multiple projects with different role configurations
- **Advanced Solo Developers** — Power users wanting to experiment

---

## Proposed Solution

A web-based Custom Role Builder within the ADA Dashboard that provides:

1. **Visual role creation** with form-based input
2. **Playbook editor** with markdown preview and templates
3. **Live preview** showing how the role will behave
4. **One-click deployment** to the repository
5. **Role versioning** with rollback capability

---

## User Stories

### US-1: Create New Role

> As an Enterprise user, I want to create a new agent role through the dashboard so that I can add domain-specific agents without editing config files.

**Acceptance Criteria:**

- [ ] Form with fields: Role ID, Name, Title, Emoji, Focus areas, Actions
- [ ] Focus areas as multi-select chips with custom input
- [ ] Actions as editable list with descriptions
- [ ] Real-time validation (ID format, required fields)
- [ ] Save as draft before deployment

### US-2: Build Playbook

> As an Enterprise user, I want to build a role's playbook visually so that I can define behavior without writing markdown from scratch.

**Acceptance Criteria:**

- [ ] Markdown editor with live preview (split pane)
- [ ] Playbook templates dropdown (Engineering, QA, Research, etc.)
- [ ] Section scaffolding (Mission, Actions, Voice, Commit Style)
- [ ] Variable insertion (role name, emoji, focus areas)
- [ ] Syntax highlighting for code blocks

### US-3: Preview Role Behavior

> As an Enterprise user, I want to preview how my custom role will behave before deploying so that I can catch issues early.

**Acceptance Criteria:**

- [ ] Simulated dispatch showing role's perspective
- [ ] Sample memory bank view with role state section
- [ ] Example commit messages based on commit style
- [ ] Rotation position visualization
- [ ] Estimated cycle time based on focus complexity

### US-4: Deploy Role to Repository

> As an Enterprise user, I want to deploy my custom role to my repository with one click so that the agent team can start using it.

**Acceptance Criteria:**

- [ ] Pre-deployment checklist (no ID conflicts, valid JSON, playbook complete)
- [ ] GitHub branch creation option (deploy via PR) or direct commit
- [ ] Automatic roster.json update
- [ ] Playbook file creation
- [ ] Optional memory bank initialization
- [ ] Rotation order position selection

### US-5: Edit Existing Role

> As an Enterprise user, I want to edit existing roles through the UI so that I can refine behaviors without manual file editing.

**Acceptance Criteria:**

- [ ] Load existing role from roster.json
- [ ] Load existing playbook from file
- [ ] Show diff before saving changes
- [ ] Version history with rollback option
- [ ] Warning if editing built-in roles (ceo, engineering, etc.)

### US-6: Import/Export Roles

> As an Enterprise user, I want to export my custom roles so that I can share them across projects or with my team.

**Acceptance Criteria:**

- [ ] Export role as JSON + playbook bundle
- [ ] Export all custom roles as zip
- [ ] Import role from JSON/zip
- [ ] Conflict detection on import (existing role ID)
- [ ] Community marketplace preview (future integration)

---

## UI Design

### Navigation

```
Dashboard
├── Overview
├── Cycles
├── Memory
├── Roles        ← NEW
│   ├── Current Team
│   ├── Role Builder  ← Custom role creation
│   └── Role Library  ← Templates & imports
└── Settings
```

### Role Builder Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🎨 Role Builder                                    [Draft] [Deploy ▼] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │  📝 Role Definition         │  │  📖 Playbook Editor            │  │
│  │                             │  │                                 │  │
│  │  ID: ____________           │  │  ┌─ Template: [Engineering ▼]  │  │
│  │  Name: ____________         │  │  │                             │  │
│  │  Title: ____________        │  │  │  # 🔐 Security Playbook     │  │
│  │  Emoji: [🔐]                │  │  │                             │  │
│  │                             │  │  │  You are **The Guardian**,  │  │
│  │  Focus Areas:               │  │  │  Security Lead for ADA.     │  │
│  │  [security] [compliance]    │  │  │                             │  │
│  │  [auditing] [+]             │  │  │  ## Mission                 │  │
│  │                             │  │  │  Protect the codebase...    │  │
│  │  Actions:                   │  │  │                             │  │
│  │  • security_audit           │  │  │  ## Actions                 │  │
│  │  • vulnerability_scan       │  │  │  1. Run security audits     │  │
│  │  • compliance_check         │  │  │  2. Review dependencies     │  │
│  │  [+ Add Action]             │  │  │  ...                        │  │
│  │                             │  │  │                             │  │
│  └─────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  👁️ Preview                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │  Rotation: ceo → growth → ... → 🔐 security* → design       │  │  │
│  │  │  Sample commit: `chore(security): run npm audit check`      │  │  │
│  │  │  Memory section: `### 🔐 Security\n- Last: audit...`        │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Role Library Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📚 Role Library                                    [Import] [Create]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ Built-in Roles ─────────────────────────────────────────────────┐  │
│  │  👔 CEO   🚀 Growth   🔬 Research   ⚙️ Engineering   🛡️ Ops      │  │
│  │  📦 Product   📋 Scrum   🔍 QA   🎨 Design   🌌 Frontier         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ Your Custom Roles ──────────────────────────────────────────────┐  │
│  │  🔐 Security (v2)        [Edit] [Disable] [Export]               │  │
│  │  📊 Analytics (v1)       [Edit] [Disable] [Export]               │  │
│  │  🎯 Marketing (draft)    [Edit] [Delete]                         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ Community Templates (Coming Soon) ──────────────────────────────┐  │
│  │  🔒 DevSecOps   📈 Growth Hacker   🤖 ML Engineer   📱 Mobile    │  │
│  │  [Browse Marketplace →]                                          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Specification

### Data Model

```typescript
// Custom role definition (extends base Role type)
interface CustomRole {
  id: string; // Unique identifier, kebab-case
  name: string; // Display name ("The Guardian")
  title: string; // Job title ("Security Lead")
  emoji: string; // Single emoji
  focus: string[]; // Focus areas
  actions: RoleAction[]; // Available actions
  playbook: string; // Markdown content
  enabled: boolean; // Active in rotation
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  version: number; // Increments on edit
  isCustom: true; // Distinguishes from built-in
}

interface RoleAction {
  id: string; // e.g., "security_audit"
  name: string; // e.g., "Security Audit"
  description: string; // What the action does
}

// Storage in roster.json
interface RosterFile {
  roles: Role[]; // Built-in + custom roles
  rotation_order: string[]; // Role IDs in dispatch order
  custom_roles_version: number; // Track custom role schema version
}
```

### API Endpoints

```typescript
// REST API (part of #190 API Gateway)
POST   /api/roles              // Create custom role
GET    /api/roles              // List all roles
GET    /api/roles/:id          // Get role details
PUT    /api/roles/:id          // Update custom role
DELETE /api/roles/:id          // Delete custom role
POST   /api/roles/:id/deploy   // Deploy to repository
GET    /api/roles/:id/versions // Get version history
POST   /api/roles/:id/rollback // Rollback to version

// Playbook operations
GET    /api/roles/:id/playbook     // Get playbook content
PUT    /api/roles/:id/playbook     // Update playbook
GET    /api/roles/templates        // List playbook templates
```

### Deployment Flow

```
User clicks "Deploy"
        │
        ▼
┌──────────────────┐
│ Validation Check │
│ - ID unique?     │
│ - Fields valid?  │
│ - Playbook ok?   │
└────────┬─────────┘
         │ Pass
         ▼
┌──────────────────┐
│ Deployment Mode  │
│ [PR] or [Direct] │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌──────────┐
│ PR    │  │ Direct   │
│ Mode  │  │ Mode     │
└───┬───┘  └────┬─────┘
    │           │
    ▼           ▼
Create       Update
Branch       main
    │           │
    ▼           ▼
Update       Update
roster.json  roster.json
    │           │
    ▼           ▼
Create       Create
playbook.md  playbook.md
    │           │
    ▼           ▼
Open PR      Commit
             & Push
```

### File Changes on Deploy

```bash
# Files created/modified per custom role deployment
agents/
├── roster.json                        # Role added to roles[] and rotation_order[]
└── playbooks/
    └── <role-id>.md                   # New playbook file

# Optional (if memory bank initialization selected)
agents/memory/banks/
    └── <role-id>.md                   # Initial memory bank
```

---

## Validation Rules

### Role ID

- 2-20 characters
- Lowercase alphanumeric + hyphens
- Must start with letter
- Cannot conflict with built-in role IDs
- Cannot start with `ada-` (reserved)

### Role Name

- 3-50 characters
- Cannot duplicate existing role names

### Emoji

- Exactly one emoji character
- Cannot duplicate existing role emojis

### Focus Areas

- 1-10 focus areas required
- Each 2-50 characters
- Lowercase, underscores allowed

### Playbook

- Minimum 100 characters
- Must include `## Mission` section
- Must include `## Actions` section

---

## Implementation Plan

### Phase 1: Foundation (Sprint 5, Days 1-3)

- [ ] Custom role TypeScript types in `@ada-ai/core`
- [ ] REST API endpoints for CRUD operations
- [ ] Role validation utilities
- [ ] Database schema for role versions

### Phase 2: UI — Role Builder (Sprint 5, Days 4-7)

- [ ] Role Builder page scaffold
- [ ] Role definition form component
- [ ] Playbook markdown editor with preview
- [ ] Form validation with error display
- [ ] Save as draft functionality

### Phase 3: UI — Deployment (Sprint 5, Days 8-10)

- [ ] Preview panel component
- [ ] Deployment modal with options
- [ ] GitHub integration for PR creation
- [ ] Direct commit flow
- [ ] Success/error handling

### Phase 4: UI — Management (Sprint 6, Days 1-3)

- [ ] Role Library page
- [ ] Edit existing role flow
- [ ] Version history display
- [ ] Rollback functionality
- [ ] Import/export UI

### Phase 5: Polish (Sprint 6, Days 4-5)

- [ ] Playbook templates library
- [ ] Rotation position drag-and-drop
- [ ] Mobile responsive design
- [ ] E2E tests for all flows
- [ ] Documentation

---

## Success Metrics

| Metric                         | Target             | Measurement                       |
| ------------------------------ | ------------------ | --------------------------------- |
| Custom roles created           | 10+ in first month | Database count                    |
| Role deployment success rate   | >95%               | Deployments / attempts            |
| Time to create role            | <10 min            | User session tracking             |
| Enterprise conversion from Pro | 5%+                | Stripe tier changes               |
| Feature usage retention        | >50% return users  | Weekly active custom role editors |

---

## Dependencies

- **#181** — GitHub OAuth (required for deployment)
- **#182** — Stripe Billing (required for tier gating)
- **#190** — API Gateway (required for REST endpoints)
- **#120** — Agent Dashboard (base infrastructure)

---

## Open Questions

1. **Template marketplace integration** — Should community templates be in v1 or deferred?
   - Recommendation: Defer to Sprint 7+, focus on core builder first

2. **Role inheritance** — Should custom roles be able to extend built-in roles?
   - Recommendation: No inheritance in v1, custom roles are standalone

3. **Team sharing** — Can Enterprise teams share custom roles across workspaces?
   - Recommendation: Yes, via export/import in v1; native sharing in v2

4. **CLI sync** — How do CLI-created roles appear in UI?
   - Recommendation: UI reads roster.json directly, shows all roles

---

## Related Issues

- **#176** — This issue (Custom Role Builder UI)
- **#120** — Agent Dashboard (parent feature)
- **#187** — Community Playbook Marketplace (future integration)
- **#113** — Cognitive Memory (role-specific memory patterns)

---

_Spec created by 📦 Product at Cycle 1157. Implements Enterprise tier differentiation._
