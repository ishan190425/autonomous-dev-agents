# 🎬 Demo Recording Preparation Guide

> Step-by-step preparation for v1.0-alpha demo recording
> **Author:** Growth (🚀 The Dealmaker)
> **Date:** 2026-02-05
> **Recording Window:** February 8-9, 2026
> **Target:** Issue #39 deliverables (GIF + Video)

---

## Pre-Recording Checklist (Complete by Feb 7)

### Environment Setup

- [ ] **Demo repo cloned:** `~/RIA/ada-demo-project`
- [ ] **ADA CLI built:** `cd ~/RIA/autonomous-dev-agents && npm run build`
- [ ] **CLI globally linked:** `cd packages/cli && npm link`
- [ ] **Verify CLI works:** `ada --version` → shows version
- [ ] **Test full flow in demo repo:**
  ```bash
  cd ~/RIA/ada-demo-project
  rm -rf agents/  # Clean slate
  ada init
  ada run --dry-run  # Safe test
  ada status
  ```

### Terminal Configuration

- [ ] **Font:** JetBrains Mono or similar (18-20pt minimum)
- [ ] **Theme:** Dracula, Nord, or high-contrast dark theme
- [ ] **Window size:** 100 columns × 30 rows (for GIF) or 120×35 (for video)
- [ ] **Hide distractions:** Clear scrollback, hide other windows
- [ ] **Prompt:** Clean PS1 (just `$ ` or `→ `)

```bash
# Minimal prompt for recording
export PS1='$ '

# Or use a clean project indicator
export PS1='\[\e[36m\]ada-demo\[\e[0m\] $ '
```

### Recording Tools

**For Terminal Recording (GIF):**

- [ ] **asciinema** installed: `pip install asciinema` or `brew install asciinema`
- [ ] **svg-term** for rendering: `npm install -g svg-term-cli`
- [ ] **gifski** for high-quality GIF: `brew install gifski`

**For Video:**

- [ ] **OBS Studio** or **Screen Studio** (macOS) ready
- [ ] **Microphone tested** (if narration)
- [ ] **Resolution:** 1920×1080 or 2560×1440

---

## Recording Scripts

### Script A: GIF Demo (30 seconds)

**Scene 1: Fresh Start (0-5s)**

```bash
cd ada-demo-project
ada init
```

_Expected output:_

```
✓ Created agents/ folder
✓ Initialized 7 roles
✓ Ready for first dispatch
```

**Scene 2: Dispatch Magic (5-15s)**

```bash
ada run
```

_Expected output:_

```
🚀 Dispatching: ⚙️ Engineering (The Builder)

[Spinner/progress animation]

📝 Action: Creating new feature...
✓ Completed dispatch cycle 1
```

**Scene 3: Status Check (15-25s)**

```bash
ada status
```

_Expected output:_

```
🤖 ADA — Autonomous Dev Agents
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Current Role: 🛡️ Ops (The Guardian)
📅 Last Run: 2 minutes ago
🔄 Cycle: 1

Next: ada run to continue dispatch
```

**Scene 4: CTA Card (25-30s)**

```
npm install -g @ada/cli
github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents
```

### Script B: Extended Video (2 min)

**[0:00-0:15] Hook**

> "What if AI could run your whole dev team? Not just write code — but plan features, review PRs, and ship releases?"

**[0:15-0:30] Problem**

> "Today, AI tools are copilots. You're still the bottleneck, context-switching between tools, reviewing everything. ADA changes that."

**[0:30-1:30] Demo Flow**

1. Show empty demo project
2. Run `ada init` — explain what gets created
3. Open `agents/` folder briefly — show roster, playbooks
4. Run `ada run` — watch agent work
5. Run `ada status` — explain rotation system
6. Check GitHub — show created issue/PR

**[1:30-1:50] Dogfooding Story**

> "The wild part? We built ADA with ADA. 57 autonomous cycles. 13 PRs merged. Every decision made by AI agents."

**[1:50-2:00] CTA**

> "Try it now: npm install -g @ada/cli. Star us on GitHub. Links in description."

---

## Recording Commands

### Terminal Recording with asciinema

```bash
# Start recording
asciinema rec demo-raw.cast

# [Run demo script]

# Stop recording
Ctrl+D

# Convert to GIF
svg-term --in demo-raw.cast --out demo.svg --window
# Or
asciinema cat demo-raw.cast | svg-term --out demo.svg
```

### Alternative: Built-in terminal recorder (macOS)

```bash
# Record with QuickTime Player
# File → New Screen Recording → Select terminal window

# Or use Gifox (menu bar GIF recorder)
# Start → run commands → stop
```

### Post-Processing

**Trim and optimize GIF:**

```bash
# Using gifsicle
gifsicle -O3 --lossy=80 demo.gif -o demo-optimized.gif

# Using gifski (better quality)
gifski --fps 15 --width 800 demo.mp4 -o demo.gif
```

**Add captions (optional):**

