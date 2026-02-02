# 🎨 Template System Design

**Author:** Design (The Architect)  
**Date:** 2026-02-02  
**Status:** PROPOSAL  
**Addresses:** Open Question Q2 — Default template design (Minimal vs Full)

---

## Problem Statement

`ada init` needs a template system that:
1. **Enables rapid onboarding** for new teams
2. **Scales from simple to complex** use cases  
3. **Avoids overwhelming** beginners with 8+ roles
4. **Maintains flexibility** for advanced users

Currently we have a full 8-role template. Most teams don't need CEO/Growth/Research roles initially.

---

## Solution: Tiered Template System

### Template Variants

#### 1. **Minimal Template** (Default)
**Target:** Individual developers, small teams, open-source projects  
**Roles:** 3 core roles
```json
{
  "roles": ["engineering", "product", "ops"],
  "rotation_order": ["product", "engineering", "ops"]
}
```

**Rationale:** 
- **Engineering** — Code, PRs, architecture (essential)
- **Product** — Feature specs, prioritization (direction)  
- **Ops** — CI/CD, quality, PR management (stability)

#### 2. **Standard Template** 
**Target:** Growing teams, startups with clear product focus  
**Roles:** 5 balanced roles
```json
{
  "roles": ["product", "engineering", "ops", "design", "scrum"],
  "rotation_order": ["product", "scrum", "engineering", "ops", "design"]  
}
```

**Rationale:** Adds **Design** (API/UX) and **Scrum** (coordination) for better organization.

#### 3. **Full Template**
**Target:** Mature teams, business-focused projects, comprehensive development  
**Roles:** All 8 roles
```json
{
  "roles": ["ceo", "growth", "research", "product", "scrum", "engineering", "ops", "design"],
  "rotation_order": ["ceo", "growth", "research", "product", "scrum", "engineering", "ops", "design"]
}
```

**Rationale:** Complete business + tech lifecycle for established teams.

#### 4. **Custom Template**
**Target:** Teams with specific needs  
**Interactive selection** during `ada init`

---

## CLI User Experience

### `ada init` Flow (Interactive)

```bash
$ ada init

🤖 ADA — Autonomous Dev Agent Teams

? What type of project is this?
  ● Individual/Small Team     (3 roles: Product, Engineering, Ops)
  ○ Growing Team              (5 roles: + Design, Scrum)  
  ○ Full Business Team        (8 roles: + CEO, Growth, Research)
  ○ Custom                    (Choose specific roles)

? Project name: my-awesome-app
? Company/Team name: ACME Inc
? Agent naming style: 
  ● Roles (The Engineer, The PM, etc.)
  ○ Names (Alice, Bob, Charlie, etc.)
  ○ Custom

✓ Initializing ADA agent team...
✓ Created agents/roster.json
✓ Created agents/playbooks/ (3 roles)
✓ Created agents/state/rotation.json
✓ Created agents/memory/bank.md
✓ Created HEARTBEAT.md

🎉 Agent team ready! Run `ada run` to start your first cycle.
```

### `ada init` Flow (Non-Interactive)

```bash
# Quick defaults
ada init --template minimal --name "my-app" --company "ACME Inc"

# Specific template  
ada init --template standard --name "my-app"

# Custom roles
ada init --roles "engineering,product,ops,design" --name "my-app"
```

---

## Template Customization

### Placeholder Replacement

Templates use consistent placeholders:
- `[PROJECT_NAME]` → User's project name
- `[COMPANY_NAME]` → User's company/team name  
- `[ROLE_NAME]` → "The Engineer" vs "Alice" based on naming style
- `[EMOJI]` → Role emoji (⚙️, 📦, 🛡️, etc.)
- `[CURRENT_DATE]` → ISO date for initialization

### Role Focus Customization

Engineering teams might want:
```json
{
  "engineering": {
    "focus": ["rust_backend", "react_frontend", "kubernetes", "testing"]  
  }
}
```

AI teams might want:
```json
{
  "research": {
    "focus": ["llm_training", "dataset_curation", "model_evaluation"]
  }
}
```

---

## Implementation Strategy

### Phase 1: Template Selection (Issue #6)
1. **Create `templates/minimal/`** — 3-role variant
2. **Create `templates/standard/`** — 5-role variant  
3. **Keep `templates/full/`** — current 8-role (rename from root)
4. **Update `ada init`** to prompt for template choice
5. **Default to minimal** for fastest onboarding

### Phase 2: Advanced Customization  
1. **Role focus customization** during init
2. **Template marketplace** (community templates)
3. **Template validation** and schema checking
4. **Migration tools** (minimal → standard → full)

### Phase 3: Template Ecosystem
1. **Framework-specific templates** (React, Django, etc.)
2. **Industry templates** (fintech, healthcare, etc.)  
3. **Template sharing** and discovery

---

## Architecture Decisions

| ID      | Decision                                              | Rationale                                           |
|---------|------------------------------------------------------|-----------------------------------------------------|
| TPL-001 | Minimal template as default                         | Reduces cognitive load, faster onboarding          |
| TPL-002 | Tiered approach (minimal/standard/full)             | Scales with team complexity                         |
| TPL-003 | Interactive CLI prompts with non-interactive fallback| Best of both worlds — guidance + automation        |
| TPL-004 | Consistent placeholder system                        | Predictable customization, easier template creation |
| TPL-005 | Role-based directories (`templates/{minimal,standard,full}/`) | Clean separation, easy maintenance                  |

---

## Open Questions for Engineering

1. **Template storage**: Should templates be embedded in the CLI binary or external files?
2. **Validation**: How do we validate template integrity during `ada init`?
3. **Updates**: How do teams migrate from minimal → standard when they grow?
4. **Custom playbooks**: Should users be able to edit playbooks directly after init?

---

## Success Metrics

- **Onboarding time**: Minimal template reduces init time to <30 seconds
- **Adoption**: 70%+ choose minimal, 25% standard, 5% full  
- **Retention**: Teams using minimal don't immediately need to upgrade
- **Flexibility**: Advanced users can still access full functionality

---

**Next:** Engineering implements template selection logic in `ada init` (Issue #6)