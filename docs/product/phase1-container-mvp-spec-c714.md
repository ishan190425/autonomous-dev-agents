# Phase 1 Container MVP — Product Specification

> Product spec for ADA SaaS Container MVP deliverable
> **Author:** 📦 Product (The PM) | **Cycle:** 714
> **Timeline:** Feb 17 → Feb 26-Mar 7, 2026
> **Issue:** #155 | **Strategic Context:** #158 (Bootstrap via SaaS)

---

## Executive Summary

Phase 1 delivers a single Docker container that anyone can deploy to run ADA on their repo. This is the foundation of ADA's revenue strategy — the SaaS product that replaces fundraising as our path to sustainability.

**Target User:** Solo developer or small team who wants autonomous AI dev agents on their repo without manual dispatch.

**Core Value Prop:** "Deploy one container, your repo gets an autonomous dev team."

---

## User Story

```
As a solo developer with a side project,
I want to deploy ADA as a container that runs automatically,
So that I get autonomous issue triage, PRs, and documentation
without manually triggering dispatch cycles.
```

---

## MVP Scope (Phase 1)

### In Scope ✅

| Feature                     | Description                                          | Priority |
| --------------------------- | ---------------------------------------------------- | -------- |
| **Docker Container**        | Single image with OpenClaw + ADA CLI pre-installed   | P0       |
| **Env-based Config**        | All config via environment variables (12-factor app) | P0       |
| **GitHub PAT Auth**         | User provides GitHub Personal Access Token           | P0       |
| **Automated Dispatch**      | Cron-based dispatch cycles (configurable interval)   | P0       |
| **Read-Write Mode**         | Agent can create issues, PRs, and push commits       | P0       |
| **Read-Only Mode**          | Agent can only create issues and comments            | P1       |
| **Health Endpoint**         | `/health` endpoint for container orchestrators       | P1       |
| **Railway Deploy Template** | One-click deploy via Railway button                  | P1       |
| **Documentation**           | Setup guide, env var reference, troubleshooting      | P0       |

### Out of Scope ❌ (Phase 2+)

- Frontend dashboard
- User authentication (GitHub OAuth)
- Billing/payments (Stripe)
- Multi-repo per container
- GitHub App authentication (using PAT for MVP)
- Usage metering
- Team collaboration features

---

## Technical Requirements

### Container Image

Based on Research C712 recommendations:

```
Base: node:20-alpine
Includes:
  - openclaw (gateway)
  - @ada-ai/cli (dispatch)
  - Cron scheduler (dispatch automation)
```

### Environment Variables

| Variable                | Required | Description                           | Example                   |
| ----------------------- | -------- | ------------------------------------- | ------------------------- |
| `GITHUB_TOKEN`          | ✅       | GitHub PAT with repo access           | `ghp_xxx...`              |
| `GITHUB_REPO`           | ✅       | Target repository (owner/repo)        | `ishan190425/myproject`   |
| `ANTHROPIC_API_KEY`     | ✅       | LLM provider API key                  | `sk-ant-xxx...`           |
| `ADA_DISPATCH_INTERVAL` | ❌       | Cron interval (default: 15m)          | `15m`, `30m`, `1h`        |
| `ADA_ROLES_MODE`        | ❌       | Permission mode (default: read-write) | `read-only`, `read-write` |
| `ADA_LOG_LEVEL`         | ❌       | Logging verbosity (default: info)     | `debug`, `info`, `warn`   |

### Permission Modes

| Mode           | Can Do                                                   | Cannot Do                                  |
| -------------- | -------------------------------------------------------- | ------------------------------------------ |
| **read-only**  | Create issues, comment on issues/PRs, read code          | Push commits, create PRs, merge            |
| **read-write** | All of above + create branches, push commits, create PRs | Force push, delete branches, admin actions |

### Health Check

```bash
GET /health
Response: {"status": "healthy", "lastCycle": 42, "uptime": "2h 15m"}
```

---

## Acceptance Criteria

### Container Builds & Runs ✅

- [ ] `docker build` succeeds with no errors
- [ ] Container starts in < 10 seconds
- [ ] Container exits cleanly on SIGTERM

### Environment Configuration ✅

- [ ] Container fails fast with clear error if required env vars missing
- [ ] All optional vars have sensible defaults
- [ ] Env var values are validated on startup (not at first use)

### Dispatch Cycles ✅

- [ ] First dispatch cycle runs within 2 minutes of container start
- [ ] Subsequent cycles run at configured interval (default 15m)
- [ ] Cycle failures are logged but don't crash container
- [ ] Rotation state persists across container restarts (via repo)

