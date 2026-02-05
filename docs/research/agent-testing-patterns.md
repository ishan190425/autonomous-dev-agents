# Autonomous Agent Testing Patterns

> Research Survey — Validation Strategies for Multi-Agent Systems
> **Author:** 🔬 Research (The Scout)
> **Date:** 2026-02-05
> **Status:** Draft
> **Issue:** #15

---

## Executive Summary

Testing autonomous AI agents presents unique challenges that traditional software testing cannot address. This research surveys testing patterns across leading agent frameworks (LangGraph, CrewAI, AutoGen, OpenHands) and proposes concrete strategies for ADA's rotation-based multi-agent architecture.

**Key Findings:**

1. **Deterministic seeding** — Most frameworks force reproducibility via temperature=0 and fixed seeds
2. **Property-based testing** — Test behavior invariants, not exact outputs
3. **Mock LLM responses** — Eliminate non-determinism by mocking at the LLM layer
4. **Evaluation harnesses** — Separate test suites from evaluation suites (evals)
5. **Snapshot testing** — Capture "golden" agent behaviors for regression detection

**Recommended Approach for ADA:** Layered testing with mocked LLMs for unit tests, property-based tests for integration, and evaluation harnesses for system-level validation.

---

## The Problem: Testing Non-Deterministic Autonomous Systems

Traditional testing assumes:

- **Determinism:** Same input → same output
- **Isolation:** Units can be tested independently
- **Speed:** Tests complete in milliseconds

Autonomous agents violate all three:

| Challenge             | Traditional Testing | Agent Testing                      |
| --------------------- | ------------------- | ---------------------------------- |
| Output consistency    | Exact match         | Semantic equivalence               |
| State management      | Reset between tests | Persistent memory across cycles    |
| External dependencies | Mock APIs           | Mock LLMs + APIs + file system     |
| Execution time        | <100ms per test     | Seconds to minutes (LLM latency)   |
| Success criteria      | Pass/fail           | Degrees of completion, quality     |
| Non-determinism       | None (bugs)         | Inherent (LLM temperature, timing) |

---

## Framework Survey

### 1. LangGraph (LangChain)

**Testing Approach:** Graph state assertions + checkpoint testing

LangGraph models agents as state machines. Their testing pattern:

```python
# Test graph state transitions
def test_agent_state_transition():
    graph = create_agent_graph()
    initial_state = {"messages": [], "next": "analyze"}

    # Run one step
    result = graph.invoke(initial_state)

    # Assert state properties (not exact values)
    assert result["next"] in ["plan", "execute", "done"]
    assert len(result["messages"]) >= 1
    assert result["messages"][-1].role == "assistant"
```

**Key Patterns:**

- **Checkpoint testing:** Save/restore graph state for reproducible mid-workflow tests
- **Human-in-the-loop mocking:** Simulate human interrupts with test fixtures
- **State schema validation:** Strong typing catches malformed state early

**Relevance to ADA:** Our dispatch cycles are analogous to LangGraph checkpoints. We can test each cycle transition independently.

---

### 2. CrewAI

**Testing Approach:** Task output validation + crew composition tests

CrewAI tests focus on crew-level outcomes rather than individual agent behaviors:

```python
def test_research_crew_completes_task():
    crew = Crew(
        agents=[researcher, writer],
        tasks=[research_task, writing_task],
        verbose=False  # Suppress logs in tests
    )

    # Mock LLM to control outputs
    with patch_llm_responses(fixture_file="research_outputs.json"):
        result = crew.kickoff()

    # Property checks
    assert result is not None
    assert "conclusion" in result.lower()
    assert len(result) > 100
```

**Key Patterns:**

- **Crew composition tests:** Verify correct agent/task assignments
- **Output property validation:** Check structural properties, not exact text
- **Delegation testing:** Ensure tasks route to correct agents
- **Process testing:** Sequential vs hierarchical execution paths

**Relevance to ADA:** Our role rotation is similar to CrewAI's delegation. We should test that rotation logic correctly selects the next role.

---

### 3. AutoGen (Microsoft)

**Testing Approach:** Conversation flow testing + termination conditions

AutoGen treats agent interactions as conversations. Their testing emphasizes:

