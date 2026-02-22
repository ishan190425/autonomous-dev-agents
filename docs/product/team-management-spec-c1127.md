# 📦 Team Management Feature Specification

> Feature spec for Issue #174 — Workspaces and User Invitations
> **Author:** 📦 Product (The PM) | **Cycle:** 1127
> **Sprint 4 Target:** Mar 15-28, 2026 | **Priority:** P2 → P1 (Enterprise unlock)

---

## Executive Summary

Team Management enables multi-user collaboration on ADA-managed repos. This feature unlocks the **Enterprise tier ($99/mo)** and is critical for agency/consultant adoption. Teams can share repos, control access, and manage billing as a unit.

**Core Components:**

1. **Workspaces** — Logical grouping of repos + team members
2. **User Invitations** — Email-based team onboarding
3. **RBAC** — Role-based access control (Admin, Member, Viewer)
4. **Billing Integration** — Per-workspace subscription

---

## User Stories

### Workspace Creation

> **As a Pro user**, I want to create a workspace so that I can organize my repos and invite team members.

**Acceptance:**

- [x] Workspace has name, description, avatar
- [x] One workspace created automatically on first login (personal workspace)
- [x] Pro/Enterprise users can create additional workspaces
- [x] Each workspace has independent settings and billing

### User Invitations

> **As a workspace admin**, I want to invite team members by email so that we can collaborate on repos.

**Acceptance:**

- [x] Invite by email (sends magic link)
- [x] Invitation expires in 7 days
- [x] Invited user creates account or links existing
- [x] Pending invitations visible to admin
- [x] Admin can revoke pending invitations

### Role-Based Access Control

> **As a workspace admin**, I want to assign roles so that I can control what team members can do.

**Acceptance:**

- [x] Three roles: Admin, Member, Viewer
- [x] Role capabilities clearly documented in UI
- [x] Only Admins can invite/remove users
- [x] Only Admins can modify workspace settings
- [x] Members can run cycles, modify configs
- [x] Viewers can only view dashboards and history

### Multi-Repo Support

> **As a workspace admin**, I want to connect multiple repos so that one workspace manages my entire project.

**Acceptance:**

- [x] Connect repos via GitHub App
- [x] Per-repo role overrides (optional)
- [x] Repo activity aggregated in workspace dashboard
- [x] Cross-repo metrics and reporting

---

## RBAC Model

### Role Definitions

| Permission                | Admin | Member | Viewer |
| ------------------------- | ----- | ------ | ------ |
| View dashboard            | ✅    | ✅     | ✅     |
| View cycle history        | ✅    | ✅     | ✅     |
| View memory bank          | ✅    | ✅     | ✅     |
| Run dispatch cycles       | ✅    | ✅     | ❌     |
| Modify agent config       | ✅    | ✅     | ❌     |
| Create/edit playbooks     | ✅    | ✅     | ❌     |
| Connect repos             | ✅    | ❌     | ❌     |
| Invite/remove members     | ✅    | ❌     | ❌     |
| Modify workspace settings | ✅    | ❌     | ❌     |
| Manage billing            | ✅    | ❌     | ❌     |
| Transfer ownership        | ✅    | ❌     | ❌     |
| Delete workspace          | ✅    | ❌     | ❌     |

### Role Inheritance

```
Owner (special Admin)
  └── Admin
        └── Member
              └── Viewer
```

- **Owner:** The user who created the workspace. Cannot be removed, only transferred.
- **Admin:** Full control except ownership transfer.
- **Member:** Can operate agent teams but not manage workspace.
- **Viewer:** Read-only access for stakeholders.

### Per-Repo Overrides (Optional)

Workspace-level role can be elevated for specific repos:

```typescript
interface RepoAccess {
  repoId: string;
  workspaceRole: Role; // inherited
  repoOverride?: Role; // optional elevation
  effectiveRole: Role; // max(workspaceRole, repoOverride)
}
```

**Use case:** A Viewer might be a Member on a specific repo they own.

---

## Data Model

### Database Schema (Supabase/PostgreSQL)

```sql
-- Workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  avatar_url TEXT,
  owner_id UUID REFERENCES users(id) NOT NULL,
  tier VARCHAR(20) DEFAULT 'free', -- free, pro, enterprise
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace Members
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- admin, member, viewer
  invited_by UUID REFERENCES users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Invitations
CREATE TABLE workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  invited_by UUID REFERENCES users(id),
  token VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, email)
);

-- Connected Repos
CREATE TABLE workspace_repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  github_repo_id BIGINT NOT NULL,
  github_repo_name VARCHAR(255) NOT NULL,
  github_owner VARCHAR(100) NOT NULL,
  connected_by UUID REFERENCES users(id),
  settings JSONB DEFAULT '{}',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, github_repo_id)
);

-- Per-repo role overrides
CREATE TABLE repo_member_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES workspace_repos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_override VARCHAR(20) NOT NULL,
  UNIQUE(repo_id, user_id)
);
```

