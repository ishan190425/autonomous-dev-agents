# 📚 Related Work: Literature Review for arXiv Paper

> Comprehensive literature survey for Section 2 of the ADA arXiv paper.
> **Author:** Research (🔬 The Scout)
> **Cycle:** 458
> **Date:** 2026-02-12
> **Related:** #131, arxiv-paper-outline-c448.md

---

## Overview

This document provides the literature foundation for Section 2 (Related Work) of the ADA paper. Each category includes:

- Key papers/tools with proper citations
- Brief methodology summaries
- ADA differentiation points

**Target:** ~20 references across 3 categories, supporting 1.5 pages of Related Work.

---

## 1. Single-Agent Coding Tools

### 1.1 GitHub Copilot

**Reference:** Chen, M., et al. (2021). "Evaluating Large Language Models Trained on Code." _arXiv:2107.03374_

**Type:** Code completion assistant

**Methodology:**

- Codex model (GPT-3 fine-tuned on code)
- Inline completion in IDEs
- No persistent context beyond current file
- No autonomous action capability

**ADA Differentiation:**

- Copilot suggests; ADA acts autonomously
- Copilot has no memory across sessions
- Copilot is single-file; ADA handles project-wide context

---

### 1.2 Cursor

**Reference:** Cursor (2023). _cursor.so_ — AI-First IDE.

**Type:** IDE with integrated AI agents

**Methodology:**

- Multi-file context via embeddings
- Chat interface for code changes
- Composer for multi-file edits
- Agent mode for autonomous tasks

**ADA Differentiation:**

- Cursor is IDE-bound; ADA is infrastructure-agnostic
- Cursor lacks persistent role-based coordination
- ADA's memory persists across days/weeks; Cursor resets per session

---

### 1.3 Aider

**Reference:** Gauthier, P. (2023). _aider.chat_ — AI Pair Programming in Terminal.

**Type:** Terminal-based pair programmer

**Methodology:**

- Git-integrated chat interface
- Supports multiple LLM backends
- Code editing via diff application
- Single-session context

**ADA Differentiation:**

- Aider is reactive; ADA is proactive (dispatch cycles)
- Aider has no cross-session memory
- ADA coordinates 10 roles; Aider is single-actor

---

### 1.4 Claude Code

**Reference:** Anthropic (2025). _claude.ai/code_ — CLI Coding Agent.

**Type:** CLI agent with sophisticated reasoning

**Methodology:**

- Multi-turn conversation with tool use
- File system, terminal, and web access
- Extended thinking mode for complex tasks
- CLAUDE.md project context

**ADA Differentiation:**

- Claude Code is single-actor; ADA orchestrates a team
- No persistent memory in Claude Code
- ADA's reflexion system extracts cross-cycle patterns
- ADA adds role specialization and governance

---

### 1.5 Codex CLI (OpenAI)

**Reference:** OpenAI (2025). _Codex CLI_ — Agent-based coding assistant.

**Type:** CLI agent with sandboxed execution

**Methodology:**

- Sandboxed execution environment
- Support for agentic loops
- Multi-turn code generation
- Project-level context

**ADA Differentiation:**

- Codex is execution-focused; ADA includes planning, review, ops
- No persistent team state in Codex
- ADA's governance evolves with the project

---

## 2. Multi-Agent Frameworks

### 2.1 AutoGen (Microsoft)

**Reference:** Wu, Q., et al. (2023). "AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation." _arXiv:2308.08155_

**Type:** Conversation-based multi-agent framework

**Methodology:**

- Agents communicate via conversation
- Supports human-in-the-loop
- Extensible with custom agents
- Code execution capabilities

**ADA Differentiation:**

- AutoGen is conversation-based; ADA uses rotation and dispatch
- ADA has persistent memory bank; AutoGen resets per session
- ADA's RULES.md provides self-governance
- AutoGen lacks reflexion/self-improvement

**Key insight:** AutoGen's conversation model works for task completion but lacks coordination for sustained development.

---

### 2.2 CrewAI

**Reference:** Moura, J. (2024). _crewai.com_ — Multi-Agent Framework.

**Type:** Role-based multi-agent orchestration

**Methodology:**

- Agents have roles, goals, backstories
- Sequential and hierarchical process modes
- Tool integration (search, file I/O, etc.)
- Task delegation between agents

**ADA Differentiation:**

- CrewAI inspired ADA's role concept
- ADA adds persistent memory compression
- ADA's self-governance (RULES.md) is unique
- CrewAI lacks reflexion for pattern extraction
- ADA designed for sustained ops, not one-shot tasks

**Acknowledgment:** ADA's role-based design draws inspiration from CrewAI.

---

### 2.3 LangGraph

**Reference:** LangChain (2024). _LangGraph_ — Graph-based agent orchestration.

**Type:** Graph-based workflow for agents

**Methodology:**

- Agents as nodes, transitions as edges
- State machine semantics
- Supports cycles, conditional branching
- Persistence via checkpointers

**ADA Differentiation:**

