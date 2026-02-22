# 📦 Community Playbook Marketplace — Feature Spec

> **Issue:** #187  
> **Author:** 📦 Product (C1107)  
> **Date:** 2026-02-22  
> **Status:** Draft  
> **Priority:** P2 (Post-Sprint 3)  
> **Sprint:** 4+

---

## Overview

The **Community Playbook Marketplace** enables ADA users to discover, share, and install pre-built playbook sets tailored for different project types and team configurations. This creates a network effect where community contributions improve ADA for everyone.

---

## User Stories

### US-1: Discovery

> **As a** new ADA user setting up my first agent team,  
> **I want to** browse pre-built playbook templates for my project type,  
> **So that** I can get started quickly without writing playbooks from scratch.

### US-2: Installation

> **As a** developer initializing ADA in my repo,  
> **I want to** install a template with a single command,  
> **So that** I have a working agent team in seconds.

### US-3: Publishing

> **As an** experienced ADA user with a custom playbook set,  
> **I want to** publish my playbooks to the marketplace,  
> **So that** others can benefit and I can build reputation.

### US-4: Customization

> **As a** user who installed a template,  
> **I want to** customize the playbooks after installation,  
> **So that** I can tailor them to my specific needs.

### US-5: Updates

> **As a** user with an installed template,  
> **I want to** receive updates when the template improves,  
> **So that** I benefit from community improvements.

---

## Key Features

### 1. Template Registry

- **Central registry** of community-contributed playbook templates
- **Metadata:** name, description, author, version, downloads, ratings, tags
- **Categories:**
  - Project type: web-app, cli-tool, api-service, mobile, python-lib
  - Team size: solo, small-team (2-5), medium (5-10)
  - Focus area: full-stack, backend-only, frontend-only, devops-heavy
  - Industry: fintech, healthcare, e-commerce, open-source

### 2. CLI Commands

```bash
# Browse marketplace
ada marketplace list
ada marketplace list --category=web-app
ada marketplace search "react native"

# View template details
ada marketplace info <template-name>

# Install during init
ada init --template=web-app
ada init --template=@username/custom-template

# Install into existing team
ada marketplace install <template-name> --merge
ada marketplace install <template-name> --replace

# Publish your template
ada marketplace publish --name="my-template" --description="..."
ada marketplace unpublish <template-name>

# Update installed template
ada marketplace update
ada marketplace update --dry-run
```

### 3. Template Structure

```yaml
# template.yaml (in published template)
name: react-nextjs-fullstack
version: 1.2.0
description: Full-stack Next.js app with Prisma, tRPC, and Tailwind
author: username
license: MIT
tags: [react, nextjs, fullstack, typescript]
category: web-app
team_size: small-team

# Dependencies
ada_version: '>=1.0.0'

# What's included
includes:
  - agents/roster.json # Custom roles
  - agents/playbooks/ # All playbooks
  - agents/rules/RULES.md # Project-specific rules
  - templates/ # Optional init templates

# Customization prompts during install
prompts:
  - name: database
    message: 'Which database?'
    type: select
    choices: [postgresql, mysql, sqlite]
    default: postgresql

  - name: auth_provider
    message: 'Auth provider?'
    type: select
    choices: [nextauth, clerk, auth0, none]
    default: nextauth

# Post-install hooks
hooks:
  post_install: |
    echo "Template installed! Next steps:"
    echo "1. Run ada run to start your first cycle"
    echo "2. Customize playbooks in agents/playbooks/"
```

### 4. Template Contents

A complete template includes:

| File             | Description                         | Required |
| ---------------- | ----------------------------------- | -------- |
| `template.yaml`  | Template metadata and configuration | ✅       |
| `roster.json`    | Team composition and rotation       | ✅       |
| `playbooks/*.md` | Role-specific playbooks             | ✅       |
| `rules/RULES.md` | Project-specific rules              | ⚪       |
| `memory/bank.md` | Initial memory bank template        | ⚪       |
| `README.md`      | Template documentation              | ⚪       |
| `templates/*`    | Files for ada init                  | ⚪       |

### 5. Quality Controls

- **Validation:** Templates validated on publish (schema, required files)
- **Versioning:** Semantic versioning required
- **License:** Must specify license
- **Reviews:** Community ratings and comments
- **Curation:** Featured templates curated by maintainers

### 6. Update Mechanism

```bash
# Check for updates
ada marketplace outdated

# Output:
# react-nextjs-fullstack: 1.2.0 → 1.3.0 (minor)
#   Changelog: Added playwright testing playbook
#
# Update with: ada marketplace update

# Apply updates (prompts for conflicts)
ada marketplace update

# Output:
# Updating react-nextjs-fullstack...
# Conflict in agents/playbooks/engineering.md
#   [m]erge | [k]eep local | [o]verwrite | [d]iff
```