```python
def test_conversation_termination():
    assistant = AssistantAgent("assistant", llm_config=test_config)
    user = UserProxyAgent("user", code_execution_config={"use_docker": False})

    # Set termination condition
    user.initiate_chat(
        assistant,
        message="Write hello world in Python",
        max_turns=3
    )

    # Assert conversation ended correctly
    assert user.last_message()["content"] != ""
    assert len(user.chat_messages[assistant]) <= 3
```

**Key Patterns:**

- **Termination testing:** Verify agents know when to stop
- **Message flow assertions:** Check conversation structure
- **Code execution sandboxing:** Isolate code execution in containers
- **Multi-agent topology tests:** Verify hub-and-spoke vs peer-to-peer routing

**Relevance to ADA:** Termination testing is critical for dispatch cycles — we need to ensure roles complete their action and don't loop infinitely.

---

### 4. OpenHands (formerly OpenDevin)

**Testing Approach:** SWE-bench-style task completion + sandbox testing

OpenHands tests against real software engineering tasks:

```python
def test_agent_fixes_bug():
    sandbox = create_sandbox(repo="test-repo", issue_id=123)
    agent = SWEAgent(sandbox=sandbox)

    result = agent.solve(
        problem="Fix the failing test in test_utils.py",
        max_iterations=10
    )

    # Verify the fix
    assert sandbox.run_tests().success
    assert sandbox.get_diff() != ""  # Agent made changes
    assert "test_utils.py" in sandbox.get_modified_files()
```

**Key Patterns:**

- **Sandbox isolation:** Each test gets a fresh environment
- **Task completion metrics:** Pass/fail based on objective criteria
- **Iteration limits:** Prevent runaway agents
- **Diff validation:** Verify agents make meaningful changes

**Relevance to ADA:** We need sandbox testing for `ada run` — testing code generation in isolated environments.

---

## Validation Strategies

### Strategy 1: Mock LLM Layer

**Concept:** Replace the LLM with deterministic fixtures for unit tests.

```typescript
// Test fixture
const mockLLMResponses = {
  'What action should Engineering take?': {
    action: 'write_code',
    target: 'packages/cli/src/commands/status.ts',
    description: 'Implement ada status command',
  },
};

// Mock LLM client
class MockLLM implements LLMClient {
  async complete(prompt: string): Promise<string> {
    return JSON.stringify(mockLLMResponses[prompt] ?? { action: 'skip' });
  }
}

// Test with mock
test('Engineering role selects code action', async () => {
  const dispatch = new Dispatch({ llm: new MockLLM() });
  const result = await dispatch.runCycle('engineering');

  expect(result.action).toBe('write_code');
});
```

**Pros:**

- ✅ 100% deterministic
- ✅ Fast (no API calls)
- ✅ Free (no token costs)
- ✅ Offline testing

**Cons:**

- ❌ Doesn't test actual LLM behavior
- ❌ Fixtures can drift from reality
- ❌ Brittle if prompts change

**Recommendation for ADA:** Use for unit tests of dispatch logic, rotation, and memory management.

---

### Strategy 2: Property-Based Testing

**Concept:** Test behavioral invariants rather than exact outputs.

```typescript
import { fc } from 'fast-check';

test('Rotation always advances to valid role', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 9 }), // current_index
      fc.integer({ min: 1, max: 100 }), // cycles to run
      (startIndex, cycles) => {
        let state = { current_index: startIndex, cycle_count: 0 };

        for (let i = 0; i < cycles; i++) {
          state = advanceRotation(state);

          // Invariant: index always valid
          expect(state.current_index).toBeGreaterThanOrEqual(0);
          expect(state.current_index).toBeLessThan(ROSTER.length);

          // Invariant: cycle count always increases
          expect(state.cycle_count).toBe(i + 1);
        }
      }
    )
  );
});
```

**Properties to test for ADA:**

| Component      | Property                                        |
| -------------- | ----------------------------------------------- |
| Rotation       | Always advances, wraps correctly, never skips   |
| Memory Bank    | Never exceeds line limit without compression    |
| Dispatch       | Always produces exactly one action per cycle    |
| Role Playbooks | Actions are always from allowed action list     |
| Git Operations | Branches always from main, commits always valid |

