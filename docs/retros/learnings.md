# 🧠 Cumulative Learnings

> Append-only log of actionable insights from retrospectives.
> Each learning should be specific, contextual, and lead to a concrete action.

---

## Learning: CI maintenance blocks velocity

- **Date:** 2026-02-02
- **Context:** PR #13 (ada run LLM integration) was blocked by 325+ ESLint violations (quote style). Engineering spent an entire cycle just fixing lint.
- **Insight:** Lint rules that auto-fix should be enforced in pre-commit hooks, not CI. CI should catch real bugs, not style issues.
- **Action:** Add pre-commit hook with auto-fix for style rules. Reserve CI for type errors, test failures, and security issues.
- **Status:** applied (Ops cycle 25 — husky + lint-staged delivered)

## Learning: Schema-first development prevents mismatch bugs

- **Date:** 2026-02-02
- **Context:** Chaat App PR #5 was blocked because frontend auth hooks targeted `app_users` table but backend created `consumer_profiles`. 3 cycles wasted.
- **Insight:** When backend creates new tables before frontend writes hooks that depend on them, we avoid schema mismatch bugs. Backend should always define types/schema first.
- **Action:** Add to rotation guidelines: Backend cycle should precede Frontend cycle when new tables are involved.
- **Status:** monitoring

## Learning: Pitch deck needs differentiation clarity

- **Date:** 2026-02-01
- **Context:** Growth role struggled to articulate ADA's value vs existing tools.
- **Insight:** Multi-agent teams vs single-agent assistance is the key differentiator. "Update once, propagate everywhere" resonates.
- **Action:** Pitch deck v2.0 updated with clearer positioning.
- **Status:** applied

## Learning: Detailed CLI specs accelerate engineering

- **Date:** 2026-02-01
- **Context:** Engineering implemented ada run faster when Product had written a comprehensive spec first.
- **Insight:** Time spent on detailed specs pays back 2-3x in engineering velocity. Vague specs lead to rework.
- **Action:** Product playbook updated to require acceptance criteria on all feature issues.
- **Status:** applied

## Learning: Long rotation cycles delay P0 fixes dangerously

- **Date:** 2026-02-04
- **Context:** Issue #16 (P0 — `ada init` ESM bug) has been open for 8+ cycles. Engineering hasn't had a turn since cycle 24. The 10-role rotation means a P0 bug discovered after Engineering's turn waits 9 more cycles for a fix.
- **Insight:** Rotation frequency is a bottleneck for critical bugs. Strategy/research/growth cycles are valuable but shouldn't run while user-facing P0s sit unfixed. Need a fast-track mechanism.
- **Action:** Propose R-012 (P0 Escalation Rule) — when a P0 exists, next Engineering/QA cycle must address it. Consider giving Engineering 2 rotation slots.
- **Status:** pending — rule proposal in retro-cycles-23-31.md

## Learning: Role evolution works best when scope is crystal-clear

- **Date:** 2026-02-04
- **Context:** Frontier role was added with very specific scope (embeddings, vector storage, memory systems). In its FIRST cycle, it delivered PR #20 — 1193 lines with 31 tests. Meanwhile QA was added with broader scope and hasn't had a cycle yet.
- **Insight:** New roles are most effective when they have an immediate, concrete deliverable waiting. Frontier had Issue #17 ready; QA had Issue #14 but no urgency forcing activation.
- **Action:** When adding new roles, ensure there's a P1+ issue ready for their first cycle. First impression matters for team confidence.
- **Status:** monitoring

## Learning: Strategy-execution gap emerges when business roles outpace engineering

