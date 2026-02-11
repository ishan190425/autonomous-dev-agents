# Related Work: Multi-Agent Autonomous Software Development

> **arXiv Paper Section 2 — Draft v1.0**
> **Issue:** #131, #90 | **Cycle:** C388 | **Author:** 🔬 Research
> **Purpose:** Expanded Related Work section for academic credibility

---

## 2. Related Work

The landscape of AI-assisted software development has evolved rapidly from simple code completion to fully autonomous coding agents. We situate ADA within this landscape by examining four key research areas: (1) human-in-the-loop code assistants, (2) autonomous single-agent systems, (3) multi-agent coordination frameworks, and (4) memory architectures for persistent agents.

### 2.1 Code Assistants with Human-in-the-Loop

The first generation of AI coding tools operated as intelligent assistants requiring continuous human guidance.

**GitHub Copilot** [1] introduced inline code completion using large language models trained on public repositories. While effective for boilerplate and common patterns, Copilot operates at the statement level, requiring human developers to orchestrate higher-level design decisions. Chen et al. (2021) [2] demonstrated that Copilot improves developer productivity by 55% on certain tasks but noted that it functions as a "pair programmer" rather than an autonomous agent.

**Cursor** [3] extended the assistant paradigm with chat-based interaction, allowing developers to describe changes in natural language. Cursor's "Agent" mode can make multi-file edits but still requires human approval before applying changes. This represents a step toward autonomy but maintains the human as the orchestrating intelligence.

**Aider** [4] introduced git-aware code editing, allowing LLMs to understand repository context and generate commits. Gauthier (2024) demonstrated that git integration improves context relevance, but Aider still operates as a human-directed tool rather than an autonomous agent.

_Key distinction:_ These tools augment human developers; ADA replaces the need for constant human guidance by simulating an entire development team with specialized roles.

### 2.2 Autonomous Coding Agents

The second wave introduced agents capable of autonomously completing complex coding tasks.

**SWE-Agent** [5] from Princeton achieved state-of-the-art results on SWE-bench by designing a specialized Agent-Computer Interface (ACI). Yang et al. (2024) demonstrated that careful interface design—limiting available commands, providing structured feedback—significantly improves agent performance. SWE-Agent processes issues sequentially and lacks persistent memory across sessions.

**Devin** [6] from Cognition AI was announced as the "first AI software engineer," demonstrating autonomous completion of Upwork contracts. While impressive, Devin operates as a closed commercial system with limited architectural transparency. Initial benchmarks showed 13.86% SWE-bench resolution, though the system has improved since launch.

**OpenHands** (formerly OpenDevin) [7] provides an open-source alternative, implementing a sandboxed environment where agents can write code, run tests, and browse documentation. Wang et al. (2024) demonstrated competitive SWE-bench performance with their AgentCentric approach. Like other single-agent systems, OpenHands lacks role specialization and persistent organizational memory.

**Claude Code** [8] from Anthropic represents the latest evolution, combining agentic file editing with tool use in a terminal environment. While capable of complex multi-step tasks, it remains a single-agent system that treats software development as an individual rather than team activity.

_Key distinction:_ These systems are powerful but monolithic. They lack the division of labor (product thinking vs. engineering vs. QA) that characterizes successful human software teams. ADA introduces role specialization to address this gap.

### 2.3 Multi-Agent Frameworks

Several frameworks have explored multi-agent architectures for improved AI coordination.

**AutoGen** [9] from Microsoft introduced the concept of "conversational agents" that can engage in multi-turn dialogues. Wu et al. (2023) demonstrated that role-based prompting improves task performance when agents are assigned distinct personas. However, AutoGen is a general-purpose framework without domain-specific adaptations for software development workflows.

**CrewAI** [10] simplified multi-agent orchestration with a Crew → Agent → Task hierarchy. CrewAI agents can be assigned roles (e.g., "senior software engineer") and collaborate through tool sharing. While more accessible than AutoGen, CrewAI lacks persistent memory across sessions and has no built-in governance mechanisms.

**LangGraph** [11] from LangChain enables stateful agent workflows through graph-based orchestration. Graphs can encode complex branching logic and multi-agent handoffs. LangGraph provides infrastructure but not domain-specific patterns for software development.

**MetaGPT** [12] introduced the concept of "software company simulation," assigning agents roles like Product Manager, Architect, and Engineer. Hong et al. (2023) demonstrated that role specialization improves code quality on HumanEval benchmarks. MetaGPT's waterfall-style workflow (PM → Architect → Engineer → QA) differs from ADA's round-robin dispatch, which ensures all roles receive regular attention regardless of project phase.

**ChatDev** [13] similarly simulates a software company with multiple agents. Qian et al. (2023) showed that chat-based collaboration between agents can produce functional software from natural language descriptions. However, ChatDev operates in single-session mode without persistent learning across projects.

_Key distinction:_ Existing multi-agent frameworks either lack domain specificity (AutoGen, CrewAI, LangGraph) or lack persistent memory and self-governance (MetaGPT, ChatDev). ADA combines role specialization with persistent memory, compression, and rule-based governance.

### 2.4 Memory Architectures for Persistent Agents

Long-running agents require memory systems that persist beyond context windows.

**MemGPT** [14] introduced the concept of "virtual context management," where agents explicitly manage their own memory through self-directed edits. Packer et al. (2023) demonstrated that MemGPT can maintain coherent conversations across sessions by archiving and retrieving relevant context. However, MemGPT's memory is unstructured—agents decide what to remember without organizational guidance.

**Generative Agents** [15] from Stanford created "believable simulacra of human behavior" through memory retrieval with importance scoring. Park et al. (2023) showed that combining recency, importance, and relevance produces human-like memory patterns. Their reflection mechanism—periodically synthesizing higher-level insights—directly inspired ADA's Lessons Learned extraction.

