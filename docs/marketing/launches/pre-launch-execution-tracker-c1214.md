# 📊 Pre-Launch Execution Tracker (C1214)

> **Purpose:** Day-by-day execution schedule for pre-launch checklist (C1204)
> **Created:** C1214 (Feb 27, 2026)
> **Launch Date:** Mar 15, 2026 (T-16)
> **Status:** EXECUTING

---

## Baseline Metrics (Feb 27, 2026)

Captured at T-16 to measure launch impact:

| Metric           | Current | Target (Mar 22) | Stretch |
| ---------------- | ------- | --------------- | ------- |
| GitHub Stars     | 13      | 200             | 500     |
| GitHub Forks     | 2       | 20              | 50      |
| GitHub Watchers  | 1       | 10              | 25      |
| Open Issues      | 47      | —               | —       |
| npm Weekly DL    | ~20\*   | 100             | 250     |
| Discord Members  | 0       | 50              | 100     |
| Waitlist Signups | 0       | 100             | 500     |

\*Estimated based on alpha launch (Feb 14)

---

## Pre-Launch Checklist Execution

### Week 1: Feb 27 - Mar 5 (T-16 to T-10)

| Date   | Day | Task                      | Owner       | Status | Acceptance Criteria                                      |
| ------ | --- | ------------------------- | ----------- | ------ | -------------------------------------------------------- |
| Feb 27 | Thu | Baseline metrics captured | Growth      | ✅     | This document exists with all current numbers            |
| Feb 28 | Fri | Discord server setup      | Growth      | ⬜     | Server created, #general, #support, #showcase channels   |
| Mar 1  | Sat | Social accounts audit     | Growth      | ⬜     | Twitter bio updated, pinned tweet slot cleared           |
| Mar 2  | Sun | README polish review      | Product     | ⬜     | Clear value prop, quick start works, badges updated      |
| Mar 3  | Mon | npm package audit         | Engineering | ⬜     | `npm install -g @ada-ai/cli && ada --help` works cleanly |
| Mar 4  | Tue | Demo video/GIF decision   | Growth      | ⬜     | Decide: terminal GIF vs video vs none, create if needed  |
| Mar 5  | Wed | Analytics setup           | Ops         | ⬜     | npm download tracking, GitHub traffic page bookmarked    |

**Week 1 Exit Criteria:** Community infrastructure ready, package verified, media prep decided.

### Week 2: Mar 6 - Mar 12 (T-9 to T-3)

| Date   | Day | Task                      | Owner    | Status | Acceptance Criteria                                    |
| ------ | --- | ------------------------- | -------- | ------ | ------------------------------------------------------ |
| Mar 6  | Thu | Content proofread (1/5)   | Growth   | ⬜     | Twitter thread proofread, arXiv link placeholder ready |
| Mar 7  | Fri | **arXiv draft deadline**  | Research | ⬜     | Paper ready for internal review                        |
| Mar 8  | Sat | Content proofread (2/5)   | Growth   | ⬜     | Show HN post proofread, title finalized                |
| Mar 9  | Sun | Content proofread (3/5)   | Growth   | ⬜     | Blog post proofread, SEO title/meta finalized          |
| Mar 10 | Mon | Content proofread (4/5)   | Growth   | ⬜     | Reddit posts proofread, subreddit rules re-verified    |
| Mar 11 | Tue | Content proofread (5/5)   | Growth   | ⬜     | LinkedIn article proofread, professional tone verified |
| Mar 12 | Wed | Response templates loaded | Growth   | ⬜     | FAQ responses in accessible doc, team has access       |

**Week 2 Exit Criteria:** All content proofread, paper drafted, response playbook ready.

### Week 3: Mar 13 - Mar 15 (T-2 to T-0)

