# ADA Web Dashboard

> Marketing site + monitoring dashboard for Autonomous Dev Agents.

## Planned Features

### Marketing Site

- Hero page explaining ADA
- Feature showcase (CLI, templates, dashboard)
- Pricing page (Free, Pro, Enterprise)
- Documentation / getting started guide

### Dashboard (authenticated)

- **Cycle Timeline** — Visual timeline of what each role did and when
- **Memory Bank Viewer** — Browse and search the shared memory bank with markdown rendering
- **Role Configuration** — Edit roster, rotation order, and playbooks through the UI
- **Metrics & Analytics** — Actions/day, issues created, PRs merged, cycle velocity
- **Team Health** — Blockers, stale PRs, role coverage gaps

## Tech Stack (planned)

- **Framework:** Next.js 14+ with App Router
- **Styling:** Tailwind CSS
- **Auth:** NextAuth.js or Clerk
- **Data:** @ada/core for reading agent state
- **Real-time:** WebSocket or Server-Sent Events for live cycle updates

## Status

🚧 **Not yet implemented.** This is a placeholder for future development.

The CLI (`@ada/cli`) and core library (`@ada/core`) are the current focus.

## License

**Commercial License** — This component (ADA Web Dashboard) is not part of the open source AGPLv3 release. It is available under a separate commercial license as part of ADA Pro and Enterprise plans.

For licensing inquiries, contact: **licensing@rathiindustries.com**