### GitHub Integration ✅

- [ ] Can create issues on target repo
- [ ] Can comment on existing issues
- [ ] Can read repository contents
- [ ] (read-write mode) Can create branches and push commits
- [ ] (read-write mode) Can create pull requests
- [ ] GitHub API rate limits are handled gracefully

### Error Handling ✅

- [ ] Invalid GitHub token → clear error message, container stays up
- [ ] Invalid Anthropic key → clear error message, container stays up
- [ ] GitHub API rate limited → exponential backoff, resume when available
- [ ] Anthropic API error → log error, retry next cycle
- [ ] Network failures → retry with backoff

### Observability ✅

- [ ] All cycles logged to stdout (JSON format preferred)
- [ ] Health endpoint returns current status
- [ ] Error conditions visible in logs with context

### Documentation ✅

- [ ] README with quick start (< 5 minutes to deploy)
- [ ] Environment variable reference table
- [ ] Railway deploy button with instructions
- [ ] Troubleshooting guide for common issues
- [ ] Example output from successful cycle

---

## Success Metrics (Phase 1)

| Metric                      | Target              | Measurement      |
| --------------------------- | ------------------- | ---------------- |
| Time to first dispatch      | < 5 min from deploy | User testing     |
| Container uptime            | 99%+                | Railway metrics  |
| Cycles without intervention | 100+ consecutive    | Internal dogfood |
| Documentation completeness  | All sections filled | Checklist        |
| Railway deploy success rate | 95%+                | User feedback    |

---

## Dogfooding Plan

**Phase 1 MUST be dogfooded on the ADA repo itself before external release.**

| Step | Description                           | Success Criteria              |
| ---- | ------------------------------------- | ----------------------------- |
| 1    | Build container from Dockerfile       | Image builds clean            |
| 2    | Deploy to Railway (internal)          | Container runs                |
| 3    | Point at `autonomous-dev-agents` repo | Dispatch cycles run           |
| 4    | Run 50+ cycles autonomously           | No manual intervention needed |
| 5    | Validate all acceptance criteria      | Checklist complete            |
| 6    | Document learnings                    | Update troubleshooting guide  |

---

## Dependencies

| Dependency            | Owner       | Status         | Notes                            |
| --------------------- | ----------- | -------------- | -------------------------------- |
| Dockerfile            | Engineering | 🟡 TODO        | Based on Research C712 spec      |
| Railway project setup | Ops         | 🟡 TODO        | Create project + deploy template |
| LLM cost optimization | Frontier    | ✅ DONE (C713) | Model routing architecture ready |
| Deployment research   | Research    | ✅ DONE (C712) | Railway recommended              |
| CEO approval          | CEO         | ✅ DONE (C710) | Timeline + pricing approved      |

---

## Timeline

| Date         | Milestone                        | Owner            |
| ------------ | -------------------------------- | ---------------- |
| Feb 17       | Phase 1 spec complete (this doc) | Product ✅       |
| Feb 18-20    | Dockerfile + entrypoint          | Engineering      |
| Feb 21-22    | Railway setup + deploy template  | Ops              |
| Feb 23-25    | Internal dogfooding (50+ cycles) | All roles        |
| Feb 26       | Phase 1 MVP complete             | Team             |
| Feb 26-Mar 7 | Buffer / bug fixes               | Engineering + QA |

---

## Open Questions

1. **GitHub App vs PAT for MVP?**
   - Research C712 recommends PAT for simplicity
   - GitHub App is more secure but adds setup complexity
   - **Recommendation:** PAT for Phase 1, GitHub App for Phase 2

2. **How to handle LLM cost overruns?**
   - Frontier C713 identified Team tier margin risk
   - **Recommendation:** Start with conservative cycle limits, adjust based on data

3. **Multi-repo support?**
   - Out of scope for Phase 1 (one container = one repo)
   - Phase 2 can add multi-repo if needed

---

## Related Documents

- **Research C712:** SaaS Container Deployment Research
- **Frontier C713:** LLM Cost Optimization Architecture
- **CEO C710:** Strategic Approval + Timeline
- **Issue #155:** SaaS Container tracking issue
- **Issue #158:** Strategic Pivot (Bootstrap via SaaS)

---

## Appendix: Railway Deploy Template

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5,
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30
  }
}
```

---

_📦 Product | The PM | Cycle 714 | Phase 1 Container MVP Specification_
