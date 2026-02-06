# Human-in-the-Loop Patterns for Autonomous Agents

> Research document surveying HITL approaches in autonomous systems and recommending patterns for ADA.

**Author:** 🔬 Research (The Scout)  
**Issue:** #31  
**Date:** 2026-02-05  
**Status:** Initial Analysis  
**Connects to:** Issue #44 (Budget-Aware Infrastructure)

---

## Executive Summary

Autonomous agents excel at routine tasks but encounter situations requiring human judgment—credentials, approvals, decisions, clarifications. Without a robust Human-in-the-Loop (HITL) protocol, agents either block indefinitely or make unauthorized decisions.

This research surveys HITL patterns across CI/CD, MLOps, workflow automation, and AI agent systems. We recommend a **tiered notification system** with GitHub Issues as the canonical audit trail and real-time channels (Telegram/Slack) for urgent items.

**Key Finding:** The most effective HITL systems share three properties: (1) clear trigger taxonomy, (2) appropriate channel routing, and (3) graceful degradation on timeout. ADA should adopt all three.

---

## 1. HITL Trigger Taxonomy

### 1.1 Trigger Categories

Based on survey of production systems, HITL triggers fall into six categories:

| Category           | Examples                                | Urgency   | Timeout |
| ------------------ | --------------------------------------- | --------- | ------- |
| **Credentials**    | API keys, secrets, tokens               | 🔴 High   | 4-24h   |
| **Approvals**      | Merge to main, deploy prod, spend money | 🟡 Medium | 24-48h  |
| **Decisions**      | Architecture choices, breaking changes  | 🟡 Medium | 48-72h  |
| **Clarifications** | Ambiguous requirements, conflicts       | 🟢 Low    | 72h+    |
| **Escalations**    | Blocked >X cycles, repeated failures    | 🔴 High   | 4-12h   |
| **Cost Triggers**  | Budget threshold, paid API usage        | 🔴 High   | 1-4h    |

### 1.2 Urgency Determination

Urgency should be computed, not hardcoded. Factors:

```typescript
type Urgency = 'critical' | 'high' | 'medium' | 'low';

interface UrgencyFactors {
  blocking: boolean; // Is other work blocked?
  financial: boolean; // Does it involve money?
  security: boolean; // Security implications?
  reversible: boolean; // Can action be undone?
  cyclesBlocked: number; // How long have we waited?
  dependentTasks: number; // How many tasks depend on this?
}

function computeUrgency(factors: UrgencyFactors): Urgency {
  if (factors.security || (factors.financial && !factors.reversible)) {
    return 'critical';
  }
  if (factors.blocking && factors.cyclesBlocked > 3) {
    return 'high';
  }
  if (factors.blocking || factors.dependentTasks > 2) {
    return 'medium';
  }
  return 'low';
}
```

---

## 2. Prior Art Survey

### 2.1 CI/CD Systems

#### GitHub Actions — Manual Approval Gates

**Pattern:** Environment protection rules requiring reviewers.

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://example.com
    steps:
      - run: ./deploy.sh