- Use Figma/Canva for text overlays
- Keep captions short: "ada init", "Agents created!", "First dispatch"

---

## Timing Guide

| Segment          | Target Time | Commands                  | Notes                        |
| ---------------- | ----------- | ------------------------- | ---------------------------- |
| Scene 1 (Init)   | 5 seconds   | `cd`, `ada init`          | Type at readable pace        |
| Scene 2 (Run)    | 10 seconds  | `ada run`                 | Let animation play naturally |
| Scene 3 (Status) | 10 seconds  | `ada status`              | Hold for readability         |
| Scene 4 (CTA)    | 5 seconds   | Static card or clear text | Can be added in post         |
| **Total**        | **30s**     |                           | Under Twitter/GitHub limit   |

---

## Troubleshooting

### "ada: command not found"

```bash
# Re-link CLI
cd ~/RIA/autonomous-dev-agents/packages/cli
npm link
# Or use direct path
node ~/RIA/autonomous-dev-agents/packages/cli/dist/index.js
```

### "Permission denied" or npm link issues

```bash
# Use npx instead
cd ~/RIA/autonomous-dev-agents
npx --workspace=packages/cli ada init
```

### LLM API errors during `ada run`

```bash
# Check API key
echo $ANTHROPIC_API_KEY  # Should be set

# Use dry-run for recording if API issues
ada run --dry-run
```

### Demo output doesn't match expected

```bash
# Reset demo repo
cd ~/RIA/ada-demo-project
rm -rf agents/
git checkout -- .  # Reset any changes
```

### GIF too large (>5MB for Twitter)

```bash
# Reduce quality/colors
gifsicle --colors 64 -O3 demo.gif -o demo-small.gif

# Reduce FPS
gifski --fps 10 --width 640 demo.mp4 -o demo.gif
```

---

## Post-Recording Checklist

### Immediately After Recording

- [ ] Save raw recordings to `~/RIA/autonomous-dev-agents/docs/marketing/assets/`
- [ ] Back up to cloud storage (Google Drive, Dropbox)
- [ ] Test playback — verify no corruption

### During Editing (Feb 10-11)

- [ ] Trim dead air at start/end
- [ ] Add subtle fade in/out
- [ ] Add captions for key moments (if needed)
- [ ] Export at multiple sizes:
  - Twitter: 800×450, <5MB
  - GitHub: 1200×675, <10MB
  - Full res: 1920×1080

### Quality Checks

- [ ] Commands readable at Twitter embed size
- [ ] No personal info visible (paths, API keys, etc.)
- [ ] Animation timing feels natural (not rushed)
- [ ] CTA visible and legible

### Final Delivery

- [ ] Upload GIF to GitHub releases or CDN
- [ ] Add to README.md
- [ ] Link in Issue #39
- [ ] Notify Product/CEO for review

---

## Resource Links

- **Demo repo:** https://github.com/ishan190425/ada-demo-project
- **ADA repo:** https://github.com/RATHI-CAPITAL-VENTURES/autonomous-dev-agents
- **Issue #39:** Demo Asset Production Plan
- **Issue #26:** Launch Coordination
- **Go/No-Go tracker:** `docs/business/go-no-go-countdown.md`

---

## Recording Day Schedule (Feb 8-9)

### Day 1 (Feb 8) — GIF Focus

| Time     | Task                                  |
| -------- | ------------------------------------- |
| 10:00 AM | Final environment check               |
| 10:30 AM | Record GIF takes (3-5 attempts)       |
| 12:00 PM | Review takes, pick best               |
| 2:00 PM  | Initial edit/trim                     |
| 4:00 PM  | Export draft, test on Twitter preview |

### Day 2 (Feb 9) — Video Focus (Stretch)

| Time     | Task                              |
| -------- | --------------------------------- |
| 10:00 AM | Record video takes with narration |
| 12:00 PM | Review and select best takes      |
| 2:00 PM  | Rough cut assembly                |
| 4:00 PM  | Polish and export                 |

---

## Dependencies & Blockers

| Dependency               | Status         | Owner       | Notes                          |
| ------------------------ | -------------- | ----------- | ------------------------------ |
| Demo repo Phase 2-3 done | 🔄 In Progress | Product     | Must complete Feb 6-7          |
| CLI UX polish (optional) | 🔄 Ready       | Engineering | Issue #38, nice-to-have before |
| API key for live demo    | ✅ Available   | Ops         | Use ANTHROPIC_API_KEY          |

---

## Fallback Plans

**If demo repo validation fails (Feb 7):**

- Use ADA repo itself for demo (less ideal but works)
- Or use scripted/simulated terminal output

**If API issues during recording:**

- Use `--dry-run` flag to show flow without LLM calls
- Add "(simulated)" caption

**If time runs out:**

- Ship GIF only (video can come post-launch)
- Static screenshots with annotations as backup

---

_🚀 Growth | Cycle 58 | Supporting Issue #39 Demo Assets_
