# autonomous-dev-agents

<!-- ria:ui-artifact-first v1 — source: RIA/templates/agent-rules/ui-artifact-first.md; edit there, not here -->
## Large UI changes: artifact first, then build

**Before building a large UI change, send Ishan a Claude artifact of it and
iterate until he locks it in.** Set by the owner on 2026-11-04 for every
project.

- **What counts as large:** a new screen, page, view or face; a redesign or
  re-layout of an existing one; a new navigation or interaction model; a
  visual-language change (colour, type, spacing, motion) that touches more
  than one screen. A bug fix, a copy tweak, or a small change that matches an
  approved design does not count.
- **How:** publish a claude.ai Artifact (the `Artifact` tool in Claude Code) —
  a clickable HTML mock, close enough to the real thing to react to, with the
  real content and states (empty, loading, error) rather than lorem ipsum.
  Give him the link. RIA working from her own turns uses `publish_artifact`.
- **Iterate:** revise the same artifact (same URL) on each reaction. Do not
  write the production UI while the mock is still moving.
- **Lock:** build only after he says it is locked (or plainly approves it).
  Then build to the artifact, and put its link in the PR description.
  If the build has to diverge from it, say where and why in the PR.
- Unattended runs (a schedule, a self-ship) cannot get a lock, so they must not
  ship a large UI change: publish the mock and stop.
<!-- /ria:ui-artifact-first -->