```

**Strengths:**

- Native GitHub integration
- Audit trail in workflow runs
- Supports multiple required reviewers
- Timeout configurable (default: 30 days)

**Weaknesses:**

- Only for deployments/environments
- No multi-channel notification
- Binary approve/reject (no partial approval)

**Relevance to ADA:** ⭐⭐⭐⭐ — We can leverage this for deployment approvals.

#### Terraform Cloud — Run Approval

**Pattern:** Plan → Manual Approve → Apply workflow.

**Strengths:**

- Shows diff before approval
- Supports Sentinel policies (automated guardrails)
- SSO integration for identity
- Cost estimation before apply

**Weaknesses:**

- Terraform-specific
- Requires TFC/TFE subscription

**Relevance to ADA:** ⭐⭐⭐ — The plan/approve/apply pattern is excellent for infrastructure changes.

#### ArgoCD — Sync Windows & Manual Sync

**Pattern:** Automatic sync disabled for prod, manual trigger required.

**Strengths:**

- GitOps-native
- Diff visualization
- Rollback capability

**Weaknesses:**

- Kubernetes-specific
- No approval workflow, just manual trigger

**Relevance to ADA:** ⭐⭐ — Limited applicability outside GitOps.

### 2.2 MLOps Systems

#### Amazon SageMaker — Human Review Workflows

**Pattern:** A2I (Augmented AI) for ML prediction review.

```python
human_review_workflow = sagemaker.HumanReviewWorkflow(
    name='fraud-detection-review',
    conditions=[
        PredictionConfidence(lt=0.8)  # Review if <80% confident
    ],
    task_template=my_template,
    worker_pool=my_private_workforce
)
```

**Strengths:**

- Condition-based triggering
- Worker pool management
- Partial automation (only low-confidence predictions reviewed)

**Weaknesses:**

- AWS-specific
- ML prediction focused

**Relevance to ADA:** ⭐⭐⭐⭐ — The condition-based triggering pattern is excellent. Agent "confidence" could determine when to ask for help.

#### Weights & Biases — Model Registry Approval

**Pattern:** Model promotion requires approval before production.

**Strengths:**

- Staged promotion (staging → production)
- Artifact lineage tracking
- Slack integration for notifications

**Relevance to ADA:** ⭐⭐⭐ — Staged promotion with approval is applicable to releases.

### 2.3 Workflow Automation

#### Temporal — Human Tasks

**Pattern:** Activities that pause workflow until human completes task.

```go
func HumanApprovalWorkflow(ctx workflow.Context, request ApprovalRequest) error {
    // Create approval task
    taskID := workflow.SideEffect(ctx, func(ctx workflow.Context) interface{} {
        return uuid.New().String()
    })

    // Wait for human (with timeout)
    var approved bool
    selector := workflow.NewSelector(ctx)
    selector.AddReceive(approvalChannel, func(c workflow.ReceiveChannel, more bool) {
        c.Receive(ctx, &approved)
    })
    selector.AddFuture(workflow.NewTimer(ctx, 48*time.Hour), func(f workflow.Future) {
        approved = false // Timeout = reject
    })
    selector.Select(ctx)

    return nil
}
```

**Strengths:**

- First-class workflow primitive
- Durable execution (survives restarts)
- Configurable timeout
- Signal-based response

**Weaknesses:**

- Requires Temporal infrastructure
- Complex for simple use cases

**Relevance to ADA:** ⭐⭐⭐⭐⭐ — The workflow pause pattern is exactly what we need. Agents pause, wait for signal, resume.

#### n8n / Zapier — Approval Steps

**Pattern:** Workflow pauses, sends notification, waits for webhook.

**Strengths:**

- Multi-channel notifications (email, Slack, webhook)
- Simple approve/reject links
- Visual workflow builder

**Weaknesses:**

- External platform dependency
- Limited customization

**Relevance to ADA:** ⭐⭐⭐ — Simple pattern but depends on external service.

### 2.4 AI Agent Systems

#### AutoGen — Human Proxy Agent

**Pattern:** Special agent type that proxies to human.

```python
human_proxy = autogen.UserProxyAgent(
    name="Human",
    human_input_mode="ALWAYS",  # or "TERMINATE" or "NEVER"
    code_execution_config={"work_dir": "coding"}
)
```

**Strengths:**

- Natural conversation flow
- Configurable input mode
- Can execute code on behalf of human

**Weaknesses:**

- Synchronous (blocks on input)
- No async notification
- Single-channel (terminal)

**Relevance to ADA:** ⭐⭐ — Too synchronous for autonomous dispatch.

#### LangGraph — Interrupt/Resume

**Pattern:** Graph execution pauses at interrupt nodes.

```python
from langgraph.checkpoint import MemorySaver

def should_interrupt(state):
    return state["confidence"] < 0.7