### TypeScript Types

```typescript
// packages/core/src/types/team.ts

export type WorkspaceTier = 'free' | 'pro' | 'enterprise';
export type WorkspaceRole = 'admin' | 'member' | 'viewer';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  ownerId: string;
  tier: WorkspaceTier;
  settings: WorkspaceSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  invitedBy?: string;
  joinedAt: Date;
  user?: User; // populated on fetch
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
}

export interface WorkspaceRepo {
  id: string;
  workspaceId: string;
  githubRepoId: number;
  githubRepoName: string;
  githubOwner: string;
  connectedBy: string;
  settings: RepoSettings;
  connectedAt: Date;
}

export interface WorkspaceSettings {
  defaultRole?: WorkspaceRole; // role for new invitations
  allowMemberInvites?: boolean; // can Members invite?
  requireApproval?: boolean; // require Admin approval for joins?
  notificationPrefs?: NotificationPrefs;
}
```

---

## API Design

### REST Endpoints (apps/web)

```typescript
// Workspaces
POST   /api/workspaces                     // Create workspace
GET    /api/workspaces                     // List user's workspaces
GET    /api/workspaces/:slug               // Get workspace details
PATCH  /api/workspaces/:slug               // Update workspace
DELETE /api/workspaces/:slug               // Delete workspace

// Members
GET    /api/workspaces/:slug/members       // List members
POST   /api/workspaces/:slug/members       // Add member (from invitation)
PATCH  /api/workspaces/:slug/members/:id   // Update member role
DELETE /api/workspaces/:slug/members/:id   // Remove member

// Invitations
GET    /api/workspaces/:slug/invitations   // List pending invitations
POST   /api/workspaces/:slug/invitations   // Create invitation
DELETE /api/workspaces/:slug/invitations/:id // Revoke invitation
POST   /api/invitations/:token/accept      // Accept invitation

// Repos
GET    /api/workspaces/:slug/repos         // List connected repos
POST   /api/workspaces/:slug/repos         // Connect repo
DELETE /api/workspaces/:slug/repos/:id     // Disconnect repo
```

### Request/Response Examples

**Create Workspace:**

```typescript
POST /api/workspaces
Authorization: Bearer <token>

{
  "name": "Acme Engineering",
  "slug": "acme-eng",
  "description": "Engineering team workspace"
}

// Response 201
{
  "id": "ws_abc123",
  "name": "Acme Engineering",
  "slug": "acme-eng",
  "tier": "pro",
  "owner": { "id": "user_xyz", "name": "Alice" },
  "memberCount": 1,
  "repoCount": 0
}
```

**Send Invitation:**

```typescript
POST /api/workspaces/acme-eng/invitations
Authorization: Bearer <token>

{
  "email": "bob@acme.com",
  "role": "member",
  "message": "Join our ADA workspace!" // optional
}

// Response 201
{
  "id": "inv_123",
  "email": "bob@acme.com",
  "role": "member",
  "expiresAt": "2026-03-01T00:00:00Z",
  "inviteLink": "https://ada.ai/invite/abc123"
}
```

---

## UI Wireframes

### Workspace Selector (Header)

```
┌─────────────────────────────────────────────────────────────┐
│  [◉ Acme Engineering ▼]  Dashboard  Cycles  Memory  Settings │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐                                    │
│  │ ◉ Acme Engineering  │ ← Current workspace                │
│  │   alice@acme.com    │                                    │
│  ├─────────────────────┤                                    │
│  │ ○ Personal          │ ← Other workspaces                 │
│  │ ○ Side Project      │                                    │
│  ├─────────────────────┤                                    │
│  │ + Create Workspace  │ ← Pro/Enterprise only              │
│  └─────────────────────┘                                    │
└─────────────────────────────────────────────────────────────┘
```

### Team Settings Page

```
┌─────────────────────────────────────────────────────────────┐
│  Settings > Team                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Members (4)                               [+ Invite Member] │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 👤 Alice Chen          alice@acme.com    Owner    [─]  │  │
│  │ 👤 Bob Smith           bob@acme.com      Admin    [▼]  │  │
│  │ 👤 Carol Davis         carol@acme.com    Member   [▼]  │  │
│  │ 👤 Dave Wilson         dave@acme.com     Viewer   [▼]  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  Pending Invitations (2)                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ✉️ eve@acme.com        Member    Expires in 5 days [×] │  │
│  │ ✉️ frank@acme.com      Viewer    Expires in 3 days [×] │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  Team Settings                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Default role for new invites:  [Member ▼]              │  │
│  │ Allow Members to invite:       [○ Yes  ● No]           │  │
│  │ Require Admin approval:        [● Yes  ○ No]           │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Invitation Modal

```
┌─────────────────────────────────────────────────────────────┐
│  Invite Team Member                                    [×]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Email address                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ teammate@company.com                                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Role                                                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Member ▼                                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ○ Admin  — Full control, can manage team                   │
│  ● Member — Can run cycles, modify configs                  │
│  ○ Viewer — Read-only dashboard access                      │
│                                                              │
│  Personal message (optional)                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Hey! Join our ADA workspace to help manage our      │    │
│  │ agent teams.                                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│                                      [Cancel]  [Send Invite] │
└─────────────────────────────────────────────────────────────┘
```

### Invitation Email

```
Subject: Alice invited you to Acme Engineering on ADA

┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  🤖 ADA                                                      │
│                                                              │
│  Alice Chen invited you to join                              │
│  Acme Engineering                                            │
│                                                              │
│  You've been invited as a Member.                            │
│                                                              │
│  "Hey! Join our ADA workspace to help manage                 │
│   our agent teams."                                          │
│                                                              │
│           ┌────────────────────────┐                         │
│           │   Accept Invitation    │                         │
│           └────────────────────────┘                         │
│                                                              │
│  This invitation expires in 7 days.                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Sprint 4 Week 1 (Mar 15-21)

| Day   | Task                                      | Owner       |
| ----- | ----------------------------------------- | ----------- |
| Day 1 | Database schema + migrations              | Engineering |
| Day 2 | TypeScript types + Supabase client        | Engineering |
| Day 3 | Workspace CRUD API + tests                | Engineering |
| Day 4 | Workspace UI (selector, create, settings) | Engineering |
| Day 5 | Member list UI + role management          | Engineering |

### Sprint 4 Week 2 (Mar 22-28)

| Day   | Task                                | Owner       |
| ----- | ----------------------------------- | ----------- |
| Day 1 | Invitation API + email sending      | Engineering |
| Day 2 | Invitation acceptance flow          | Engineering |
| Day 3 | RBAC middleware + permission checks | Engineering |
| Day 4 | Connected repos UI                  | Engineering |
| Day 5 | E2E tests + docs                    | QA          |

### Dependencies

1. **Auth system (#181)** — Must be complete (Sprint 3 Day 1-2)
2. **Billing integration (#182)** — Per-workspace billing hook
3. **Email service** — Resend or similar for invitations

### Risks

| Risk                        | Likelihood | Impact | Mitigation                       |
| --------------------------- | ---------- | ------ | -------------------------------- |
| Auth delays from Sprint 3   | Medium     | High   | Stub auth for team features      |
| Email deliverability issues | Low        | Medium | Test with multiple providers     |
| RBAC complexity             | Medium     | Medium | Start with 3 roles, expand later |

---

## Testing Strategy

### Unit Tests

```typescript
// packages/core/src/__tests__/team.test.ts
describe('WorkspaceService', () => {
  it('creates workspace with owner as admin');
  it('prevents non-admins from inviting');
  it('expires invitations after 7 days');
  it('resolves effective role with overrides');
});
```

### E2E Tests

```typescript
// apps/web/e2e/team.spec.ts
test('admin can invite member by email', async ({ page }) => {
  await page.goto('/settings/team');
  await page.click('text=Invite Member');
  await page.fill('[name="email"]', 'bob@acme.com');
  await page.selectOption('[name="role"]', 'member');
  await page.click('text=Send Invite');
  await expect(page.locator('text=bob@acme.com')).toBeVisible();
});

test('viewer cannot access run cycles button', async ({ page }) => {
  await loginAs('viewer@acme.com');
  await page.goto('/dashboard');
  await expect(page.locator('text=Run Cycle')).not.toBeVisible();
});
```

---

## Success Metrics

| Metric                   | Target                    | Measurement                    |
| ------------------------ | ------------------------- | ------------------------------ |
| Workspace creation rate  | 10+ workspaces/week       | New workspaces after launch    |
| Team size                | 2.5 avg members/workspace | Member count / workspace count |
| Invitation acceptance    | >60%                      | Accepted / sent                |
| Enterprise tier upgrades | 5+ first month            | Upgrades to $99/mo             |

---

## Open Questions (Resolved)

1. **Per-seat vs flat billing?**
   - **Decision:** Flat rate per workspace ($99/mo Enterprise). Simpler, predictable.

2. **Can Members invite other Members?**
   - **Decision:** Configurable per workspace (default: No). Admins control.

3. **What happens when owner leaves?**
   - **Decision:** Owner must transfer ownership before leaving. Cannot delete self.

4. **GitHub org integration?**
   - **Decision:** Phase 2. MVP uses individual repo connections.

---

## Related Issues

- **#174** — This issue (Team Management)
- **#181** — Authentication System (prerequisite)
- **#182** — Billing Integration (per-workspace billing)
- **#155** — SaaS Container (umbrella issue)
- **#176** — Custom Role Builder UI (future enhancement)

---

## Changelog

| Version | Date       | Author  | Changes                      |
| ------- | ---------- | ------- | ---------------------------- |
| 1.0     | 2026-02-22 | Product | Initial spec created (C1127) |

---

_📦 Product (The PM) | Cycle 1127 | Feb 22, 2026_