- LangGraph is workflow-focused; ADA is team-focused
- ADA's rotation is simpler than graph orchestration
- Memory bank compression not native to LangGraph
- LangGraph checkpoints state; ADA compresses knowledge

---

### 2.4 Semantic Kernel (Microsoft)

**Reference:** Microsoft (2023). _Semantic Kernel_ — SDK for LLM Apps.

**Type:** SDK for building LLM applications

**Methodology:**

- Plugin architecture for LLM capabilities
- Memory and planning abstractions
- Multi-language support (C#, Python, Java)
- Enterprise focus

**ADA Differentiation:**

- Semantic Kernel is SDK; ADA is framework
- ADA's rotation and governance are unique
- Semantic Kernel is general-purpose; ADA is dev-team-focused

---

### 2.5 OpenAI Assistants API

**Reference:** OpenAI (2024). _Assistants API_ — Persistent AI agents.

**Type:** Managed agent infrastructure

**Methodology:**

- Threads for conversation persistence
- Tool use (code interpreter, retrieval, functions)
- Managed file storage
- Run lifecycle management

**ADA Differentiation:**

- Assistants API is single-agent; ADA is multi-agent
- No role specialization in Assistants
- ADA's governance and reflexion are unique
- Assistants lacks team coordination

---

## 3. Autonomous Coding Agents

### 3.1 Devin (Cognition)

**Reference:** Cognition AI (2024). _Devin_ — First AI Software Engineer.

**Type:** Closed-source autonomous coding agent

**Methodology:**

- Full development environment control
- Multi-step planning and execution
- Web browsing and research capabilities
- (Methodology largely opaque)

**ADA Differentiation:**

- Devin is closed-source; ADA is open
- ADA's methodology is fully documented and reproducible
- ADA's role-based approach is transparent
- ADA enables academic study; Devin does not

**Critical note:** Devin's closed nature limits scientific comparison. Claims cannot be independently verified.

---

### 3.2 OpenHands (formerly OpenDevin)

**Reference:** Wang, X., et al. (2024). "OpenDevin: An Open Platform for AI Software Developers." _arXiv:2407.16741_

**Type:** Open-source autonomous coding agent

**Methodology:**

- Browser + terminal agent sandbox
- Event-driven architecture
- SWE-bench evaluation support
- Extensible action space

**ADA Differentiation:**

- OpenHands is single-agent; ADA is multi-agent team
- OpenHands lacks persistent memory compression
- ADA includes governance and reflexion
- OpenHands focuses on benchmarks; ADA on sustained operation

---

### 3.3 SWE-Agent (Princeton)

**Reference:** Yang, J., et al. (2024). "SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering." _arXiv:2405.15793_

**Type:** Benchmark-optimized coding agent

**Methodology:**

- Custom agent-computer interface (ACI)
- Optimized for SWE-bench
- File navigation and editing commands
- Linting-based error recovery

**ADA Differentiation:**

- SWE-Agent is benchmark-focused; ADA is production-focused
- SWE-Agent solves isolated issues; ADA manages projects
- ADA's multi-agent approach distributes responsibilities
- No persistent memory in SWE-Agent

---

### 3.4 Agentless (UIUC)

**Reference:** Xia, C., et al. (2024). "Agentless: Demystifying LLM-based Software Engineering Agents." _arXiv:2407.01489_

**Type:** Non-agentic baseline approach

**Methodology:**

- Simple localize-then-fix approach
- No agentic scaffolding
- Surprisingly competitive with agents on SWE-bench
- Challenges complexity of agent architectures

**ADA Differentiation:**

- Agentless questions the need for agents for simple tasks
- ADA targets sustained, complex development — not one-shot fixes
- Multi-role coordination essential for project management
- Validates that simple approaches work for simple tasks; ADA handles complex ones

---

## 4. Self-Improvement & Reflexion

### 4.1 Reflexion

**Reference:** Shinn, N., et al. (2023). "Reflexion: Language Agents with Verbal Reinforcement Learning." _NeurIPS 2023_

**Type:** Self-improving language agents

**Methodology:**

- Verbal feedback loop for self-improvement
- Episodic memory for reflection
- No gradient updates — text-based reinforcement
- Significant performance gains on benchmarks

**ADA Differentiation:**

- ADA implements Reflexion Phase 1 (capture) with Phase 2 (patterns) specced
- ADA extends to multi-agent: cross-role pattern detection
- Confidence thresholds (70%+) for pattern extraction
- Reflexion is single-agent; ADA applies to teams

**Key insight:** ADA's reflexion extracts organizational patterns, not just task-level improvements.

---

### 4.2 Self-Taught Reasoner (STaR)

**Reference:** Zelikman, E., et al. (2022). "STaR: Self-Taught Reasoner." _NeurIPS 2022_

**Type:** Iterative self-improvement via rationale generation

**Methodology:**

- Generate rationales for correct answers
- Fine-tune on successful rationales
- Iterate until convergence

**ADA Differentiation:**

- STaR requires fine-tuning; ADA uses prompting
- ADA's learnings are persistent and human-readable
- Different paradigm: STaR improves model; ADA improves process

---

## 5. Memory & Context Management

### 5.1 MemGPT

**Reference:** Packer, C., et al. (2023). "MemGPT: Towards LLMs as Operating Systems." _arXiv:2310.08560_

**Type:** Memory management for LLMs

**Methodology:**

- Hierarchical memory (main + archival)
- Self-directed memory operations
- Pagination for long contexts
- OS-inspired memory architecture

**ADA Differentiation:**

- MemGPT is general-purpose; ADA is dev-team-focused
- ADA's compression is domain-specific (dev artifacts)
- Memory bank structure reflects development workflow
- Both solve context limits, different approaches

---

### 5.2 Generative Agents (Stanford)

**Reference:** Park, J., et al. (2023). "Generative Agents: Interactive Simulacra of Human Behavior." _UIST 2023_

**Type:** Simulated agents with memory streams

**Methodology:**

- Memory streams capture observations
- Retrieval based on relevance + recency + importance
- Reflection extracts higher-level insights
- Planning via reflection

**ADA Differentiation:**

- Generative Agents simulate humans; ADA performs development
- Both use reflection for insight extraction
- ADA's memory is project-centric, not agent-centric
- ADA's rotation replaces Generative Agents' free scheduling

---

## 6. Comparison Table (for paper)

| Feature              | ADA            | CrewAI      | AutoGen     | Devin   | OpenHands | SWE-Agent    |
| -------------------- | -------------- | ----------- | ----------- | ------- | --------- | ------------ |
| Role specialization  | ✅ 10 roles    | ✅ Custom   | Partial     | Unknown | ❌ Single | ❌ Single    |
| Persistent memory    | ✅ Compressed  | Limited     | ❌          | Unknown | ❌        | ❌           |
| Self-governance      | ✅ RULES.md    | ❌          | ❌          | Unknown | ❌        | ❌           |
| Reflexion            | ✅ Phase 1     | ❌          | ❌          | Unknown | ❌        | ❌           |
| Open source          | ✅             | ✅          | ✅          | ❌      | ✅        | ✅           |
| Sustained operation  | ✅ 450+ cycles | ❌ One-shot | ❌ One-shot | Unknown | ❌        | ❌ Benchmark |
| Documented learnings | ✅ 191         | ❌          | ❌          | ❌      | ❌        | ❌           |

---

## References (BibTeX)

```bibtex
@article{chen2021evaluating,
  title={Evaluating Large Language Models Trained on Code},
  author={Chen, Mark and others},
  journal={arXiv preprint arXiv:2107.03374},
  year={2021}
}

@article{wu2023autogen,
  title={AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation},
  author={Wu, Qingyun and others},
  journal={arXiv preprint arXiv:2308.08155},
  year={2023}
}

@inproceedings{shinn2023reflexion,
  title={Reflexion: Language Agents with Verbal Reinforcement Learning},
  author={Shinn, Noah and others},
  booktitle={NeurIPS},
  year={2023}
}

@article{yang2024sweagent,
  title={SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering},
  author={Yang, John and others},
  journal={arXiv preprint arXiv:2405.15793},
  year={2024}
}

@article{wang2024opendevin,
  title={OpenDevin: An Open Platform for AI Software Developers},
  author={Wang, Xingyao and others},
  journal={arXiv preprint arXiv:2407.16741},
  year={2024}
}

@article{xia2024agentless,
  title={Agentless: Demystifying LLM-based Software Engineering Agents},
  author={Xia, Chunqiu and others},
  journal={arXiv preprint arXiv:2407.01489},
  year={2024}
}

@article{packer2023memgpt,
  title={MemGPT: Towards LLMs as Operating Systems},
  author={Packer, Charles and others},
  journal={arXiv preprint arXiv:2310.08560},
  year={2023}
}

@inproceedings{park2023generative,
  title={Generative Agents: Interactive Simulacra of Human Behavior},
  author={Park, Joon Sung and others},
  booktitle={UIST},
  year={2023}
}

@inproceedings{zelikman2022star,
  title={STaR: Self-Taught Reasoner},
  author={Zelikman, Eric and others},
  booktitle={NeurIPS},
  year={2022}
}
```

---

## Summary for Paper

**Key positioning:**

- ADA is the first open-source framework combining **role-based multi-agent coordination**, **persistent memory with compression**, **self-governance via evolving rules**, and **reflexion-based self-improvement**
- Unlike benchmark-focused agents (SWE-Agent, OpenHands), ADA targets **sustained autonomous operation** (450+ cycles)
- Unlike single-agent tools (Copilot, Aider, Claude Code), ADA provides **team-level coordination**
- Unlike closed systems (Devin), ADA enables **reproducible research**

**Contribution claims:**

1. First documented multi-agent dev team with persistent memory
2. Self-governance that evolves with the project (RULES.md)
3. Cross-role reflexion for organizational pattern detection
4. Open-source methodology enabling reproduction and extension

---

_🔬 Research | Cycle 458 | Related Work Literature_
_Cross-referenced: #131, arxiv-paper-outline-c448.md_
