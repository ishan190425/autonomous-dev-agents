# 🚀 Post-Launch Submission Runbook

> Step-by-step execution guide for accelerator submissions
> **Author:** Growth (🚀 The Dealmaker)
> **Created:** 2026-02-09 (Cycle 287)
> **Status:** Ready to execute on launch day

---

## Timeline Overview

| Date      | Time   | Action                                   |
| --------- | ------ | ---------------------------------------- |
| Feb 24    | Launch | v1.0-alpha goes live                     |
| Feb 24    | +2h    | Capture initial metrics                  |
| Feb 24    | +4h    | Update all application docs              |
| Feb 25    | AM     | Submit Pioneer application               |
| Feb 25-28 | —      | Monitor traction, collect early feedback |
| Mar 1     | AM     | Submit YC application                    |
| Mar 5     | —      | Submit Neo application                   |

---

## Launch Day (Feb 24)

### Step 1: Verify Launch Success

```bash
# Check npm package is published
npm view @ada/cli version

# Check GitHub release is live
gh release list --repo ishan190425/autonomous-dev-agents

# Check Discord for launch announcement
# → discord.gg/5NCHGJAz
```

### Step 2: Capture Initial Metrics (T+2 hours)

Run this script to capture all metrics in one place:

```bash
cd ~/RIA/autonomous-dev-agents

# GitHub stats
echo "=== GitHub Stats ==="
gh api repos/ishan190425/autonomous-dev-agents --jq '.stargazers_count, .forks_count, .watchers_count'

# npm downloads (wait 24-48h for accuracy)
echo "=== npm Downloads ==="
npm view @ada/cli downloads 2>/dev/null || echo "Check npmjs.com/@ada/cli"

# Dispatch cycles (internal)
echo "=== Dispatch Cycles ==="
cat agents/state/rotation.json | jq '.cycle_count'

# PRs merged
echo "=== PRs Merged ==="
gh pr list --state merged --limit 200 | wc -l

# Tests
echo "=== Tests ==="
npm test --workspaces 2>&1 | grep -E "passed|failed"

# Docs
echo "=== Documentation ==="
find docs -name "*.md" | wc -l
```

### Step 3: Update Application Documents

**Files to update:**

1. `docs/applications/pioneer-application.md` — Pioneer draft
2. `docs/applications/accelerator-strategy.md` — Strategy doc
3. `docs/fundraising/pitch-deck.md` — Investor deck

**Metrics to update in each:**

- [ ] Dispatch cycles (current: 287 → update to launch value)
- [ ] PRs merged (current: 42 → update)
- [ ] Tests passing (current: 991 → verify)
- [ ] Documentation files (current: 129 → update)
- [ ] GitHub stars (new metric!)
- [ ] npm downloads (new metric! 24-48h delay)
- [ ] Discord members (new metric!)

**Demo links to add:**

- [ ] Demo video link (from YouTube/Loom)
- [ ] Demo GIF link (for quick embed)
- [ ] Docs site link (if live)

---

## Pioneer Submission (Feb 25)

### Pre-Submission Checklist

- [ ] All metrics updated to post-launch values
- [ ] Demo video link added and working
- [ ] Demo GIF embedded (for quick visual)
- [ ] npm download count captured (or estimate)
- [ ] GitHub star count captured
- [ ] Discord member count captured
- [ ] One-liners updated with fresh numbers
- [ ] All links tested and working
- [ ] Proofread for typos

### Submission Steps

1. Go to pioneer.app/apply
2. Copy content from `pioneer-application.md` section by section
3. Double-check all numbers match latest metrics
4. Upload demo video if required
5. Submit and screenshot confirmation
6. Post to Issue #74 confirming submission

### Post-Submission

- Set weekly update reminder (Pioneer tournament format)
- Track submission in `accelerator-strategy.md` tracker table
- Note any immediate feedback from Pioneer

---

## YC Submission (Mar 1)

### Pre-Submission Checklist

Same as Pioneer, plus:

- [ ] 5-day traction data (Feb 24-28)
- [ ] Early user quotes/feedback (if any)
- [ ] HN/Product Hunt results (if launched there)
- [ ] Video finalized for YC format (1-2 min)

### Submission Steps

1. Go to ycombinator.com/apply
2. Use content from `accelerator-strategy.md` YC section
3. Attach demo video
4. Submit and screenshot confirmation
5. Post to Issue #74 confirming submission

---

## Neo Submission (Mar 5)

### Pre-Submission Checklist

- [ ] 10-day traction data
- [ ] Pioneer feedback incorporated
- [ ] Any fixes/improvements from week 1

---

## Quick Metric Reference

When updating applications, replace these placeholders:

| Placeholder         | Source                                                                    |
| ------------------- | ------------------------------------------------------------------------- |
| `{CYCLES}`          | `cat agents/state/rotation.json \| jq '.cycle_count'`                     |
| `{PRS}`             | `gh pr list --state merged --limit 200 \| wc -l`                          |
| `{TESTS}`           | `npm test --workspaces 2>&1 \| grep passed`                               |
| `{DOCS}`            | `find docs -name "*.md" \| wc -l`                                         |
| `{STARS}`           | `gh api repos/ishan190425/autonomous-dev-agents --jq '.stargazers_count'` |
| `{DOWNLOADS}`       | npmjs.com/@ada/cli or `npm view @ada/cli`                                 |
| `{DISCORD_MEMBERS}` | Check discord.gg/5NCHGJAz member count                                    |
| `{DEMO_VIDEO_LINK}` | From YouTube/Loom after upload                                            |
| `{DEMO_GIF_LINK}`   | From GitHub/hosting after creation                                        |

---

## Contingency Plans

### If launch is delayed

- Do NOT submit Pioneer on Feb 25
- Wait for launch, capture 24h metrics, then submit
- Update all deadlines in this runbook

### If metrics are lower than expected

- Focus on the story, not just numbers
- Emphasize dogfooding proof (product built by product)
- Highlight technical milestones (cognitive memory, reflexion)

### If demo video has issues

- Use terminal recording as backup (asciinema)
- Focus on code + output, less on UI polish
- Submit with note that polished video coming

---

## Success Criteria

| Metric                   | Target    | Stretch   |
| ------------------------ | --------- | --------- |
| GitHub stars (7 days)    | 100       | 500       |
| npm downloads (7 days)   | 500       | 2,000     |
| Discord members (7 days) | 50        | 200       |
| Pioneer advancement      | Week 2    | Week 1    |
| YC interview             | By Mar 31 | By Mar 15 |

---

## Cross-References

- `docs/applications/pioneer-application.md` — Pioneer draft
- `docs/applications/accelerator-strategy.md` — Full strategy
- `docs/fundraising/pitch-deck.md` — Investor deck
- `docs/marketing/launch-communications.md` — Launch content
- Issue #74 — Accelerator Application Strategy
- Issue #26 — Launch Coordination
- Issue #39 — Demo Asset Production

---

_🚀 Growth | Cycle 287 | Post-Launch Submission Runbook_
_Created to streamline Feb 24-Mar 5 execution. Execute precisely, iterate based on feedback._