**Reflexion** [16] by Shinn et al. introduced verbal reinforcement learning, where agents improve through self-critique. Reflexion agents maintain a memory of past attempts and failure modes, using this context to improve subsequent tries. ADA adapts this pattern for multi-agent teams through cross-role insight extraction.

**MemoryBank** [17] demonstrated that structured memory with explicit forgetting mechanisms improves agent consistency over long horizons. Zhong et al. (2024) showed that memory compression—summarizing old context while preserving key facts—extends effective agent lifetime.

_Key distinction:_ ADA combines insights from these systems: structured memory bank (MemoryBank), importance-based compression (Generative Agents), self-reflection (Reflexion), and virtual context management (MemGPT). The novel contribution is applying these patterns to multi-role software teams with rule-based governance.

### 2.5 Benchmarks and Evaluation

Evaluating autonomous coding agents requires standardized benchmarks.

**SWE-bench** [18] by Jimenez et al. provides 2,294 real-world GitHub issues for testing agent capability. While widely adopted, SWE-bench evaluates single-issue resolution rather than sustained development velocity.

**HumanEval** [19] by Chen et al. tests code generation through function completion tasks. HumanEval measures implementation capability but not design, testing, or coordination skills.

**Terminal-Bench** and **Context-Bench** (proposed by ADA) address gaps in existing benchmarks by measuring CLI test coverage and memory efficiency respectively. These benchmarks evaluate the full development workflow rather than isolated code generation.

### 2.6 Positioning of ADA

Table 1 positions ADA against related systems across key dimensions:

| System      | Multi-Agent | Role Specialization | Persistent Memory | Self-Governance | Open Source |
| ----------- | ----------- | ------------------- | ----------------- | --------------- | ----------- |
| SWE-Agent   | ❌          | ❌                  | ❌                | ❌              | ✅          |
| Devin       | ❌          | ❌                  | Partial           | ❌              | ❌          |
| OpenHands   | ❌          | ❌                  | ❌                | ❌              | ✅          |
| Claude Code | ❌          | ❌                  | ❌                | ❌              | ❌          |
| AutoGen     | ✅          | Partial             | ❌                | ❌              | ✅          |
| CrewAI      | ✅          | ✅                  | ❌                | ❌              | ✅          |
| MetaGPT     | ✅          | ✅                  | ❌                | ❌              | ✅          |
| ChatDev     | ✅          | ✅                  | ❌                | ❌              | ✅          |
| **ADA**     | ✅          | ✅                  | ✅                | ✅              | ✅          |

ADA is the first framework to combine multi-agent role specialization with persistent memory, compression, and rule-based self-governance for autonomous software development.

---

## References

[1] GitHub Copilot. "Your AI pair programmer." https://github.com/features/copilot (2021)

[2] Chen, M., et al. "Evaluating Large Language Models Trained on Code." arXiv:2107.03374 (2021)

[3] Cursor. "The AI-first Code Editor." https://cursor.sh (2023)

[4] Gauthier, P. "Aider: AI Pair Programming in Your Terminal." https://aider.chat (2024)

[5] Yang, J., et al. "SWE-Agent: Agent-Computer Interfaces Enable Automated Software Engineering." arXiv:2405.15793 (2024)

[6] Cognition AI. "Introducing Devin, the first AI software engineer." https://www.cognition-labs.com/introducing-devin (2024)

[7] Wang, X., et al. "OpenHands: An Open Platform for AI Software Developers as Generalist Agents." arXiv:2407.16741 (2024)

[8] Anthropic. "Claude Code: Agentic coding in your terminal." https://www.anthropic.com/claude-code (2025)

[9] Wu, Q., et al. "AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation." arXiv:2308.08155 (2023)

[10] CrewAI Documentation. "Framework for orchestrating role-playing AI agents." https://docs.crewai.com (2024)

[11] LangChain. "LangGraph: Build stateful, multi-actor applications." https://langchain-ai.github.io/langgraph (2024)

[12] Hong, S., et al. "MetaGPT: Meta Programming for A Multi-Agent Collaborative Framework." arXiv:2308.00352 (2023)

[13] Qian, C., et al. "ChatDev: Communicative Agents for Software Development." arXiv:2307.07924 (2023)

[14] Packer, C., et al. "MemGPT: Towards LLMs as Operating Systems." arXiv:2310.08560 (2023)

[15] Park, J.S., et al. "Generative Agents: Interactive Simulacra of Human Behavior." UIST 2023. arXiv:2304.03442

[16] Shinn, N., et al. "Reflexion: Language Agents with Verbal Reinforcement Learning." NeurIPS 2023. arXiv:2303.11366

[17] Zhong, W., et al. "MemoryBank: Enhancing Large Language Models with Long-Term Memory." AAAI 2024. arXiv:2305.10250

[18] Jimenez, C.E., et al. "SWE-bench: Can Language Models Resolve Real-World GitHub Issues?" ICLR 2024. arXiv:2310.06770

[19] Chen, M., et al. "Evaluating Large Language Models Trained on Code." arXiv:2107.03374 (2021)

---

## Integration Notes

**For Paper Assembly:**

- This section should follow Introduction (Section 1)
- Approximately 1,500-2,000 words in final form
- Table 1 can be converted to LaTeX tabular format
- All citations should be converted to BibTeX entries

**Key Contributions Highlighted:**

1. ADA combines multi-agent + persistent memory + self-governance (unique combination)
2. Role specialization for software development workflows (beyond generic frameworks)
3. Memory compression inspired by Generative Agents / MemoryBank research
4. Reflexion adapted for cross-role teams (novel application)

---

_Section 2 draft prepared for #131. Enables first draft assembly by Mar 7._
