# Dashboard Authentication Architecture

> **Author:** Design (The Architect) 🎨  
> **Date:** 2026-02-03  
> **Status:** Draft  
> **Resolves:** Open Question Q3

## Overview

Authentication design for the ADA web dashboard, supporting both individual users and team-based access patterns. Balances simplicity for early adoption with enterprise requirements for future growth.

## Auth Architecture

### Phase 1: Individual Access (MVP)

Simple GitHub OAuth for immediate market entry:

```
User → GitHub OAuth → Dashboard → User's Repos
```

**Benefits:**

- Zero setup friction (developers already have GitHub)
- Natural repo access mapping
- Familiar auth flow
- No password management

**Limitations:**

- Individual-only (no team sharing)
- GitHub dependency

### Phase 2: Team Workspaces

Multi-user team access with role-based permissions:

```
Team Admin → Creates Workspace → Invites Members → Assigns Repo Access
```

**Workspace Model:**

- `workspace_id` (UUID)
- `name` (string) - "Acme AI Team"
- `plan` (enum) - free/pro/enterprise
- `created_by` (user_id)

**User-Workspace Mapping:**

```typescript
interface WorkspaceUser {
  user_id: string;
  workspace_id: string;
  role: 'admin' | 'member' | 'viewer';
  repo_permissions: string[]; // ['repo1/*', 'repo2/read-only']
  invited_at: Date;
  accepted_at: Date | null;
}
```

## API Authentication

### Session-Based (Dashboard)

- Next.js `NextAuth.js` with GitHub provider
- Secure httpOnly cookies
- CSRF protection via double-submit pattern

### Token-Based (CLI → API)

- Personal access tokens for CLI authentication
- Scoped permissions: `repos:read`, `agents:write`, `logs:read`
- Standard Bearer token in Authorization header

```bash
# CLI login flow
ada login
# → Opens browser to dashboard.ada.dev/cli-login
# → User authorizes, gets token
# → CLI stores in ~/.ada/credentials
```

## Permission Model

### Granular Repo Permissions

```typescript
type RepoPermission =
  | 'read' // View cycles, memory, logs
  | 'write' // Modify agent config
  | 'admin'; // Invite users, delete agents

interface RepoAccess {
  repo: string; // "owner/repo" format
  permission: RepoPermission;
}
```

### Built-in Roles

- **Viewer**: Read access to all workspace repos
- **Member**: Read/write to assigned repos
- **Admin**: Full workspace control

## Data Model

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id INTEGER UNIQUE NOT NULL,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);
```

### Sessions Table (Redis)

```typescript
interface Session {
  sessionId: string;
  userId: string;
  workspaceId?: string; // null for individual access
  expiresAt: Date;
  lastActivity: Date;
}
```

## Security Considerations

### Threats & Mitigations

1. **Repo access escalation** → Validate GitHub permissions on every repo request
2. **Session hijacking** → Short-lived sessions (24h), secure cookies, IP binding
3. **CSRF attacks** → Next.js built-in CSRF protection
4. **Token leakage** → Scoped tokens, revocation endpoint

### Privacy

- No code content stored on ADA servers
- Only metadata: cycle history, memory bank structure, metrics
- GitHub permissions checked in real-time (no cached repo lists)

## Implementation Plan

### MVP (Phase 1)

1. **GitHub OAuth setup** in Next.js dashboard
2. **Session management** with NextAuth.js
3. **Repo validation** - check user's GitHub access before showing data
4. **CLI token flow** - browser-based auth for CLI

### Phase 2 Additions

1. **Workspace data model** and UI
2. **Team invitation system**
3. **Permission management UI**
4. **Usage analytics** per workspace

## API Endpoints

```typescript
// Auth
POST /api/auth/cli/authorize  // CLI → browser auth flow
GET  /api/auth/session        // Current user session
POST /api/auth/revoke         // Revoke tokens

// Workspaces (Phase 2)
GET    /api/workspaces        // User's workspaces
POST   /api/workspaces        // Create workspace
PUT    /api/workspaces/:id    // Update workspace
DELETE /api/workspaces/:id    // Delete workspace

// Users (Phase 2)
GET  /api/workspaces/:id/users     // Workspace members
POST /api/workspaces/:id/invite    // Invite user
PUT  /api/workspaces/:id/users/:uid // Update user permissions
```

## Developer Experience

### Smooth Onboarding

1. User visits `dashboard.ada.dev`
2. "Connect GitHub" button → OAuth flow
3. Immediately see repos with ADA agents
4. Click repo → view cycles, memory, metrics

### CLI Integration

```bash
# First-time setup
ada login
# → "Opening browser for authentication..."
# → "✅ Logged in as @username"

# Seamless thereafter
ada status
# → Shows current repo's agent status
# → Automatically uses saved credentials
```

## Technical Dependencies

- **Next.js 14+** with App Router
- **NextAuth.js v5** for session management
- **Redis** for session storage
- **PostgreSQL** for user/workspace data
- **GitHub API** for real-time permission checking

## Future Considerations

### Enterprise Features (Post-Product-Market-Fit)

- **SAML SSO** integration
- **SCIM provisioning** for automated user management
- **Audit logs** for compliance
- **Custom role definitions** beyond built-in roles

### Multi-Provider Support

- **GitLab** and **Azure DevOps** auth
- **Generic Git** providers via SSH key management

---

**Decision Required:** Should MVP launch with GitHub OAuth only, or include basic workspace concepts from day one?

**Recommendation:** GitHub OAuth only for MVP. Workspaces add complexity that could slow initial adoption. Add team features once we validate individual use cases.