graph = StateGraph(AgentState)
graph.add_node("decide", decide_node)
graph.add_conditional_edges("decide", should_interrupt, {
    True: "await_human",
    False: "execute"
})

# Resume later
config = {"configurable": {"thread_id": "123"}}
graph.invoke({"input": "user approved"}, config)
```

**Strengths:**

- State persistence across sessions
- Conditional interrupts
- Resume from checkpoint

**Weaknesses:**

- No built-in notification
- Requires external trigger to resume

**Relevance to ADA:** ⭐⭐⭐⭐ — Checkpoint/resume pattern is directly applicable.

#### CrewAI — Human Input Tool

**Pattern:** Agent calls human_input tool when needed.

```python
from crewai import Agent, Task
from crewai.tools import HumanInputTool

researcher = Agent(
    role='Researcher',
    tools=[HumanInputTool()],
    allow_delegation=True
)
```

**Strengths:**

- Tool-based (composable)
- Agent decides when to ask

**Weaknesses:**

- Synchronous blocking
- No persistence if process dies

**Relevance to ADA:** ⭐⭐⭐ — Tool pattern is good, but needs async enhancement.

---

## 3. Communication Channel Analysis

### 3.1 Channel Comparison

| Channel               | Latency          | Audit        | Security   | Context       | Best For              |
| --------------------- | ---------------- | ------------ | ---------- | ------------- | --------------------- |
| **GitHub Issue**      | Slow (hours)     | ✅ Excellent | ⚠️ Public  | ✅ Rich       | Decisions, approvals  |
| **GitHub PR Comment** | Slow (hours)     | ✅ Excellent | ⚠️ Public  | ✅ Code-aware | Code questions        |
| **Telegram**          | Fast (seconds)   | ❌ Poor      | ✅ Private | ⚠️ Limited    | Urgent, credentials   |
| **Slack**             | Fast (seconds)   | ✅ Good      | ✅ Private | ✅ Rich       | Team notifications    |
| **Discord**           | Fast (seconds)   | ⚠️ Moderate  | ⚠️ Varies  | ✅ Rich       | Community             |
| **Email**             | Medium (minutes) | ✅ Good      | ✅ Private | ✅ Rich       | Non-urgent, summaries |
| **SMS**               | Fast (seconds)   | ❌ Poor      | ✅ Private | ❌ None       | Critical escalations  |
| **CLI Prompt**        | Instant          | ❌ None      | ✅ Local   | ❌ None       | Interactive setup     |

### 3.2 Recommended Channel Strategy

**Dual-channel approach:**

1. **GitHub Issues** — Canonical audit trail for all HITL events
2. **Real-time channel** (user's choice: Telegram/Slack/Discord) — Notifications with links to issues

```
Agent triggers HITL
    ↓
Create GitHub Issue (audit trail)
    ↓
Send notification to real-time channel
    "🔐 Approval needed: Deploy to production"
    [View Issue →] [Approve ✅] [Reject ❌]
    ↓
User clicks Approve
    ↓
Bot comments on issue, closes it
    ↓
Agent resumes
```

### 3.3 Security for Credentials

Credentials should NEVER appear in GitHub Issues. Options:

| Method                    | Security     | UX                      | Implementation            |
| ------------------------- | ------------ | ----------------------- | ------------------------- |
| **GitHub Secrets**        | ✅ Excellent | ⚠️ Requires repo access | Agent requests, user adds |
| **1Password Integration** | ✅ Excellent | ✅ Smooth               | op CLI + service account  |
| **Vault (HashiCorp)**     | ✅ Excellent | ⚠️ Complex              | Agent requests path       |
| **Encrypted DM**          | ✅ Good      | ✅ Smooth               | Telegram/Signal DM        |
| **Environment Variables** | ⚠️ Moderate  | ⚠️ Varies               | CI/deployment config      |

**Recommendation:** Support GitHub Secrets + 1Password integration. For one-off credentials, use encrypted DM channel.

---

## 4. Timeout and Degradation Strategy

### 4.1 Timeout Tiers

```typescript
interface TimeoutConfig {
  reminder: Duration; // When to send reminder
  escalate: Duration; // When to try alternate channel
  fallback: Duration; // When to execute fallback
  abandon: Duration; // When to mark blocked and move on
}

