# Deploying ADA on Railway

> One-click deployment of autonomous AI dev agents to your GitHub repository
>
> **Author:** 🛡️ Ops (C729) | **Phase 1 Container MVP**

---

## Quick Start (< 5 minutes)

### Option 1: Deploy Button

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/ada-agent)

Click the button, fill in your credentials, and ADA starts working on your repo.

### Option 2: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Clone and deploy
git clone https://github.com/ishan190425/autonomous-dev-agents.git
cd autonomous-dev-agents
railway up
```

---

## Required Configuration

| Variable            | Description                  | Example               |
| ------------------- | ---------------------------- | --------------------- |
| `GITHUB_TOKEN`      | GitHub PAT with `repo` scope | `ghp_xxxxxxxxxxxx`    |
| `GITHUB_REPO`       | Target repository            | `myorg/myproject`     |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | `sk-ant-xxxxxxxxxxxx` |

### Getting Your Credentials

1. **GitHub Token**: [github.com/settings/tokens](https://github.com/settings/tokens)
   - Required scopes: `repo` (full control of private repositories)

2. **Anthropic API Key**: [console.anthropic.com](https://console.anthropic.com)
   - Sign up for an account and create an API key

---

## Optional Configuration

### Dispatch Settings

| Variable                | Default      | Description                                          |
| ----------------------- | ------------ | ---------------------------------------------------- |
| `ADA_DISPATCH_INTERVAL` | `15m`        | How often to run dispatch cycles (15m, 30m, 1h)      |
| `ADA_ROLES_MODE`        | `read-write` | `read-only` (issues only) or `read-write` (code+PRs) |
| `ADA_LOG_LEVEL`         | `info`       | Logging verbosity (debug, info, warn)                |

### Model Routing (Cost Optimization)

ADA automatically selects the optimal LLM model per role to minimize costs while maintaining quality:

| Variable             | Default | Description                                            |
| -------------------- | ------- | ------------------------------------------------------ |
| `ADA_MODEL_ROUTING`  | `true`  | Enable automatic cost-optimized model selection        |
| `ADA_MODEL_OVERRIDE` | (empty) | Force specific model: `haiku`, `sonnet`, or `opus`     |
| `ADA_MODEL_FALLBACK` | `true`  | Enable fallback to stronger models if validation fails |

#### Model Selection Strategy

| Model  | Usage | Roles                                  | Cost |
| ------ | ----- | -------------------------------------- | ---- |
| Haiku  | 35%   | Scrum, Evangelist, Ops (merge tasks)   | $    |
| Sonnet | 62%   | Engineering, Product, Research, Design | $$   |
| Opus   | 3%    | CEO (critical decisions only)          | $$$  |

This strategy achieves ~14% cost savings compared to using Sonnet for all roles.

---

## Role Permissions

### Read-Only Mode (`ADA_ROLES_MODE=read-only`)

| Action         | Allowed |
| -------------- | ------- |
| Create issues  | ✅      |
| Comment on PRs | ✅      |
| Read code      | ✅      |
| Push commits   | ❌      |
| Create PRs     | ❌      |
| Merge PRs      | ❌      |

### Read-Write Mode (`ADA_ROLES_MODE=read-write`)

| Action          | Allowed |
| --------------- | ------- |
| Create issues   | ✅      |
| Comment on PRs  | ✅      |
| Read code       | ✅      |
| Push commits    | ✅      |
| Create PRs      | ✅      |
| Merge PRs       | ✅      |
| Force push      | ❌      |
| Delete branches | ❌      |

---

## Health Monitoring

ADA exposes a health endpoint at `/health` on port 8080:

```bash
curl http://localhost:8080/health
```

Response:

```json
{
  "status": "healthy",
  "lastCycle": 42,
  "uptime": "2h 15m",
  "lastCycleTime": "2026-02-16T08:30:00Z"
}
```

Railway automatically monitors this endpoint and restarts the container if unhealthy.

---

## Logs

View real-time logs in the Railway dashboard or via CLI:

```bash
railway logs
```

Log format (JSON for structured logging):

```json
{
  "timestamp": "2026-02-16T08:30:00Z",
  "level": "info",
  "message": "Dispatch cycle 42 completed"
}
```

---

## Troubleshooting

### Container fails to start

1. Check environment variables are set correctly
2. Verify GitHub token has `repo` scope
3. Verify Anthropic API key is valid
4. Check Railway logs for specific error messages

### Dispatch cycles not running

1. Check health endpoint: `curl http://<your-app>.railway.app/health`
2. Verify `ADA_DISPATCH_INTERVAL` is valid (e.g., `15m`, `30m`, `1h`)
3. Check if repository has `agents/` directory with ADA configuration

### Model routing not working

1. Ensure `ADA_MODEL_ROUTING=true` (default)
2. Check if `ADA_MODEL_OVERRIDE` is set (this bypasses routing)
3. Verify Anthropic API key has access to all model tiers

---

## Cost Estimation

With model routing enabled (default), typical costs:

| Cycles/Day | Approx. Cost/Month |
| ---------- | ------------------ |
| 96 (15m)   | ~$30-50            |
| 48 (30m)   | ~$15-25            |
| 24 (1h)    | ~$8-15             |

Costs depend on repository complexity and action types. Engineering cycles (code generation) cost more than Scrum cycles (status updates).

---

## Next Steps

After deployment:

1. **Verify first cycle**: Check Railway logs for "Dispatch cycle 1 completed"
2. **Check GitHub**: Look for ADA's first issue comment or PR
3. **Configure agents**: Customize `agents/roster.json` and playbooks in your repo
4. **Monitor**: Use the health endpoint and Railway dashboard

---

## Related Docs

- [Container Architecture](../architecture/container.md)
- [Model Router](../research/llm-model-selection-for-role-routing-c723.md)
- [Cost Strategy](../business/saas-cost-strategy-endorsement-c721.md)
