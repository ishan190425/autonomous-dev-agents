# Community Playbook Marketplace — Product Specification

> **Author:** 📦 The PM (C1227)
> **Date:** 2026-02-27
> **Related Issue:** #187
> **Sprint:** Sprint 4+ (post-SaaS launch)
> **Status:** Draft

---

## Overview

The **Community Playbook Marketplace** enables users to discover, share, and install pre-built playbook templates created by the ADA community. This transforms ADA from a single-user tool into a platform with network effects — each shared playbook makes the ecosystem more valuable.

---

## User Stories

### Primary Persona: Solo Developer (Installer)

> "As a solo developer, I want to find and install a playbook template for my React project so that I don't have to configure roles and rules from scratch."

### Secondary Persona: Experienced User (Creator)

> "As an experienced ADA user, I want to share my customized playbook set so that other developers can benefit from my learnings and I can build reputation in the community."

### Tertiary Persona: Team Lead (Curator)

> "As a team lead, I want to browse highly-rated playbooks for API projects so that I can find best practices from teams like mine."

---

## MVP Features (Sprint 4)

### 1. Playbook Discovery

**CLI Integration:**

```bash
# Browse marketplace
ada marketplace browse [--category=<category>] [--sort=<popular|recent|rating>]

# Search for playbooks
ada marketplace search "react typescript"

# View playbook details
ada marketplace info <playbook-id>
```

**Categories:**

- **Web App** — React, Next.js, Vue, Angular
- **API/Backend** — Express, Fastify, NestJS, Django
- **CLI Tool** — Node.js, Python, Rust, Go
- **Library** — npm packages, PyPI, crates
- **Mobile** — React Native, Flutter
- **DevOps** — Terraform, Kubernetes, CI/CD
- **Documentation** — Docs sites, wikis
- **Data Science** — Python, Jupyter, ML pipelines

**Listing Display:**

```
┌─────────────────────────────────────────────────────────────┐
│  🎯 react-typescript-pro                          ★★★★☆ (4.2) │
│  Author: @jane-dev  |  Downloads: 1,234  |  Updated: 2d ago  │
│                                                               │
│  Full-stack React + TypeScript template with 8 specialized   │
│  roles including Frontend, API, Testing, and DevOps.         │
│                                                               │
│  Roles: frontend, api, testing, devops, docs, design, pm, qa │
│  Tags: react, typescript, nextjs, tailwind, vitest           │
└─────────────────────────────────────────────────────────────┘
```

### 2. Playbook Installation

**CLI Commands:**

```bash
# Install a playbook template
ada marketplace install <playbook-id>

# Install with customization
ada marketplace install <playbook-id> --roles=frontend,api,testing

# Preview what will be installed
ada marketplace install <playbook-id> --dry-run
```

**Installation Flow:**

1. **Validate compatibility** — Check ADA version, required dependencies
2. **Preview changes** — Show what files will be created/modified
3. **Confirm installation** — User approves or cancels
4. **Install playbooks** — Copy templates to `agents/playbooks/`
5. **Update roster** — Merge new roles into `agents/roster.json`
6. **Post-install hooks** — Run any setup scripts

**Conflict Resolution:**

- If playbook contains a role that already exists, prompt user:
  - **Replace** — Overwrite existing playbook
  - **Merge** — Combine sections (manual review)
  - **Skip** — Keep existing, don't install this role
  - **Rename** — Install as `<role>-marketplace`

### 3. Playbook Publishing

**CLI Commands:**

```bash
# Package current playbooks for publishing
ada marketplace pack [--include=<roles>]

# Publish to marketplace
ada marketplace publish <package-path>

# Update existing playbook
ada marketplace update <playbook-id>
```

**Publishing Requirements:**

- Valid `ada-playbook.json` manifest
- At least one playbook file
- README.md with usage instructions
- Author authentication (GitHub OAuth)
- Passes validation checks (no secrets, valid YAML/MD)

**Manifest Schema (`ada-playbook.json`):**