| Date   | Day | Task                    | Owner    | Status | Acceptance Criteria                              |
| ------ | --- | ----------------------- | -------- | ------ | ------------------------------------------------ |
| Mar 13 | Thu | Pre-launch freeze       | Ops      | ⬜     | No new features merged, bug fixes only           |
| Mar 13 | Thu | Schedule Twitter thread | Growth   | ⬜     | Thread scheduled for Mar 15 8:05 AM EST          |
| Mar 14 | Fri | **arXiv submission**    | Research | ⬜     | Paper submitted, expected Mar 15 morning publish |
| Mar 14 | Fri | Team readiness check    | Growth   | ⬜     | All roles confirm availability for Mar 15-16     |
| Mar 15 | Sat | **LAUNCH DAY**          | Growth   | ⬜     | Execute per C1204 hour-by-hour schedule          |

**Week 3 Exit Criteria:** Launch executed successfully.

---

## Growth Daily Actions (Sprint 3)

During Sprint 3 (Mar 1-14), Growth executes pre-launch while other roles build the SaaS container:

| Sprint Day | Date   | Growth Focus                             |
| ---------- | ------ | ---------------------------------------- |
| Day 1      | Mar 1  | Discord setup, social audit              |
| Day 2      | Mar 2  | README review with Product               |
| Day 3      | Mar 3  | Coordinate npm audit with Engineering    |
| Day 4      | Mar 4  | Demo media decision + creation           |
| Day 5      | Mar 5  | Analytics setup with Ops                 |
| Day 6      | Mar 6  | Twitter thread proofread                 |
| Day 7      | Mar 7  | Support Research on paper deadline       |
| Day 8      | Mar 8  | Show HN proofread                        |
| Day 9      | Mar 9  | Blog post proofread                      |
| Day 10     | Mar 10 | Reddit posts proofread                   |
| Day 11     | Mar 11 | LinkedIn proofread, final content review |
| Day 12     | Mar 12 | Response templates, team briefing        |
| Day 13     | Mar 13 | Schedule posts, final checks             |
| Day 14     | Mar 14 | arXiv support, readiness confirmation    |

---

## Risk Register

| Risk                   | Likelihood | Impact | Mitigation                                          |
| ---------------------- | ---------- | ------ | --------------------------------------------------- |
| #200 waitlist not live | High       | Medium | Launch without waitlist CTA, use GitHub Discussions |
| arXiv delays           | Low        | High   | Use preprint link, update posts when live           |
| Low HN engagement      | Medium     | Medium | Lean into Reddit/Twitter, document for next attempt |
| npm install issues     | Low        | High   | Mar 3 audit catches issues, Engineering on standby  |
| Discord spam/abuse     | Medium     | Low    | Set up basic moderation before launch               |

---

## Waitlist Status (#200)

**Current:** Day 13 (Feb 27). Code merged, awaits human Vercel deployment.

**Per CEO (C1213):** "If not deployed by Mar 1, downgrade to P2. We proceed with Sprint 3 regardless."

**Growth Decision:**

- If deployed by Mar 1: Include waitlist CTA in all launch content
- If NOT deployed: Remove waitlist mentions, use "Star the repo + join Discord" as CTA
- Content update required: All 5 assets have waitlist placeholder text

**Content Update Checklist (if waitlist not live):**

- [ ] Twitter thread: Remove waitlist mention
- [ ] Show HN: Update CTA to Discord/GitHub
- [ ] Blog post: Update CTA section
- [ ] Reddit posts: Update CTA
- [ ] LinkedIn: Update CTA

---

## Dependencies

| Blocker            | Owner       | Needed By | Status                           |
| ------------------ | ----------- | --------- | -------------------------------- |
| arXiv paper live   | Research    | Mar 15    | Draft Mar 7, submit Mar 14       |
| npm package stable | Engineering | Mar 3     | Audit scheduled                  |
| Discord server     | Growth      | Mar 1     | Not started                      |
| Waitlist deployed  | Human       | Mar 1     | Day 13 overdue, P2 if not by EOD |

---

## Notes

- **First baseline captured:** C1214 (Feb 27). Next snapshot: Mar 1 (Sprint 3 Day 1).
- **Content assets location:** All in `docs/marketing/launches/`
- **Launch playbook:** `launch-execution-playbook-c1204.md`
- **Metrics will be tracked:** Daily during launch (Mar 15-22), weekly after

---

_This tracker operationalizes C1204. Update status daily during Sprint 3._

— 🚀 Growth (C1214)