**Recommendation for ADA:** Primary strategy for integration testing.

---

### Strategy 3: Snapshot / Golden Master Testing

**Concept:** Capture "known good" agent outputs, alert on deviation.

```typescript
test('Memory bank update produces expected structure', () => {
  const beforeBank = loadFixture('bank-before.md');
  const action = {
    role: 'engineering',
    action: 'write_code',
    result: 'success',
  };

  const afterBank = updateMemoryBank(beforeBank, action);

  // Snapshot comparison
  expect(afterBank).toMatchSnapshot();
});
```

**When to update snapshots:**

- Intentional behavior changes → update and commit
- Unintentional deviations → investigate and fix

**Recommendation for ADA:** Use for memory bank formatting, rotation state serialization, commit message generation.

---

### Strategy 4: Evaluation Harnesses (Evals)

**Concept:** Separate "does it work?" (tests) from "how well?" (evals).

```typescript
// evals/dispatch-quality.ts
interface EvalResult {
  actionRelevance: number;   // 0-1: Was action appropriate for role?
  issueAlignment: number;    // 0-1: Did action address a real issue?
  memoryAccuracy: number;    // 0-1: Was memory bank updated correctly?
  commitQuality: number;     // 0-1: Did commit follow conventions?
}

async function evaluateDispatchCycle(cycle: CycleResult): Promise<EvalResult> {
  // Use LLM-as-judge to evaluate quality
  const judge = new LLMJudge(model: "claude-3.5-sonnet");

  return {
    actionRelevance: await judge.score(cycle.action, "Was this action appropriate?"),
    issueAlignment: await judge.score(cycle.action, "Did this address the backlog?"),
    memoryAccuracy: await judge.score(cycle.memoryUpdate, "Is this update accurate?"),
    commitQuality: await judge.score(cycle.commit, "Does this follow conventions?")
  };
}
```

**Eval vs Test:**

| Aspect  | Test                | Eval                      |
| ------- | ------------------- | ------------------------- |
| Runs    | Every CI build      | Nightly / weekly          |
| Speed   | Fast (<1s each)     | Slow (LLM calls)          |
| Cost    | Free (mocked)       | $$ (real LLM usage)       |
| Output  | Pass/Fail           | Scores (0-100)            |
| Purpose | Prevent regressions | Measure quality over time |

**Recommendation for ADA:** Implement evals for tracking agent quality across versions.

---

### Strategy 5: Simulation Testing

**Concept:** Run agents in simulated environments with predictable outcomes.

```typescript
class SimulatedGitHub {
  private issues: Issue[] = [];
  private prs: PR[] = [];

  async createIssue(title: string, body: string): Promise<Issue> {
    const issue = { id: this.issues.length + 1, title, body, state: 'open' };
    this.issues.push(issue);
    return issue;
  }

  async listIssues(): Promise<Issue[]> {
    return this.issues.filter(i => i.state === 'open');
  }
}

test('Agent creates issue when backlog is empty', async () => {
  const sim = new SimulatedGitHub();
  const agent = new ProductAgent({ github: sim });

  await agent.runCycle();

  const issues = await sim.listIssues();
  expect(issues.length).toBe(1);
  expect(issues[0].title).toMatch(/^feat\(/);
});
```

**Recommendation for ADA:** Critical for testing GitHub interactions without hitting real API.

---

## Recommended Testing Architecture for ADA

### Layer 1: Unit Tests (Fast, Mocked)

**Target:** Core library functions

```
packages/core/src/
├── rotation/
│   └── rotation.test.ts    # 100% coverage, pure functions
├── memory/
│   └── memory.test.ts      # Mock file system
└── dispatch/
    └── dispatch.test.ts    # Mock LLM + GitHub
```

**Tools:** Vitest, mock-fs, custom LLM mocks
**Speed:** <5 seconds total
**Runs:** Every commit, pre-commit hook

---

### Layer 2: Integration Tests (Medium, Simulated)

**Target:** Multi-component interactions

```
packages/core/tests/integration/
├── dispatch-cycle.test.ts    # Full cycle with simulated GitHub
├── memory-rotation.test.ts   # Memory + rotation interaction
└── role-playbook.test.ts     # Role behavior validation
```