const TIMEOUT_PRESETS: Record<Urgency, TimeoutConfig> = {
  critical: {
    reminder: '1h',
    escalate: '2h',
    fallback: '4h',
    abandon: '24h',
  },
  high: {
    reminder: '4h',
    escalate: '12h',
    fallback: '24h',
    abandon: '48h',
  },
  medium: {
    reminder: '24h',
    escalate: '48h',
    fallback: '72h',
    abandon: '1w',
  },
  low: {
    reminder: '48h',
    escalate: '1w',
    fallback: 'never',
    abandon: '2w',
  },
};
```

### 4.2 Fallback Actions

When timeout expires, agent should have a fallback:

| Trigger Type  | Fallback Action                                  |
| ------------- | ------------------------------------------------ |
| Credentials   | Skip feature, document in issue                  |
| Approval      | Abort action, notify, continue other work        |
| Decision      | Use conservative default, document               |
| Clarification | Make best-effort interpretation, flag for review |
| Cost          | Abort, notify, halt related work                 |

### 4.3 Escalation Path

```
Initial notification (Telegram)
    ↓ reminder timeout
Reminder notification (Telegram)
    ↓ escalate timeout
Escalate to alternate channel (Email)
    ↓ fallback timeout
Execute fallback action
    ↓ abandon timeout
Mark blocked, move to other work
```

---

## 5. ADA-Specific Recommendations

### 5.1 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ADA Dispatch Loop                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Agent Action                                            │
│       ↓                                                  │
│  Needs Human Input?  ──NO──→  Execute Normally           │
│       ↓ YES                                              │
│  Create HITLRequest                                      │
│       ↓                                                  │
│  ┌─────────────────────────────────────────────────┐    │
│  │               HITL Manager                       │    │
│  ├─────────────────────────────────────────────────┤    │
│  │  1. Create GitHub Issue (audit)                  │    │
│  │  2. Send notification (real-time channel)        │    │
│  │  3. Persist request state                        │    │
│  │  4. Start timeout timers                         │    │
│  │  5. Resume on response or timeout                │    │
│  └─────────────────────────────────────────────────┘    │
│       ↓                                                  │
│  Agent Pauses (works on other tasks)                    │
│       ↓                                                  │
│  Human Responds                                          │
│       ↓                                                  │
│  HITL Manager detects response                          │
│       ↓                                                  │
│  Agent Resumes                                           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 5.2 API Design

```typescript
// @ada/core - HITL module

interface HITLRequest {
  id: string;
  type:
    | 'credentials'
    | 'approval'
    | 'decision'
    | 'clarification'
    | 'escalation'
    | 'cost';
  urgency: Urgency;
  agent: string; // Role that triggered
  cycle: number; // Cycle number
  context: {
    issue?: number; // Related GitHub issue
    pr?: number; // Related PR
    task: string; // What agent is trying to do
    reason: string; // Why human input is needed
  };
  request: {
    prompt: string; // Question for human
    options?: string[]; // Multiple choice (if applicable)
    default?: string; // Default if timeout
  };
  channels: {
    github: { issueId: number };
    realtime?: { channel: string; messageId: string };
  };
  timeout: TimeoutConfig;
  state:
    | 'pending'
    | 'reminded'
    | 'escalated'
    | 'resolved'
    | 'timeout'
    | 'abandoned';
  response?: {
    value: string;
    respondedBy: string;
    respondedAt: Date;
    channel: string;
  };
}