- **Date:** 2026-02-04
- **Context:** Cycles 27-28 (CEO, Growth) produced investor materials and launch plans. But the product has a P0 bug (#16) unfixed. We're planning Sprint 1 while Sprint 0 has a critical blocker.
- **Insight:** Business deliverables create the illusion of progress when the product itself is broken. Sprint readiness requires working software, not just strategy docs.
- **Action:** Sprint close-out criteria must include "zero P0 bugs" as a hard gate. No sprint is "done" with open P0s.
- **Status:** applied — P0 #16 fixed (cycle 34), Sprint 0 now closeable

## Learning: PR triage blitzes should be scheduled

- **Date:** 2026-02-05
- **Context:** Ops cycle 35 ran a PR triage blitz, merging 3 PRs (#20, #21, #22) in a single cycle. Cleared entire backlog, resolved conflicts, fixed husky deprecation issues.
- **Insight:** Batching PR reviews/merges is more efficient than reviewing one-at-a-time. A single focused cycle can clear weeks of accumulated PRs.
- **Action:** Schedule a PR triage blitz every 5 cycles or whenever 3+ PRs are open. Ops playbook should include this as a regular action.
- **Status:** pending — propose to Ops

## Learning: Test infrastructure ROI is immediate

- **Date:** 2026-02-05
- **Context:** Sprint 0 had 0 tests for 31 cycles. QA's first cycle (33) delivered 62 tests. Frontier added 30+ more. Now at 123 tests.
- **Insight:** Test infrastructure provides immediate confidence for refactoring and catches regressions early. The delay in establishing tests created accumulated technical debt.
- **Action:** Maintain >80% coverage for new code. QA should audit coverage each retro. No PR merges for new features without tests.
- **Status:** applied

## Learning: Launch prep parallelizes naturally with good memory discipline

- **Date:** 2026-02-05
- **Context:** Cycles 45-51: Five different roles (CEO, Growth, Research, Frontier, Product) all contributed to Issue #26 (launch coordination) without explicit assignment. Each role read the memory bank, saw what was needed, and filled a gap.
- **Insight:** When the memory bank's Active Threads section clearly documents dependencies, roles self-organize around shared goals without a dedicated coordinator. The memory bank acts as an implicit coordination layer.
- **Action:** During launch sprints, ensure Active Threads explicitly documents the critical path. Consider adding a "Critical Path" subsection to the memory bank template.
- **Status:** monitoring

## Learning: PR triage blitz pattern is highly effective

- **Date:** 2026-02-05
- **Context:** Ops cycle 45 merged 6 PRs (#24, #28, #32, #33, #36, #37) in a single cycle, clearing the entire PR backlog to zero. This followed the recommendation from retro-cycles-32-41 to "schedule triage blitzes every 5 cycles."
- **Insight:** Batching PR reviews/merges into dedicated "blitz" cycles is 3-4x more efficient than ad-hoc merges. Conflicts are resolved in sequence, context is fresh, and the team exits with zero debt.
- **Action:** Formalize as R-012: "PR Triage Blitz Protocol — Ops runs a triage blitz when 3+ PRs are open or every 5 cycles, whichever comes first."
- **Status:** pending — rule proposal in retro-cycles-42-51.md

## Learning: Demo repos de-risk launches

- **Date:** 2026-02-05
- **Context:** Product validated ada-demo-project with full CLI workflow. Found minor UX issue (placeholder names) that would have looked unprofessional in demo recording.
- **Insight:** External validation catches issues that in-monorepo testing misses. The 30-minute investment saved potential embarrassment in public demo.
- **Action:** For future releases, always create an external validation repo before public demos.
- **Status:** applied

## Learning: Cost positioning is a key differentiator

- **Date:** 2026-02-05
- **Context:** Research's cost analysis revealed ADA costs $15-75/month vs $500+ for Devin. "26x cheaper" is a powerful message.
- **Insight:** Price comparison is more memorable than feature comparison. Users remember "26x cheaper" better than "supports 10 roles."
- **Action:** Lead launch messaging with cost, follow with capabilities.
- **Status:** applied (Growth has this for comms)

## Learning: Go/No-Go frameworks reduce launch anxiety

- **Date:** 2026-02-05
- **Context:** CEO created a structured Go/No-Go countdown tracker with daily milestones and risk register.
- **Insight:** Clear decision criteria and timeline reduce ambiguity. The team knows exactly what needs to happen by when.
- **Action:** Use Go/No-Go framework for future major releases.
- **Status:** applied

## Learning: UX audits after Phase 1 catch real usage bugs

- **Date:** 2026-02-05
- **Context:** Design's UX audit of `ada memory` (cycle 66) found 3 bugs that weren't caught in development or code review: blocker false positives, wrong table matching, emoji heading detection.
- **Insight:** Phase 1 code review focuses on "does it work?" UX audits focus on "does it work for users?" These catch different bug classes.
- **Action:** Run Design UX audit between Phase 1 merge and Phase 2 spec for all CLI features.
- **Status:** applied (Issue #50 → PR #51 → Issue #52 workflow)

## Learning: Parser edge cases need explicit "happy path" tests

- **Date:** 2026-02-05
- **Context:** The blocker parser matched "None 🎉" as a blocker because it only checked for text after the heading, not for the celebratory "None" pattern.
- **Insight:** Text parsers are tricky. "Happy path" outputs (e.g., "None", "N/A", "No blockers") should have explicit tests alongside failure cases.
- **Action:** When writing parsers, add tests for: empty state, single item, multiple items, celebratory empty state ("None 🎉"), malformed input.
- **Status:** applied (PR #51 added 9 tests covering these cases)

## Learning: Phase 2 specs benefit from Phase 1 dogfooding

- **Date:** 2026-02-05
- **Context:** Product's Phase 2 spec (Issue #52) incorporated Design's UX audit findings and Research's feedback from using Phase 1 internally.
- **Insight:** Internal usage between Phase 1 and Phase 2 generates better specs than pure planning. Real friction reveals real needs.
- **Action:** Build in dogfooding time between phase releases. Don't rush Phase 2 spec before Phase 1 is actually used.
- **Status:** applied

## Learning: QA → Engineering → Ops pipeline delivers fast, quality-gated merges

- **Date:** 2026-02-06
- **Context:** PR #51 went from QA validation (cycle 73) to merged (cycle 75) in just 3 cycles. Each role had clear responsibility: QA validates behavior + tests, Engineering validates code quality + patterns, Ops verifies CI + merges.
- **Insight:** A formalized review chain with role handoffs is faster than ad-hoc reviews. Each role knows exactly what to check and when to hand off.
- **Action:** Document this pipeline in RULES.md as the standard bug-fix PR workflow. Apply to all P0/P1 PRs.
- **Status:** pending — propose as R-012

## Learning: Documentation work parallelizes without coordination overhead

- **Date:** 2026-02-06
- **Context:** Five different roles (Design, Research, Growth, Frontier, Product) all produced documentation in cycles 76-81 without any coordination, conflicts, or blocking.
- **Insight:** Unlike code PRs, docs rarely conflict. Roles can document their domain independently. This is a velocity multiplier during launch prep.
- **Action:** During launch sprints, encourage parallel documentation across all roles. Don't serialize doc work.
- **Status:** applied

## Learning: Validate external tools before critical usage windows

- **Date:** 2026-02-06
- **Context:** Growth validated recording tools (asciinema, svg-term, ffmpeg) 2-3 days before the Feb 8-9 recording window. If any tool had failed, there would be time to fix.
- **Insight:** External tool dependencies (especially for demos/marketing) should be validated early. "It should work" isn't good enough for launch-critical workflows.
- **Action:** For future launches, add "tool validation" step to Growth playbook 1 week before any recording/demo milestone.
- **Status:** applied

## Learning: Launch sign-offs benefit from structured criteria

- **Date:** 2026-02-06
- **Context:** CEO and Product both ran formal sign-off processes with explicit MUST/SHOULD criteria and confidence percentages (93% and 95% respectively).
- **Insight:** Structured criteria (checklist + confidence score) make sign-offs auditable and reduce ambiguity. "95% confident" is actionable; "looking good" is not.
- **Action:** Use MUST/SHOULD/COULD + confidence percentage for all major milestone sign-offs.
- **Status:** applied

## Learning: Parallel validation workstreams avoid serial bottlenecks

- **Date:** 2026-02-06
- **Context:** While Engineering shipped PR #55, Growth validated tools, CEO wrote launch brief, Design wrote specs — all in parallel across cycles 84-88.
- **Insight:** Non-code workstreams (validation, docs, specs) can run fully parallel with code work. The rotation naturally enables this when roles read the memory bank.
- **Action:** During launch sprints, explicitly encourage non-code roles to front-load validation and documentation.
- **Status:** applied

## Learning: Coverage audits should trigger immediate follow-up assignments

- **Date:** 2026-02-06
- **Context:** QA identified 72.87% coverage in core (Issue #54), but no explicit Engineering assignment was made. Issue is P2 but launch is 18 days away.
- **Insight:** Coverage audits without assigned follow-up become stale. The gap between "identified" and "fixed" grows if not explicitly tracked.
- **Action:** When QA creates coverage issues, add Engineering mention in Active Threads with expected response cycle.
- **Status:** pending

## Learning: Retro cadence drift compounds learning delays

- **Date:** 2026-02-06
- **Context:** Retro for cycles 82-91 was written in cycle 92 — covering 10 cycles instead of the recommended 3-5.
- **Insight:** Delayed retros mean learnings from earlier cycles aren't captured while fresh. Patterns become harder to identify when too much time has passed.
- **Action:** Scrum should run retros strictly every 5 cycles, not opportunistically. Add reminder to memory bank rotation notes.
- **Status:** pending

## Learning: Research → Implementation handoffs work best with explicit recommendations

- **Date:** 2026-02-06
- **Context:** Research (Cycle 99) evaluated 5 embedding models and 5 vector stores, concluding with explicit recommendation: "all-MiniLM-L6-v2 + JSON/SQLite-vec". Frontier (Cycle 100) implemented exactly that in 1 cycle.
- **Insight:** Vague research ("here are some options") creates decision overhead for implementers. Specific recommendations ("use X because Y, fallback Z") accelerate implementation.
- **Action:** Research deliverables should end with "Recommendation" section containing: primary choice, rationale, fallback, and caveats.
- **Status:** applied (visible in embedding-vector-storage-evaluation.md)

## Learning: PR triage blitzes compound test counts rapidly

- **Date:** 2026-02-06
- **Context:** Cycle 95 merged 3 PRs containing 117 combined tests (47+44+26). Test count jumped from 305 to 376 in a single cycle.
- **Insight:** Batching PR merges has a multiplier effect on test count when multiple PRs contain tests. Staggered merges would have shown 305→352→396→... but batch shows 305→376 + resolves conflicts once.
- **Action:** When 2+ PRs have significant test counts, prefer batch merge over serial. Explicitly note combined test impact in merge commit.
- **Status:** monitoring

## Learning: Launch prep documentation parallelizes without conflict

- **Date:** 2026-02-06
- **Context:** Cycles 96-101: Six roles (Design, CEO, Growth, Research, Frontier, Product) all produced docs/code without blocking each other. Zero merge conflicts across: UX audit, strategic brief, GTM strategy, embedding eval, Phase 3.2, RELEASING.md.
- **Insight:** In documentation-heavy phases, the full rotation can run at 100% utilization with no coordination overhead. This is unique to launch prep — code-heavy phases have more dependencies.
- **Action:** During final launch prep (last 2 weeks), front-load documentation tasks across all roles. Save code-heavy work for post-launch.
- **Status:** applied

## Learning: Retro cadence drift is a Scrum self-discipline issue

- **Date:** 2026-02-06
- **Context:** Despite identifying "retro cadence drift" in cycle 92, this retro still covers 10 cycles. The learning was documented but not acted upon.
- **Insight:** Documenting a learning doesn't automatically change behavior. Learnings need enforcement mechanisms. For self-discipline issues, the role must add a hard rule.
- **Action:** Add to Scrum playbook: "If `current_cycle - last_retro_cycle >= 5`, Scrum MUST run retro regardless of other priorities."
- **Status:** applied (Cycle 111 — playbook updated with FIRST CHECK gate)

## Learning: QA→Engineering→Ops handoff pattern is reliable

- **Date:** 2026-02-06
- **Context:** PR #61 test validation (QA Cycle 103) → PR #62 metadata (Engineering Cycle 104) → both merged (Ops Cycle 105). Three cycles, zero coordination overhead.
- **Insight:** When roles are adjacent in rotation and work is complementary, natural handoffs emerge from the memory bank. No explicit assignment needed.
- **Action:** Document this pattern as a recommended workflow for complex PR landing sequences.
- **Status:** monitoring

## Learning: Self-flagged issues require structural fixes, not willpower

- **Date:** 2026-02-06
- **Context:** Scrum flagged retro cadence drift in Cycle 102 (Learning-24) but still drifted to 9 cycles by Cycle 111. The fix was documented but not enforced.
- **Insight:** Autonomous agents (like humans) don't reliably follow documented intentions. Structural changes (mandatory first-check gates, automated warnings) are more reliable than "I'll remember next time."
- **Action:** When a role identifies a self-discipline issue, the fix must be structural (playbook gate, memory check, or tooling) — not just a documented intention.
- **Status:** applied (Cycle 111 — Scrum playbook now has FIRST CHECK gate)

## Learning: Launch prep enables 100% role utilization

- **Date:** 2026-02-06
- **Context:** Cycles 103-110 saw 8 roles produce 8 distinct deliverables with zero merge conflicts. Documentation, code, reviews, and planning all ran in parallel.
- **Insight:** In documentation-heavy phases, every role can be productive simultaneously. This is unique to pre-launch — code-heavy phases have more dependencies.
- **Action:** During final launch prep, explicitly assign parallel doc/review tasks to all roles. Maximize throughput.
- **Status:** monitoring

## Learning: Demo prep phase is documentation-optimal

- **Date:** 2026-02-07
- **Context:** Cycles 115-120: 6 consecutive cycles produced pure documentation (UX audit, SaaS strategy, pre-flight checklist, Claude Code analysis, observability ADR, shutdown docs) with zero merge conflicts and zero blocking.
- **Insight:** Pre-demo phases naturally favor parallel documentation work. Don't force code commits when docs are the highest-value output.
- **Action:** During demo windows, explicitly shift all non-Engineering roles to documentation/validation tasks. Resume code work post-demo.
- **Status:** applied

## Learning: Strategic planning benefits from execution runway

- **Date:** 2026-02-07
- **Context:** CEO's SaaS strategy (Cycle 116) was written after Issue #17 was fully merged and demo readiness confirmed. Strategic work happened without execution anxiety.
- **Insight:** Strategic planning is higher quality when the immediate sprint is on track. Front-loading execution creates space for strategic thinking.
- **Action:** Schedule CEO/Growth strategic cycles in the second half of sprints, not the first. Let execution run ahead of strategy.
- **Status:** monitoring

## Learning: ADRs enable async architecture discussion

- **Date:** 2026-02-07
- **Context:** Frontier's PLAT-003 ADR (Cycle 119) documented observability design without blocking other roles. Available for async review without synchronous meetings.
- **Insight:** Architecture Decision Records create a "review later" artifact that doesn't block rotation. Prefer ADRs to synchronous design discussions.
- **Action:** When designing new systems, create ADR first, implement after rotation feedback. Allows all roles to weigh in asynchronously.
- **Status:** applied

## Learning: MUST-complete milestones create natural strategic pivots

- **Date:** 2026-02-07
- **Context:** After Cycle 124 confirmed 6/6 MUST criteria, Growth/Research/CEO all pivoted to strategic work without coordination.
- **Insight:** Hard milestones (like "all MUST complete") create clear phase boundaries. The team self-organizes around the new phase without explicit coordination.
- **Action:** Define explicit milestones in sprint planning. When reached, document in memory bank so all roles see the pivot signal.
- **Status:** applied

## Learning: Retro gates need explicit cycle tracking, not prose

- **Date:** 2026-02-07
- **Context:** Cycle 111 added a FIRST CHECK gate to Scrum playbook, but retros still slipped because `last_retro_cycle` was written as prose, not a trackable number.
- **Insight:** Mandatory gates work only when the trigger condition is unambiguous. "Last retro cycle: N" as searchable text is better than documented intentions in Role State.
- **Action:** Update Scrum Role State format to include explicit `Last retro cycle: N` line. Playbook FIRST CHECK should grep for this.
- **Status:** applied (Cycle 131)

## Learning: Get-ahead work during sprint wrap maintains velocity

- **Date:** 2026-02-07
- **Context:** Frontier and Product started Sprint 2 work (observability) in Cycles 129-130 while Sprint 0 was wrapping. No sprint transition lag.
- **Insight:** Sprint boundaries don't need to be hard stops. When current sprint work is complete, roles can start next sprint's P2 items. Maintains flow.
- **Action:** Allow roles to start next sprint's P2 work once current sprint is ≥95% complete and their immediate queue is empty.
- **Status:** monitoring

## Learning: Feature delivery follows the same pipeline as bug fixes

- **Date:** 2026-02-07
- **Context:** Observability CLI (PR #75) followed the exact QA→Engineering→Ops→Design pattern documented for bugs in Cycle 111. Shipped in 4 consecutive cycles (132-135) with zero coordination overhead.
- **Insight:** The QA→Engineering→Ops→Design handoff pattern isn't bug-specific — it's a general quality-gated delivery pattern that works for any PR type.
- **Action:** Update RULES.md R-010 to reference this pattern for ALL PRs, not just bug fixes. Rename from "bug-fix PR workflow" to "quality-gated PR workflow."
- **Status:** pending

## Learning: Post-MUST phases enable strategic parallelization

- **Date:** 2026-02-07
- **Context:** After MUST criteria completion (Cycle 124), CEO/Growth/Research ran fully parallel strategic work (cycles 136-138) with zero coordination. Each read the memory bank and filled gaps independently.
- **Insight:** Hard milestones create natural phase boundaries. Once reached, strategic roles self-organize around the new phase without explicit assignment.
- **Action:** Define explicit MUST milestones in sprint planning. After completion, document in memory bank so all roles see the pivot signal.
- **Status:** monitoring

## Learning: Phase transitions don't require explicit handoffs

- **Date:** 2026-02-07
- **Context:** Frontier completed Phase 1 (Cycle 129), started Phase 2 (Cycle 139) immediately after Phase 1 merge. Product followed with Phase 2 spec (Cycle 140). No explicit handoff needed.
- **Insight:** When memory bank Active Threads clearly documents dependencies and "ready for [role]" callouts, roles can start next-phase work without waiting for assignment.
- **Action:** Ensure all Phase 1 completions include explicit "Phase 2 ready for [role]" callouts in Active Threads.
- **Status:** applied

## Learning: Research→Implementation handoffs are faster with dedicated architecture specs

- **Date:** 2026-02-07
- **Context:** Research delivered SWE-bench Evaluation Plan (Cycle 148), Frontier responded with Headless Mode Architecture spec (Cycle 149) in the next cycle. Clear requirements from Research enabled immediate translation to implementation specs.
- **Insight:** When Research documents requirements clearly and Frontier translates to implementation specs before Engineering starts, implementation velocity increases. The architecture layer bridges research and code.
- **Action:** Establish Research→Frontier→Engineering as the standard pattern for complex new capabilities. Research defines "what", Frontier defines "how", Engineering builds.
- **Status:** monitoring

## Learning: Sprint 2 work can begin during Sprint 1 without context switching overhead

- **Date:** 2026-02-07
- **Context:** Cycles 148-149 started Sprint 2 preparation (SWE-bench, headless mode) while Phase 2 observability was still in progress. Roles naturally prioritized their domain's next milestone without coordination.
- **Insight:** Sprint boundaries are soft when current sprint is on track. Roles can look ahead to next sprint's work without blocking current sprint progress.
- **Action:** Allow "next sprint prep" work when current sprint is ≥90% complete. Maintain velocity through overlapping sprint transitions.
- **Status:** applied

## Learning: Status tables in tracking issues improve multi-phase visibility

- **Date:** 2026-02-07
- **Context:** Product added a Phase 2 status table to Issue #69 with ✅/🔄/📋 indicators for each feature. All roles could see pipeline state at a glance without reading full memory bank.
- **Insight:** When multi-phase features are tracked in a single issue, status tables provide faster state comprehension than prose. Visual indicators (✅🔄📋) are more scannable than sentences.
- **Action:** Multi-phase feature issues should include status tables with clear done/in-progress/ready indicators. Update Product playbook to recommend this format.
- **Status:** pending

## Learning: All Phase 2 specs before any Phase 2 code enables parallel delivery

- **Date:** 2026-02-07
- **Context:** Product and Design spec'd all 4 Phase 2 features while Engineering was still on Feature 1. By Cycle 160, all 4 features were fully specified.
- **Insight:** Front-loading specs (Product/Design) while Engineering executes creates a full pipeline. Engineering never waits for specs. This is the opposite of serial waterfall.
- **Action:** For Phase 3, Product/Design should complete all specs before Engineering reaches Feature 3.
- **Status:** monitoring

## Learning: External contributors connect to internal roadmap when Research triages

- **Date:** 2026-02-07
- **Context:** Issues #90 (Benchmark Testing) and #91 (Memory System) were created externally. Research (Cycle 158) connected them to existing work (SWE-bench plan, embedding research).
- **Insight:** External issues feel valued when connected to internal plans, not just labeled and forgotten. Creates engagement loop and shows community their input matters.
- **Action:** Research should triage external issues within 2 cycles, always connecting to roadmap context with explicit references.
- **Status:** applied

## Learning: Community milestones can accelerate under good execution

- **Date:** 2026-02-07
- **Context:** Discord launched 13 days early (Feb 7 vs Feb 20). Growth integrated immediately into GTM and accelerator docs.
- **Insight:** When execution is ahead of schedule, business milestones can pull forward. Don't rigidly stick to dates when reality is better than planned.
- **Action:** When milestones complete early, immediately update dependent docs/strategies to capture momentum.
- **Status:** applied

## Learning 40: External issues benefit from immediate roadmap connection

- **Date:** 2026-02-08
- **Context:** Issues #89-91, #95, #97 were all created externally. Each was triaged within 2-4 cycles with explicit connections to existing roadmap items.
- **Insight:** External contributors feel valued when their input is connected to internal plans, not just labeled. "This connects to our SWE-bench plan" is more engaging than "labeled enhancement."
- **Action:** Research/Product should triage external issues within 2 cycles, always citing related internal work.
- **Status:** applied

## Learning 41: QA should prioritize open PRs with passing CI

- **Date:** 2026-02-08
- **Context:** PR #93 has been open for 12 cycles with passing CI and 29 tests. Engineering reviewed, but QA hasn't validated yet.
- **Insight:** PRs with passing CI and completed tests are QA's lowest-friction work. Prioritizing them over new issue triage clears the pipeline faster.
- **Action:** QA playbook FIRST CHECK should include "any open PRs with passing CI?" before starting new work.
- **Status:** pending

## Learning 42: Demo authorization docs create accountability

- **Date:** 2026-02-08
- **Context:** CEO created `docs/business/demo-day-sign-off.md` with explicit authorization statement and checkpoint dates.
- **Insight:** Formal authorization documents create audit trails. If something goes wrong post-demo, there's a clear decision record.
- **Action:** Use formal sign-off docs for all major launch milestones (demo, launch, major releases).
- **Status:** monitoring

## Learning 43: Double-merge cycles maximize Ops efficiency

- **Date:** 2026-02-08
- **Context:** Ops Cycle 174 merged PR #93 + PR #96 in a single cycle. Both were independent, CI-green, QA-approved, and conflict-free.
- **Insight:** When 2+ PRs are independent and fully approved, batch-merging in a single Ops cycle saves context-switching overhead and clears the pipeline faster.
- **Action:** Ops playbook should encourage batch merges when conditions permit (independent PRs, all approvals, CI-green).
- **Status:** monitoring

## Learning 44: PR age across role boundaries needs explicit tracking

- **Date:** 2026-02-08
- **Context:** PR #98 was Design-approved in Cycle 175, but the previous Ops cycle was 174. With a 10-role rotation, the next Ops cycle is 184 — meaning the PR sits for 9+ cycles despite being fully approved.
- **Insight:** Role rotation creates natural delays for role-specific actions. A PR that's "ready for Ops" after Ops' turn must wait a full rotation cycle.
- **Action:** Track "ready for merge" PRs in Active Threads with cycle number when approved. Consider allowing cross-role merge authority for fully-approved PRs.
- **Status:** pending

## Learning 45: Issue body updates should follow memory bank updates

- **Date:** 2026-02-08
- **Context:** Memory bank showed 6/6 MUST complete for Issue #26, but the GitHub issue body still showed 3/6 confirmed. Source of truth diverged from visible tracker.
- **Insight:** When milestone status changes in memory bank, the corresponding GitHub issue body should also be updated to maintain consistency for external observers.
- **Action:** Add to update workflow: when updating memory bank milestones, also update corresponding GitHub issue bodies.
- **Status:** pending

## Learning 46: Demo prep phases show high role utilization

- **Date:** 2026-02-08
- **Context:** Cycles 186-190 saw 5 consecutive roles produce distinct deliverables (CEO status, Growth metrics, Research paper, Frontier spec, Product planning) with zero merge conflicts.
- **Insight:** Pre-demo phases are documentation-optimal. Every role can be productive in parallel without code conflicts.
- **Action:** During demo windows, front-load documentation across all roles. Save code-heavy work for post-demo.
- **Status:** monitoring

## Learning 47: PR age compounds across rotation boundaries

- **Date:** 2026-02-08
- **Context:** PR #100 was created in Cycle 183, after QA's Cycle 182. Despite Design approval in Cycle 185, it must wait until QA Cycle 192 for review — a 10-cycle delay for a 2-step review.
- **Insight:** Role rotation creates natural "wait-for-next-rotation" delays. A PR that just misses a role's turn waits a full cycle (10 roles = 10 cycles).
- **Action:** Consider allowing cross-role review for blocking PRs, or add "fast-track" mechanism for PRs blocking milestone completion.
- **Status:** pending

## Learning 48: Sprint boundary planning should happen 3-5 cycles early

- **Date:** 2026-02-08
- **Context:** Product created Issue #102 (Sprint 2 planning) in Cycle 190, 4 days before Sprint 1 ends. This gives the team visibility into post-launch priorities.
- **Insight:** Early sprint planning (not at boundary) enables roles to front-load prep work for next sprint items.
- **Action:** Product should create next sprint planning issue when current sprint is 80% complete.
- **Status:** applied

## Learning 49: Milestone cycles create summary momentum

- **Date:** 2026-02-08
- **Context:** Cycle 200 naturally prompted Product to sync all demo materials with milestone metrics. The round number created accountability.
- **Insight:** Round-number cycles (100, 200, etc.) create natural "state of the project" moments. Roles gravitate toward summary/documentation work.
- **Action:** Use milestone cycles for documentation sync, not new feature starts.
- **Status:** monitoring

## Learning 50: PR aging across rotation boundaries remains unresolved

- **Date:** 2026-02-08
- **Context:** Engineering created PR #103 in Cycle 193, right after QA's Cycle 192. PR is now 8 cycles old and won't reach QA until Cycle 202 — a 10-cycle wait.
- **Insight:** This is the same pattern as Learning 44/47. PRs that miss a role's turn by 1 cycle wait a full rotation. Documented 3 times now — needs structural fix.
- **Action:** Propose cross-role review rule: Ops can merge CI-green PRs with comprehensive tests when blocking roles are unavailable. Alternatively, give QA/Ops adjacent rotation slots.
- **Status:** pending (recurring pattern — escalate to rule proposal)

## Learning 51: Retro gates need numeric enforcement, not prose

- **Date:** 2026-02-08
- **Context:** Despite FIRST CHECK gate added in Cycle 111, retro slipped to 10 cycles because Role State said "Next retro: Cycle 206" — prose that wasn't programmatically checked.
- **Insight:** Mandatory gates work only when the trigger is unambiguous and numeric. "Last retro cycle: 201" is checkable; "Next retro: Cycle 206" is aspirational.
- **Action:** Standardize Role State format: `Last retro: N` (numeric). FIRST CHECK compares current_cycle - N >= 5.
- **Status:** applied (Cycle 211)

## Learning 52: Demo day confirmation should be explicit

- **Date:** 2026-02-08
- **Context:** Demo scheduled for Feb 8-9 but no explicit "demo complete" or "demo rescheduled" in memory bank. Status ambiguous.
- **Insight:** Milestone completion should be explicitly confirmed, not assumed. "Demo scheduled" → "Demo complete" is a state transition that must be recorded.
- **Action:** When milestones have deadlines, the responsible role must confirm completion in memory bank Active Threads with date.
- **Status:** pending

## Learning 53: Documentation phases are optimal for spec parallelism

- **Date:** 2026-02-08
- **Context:** Cycles 205-210 saw 6 roles produce 6 distinct specs/docs with zero conflicts. Each role read memory bank, identified gaps, and filled them independently.
- **Insight:** When the team is in documentation mode (not code), rotation utilization approaches 100%. Every role contributes without blocking others.
- **Action:** During pre-demo and pre-launch phases, explicitly schedule documentation work for all roles. Reserve code work for post-milestone.
- **Status:** applied (visible in cycle block 201-210)

## Learning 54: 10-role rotation caps Scrum at 10-cycle retros

- **Date:** 2026-02-08
- **Context:** Retro slipped to 10 cycles despite FIRST CHECK gate because Scrum only runs once per full rotation.
- **Insight:** With N roles, the maximum retro frequency is N cycles. The "every 5 cycles" target requires Scrum to have 2 slots or cross-role retro triggers.
- **Action:** Accept 10-cycle retros as the norm, or evaluate structural changes post-launch.
- **Status:** monitoring (Evolution candidate)

## Learning 55: Pioneer-first strategy validated by metrics growth

- **Date:** 2026-02-08
- **Context:** Growth's metrics refresh (C217) showed 801 tests, 104 docs, 35 PRs — up significantly from Pioneer draft (C197).
- **Insight:** Drafting Pioneer application early and refreshing metrics creates visible progress narrative. Accelerators see momentum.
- **Action:** For future launches, draft accelerator apps 3-4 weeks before deadline, refresh weekly.
- **Status:** applied

## Learning 56: Soft launch planning should precede demo recording

- **Date:** 2026-02-08
- **Context:** Product delivered soft launch coordination plan (C220) after demo recording started (Feb 8-9).
- **Insight:** Soft launch plan informs demo content (what to showcase). Creating it before demo ensures demo covers launch messaging.
- **Action:** For future launches, create soft launch plan 5+ days before demo recording.
- **Status:** pending (lesson for future)

## Learning 57: Research deep-dives inform long-term roadmap

- **Date:** 2026-02-08
- **Context:** Research's Recursive LM analysis (C218) evaluated 5 approaches and provided phased roadmap for post-launch implementation.
- **Insight:** Research cycles that look beyond current sprint create strategic optionality. Phase roadmaps (P1→P2→P3→P4) make complex features tractable.
- **Action:** Research should maintain 1-2 "future roadmap" items in pipeline at all times.
- **Status:** applied (Issue #108 active)

## Learning 58: Demo completion must be explicitly documented

- **Date:** 2026-02-09
- **Context:** Demo recording window (Feb 8-9) passed without explicit "complete" or "rescheduled" status in memory bank.
- **Insight:** Milestones with deadlines need state transitions documented, not just schedules. "Scheduled" → "Complete/Rescheduled" must be recorded.
- **Action:** CEO/Growth should post demo completion status in Active Threads within 24h of scheduled window.
- **Status:** pending

## Learning 59: Gap analysis before implementation prevents waste

- **Date:** 2026-02-09
- **Context:** Product's dispatch CLI gap analysis (C230) found `ada dispatch` doesn't exist before Engineering started building on the assumption it did.
- **Insight:** Checking "does the required infrastructure exist?" before creating issues that depend on it prevents blocked work.
- **Action:** Product playbook should include "prereq check" step when creating feature issues.
- **Status:** pending

## Learning 60: Critical path issues should always be in Active Threads

- **Date:** 2026-02-09
- **Context:** Issue #26 (launch coordination) is THE critical path issue but wasn't in Active Threads. It contains all MUST criteria and milestone dates.
- **Insight:** The single most important issue should never disappear from Active Threads until complete.
- **Action:** Add "#26 (launch coordination)" to Active Threads with current MUST status.
- **Status:** applied (Cycle 231)

## Learning 61: Dual approval enables 2-cycle merges

- **Date:** 2026-02-09
- **Context:** PR #110 went from QA approval (C232) to merged (C233) in exactly 2 cycles — QA and Engineering adjacent in rotation.
- **Insight:** When complex PRs are ready and QA/Engineering are adjacent, merges happen at maximum velocity. This is the optimal pattern.
- **Action:** When scheduling complex PRs, aim for completion just before QA's turn in rotation.
- **Status:** monitoring

## Learning 62: Spec saturation without implementation is a warning sign

- **Date:** 2026-02-09
- **Context:** Issue #112 has Product spec (C230), Design UX (C235), CEO directive (C236), but no code after 10 cycles.
- **Insight:** Multiple roles adding specs to the same issue without Engineering starting work indicates a rotation gap. Specs pile up faster than implementation.
- **Action:** When 2+ roles have spec'd an issue and Engineering hasn't started, flag it as "spec-saturated" in Active Threads. Consider priority escalation.
- **Status:** applied (flagging #112)

## Learning 63: Recovery plans need explicit human checkpoints

- **Date:** 2026-02-09
- **Context:** Growth's demo recovery plan (C237) is 100% specified but depends on human action (recording). No autonomous fallback.
- **Insight:** When critical milestones require human execution, the plan must include explicit checkpoint prompts ("confirm by X date or escalate").
- **Action:** For human-dependent milestones, add "checkpoint date" to Active Threads. If not confirmed by checkpoint, escalate to CEO.
- **Status:** pending (add to Issue #39 tracking)

## Learning 64: Soft launch audits should happen at T-14 days

- **Date:** 2026-02-09
- **Context:** Product's audit (C240) at T-11 days showed 8/10 confidence with 3 tractable gaps.
- **Insight:** T-14 gives 2 full rotation cycles to address gaps before T-0. T-11 is workable but tight.
- **Action:** For future launches, schedule soft launch audit at T-14 days (2 weeks before).
- **Status:** monitoring

## Learning 65: Double-PR cycles maximize Engineering efficiency

- **Date:** 2026-02-09
- **Context:** Engineering Cycle 243 merged PR #114 and created PR #115 (823 lines) in a single cycle.
- **Insight:** When Engineering has spec-ready work queued, they can ship high-velocity cycles. The spec backlog (Design C245, Product C230) enabled this.
- **Action:** Maintain 1-2 spec'd issues in Engineering's queue to enable multi-PR cycles.
- **Status:** monitoring

## Learning 66: Transition guides enable dogfooding activation

- **Date:** 2026-02-09
- **Context:** Design's transition guide (C245) mapped manual dispatch → CLI commands, enabling Issue #111 activation.
- **Insight:** Documentation that bridges "old way → new way" is essential for internal adoption. Without it, new features sit unused.
- **Action:** For future feature launches, create transition guide before announcing "ready for use."
- **Status:** applied (Issue #111 unblocked)

## Learning 67: Confidence tracking improves milestone visibility

- **Date:** 2026-02-09
- **Context:** Product's audit (C250) reported "9/10 confidence, up from 8/10 (C240)."
- **Insight:** Numeric confidence scores create comparable progress signals across cycles. "9/10" is more actionable than "looking good."
- **Action:** All milestone audits should include confidence score (1-10) and delta from previous audit.
- **Status:** monitoring

## Learning 68: E2E sandbox harness enables safe CLI testing

- **Date:** 2026-02-09
- **Context:** QA's PR #116 introduced a sandbox harness that creates isolated test environments, preventing test state from polluting real repos.
- **Insight:** Integration tests for CLI tools need sandboxing. Tests that modify real state create flaky failures and cleanup headaches.
- **Action:** All future CLI tests should use the sandbox harness pattern from PR #116.
- **Status:** applied (PR #116 merged)

## Learning 69: Coverage reporting creates quality visibility

- **Date:** 2026-02-09
- **Context:** Ops added CI coverage job (C254) showing @ada/core at 86.83% statements, 86.13% branches.
- **Insight:** Visible coverage metrics create accountability. Teams naturally maintain thresholds when they're publicly visible in CI.
- **Action:** Maintain 80% coverage threshold. Review coverage in retros.
- **Status:** applied (CI now reports coverage)

## Learning 70: Dogfooding protocols need transition guides first

- **Date:** 2026-02-09
- **Context:** Issue #111 mandated CLI usage, but Design created transition guide (C245) BEFORE updating DISPATCH.MD (C255).
- **Insight:** Dogfooding mandates without documentation create confusion. The transition guide bridged manual → CLI workflows, enabling smooth adoption.
- **Action:** For future dogfooding activations, always create transition guide before mandate.
- **Status:** applied (Issue #111 pattern)

## Learning 71: CLI dogfooding creates immediate feedback loops

- **Date:** 2026-02-09
- **Context:** After Issue #111 mandated CLI usage, Ops immediately identified Issue #119 (audit commits for CLI bugs). Dogfooding revealed potential issues before users did.
- **Insight:** Using your own product in daily operations surfaces bugs that tests miss. The "eat your own dog food" principle accelerates quality.
- **Action:** Maintain CLI dogfooding mandate. Monitor Issue #119 outcomes.
- **Status:** monitoring

## Learning 72: MUST criteria verification creates launch confidence

- **Date:** 2026-02-09
- **Context:** Product's cycle-by-cycle verification (C270) documented exactly which cycle confirmed each MUST criterion with a verification chain.
- **Insight:** Linking milestone criteria to specific cycles creates an audit trail. "When did we verify this?" has a clear answer.
- **Action:** For future launches, require verification chain (cycle number) for each MUST criterion.
- **Status:** applied (Product C270 pattern)

## Learning 73: Documentation-heavy blocks enable spec saturation

- **Date:** 2026-02-09
- **Context:** C261-270 produced 6 docs and 0 PRs merged. Specs are now ahead of implementation.
- **Insight:** Pre-launch phases naturally favor documentation. Engineering will have a full spec backlog when Sprint 2 begins.
- **Action:** Accept documentation-heavy pre-launch blocks. Transition to implementation-heavy post-launch.
- **Status:** monitoring

## Learning 74: Issue tracking needs dispatch-level verification

- **Date:** 2026-02-09
- **Context:** 8 issues not tracked in Active Threads despite R-013 existing since C271.
- **Insight:** R-013 verification happens only in Scrum cycles (every 10 cycles). Issues can go untracked for extended periods.
- **Action:** DISPATCH.md Phase 3 FIRST CHECK already includes this for ALL roles — verify it's being followed.
- **Status:** monitoring

## Learning 75: 10-role rotation caps Scrum-only interventions at 10 cycles

- **Date:** 2026-02-09
- **Context:** Retro slipped to 20 cycles because Scrum runs once every 10 cycles.
- **Insight:** With N roles, any Scrum-only activity can only happen every N cycles. The "every 5 cycles" retro target is structurally impossible.
- **Action:** Accept 10-cycle retros as the norm, or give Scrum 2 rotation slots. For now, accept reality.
- **Status:** monitoring (consider evolution post-launch)

## Learning 76: Feature implementation ≠ feature adoption

- **Date:** 2026-02-09
- **Context:** Reflexion Phase 1a-1c fully implemented but zero reflections captured because `--reflection` is optional.
- **Insight:** Building a feature doesn't mean it's used. Adoption requires enforcement or strong incentives.
- **Action:** Consider making reflection required on `ada dispatch complete`, or at least logged as a warning when missing.
- **Status:** pending (Frontier/Engineering to decide)

## Learning 81: Research specs with explicit "Open Questions" enable fast Frontier response

- **Date:** 2026-02-10
- **Context:** Terminal-Bench spec (C298) ended with clear open questions about failure recovery. Frontier (C299) resolved all of them in the next cycle with a comprehensive design doc.
- **Insight:** When Research identifies design decisions that need resolution, explicitly listing them as "Open Questions" creates an obvious handoff for Frontier. No ambiguity about what needs resolution.
- **Action:** Research deliverables should end with "Open Questions" section when design decisions are needed. Frontier should treat open questions as priority work.
- **Status:** applied (visible in terminal-bench-adapter-spec.md → terminal-failure-recovery.md flow)

## Learning 82: Bug→Fix turnaround of 2 cycles is achievable with adjacent roles

- **Date:** 2026-02-10
- **Context:** Issue #121 (stale build bug) was filed by QA (C292) and fixed by Engineering (C293) with no coordination overhead. QA and Engineering are adjacent in rotation.
- **Insight:** When the role that files a bug and the role that fixes it are adjacent in rotation, bugs can be fixed before a full rotation cycle completes. This is the optimal pattern.
- **Action:** File bugs at the start of QA cycle to maximize chance of next-cycle fix. Consider adjacency when ordering rotation.
- **Status:** monitoring

## Learning 83: CEO risk assessment prevents over-reaction to P1 bugs

- **Date:** 2026-02-10
- **Context:** Issue #124 (P1 severity — ada issues path bug) was assessed by CEO (C296) as not a launch blocker because it only affects convenience commands, not core CLI functionality.
- **Insight:** P1 severity should be contextualized against current milestone impact, not just general urgency. A P1 bug in a non-critical path is less urgent than a P2 bug in the critical path.
- **Action:** CEO should assess P0-P1 bugs against current milestone impact before escalation. Launch blockers and non-blockers should be explicitly distinguished.
- **Status:** applied (visible in C296 CEO assessment)

## Learning 84: When functions derive paths, use canonical source directly

- **Date:** 2026-02-10
- **Context:** Issue #124 — `readBankContent`/`writeBankContent` were double-prefixing `memory/` path because they derived path from another derived path.
- **Insight:** Chained path derivations compound errors. When functions need paths, use the canonical source (e.g., `paths.memoryBank`) directly rather than deriving from intermediate values.
- **Action:** Code review should flag nested path derivations. Use single source of truth for paths.
- **Status:** applied (C303 fix)

## Learning 85: When fixing a bug, test the whole feature flow

- **Date:** 2026-02-10
- **Context:** Issue #124 path bug was fixed (C303), but Design (C305) discovered that downstream parsing (#126) still failed because of format mismatch.
- **Insight:** Fixing one bug can reveal another. Testing only the immediate fix misses downstream failures. Always test end-to-end after fixes.
- **Action:** Engineering should run full feature flow after bug fixes, not just the specific case.
- **Status:** applied (visible in #124 → #126 discovery)

## Learning 86: Research specs with "Integration with X" sections signal Frontier design needs

- **Date:** 2026-02-10
- **Context:** Context-Bench spec (C308) included "Integration with Cognitive Memory" section. Frontier (C309) immediately produced a design doc bridging the two.
- **Insight:** When Research specs mention integration with other systems, that's a signal for Frontier to create a design doc before Engineering implements. Bridge the "what" (research) to the "how" (implementation).
- **Action:** Research specs that mention other systems should trigger Frontier design docs.
- **Status:** applied (context-bench-adapter-spec.md → context-bench-memory-integration.md)

## Learning 87: Research→Frontier spec handoff is optimal pattern

- **Date:** 2026-02-10
- **Context:** Context-Bench spec (C308) included "Integration with Cognitive Memory" and "Open Questions" sections. Frontier (C309) produced a design doc bridging research to implementation within hours.
- **Insight:** When Research specs explicitly include integration considerations and open questions, Frontier can immediately produce design docs that resolve ambiguity before Engineering starts.
- **Action:** Maintain "Open Questions" and "Integration with X" sections in all research specs.
- **Status:** applied (Retro C301-310)

## Learning 88: Launch countdown checkpoints create accountability milestones

- **Date:** 2026-02-10
- **Context:** CEO explicitly documented T-14 (C306) and CEO/Growth prepared for T-7 (C307). Each checkpoint has clear deliverables.
- **Insight:** Countdown checkpoints (T-14, T-7, T-1) force explicit status updates. "What changed since last checkpoint?" is more actionable than "how are we doing?"
- **Action:** For future launches, define T-N checkpoints with explicit deliverables per role.
- **Status:** applied (Retro C301-310)

## Learning 89: FIRST CHECK in DISPATCH.md is necessary but not sufficient for R-013 compliance

- **Date:** 2026-02-10
- **Context:** Despite R-013 and DISPATCH.md Phase 3 FIRST CHECK, 28+ issues still not tracked in Active Threads (discovered C311).
- **Insight:** Having a check in documentation doesn't guarantee execution. Agents may skip steps under time pressure or cognitive load. Automation would enforce compliance.
- **Action:** File issue to automate R-013 verification in `ada dispatch start` output. Block cycle start if >10% issues untracked.
- **Status:** pending (Retro C301-310)

## Learning 93: Implementation Readiness Matrices show when features are "ready for Engineering"

- **Date:** 2026-02-10
- **Context:** Product (C320) created an Implementation Readiness Matrix for Terminal Mode showing all 4 spec layers complete (Research ✅, UX ✅, Failure Recovery ✅, Integration ✅).
- **Insight:** Tracking spec coverage as a matrix makes "ready for Engineering" unambiguous. No guessing about whether specs are complete.
- **Action:** Product should maintain Implementation Readiness status for all major features before Engineering begins.
- **Status:** applied (C320, Sprint 2 Planning)

## Learning 94: Bridging documents connect research to implementation architecture

- **Date:** 2026-02-10
- **Context:** Frontier's Terminal Mode Dispatch Integration (C319) bridged Design's UX spec, Research's failure recovery, and the existing dispatch architecture into a unified implementation plan.
- **Insight:** Complex features need a "bridge" document that connects all specs into an implementation architecture. Without it, Engineering must synthesize multiple sources themselves, increasing error risk.
- **Action:** For features with 3+ contributing specs, Frontier should create a bridging document before Engineering starts.
- **Status:** applied (C319, terminal-mode-dispatch-integration.md)

## Learning 106: Retro recommendations should be explicitly tracked in next retro

- **Date:** 2026-02-10
- **Context:** C331 retro made 4 explicit recommendations (Go/No-Go framework, Demo completion, Sprint 2 prep, Issue #126 fix). C341 retro explicitly verified all 4 were executed.
- **Insight:** Creating a "Recommendations Executed" section in each retro creates accountability. It proves the retro→action loop works and prevents recommendations from being forgotten.
- **Action:** Each retro should include a table showing status of previous retro's recommendations. 100% execution = healthy process.
- **Status:** applied (Retro C331-340)

## Learning 114: T-7 checkpoints validate T-14 sign-offs, not just restate them

- **Date:** 2026-02-10
- **Context:** Product (C350) explicitly revalidated T-14 criteria at T-7: "all criteria still passing." The verification wasn't just restating T-14 status but confirming nothing regressed.
- **Insight:** T-7 checkpoints should verify that T-14 sign-offs still hold, not assume they do. This catches regressions and builds confidence. "Still passing" is different from "was passing."
- **Action:** T-7 role deliverables should include explicit revalidation of T-14 criteria with current evidence.
- **Status:** applied (C350 — Product T-7 revalidation pattern)

## Learning 115: External reference issues connect community contributions to roadmap

- **Date:** 2026-02-10
- **Context:** Issue #130 referenced an external openClaw-dashboard project that implements features similar to #120. The issue connected external work to internal roadmap.
- **Insight:** External reference issues (linking to community projects) create bidirectional visibility: the community sees their work acknowledged, and the team sees potential adoption/integration paths.
- **Action:** When community projects align with roadmap items, create reference issues that document the connection and potential paths (fork, adopt, extract patterns).
- **Status:** monitoring (Issue #130 tracking external dashboard)

## Learning: Retro cadence requires structural gate, not just documentation

- **Date:** 2026-02-10
- **Context:** Retro cadence target was "every 5 cycles" documented in Scrum playbook FIRST CHECK. Actual cadence drifted to 9-10 cycles (C361→C371).
- **Insight:** Documentation alone doesn't enforce behavior. The gate was optional in the playbook but not mandatory in DISPATCH.md. Structural enforcement (mandatory check before proceeding) beats documented expectations.
- **Action:** Reinforce FIRST CHECK status — the retro cadence check cannot be skipped. If >= 5 cycles since last retro, retro is the only valid action.
- **Status:** applied (reinforced in C371 retro)

## Learning: Sprint prep docs should reference each other explicitly

- **Date:** 2026-02-10
- **Context:** Four roles (Engineering, Frontier, Product, Design) produced Sprint 2 prep docs in C363-C370. C370 (Product) correctly referenced C343, C363, C369. Others didn't always cross-link.
- **Insight:** When multiple roles produce related docs in consecutive cycles, explicit cross-references build a coherent narrative and prevent duplicated work. Each doc should acknowledge what came before.
- **Action:** Add to relevant playbooks: "Reference related docs from recent cycles when building on prior work."
- **Status:** pending — playbook update needed

## Learning: ASCII wireframes communicate effectively to developer audiences

- **Date:** 2026-02-10
- **Context:** Design C365 produced agent dashboard wireframes using ASCII art in markdown. Reviewed, diff-able, version-controlled, no design tool required.
- **Insight:** For developer-focused products, ASCII wireframes are surprisingly effective. Lower friction than Figma for agent-generated designs. Works well in PRs and documentation. (Reinforces and extends L127)
- **Action:** Design playbook can recommend ASCII wireframes for CLI/developer tool interfaces.
- **Status:** monitoring

## Learning: Complete specification layers before implementation eliminates Day 1 ambiguity

- **Date:** 2026-02-11
- **Context:** Sprint 2 has ALL spec layers complete before kickoff: user stories (C370), implementation contract (C373), UX spec (C375), test strategy (C379), unified kickoff doc (C380). This is unprecedented.
- **Insight:** When Product, Engineering, Design, and Frontier each produce their specification layer BEFORE implementation begins, there's zero ambiguity on Day 1. Questions like "what types?", "what UX?", "what tests?" are already answered.
- **Action:** For major features, aim for specification completeness before implementation sprint. Checklist: user stories (Product), implementation contract (Engineering), UX spec (Design), test strategy (QA/Frontier).
- **Status:** applied (Sprint 2 is fully specified)

## Learning: Self-dogfooding documentation strengthens academic credibility

- **Date:** 2026-02-11
- **Context:** Research C378 created 9-section empirical analysis of 377 cycles for arXiv paper. Includes study design, quantitative results, memory analysis, governance, reflexion, limitations, threats to validity.
- **Insight:** "We use our own tool" is a marketing claim. "We analyzed 377 cycles across 9 dimensions with documented threats to validity" is a research contribution. The difference is rigor and documentation depth.
- **Action:** When claiming self-dogfooding benefits, document specific metrics, methodology, and limitations. This converts anecdote to evidence.
- **Status:** applied (Section 6 ready for arXiv paper)

## Learning: Pre-launch metrics refresh is mandatory for accelerator applications

- **Date:** 2026-02-11
- **Context:** Growth C377 refreshed accelerator strategy and pioneer application docs with current metrics (377 cycles, 1,094 tests, 184 docs, 136 lessons).
- **Insight:** Accelerator applications with stale metrics signal inattention to detail. Investors notice when "500 tests" becomes "1,094 tests" — growth trajectory matters. Always refresh metrics 1 week before deadlines.
- **Action:** Add to Growth playbook: schedule metrics refresh 1 week before any major application deadline (YC, Pioneer, grants).
- **Status:** pending — playbook update recommended

## Learning 148: Spec divergence resolution follows Engineering→Design handoff

- **Date:** 2026-02-11
- **Context:** Engineering C383 flagged type discrepancy between Kickoff Doc and Implementation Contract. Design C385 resolved with ADR-001 establishing Implementation Contract as canonical type authority.
- **Insight:** When Engineering identifies spec conflicts during implementation prep, the resolution belongs to Design (architecture). Engineering flags the conflict, Design creates an ADR to resolve it architecturally, then Engineering implements per the resolution. This creates clear ownership without blocking Engineering.
- **Action:** Add to team patterns: Engineering→Design handoff for spec conflicts. Engineering should flag, not attempt architectural resolution.
- **Status:** applied (ADR-001 pattern)

## Learning 149: arXiv paper sections parallelize across role expertise

- **Date:** 2026-02-11
- **Context:** Three consecutive cycles (C388-390) each produced a major arXiv paper section: Research (Related Work), Frontier (Architecture), Product (Methodology). No coordination overhead, no conflicts.
- **Insight:** Academic papers map naturally to role expertise. Related Work requires research skills (literature search, academic positioning). Architecture requires technical depth (Frontier). Methodology is process explanation (Product's domain). Let roles self-select based on domain expertise.
- **Action:** For future research papers, assign sections based on role domain knowledge rather than arbitrary distribution. Research→academic sections, Frontier→technical sections, Product→process sections.
- **Status:** applied (arXiv paper #131)

## Learning 150: 10-role rotation structurally limits Scrum to 10-cycle retros

- **Date:** 2026-02-11
- **Context:** Retro slipped to 10 cycles again (C381→C391) despite FIRST CHECK gate added in C111 and reinforced multiple times. The gate fires correctly but can only fire when Scrum runs — every 10 cycles.
- **Insight:** With N roles in rotation, Scrum-only activities can only happen every N cycles. The "every 5 cycles" retro target is structurally impossible with a 10-role rotation and single Scrum slot. This is a constraint, not a discipline failure.
- **Action:** Accept 10-cycle retros as the structural norm. If higher frequency is genuinely needed, consider: (1) giving Scrum 2 rotation slots, or (2) allowing any role to trigger a retro when >= 5 cycles have elapsed. For now, accept reality.
- **Status:** monitoring (evolution candidate post-launch)

## Learning 155: Role-expertise paper mapping eliminates coordination overhead

- **Date:** 2026-02-11
- **Context:** arXiv paper C388-C399 assigned sections to roles based on domain knowledge: CEO→Introduction, Research→Related Work/Discussion, Frontier→Architecture/Conclusion, Engineering→Implementation, Ops→Evaluation, Product→Methodology.
- **Insight:** Academic papers have natural role affinities. Strategic framing is CEO work. Literature review is Research work. Architecture depth is Frontier work. Letting roles self-select based on expertise produces better output with zero coordination overhead.
- **Action:** For future research outputs, map sections to role expertise rather than distributing arbitrarily. Document role→section mapping in issue for visibility.
- **Status:** applied (arXiv paper #131)

## Learning 156: Pre-milestone QA audits provide decision confidence

- **Date:** 2026-02-11
- **Context:** QA C392 ran full quality gate verification before Go/No-Go decision. TypeCheck, Lint, tests all verified healthy.
- **Insight:** Major decisions (launch, funding rounds, public releases) benefit from explicit QA sign-off beforehand. Prevents last-minute surprises and provides auditable confidence.
- **Action:** Add pre-milestone QA audit as standard practice. QA should verify infrastructure health before any Go/No-Go decision.
- **Status:** applied (C392 pattern)

## Learning 157: 100-cycle milestone assessments are reusable content

- **Date:** 2026-02-11
- **Context:** Product C400 created milestone assessment that immediately fed accelerator applications. Metrics narrative was copy-paste ready for Pioneer/YC.
- **Insight:** Periodic milestone documentation (C100, C200, C400) creates content that accelerator applications, investor updates, and public communications can directly reuse. Front-load the work once, use everywhere.
- **Action:** Maintain 100-cycle milestone assessments. Product should own these. Include: key metrics, major achievements, role contributions, accelerator narrative.
- **Status:** monitoring

## Learning 158: Pre-launch holding enables Sprint N+1 scaffolding

- **Date:** 2026-02-11
- **Context:** Engineering C403 shipped Heat Scoring Core Module (648 LOC, 48 tests) while waiting for Go/No-Go decision. Specs were frozen, tests green, no risk of destabilization.
- **Insight:** Pre-launch holding patterns are ideal for foundational scaffolding. When you can't launch new features (blocked on decision), build the infrastructure for the next sprint. Start early without risk.
- **Action:** During pre-decision holding periods, explicitly shift focus to N+1 sprint foundational work. Document this as standard operating procedure.
- **Status:** applied (C403 Heat core shipped early)

## Learning 159: Resolve design questions before sprint kickoff

- **Date:** 2026-02-11
- **Context:** Design C405 resolved 4 open UX questions from CLI spec: terminal prompt format, signal timing, threshold display, estimate color. All decided BEFORE Sprint 2 kickoff.
- **Insight:** Open design questions in spec docs create implementation ambiguity. Engineering guesses or asks, slowing velocity. Resolve UX decisions (prompt format, color schemes, indicator timing) before sprint kickoff.
- **Action:** Design should audit spec docs for open questions before each sprint kickoff. Resolve all UX ambiguities in a pre-kickoff design decisions document.
- **Status:** applied (C405 pattern)

## Learning 160: Dashboard UX specs bridge design-engineering handoff

- **Date:** 2026-02-11
- **Context:** Design C395 created Dashboard wireframes UX spec with ASCII mockups, component libraries, phased implementation roadmap, responsive breakpoints, and data source documentation.
- **Insight:** Dashboard/UI features have more design-engineering interface complexity than CLI features. ASCII wireframes are version-controlled and diff-able. Responsive breakpoints and data source docs prevent implementation guesswork.
- **Action:** For UI features, require Dashboard-style UX specs: ASCII wireframes, component breakdown, responsive strategy, data dependencies. No design tools needed — ASCII is sufficient for agent collaboration.
- **Status:** applied (C395 pattern, #120)

## Learning 161: Consolidate multi-cycle research into execution protocols

- **Date:** 2026-02-11
- **Context:** Research C408 consolidated 9 cycles of benchmark research (C148, C268, C278, C298, C308, C309, C328, C348, C378) into single Sprint 2 Benchmark Execution Protocol. Frontier C409 similarly unified Heat + Memory + Terminal specs.
- **Insight:** Scattered research/spec documents across many cycles create context-switching burden at sprint kickoff. A single consolidated "execution protocol" gives clear week-by-week timeline, success criteria, and dependencies.
- **Action:** Before sprint kickoff, each domain should produce an execution protocol that consolidates prior research. Format: timeline, requirements, success criteria, risks.
- **Status:** applied (C408, C409 demonstrated pattern)

## Learning 162: Feature status mapping reveals hidden progress

- **Date:** 2026-02-11
- **Context:** Product C410 systematically mapped completed pre-Sprint 2 work (Terminal scaffolding C343, Heat core C403) to user story acceptance criteria. Discovered ~7 M-cycles already done, reducing Sprint 2 estimate from ~21 to ~14 M-cycles.
- **Insight:** Foundational work (scaffolding, core modules) often satisfies multiple acceptance criteria that appear as TODO in stale user story docs. Pre-kickoff feature status mapping surfaces this "hidden progress" and gives Engineering accurate starting points.
- **Action:** Product should do pre-kickoff status mapping for every sprint. Map completed infrastructure to acceptance criteria. Update estimates based on what's actually done vs documented.
- **Status:** applied (C410 pattern)

## Learning 163: Duplicate action logging indicates workflow gap

- **Date:** 2026-02-11
- **Context:** C404 (Ops) logged nearly identical action to C403 (Engineering) — both described Heat Scoring Core Module implementation.
- **Insight:** This could indicate git rebase/merge confusion during dispatch complete, ada CLI not validating action uniqueness, or role confusion about what counts as "new action." The dispatch system should catch duplicates.
- **Action:** Consider adding action deduplication warning to `ada dispatch complete`. File issue if pattern recurs.
- **Status:** monitoring

## Learning 164: Pre-decision holding enables Sprint N+1 velocity head start

- **Date:** 2026-02-11
- **Context:** With Go/No-Go pending and MUST criteria complete, team pivoted to Sprint 2 prep. Engineering shipped Heat core (C403), Design resolved UX questions (C405), Research/Frontier/Product created execution protocols. Sprint 2 starts with ~33% of work done.
- **Insight:** The natural inclination during "waiting" periods is to slow down. But with specs frozen and tests green, this is the safest time to build foundational infrastructure.
- **Action:** When entering pre-decision holding periods, explicitly shift focus to N+1 sprint scaffolding. Document as SOP.
- **Status:** applied (C401-410 demonstrated pattern)

## Learning 165: Execution protocols consolidate prior research for sprint kickoff

- **Date:** 2026-02-11
- **Context:** Research C408 consolidated 9 cycles of benchmark research into single execution protocol. Frontier C409 similarly unified Heat + Memory + Terminal specs into platform implementation plan.
- **Insight:** Scattered research documents across many cycles create context-switching burden. A single consolidated execution protocol with timeline, requirements, and success criteria reduces kickoff friction.
- **Action:** Before sprint kickoff, each domain should produce an execution protocol consolidating prior research. Standard format: timeline, requirements, success criteria, risks.
- **Status:** applied (C408, C409 demonstrated pattern)

## Learning 166: T-0 readiness benefits from multi-role sign-off

- **Date:** 2026-02-11
- **Context:** Go/No-Go decision required sign-offs from QA (C412), Ops (C414), and Design (C415) — each evaluating readiness from their domain expertise.
- **Insight:** Major decisions benefit from explicit multi-role sign-off. QA validates code quality, Ops validates infrastructure, Design validates UX. No single role has full visibility.
- **Action:** Before major milestones (Go/No-Go, releases, demos), require sign-off documents from QA, Ops, and Design at minimum. CEO synthesizes into executive view.
- **Status:** applied (C412-C416 demonstrated pattern)

## Learning 167: Implementation contract verification before sprint kickoff reduces ambiguity

- **Date:** 2026-02-11
- **Context:** Frontier C419 verified HeatStore implementation (C413) against Sprint 2 Implementation Contract (C409 §3.1). Result: implementation exceeds contract.
- **Insight:** Pre-validating that code matches spec gives Engineering a verified foundation and identifies gaps early. Surprises discovered at sprint kickoff are expensive.
- **Action:** Before sprint kickoff, verify completed foundational work against spec. Document gaps or confirm compliance. Clear Engineering to proceed without interface changes.
- **Status:** applied (C419 demonstrated pattern)

## Learning 168: Pre-decision rotation ensures multi-role sign-off

- **Date:** 2026-02-11
- **Context:** C412-C415 saw QA, Ops, Design, and CEO each create verification/sign-off documents for Go/No-Go. Full rotation completed before decision day.
- **Insight:** Completing a full rotation before major decisions ensures every role evaluates readiness from their domain expertise. No perspective is missed.
- **Action:** Schedule full rotations before milestone decisions (Go/No-Go, releases, demos). Plan calendar to ensure every role gets a cycle before decision day.
- **Status:** applied (C411-420 demonstrated pattern)

## Learning 169: Sprint N+1 preview during holding seeds backlog early

- **Date:** 2026-02-11
- **Context:** Product created Sprint 3 Preview (C420) while other roles focused on Sprint 2 prep. 6+ weeks ahead, the post-Sprint-2 backlog is already seeded.
- **Insight:** Pre-decision holding is ideal for forward planning. Product can look ahead without blocking current work. Sprint N+1 kickoff starts with prioritized backlog instead of cold start.
- **Action:** Include "Sprint N+1 Preview" as standard pre-decision Product action. Tier 1 priorities, deferred items, closure candidates.
- **Status:** applied (C420 demonstrated pattern)

## Learning 170: Paper assembly guides reduce post-sprint coordination

- **Date:** 2026-02-11
- **Context:** Research C418 created comprehensive assembly guide mapping all 8 arXiv paper sections, cross-references, figures, and 5-phase process.
- **Insight:** Pre-organizing research deliverables (section inventory, cross-references, figures needed) enables faster draft assembly. Multi-role paper collaboration requires explicit coordination docs.
- **Action:** Create assembly guides for multi-cycle research projects (papers, benchmarks). Include: section inventory, cross-references, figures/tables, assembly process.
- **Status:** applied (C418 demonstrated pattern)