**Tools:** Vitest, simulated GitHub, property-based testing
**Speed:** <30 seconds total
**Runs:** Every PR, CI pipeline

---

### Layer 3: E2E Tests (Slow, Real)

**Target:** Full system behavior

```
tests/e2e/
├── init.test.ts      # ada init creates valid structure
├── run.test.ts       # ada run completes dispatch cycle
└── agents.test.ts    # Full agent team simulation
```

**Tools:** Vitest, real file system (temp dirs), mocked LLM
**Speed:** <2 minutes total
**Runs:** Daily, pre-release

---

### Layer 4: Evaluation Suite (Async, LLM-powered)

**Target:** Quality measurement over time

```
evals/
├── dispatch-quality.eval.ts   # LLM judges dispatch decisions
├── code-quality.eval.ts       # LLM judges generated code
└── memory-accuracy.eval.ts    # LLM judges memory updates
```

**Tools:** Custom eval framework, Claude/GPT as judge
**Speed:** Minutes to hours
**Runs:** Weekly, per-release
**Output:** Dashboard of quality scores over time

---

## Implementation Roadmap

### Phase 1: Foundation (Sprint 1, Week 1)

**Already Complete:**

- [x] Vitest configured for core + cli (PR #21)
- [x] 97 unit tests passing
- [x] Pre-commit hooks running tests

**Remaining:**

- [ ] Add mock LLM client to @ada/core
- [ ] Add simulated GitHub client to @ada/core
- [ ] Achieve 80%+ coverage on rotation/memory modules

---

### Phase 2: Integration (Sprint 1, Week 2)

- [ ] Property-based tests for rotation invariants
- [ ] Dispatch cycle integration tests
- [ ] Memory bank compression tests
- [ ] Snapshot tests for state serialization

---

### Phase 3: E2E (Sprint 2)

- [ ] CLI E2E tests (ada init, ada run)
- [ ] Full dispatch cycle E2E
- [ ] GitHub interaction simulation suite

---

### Phase 4: Evals (Sprint 2+)

- [ ] Design eval framework architecture
- [ ] Implement dispatch quality eval
- [ ] Set up eval dashboard
- [ ] Establish baseline scores

---

## Tool Recommendations

| Category         | Recommended Tool           | Reason                               |
| ---------------- | -------------------------- | ------------------------------------ |
| Unit testing     | **Vitest**                 | Already configured, fast, TypeScript |
| Mocking          | **vitest mocks + mock-fs** | Built-in, no extra deps              |
| Property testing | **fast-check**             | Mature, TypeScript support           |
| Snapshot testing | **Vitest snapshots**       | Built-in, easy updates               |
| E2E CLI testing  | **execa + temp dirs**      | Simple, reliable                     |
| LLM mocking      | **Custom MockLLM class**   | Full control over fixtures           |
| Eval framework   | **Custom + Claude API**    | LLM-as-judge for quality scoring     |
| Coverage         | **Vitest coverage (v8)**   | Already configured                   |

---

## Conclusions

1. **Layer your tests:** Unit (mocked) → Integration (simulated) → E2E (real) → Evals (LLM)

2. **Mock at the LLM layer:** This gives you determinism without losing test value

3. **Use property-based testing:** Test invariants, not exact outputs

4. **Separate tests from evals:** Tests catch regressions; evals measure quality

5. **Simulate external dependencies:** GitHub, file system, and LLM should all be mockable

6. **Invest in eval infrastructure:** Long-term quality tracking is essential for autonomous agents

---

## References

- [LangGraph Testing Guide](https://langchain-ai.github.io/langgraph/how-tos/test/)
- [CrewAI Documentation](https://docs.crewai.com/)
- [AutoGen Conversation Patterns](https://microsoft.github.io/autogen/)
- [SWE-bench Evaluation](https://www.swebench.com/)
- [Property-Based Testing with fast-check](https://fast-check.dev/)
- [Testing Strategies for LLM Applications](https://www.anthropic.com/research)

---

_🔬 Research Role — The Scout_
_Delivering actionable testing strategies for autonomous agent teams_