interface HITLManager {
  request(
    req: Omit<HITLRequest, 'id' | 'state' | 'channels'>
  ): Promise<HITLRequest>;
  respond(
    requestId: string,
    response: string,
    respondedBy: string
  ): Promise<void>;
  check(requestId: string): Promise<HITLRequest>;
  cancel(requestId: string, reason: string): Promise<void>;
  list(filter?: { state?: string; agent?: string }): Promise<HITLRequest[]>;
}
```

### 5.3 GitHub Issue Template

```markdown
---
name: 🔐 Human Input Required
about: Agent requires human input to proceed
labels: human-input-required, {{urgency}}
---

## 🔐 Human Input Required

| Field       | Value                      |
| ----------- | -------------------------- |
| **Agent**   | {{role}} (Cycle {{cycle}}) |
| **Urgency** | {{urgency}}                |
| **Type**    | {{type}}                   |
| **Timeout** | {{timeout}}                |

### Context

{{context}}

### Request

{{prompt}}

{{#if options}}
**Options:**
{{#each options}}

- [ ] {{this}}
      {{/each}}
      {{/if}}

### How to Respond

1. Comment on this issue with your response
2. Or use the buttons in the notification message
3. Or add a 👍 reaction to approve / 👎 to reject

### Timeout Behavior

If no response by **{{timeoutDate}}**, the agent will: {{fallbackAction}}

---

_Auto-generated by ADA HITL Manager_
```

### 5.4 Integration with Budget-Aware Infrastructure

Per Issue #44, cost triggers are critical HITL events:

```typescript
// Integration with @ada/budget (future)
interface CostApprovalRequest extends HITLRequest {
  type: 'cost';
  cost: {
    service: string; // e.g., 'vercel', 'aws', 'stripe'
    estimatedAmount: number;
    currency: string;
    budgetRemaining: number;
    percentOfBudget: number;
  };
}

// Auto-trigger HITL for cost thresholds
const COST_THRESHOLDS = {
  autoApprove: 10, // <$10: auto-approve
  requireApproval: 100, // $10-100: require approval
  requireMultiple: 1000, // >$100: require multiple approvers
};
```

---

## 6. Implementation Roadmap

### Phase 1: Core HITL Infrastructure (v1.1)

- [ ] HITLRequest type and state machine
- [ ] GitHub Issue creation/monitoring
- [ ] Basic timeout handling
- [ ] Memory bank integration for pending requests

### Phase 2: Multi-Channel Notifications (v1.2)

- [ ] Telegram integration
- [ ] Slack integration
- [ ] Discord integration
- [ ] Channel preference configuration

### Phase 3: Advanced Features (v1.3)

- [ ] Approval workflows (multi-approver)
- [ ] 1Password credential integration
- [ ] Cost trigger integration with @ada/budget
- [ ] Escalation path automation

### Phase 4: Dashboard (v2.0)

- [ ] Web UI for pending requests
- [ ] Batch approve/reject
- [ ] Analytics (response times, bottlenecks)

---

## 7. Open Questions

1. **Batching:** Should multiple HITL requests be grouped into a single notification? Risk: notification fatigue vs. delayed individual items.

2. **Delegation:** Can users delegate approval authority? Risk: security vs. velocity.

3. **Confidence-Based Triggering:** Should agents have a "confidence" score that determines when to ask for help? (Like SageMaker A2I)

4. **Silent Approval:** For low-risk decisions, should "no response" mean "approved"? Risk: surprises vs. velocity.

5. **Cross-Cycle Persistence:** How to handle requests that span multiple dispatch cycles? State must persist.

---

## 8. Conclusion

A robust HITL system is essential for autonomous agents that interact with the real world. Based on this survey, ADA should implement:

1. **Tiered urgency system** with computed (not hardcoded) urgency
2. **Dual-channel approach** — GitHub for audit, real-time for notification
3. **Graceful degradation** — clear timeouts and fallback actions
4. **State persistence** — requests survive restarts
5. **Cost integration** — special handling for financial approvals

This connects directly to the budget-aware infrastructure work (Issue #44) and is foundational for expanding agent autonomy safely.

---

_🔬 Research | Cycle 79 | Issue #31_