---

## Acceptance Criteria

### Discovery (AC-1)

- [ ] `ada marketplace list` displays all templates with name, description, downloads, rating
- [ ] `ada marketplace list --category=X` filters by category
- [ ] `ada marketplace search "query"` searches name, description, tags
- [ ] `ada marketplace info <name>` shows full template details including README

### Installation (AC-2)

- [ ] `ada init --template=X` installs template during initialization
- [ ] `ada marketplace install X` installs into existing ADA repo
- [ ] `--merge` merges with existing playbooks (prompts for conflicts)
- [ ] `--replace` replaces all agent files
- [ ] Post-install hooks execute successfully
- [ ] Customization prompts work correctly

### Publishing (AC-3)

- [ ] `ada marketplace publish` validates template structure
- [ ] Validation errors clearly indicate what's missing/wrong
- [ ] Published templates appear in registry within 1 minute
- [ ] `ada marketplace unpublish` removes template from registry
- [ ] Version bumps require `ada marketplace publish --version X.Y.Z`

### Updates (AC-4)

- [ ] `ada marketplace outdated` shows available updates
- [ ] `ada marketplace update` applies updates with conflict resolution
- [ ] `--dry-run` previews changes without applying
- [ ] Update history tracked in local config

### Quality (AC-5)

- [ ] Templates require valid `template.yaml` schema
- [ ] Templates require at least `roster.json` and one playbook
- [ ] Rating system allows 1-5 stars with optional comment
- [ ] Download counts visible and accurate

---

## Edge Cases

### EC-1: Conflicting Updates

When an update conflicts with local customizations:

1. Detect conflicts using three-way merge
2. Prompt user for resolution strategy per file
3. Offer diff view to understand changes
4. Log resolution choices for future updates

### EC-2: Breaking Changes

When a template introduces breaking changes:

1. Major version bump required (semver)
2. `ada marketplace update` warns about breaking changes
3. Requires explicit `--allow-breaking` flag
4. Provides migration guide in changelog

### EC-3: Abandoned Templates

When a template author stops maintaining:

1. Display "last updated" prominently
2. After 6 months inactive, show warning
3. Allow community forks with new ownership
4. Featured status requires recent activity

### EC-4: Template Dependencies

When templates depend on specific ADA features:

1. `ada_version` field specifies minimum version
2. Installation fails gracefully with clear error if incompatible
3. Suggest updating ADA or finding compatible template version

### EC-5: Offline Installation

When user is offline:

1. Cache recently viewed template metadata
2. Allow installation from local path: `ada init --template=./path/to/template`
3. Export installed template: `ada marketplace export <name> ./path`

### EC-6: Private Templates

For enterprise/team use:

1. Support private registry URL in config
2. `ada marketplace add-registry <url> --token=...`
3. Private templates searchable only with auth
4. Billing integration for paid templates (future)

---

## Implementation Phases

### Phase 1: Local Templates (Sprint 4)

- [ ] `ada init --template=./local/path` support
- [ ] Template validation schema
- [ ] Basic `template.yaml` format

### Phase 2: Public Registry (Sprint 5)

- [ ] Central registry backend (Supabase or dedicated service)
- [ ] `ada marketplace list/search/info` commands
- [ ] `ada init --template=<name>` from registry

### Phase 3: Publishing & Updates (Sprint 6)

- [ ] `ada marketplace publish` workflow
- [ ] Versioning and changelog support
- [ ] `ada marketplace update` with conflict resolution

### Phase 4: Community Features (Sprint 7+)

- [ ] Ratings and reviews
- [ ] Featured templates curation
- [ ] Download analytics for authors
- [ ] Private registries for enterprise

---

## Related Issues

- **#41** — Demo Repository (could become featured template)
- **#149** — Evangelist role (could help promote marketplace)
- **#133** — First-run CLI banner (marketplace promotion opportunity)
- **#183** — Interactive Onboarding Wizard (integrates with template selection)

---

## Non-Goals (This Spec)

- **Monetization:** Paid templates not in scope for v1
- **Enterprise SSO:** Private registry auth is Phase 4
- **Template analytics dashboard:** Future feature
- **Collaborative template editing:** Out of scope

---

## Open Questions

1. **Registry hosting:** Self-hosted vs. managed service? (Suggest: Start with Supabase, migrate if needed)
2. **Namespace conflicts:** How to handle duplicate template names? (Suggest: Username-scoped like npm)
3. **License enforcement:** Should we validate license compatibility? (Suggest: Display only, no enforcement)
4. **Community moderation:** How to handle inappropriate templates? (Suggest: Report system + manual review)

---

_📦 Product (C1107) — Tangible spec for post-launch roadmap. Per R-017._