```json
{
  "name": "react-typescript-pro",
  "version": "1.0.0",
  "description": "Full-stack React + TypeScript template",
  "author": {
    "name": "Jane Developer",
    "github": "jane-dev"
  },
  "license": "MIT",
  "ada_version": ">=1.0.0",
  "categories": ["web-app", "frontend"],
  "tags": ["react", "typescript", "nextjs"],
  "roles": [
    {
      "id": "frontend",
      "playbook": "playbooks/frontend.md",
      "description": "React component development"
    }
  ],
  "rules": [
    {
      "file": "rules/react-conventions.md",
      "description": "React coding standards"
    }
  ],
  "dependencies": {
    "node": ">=18.0.0"
  }
}
```

### 4. Ratings & Reviews

**Rating System:**

- 1-5 star rating
- Text reviews (optional, max 500 chars)
- "Helpful" votes on reviews
- Author responses to reviews

**Review Requirements:**

- Must have installed the playbook
- One review per user per playbook
- Can update review after re-evaluation

---

## Backend Architecture

### Data Model

**Playbook:**

```typescript
interface Playbook {
  id: string; // UUID
  slug: string; // URL-friendly name
  name: string; // Display name
  description: string; // Short description
  longDescription?: string; // Full README content
  version: string; // Semver
  author: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  categories: string[];
  tags: string[];
  roles: PlaybookRole[];
  rules: PlaybookRule[];
  stats: {
    downloads: number;
    rating: number; // 0-5, aggregated
    reviewCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date;
}

interface PlaybookRole {
  id: string;
  name: string;
  playbook: string; // S3 key to playbook content
  description: string;
}

interface Review {
  id: string;
  playbookId: string;
  userId: string;
  rating: number; // 1-5
  text?: string;
  helpfulVotes: number;
  authorResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### API Endpoints

| Method | Endpoint                                    | Description               |
| ------ | ------------------------------------------- | ------------------------- |
| GET    | `/api/marketplace/playbooks`                | List/search playbooks     |
| GET    | `/api/marketplace/playbooks/:slug`          | Get playbook details      |
| GET    | `/api/marketplace/playbooks/:slug/download` | Download playbook package |
| POST   | `/api/marketplace/playbooks`                | Publish new playbook      |
| PUT    | `/api/marketplace/playbooks/:slug`          | Update playbook           |
| DELETE | `/api/marketplace/playbooks/:slug`          | Unpublish playbook        |
| GET    | `/api/marketplace/playbooks/:slug/reviews`  | List reviews              |
| POST   | `/api/marketplace/playbooks/:slug/reviews`  | Add review                |
| PUT    | `/api/marketplace/reviews/:id`              | Update review             |

### Storage

- **Playbook packages:** S3 or equivalent object storage
- **Metadata:** PostgreSQL (same as SaaS database)
- **CDN:** CloudFront for fast downloads

---

## Success Metrics

### Launch Metrics (Sprint 4 End)

| Metric                   | Target                    |
| ------------------------ | ------------------------- |
| Playbooks published      | 10+ (internal team seeds) |
| Browse/search functional | 100%                      |
| Install success rate     | >95%                      |

### Growth Metrics (Sprint 5+)

| Metric              | Target |
| ------------------- | ------ |
| Community playbooks | 50+    |
| Monthly downloads   | 500+   |
| Average rating      | >4.0   |
| Active publishers   | 20+    |

### Quality Metrics

| Metric                      | Target |
| --------------------------- | ------ |
| Install success rate        | >98%   |
| Support tickets per install | <1%    |
| Time to first install       | <2 min |

---

## Security Considerations

### Content Validation

Before publishing, playbooks are scanned for:

- **Secrets:** API keys, tokens, passwords (reject if found)
- **Malicious content:** Shell injection, unsafe commands
- **File paths:** No absolute paths, no path traversal
- **Size limits:** Max 10MB per playbook, max 50 files

### Trust Signals

- **Verified authors:** GitHub profile linked and verified
- **Download counts:** Higher downloads = more trust
- **Community ratings:** Poor ratings trigger review
- **ADA team picks:** Curated "featured" playbooks

### Sandboxing

- Playbooks are markdown/YAML only — no executable code
- Installation runs in user's local environment (no cloud exec)
- Post-install hooks require explicit user approval

---

## Implementation Phases

### Phase 1: Browse & Install (Sprint 4 Week 1-2)

**Scope:**

- CLI: `marketplace browse`, `search`, `info`, `install`
- Backend: Read-only API, seeded with 10 internal playbooks
- Storage: S3 bucket for packages

**Acceptance Criteria:**

- [ ] User can browse playbooks by category
- [ ] User can search playbooks by keyword
- [ ] User can view playbook details (roles, rating, description)
- [ ] User can install playbook to local project
- [ ] Conflict resolution prompts user on role overlap
- [ ] Install creates audit log entry

### Phase 2: Publishing (Sprint 4 Week 3-4)

**Scope:**

- CLI: `marketplace pack`, `publish`, `update`
- Backend: Write API with auth
- Validation: Content scanning, manifest validation

**Acceptance Criteria:**

- [ ] User can package their playbooks
- [ ] User can authenticate via GitHub OAuth
- [ ] User can publish to marketplace
- [ ] Validation rejects playbooks with secrets
- [ ] User can update/unpublish their playbooks

### Phase 3: Ratings & Reviews (Sprint 5)

**Scope:**

- CLI: `marketplace review <playbook-id> --rating=5`
- Backend: Review API, rating aggregation
- UI: Reviews display in `marketplace info`

**Acceptance Criteria:**

- [ ] User can rate installed playbooks (1-5 stars)
- [ ] User can write text review
- [ ] Ratings displayed in search results
- [ ] Authors can respond to reviews

### Phase 4: Web UI (Sprint 6+)

**Scope:**

- Dashboard integration: Browse/install via web
- Publisher dashboard: Analytics, reviews, updates
- Featured/trending sections

---

## Competitive Analysis

| Feature         | ADA Marketplace | GitHub Marketplace | Hugging Face |
| --------------- | --------------- | ------------------ | ------------ |
| CLI-first       | ✅              | ❌                 | ✅           |
| Free to publish | ✅              | ❌ (paid tier)     | ✅           |
| Version control | ✅              | ✅                 | ✅           |
| Ratings/reviews | ✅              | ✅                 | ✅           |
| Auto-updates    | 🟡 (planned)    | ❌                 | ✅           |
| Offline install | ✅              | ❌                 | ✅           |

**Differentiation:** ADA's marketplace is CLI-native, meaning developers never leave their terminal. Integration with `ada init` makes discovery frictionless.

---

## Future Enhancements (Post-MVP)

1. **Auto-updates:** `ada marketplace update --all` checks for new versions
2. **Playbook forks:** Fork and customize community playbooks
3. **Organizations:** Publish under org name, team reviews
4. **Verified badges:** "ADA Verified" for quality playbooks
5. **Dependency resolution:** Playbooks can depend on other playbooks
6. **Usage analytics:** Authors see install counts, retention
7. **Monetization:** Paid playbooks for premium templates (70/30 split)

---

## Open Questions

1. **Moderation:** Who reviews flagged playbooks? Community reports + team review?
2. **Versioning:** How to handle breaking changes in playbooks? Semver + changelogs?
3. **Licensing:** Require explicit license? Default to MIT?
4. **Namespacing:** `@username/playbook-name` or flat namespace?

---

## Dependencies

- **Sprint 3 completion:** Auth system required for publishing
- **#181 GitHub OAuth:** Publishers authenticate via GitHub
- **#190 API Gateway:** Marketplace endpoints use shared gateway

---

## Related Documents

- `docs/product/onboarding-wizard-spec-c1217.md` — Init flow integrates marketplace
- `docs/architecture/sprint3-saas-architecture-adr-c1196.md` — Backend infrastructure
- Issue #187 — Original feature request

---

_📦 Product Specification by The PM | C1227 | 2026-02-27_
