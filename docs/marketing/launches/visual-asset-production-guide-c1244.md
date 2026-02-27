# 🎨 Visual Asset Production Guide (C1244)

> **Purpose:** Complete specification for launch visual assets (Twitter, Show HN, Product Hunt)
> **Created:** C1244 (Feb 27, 2026)
> **Production Window:** Mar 6-7, 2026 (T-9 to T-8)
> **Status:** READY FOR PRODUCTION

---

## Overview

This guide specs out every visual asset needed for the ADA SaaS launch (Mar 8-10) and public launch (Mar 15). All assets should be produced Mar 6-7 when Sprint 3 implementation is far enough along to capture real UI.

**Total assets needed:** 8 primary + 3 fallback

---

## Asset Inventory

### Required for SaaS Launch Thread (C1234)

| ID    | Asset                 | Type       | Needed For | Priority |
| ----- | --------------------- | ---------- | ---------- | -------- |
| VIS-1 | Terminal `ada status` | Screenshot | Tweet 1    | P0       |
| VIS-2 | Role Grid             | Graphic    | Tweet 3    | P0       |
| VIS-3 | Cycle Rotation GIF    | Animation  | Tweet 4    | P1       |
| VIS-4 | GitHub Insights       | Screenshot | Tweet 5    | P0       |
| VIS-5 | Dashboard Preview     | Screenshot | Tweet 10   | P1       |

### Required for Show HN / Product Hunt

| ID    | Asset                | Type        | Needed For     | Priority |
| ----- | -------------------- | ----------- | -------------- | -------- |
| VIS-6 | Hero Terminal GIF    | Animation   | Show HN header | P0       |
| VIS-7 | Product Hunt Gallery | Screenshots | PH listing     | P1       |
| VIS-8 | Social Preview Card  | Graphic     | Link previews  | P0       |

### Fallback Assets (if Dashboard not ready)

| ID     | Asset                      | Type       | Replaces | Priority |
| ------ | -------------------------- | ---------- | -------- | -------- |
| VIS-F1 | Terminal-only workflow     | GIF        | VIS-5    | P1       |
| VIS-F2 | CLI init → status sequence | GIF        | VIS-7    | P1       |
| VIS-F3 | README screenshot          | Screenshot | VIS-7    | P2       |

---

## Technical Specifications

### Twitter Image Specs

| Spec              | Value                          |
| ----------------- | ------------------------------ |
| **Format**        | PNG (screenshots), GIF (anims) |
| **Single Image**  | 1200 × 675 px (16:9)           |
| **Max File Size** | 5 MB (images), 15 MB (GIFs)    |
| **Alt Text**      | Required for accessibility     |

### Product Hunt Specs

| Spec           | Value                       |
| -------------- | --------------------------- |
| **Gallery**    | Up to 5 images              |
| **Dimensions** | 1270 × 760 px recommended   |
| **Thumbnail**  | 240 × 240 px (auto-cropped) |
| **Video**      | Optional, YouTube embed     |

### General Specs

| Spec               | Value                               |
| ------------------ | ----------------------------------- |
| **Color Space**    | sRGB                                |
| **Resolution**     | 2x for retina, downscale for upload |
| **Terminal Theme** | Dark background (professional)      |
| **Font**           | JetBrains Mono or SF Mono           |

---

## Asset Production Details

### VIS-1: Terminal `ada status` Screenshot

**Content:**

```
$ ada status

🎯 ADA Status — autonomous-dev-agents

  Cycle:       1244
  Streak:      826 consecutive 🏆
  Next Role:   🔬 Research (in 12 min)
  Memory:      v61 (162 lines)

  Last 5 Actions:
  ├─ C1244 🚀 Growth    Visual asset production guide
  ├─ C1243 👔 CEO       Sprint 3 Go/No-Go decision
  ├─ C1242 🎨 Design    Managed execution UX spec
  ├─ C1241 🛡️ Ops       PR #260 merge
  └─ C1240 ⚙️ Engineering  Typecheck fix

  Issues: 47 open | PRs: 0 open, 112 merged
  Tests: 2,606 passing | Coverage: 89%
```

**Style:**

- Dark terminal (black or #1e1e1e background)
- Green/cyan for role emojis
- White text for content
- Subtle terminal chrome (title bar optional)

**Tools:** iTerm2 + Snagit/CleanShot X, or asciinema → SVG

**Dimensions:** 1200 × 675 (fit to tweet image)

---

### VIS-2: Role Grid Graphic

**Content:** 10 roles arranged in a 2×5 or 3×4 grid:

```
┌─────────────┬─────────────┬─────────────┐
│ 👔 CEO      │ 🚀 Growth   │ 🔬 Research │
├─────────────┼─────────────┼─────────────┤
│ 🌌 Frontier │ 📦 Product  │ 📋 Scrum    │
├─────────────┼─────────────┼─────────────┤
│ 🔍 QA       │ ⚙️ Engineering │ 🛡️ Ops    │
├─────────────┴─────────────┴─────────────┤
│              🎨 Design                   │
└──────────────────────────────────────────┘
```

**Style:**

- Clean, modern design
- Dark background to match terminal aesthetic
- Each role in a rounded card
- Emoji prominent, title beneath
- Subtle connecting lines showing rotation order

**Tools:** Figma, Excalidraw, or Canva

**Dimensions:** 1200 × 675

---

### VIS-3: Cycle Rotation GIF

**Content:** 15-20 second loop showing:

1. Role indicator changes (CEO → Growth → Research...)
2. `ada dispatch start` command
3. Brief action execution
4. `ada dispatch complete` with action message
5. Next role highlighted

**Style:**

- Terminal recording
- Real commands, not simulated
- Speed: 1.5x-2x (keep under 15 seconds)
- Loop seamlessly

**Tools:**

- Record: asciinema or OBS
- Convert: gifski or CloudConvert
- Edit: ezgif.com for optimization

**Dimensions:** 1200 × 675 (or 800 × 450 if file size issues)

---

### VIS-4: GitHub Insights Screenshot

**Content:** GitHub contributor graph showing consistent activity:

- Insights → Contributors page
- Show the "Contributions" graph (green squares)
- Highlight 826 consecutive cycles stat

**Source:** `github.com/autonomous-dev-agents/ada/graphs/contributors`

**Style:**

- Full-width capture
- Crop to show activity graph prominently
- Optional: overlay cycle count badge

**Tools:** Browser screenshot + annotation

**Dimensions:** 1200 × 675

---

### VIS-5: Dashboard Preview (Contingent on Sprint 3)

**Content:** If dashboard is ready:

- Login/dashboard home showing active projects
- Execution queue with running cycles
- Clean, modern SaaS UI

**Fallback (VIS-F1):** If dashboard not ready by Mar 6:

- Terminal workflow: `ada init` → `ada status` → `ada dispatch start`
- GIF showing full cycle execution

**Tools:** Browser screenshot or screen recording

**Dimensions:** 1200 × 675

---

### VIS-6: Hero Terminal GIF (Show HN)

**Content:** 30-second "wow" demo:

1. `npm install -g @ada-ai/cli`
2. `cd example-repo && ada init`
3. `ada dispatch start`
4. Agent executes action (creates issue, writes code, etc.)
5. `ada dispatch complete`
6. Show the result (issue created, PR opened)

**Style:**

- High-quality terminal
- Real repo, real execution
- No errors, smooth flow
- Music optional (YouTube version)

**Tools:**

- Record: asciinema (terminal) or OBS (full screen)
- Convert: gifski, ffmpeg
- For YouTube: Keep as MP4

**Dimensions:**

- GIF: 800 × 450 (optimize for file size)
- Video: 1920 × 1080 for YouTube embed

---

### VIS-7: Product Hunt Gallery

**Content:** 5 images showing:

1. Hero shot (terminal status or dashboard)
2. Role grid
3. Cycle rotation (still from GIF)
4. GitHub insights
5. Pricing page or quick start

**Style:** Consistent framing, dark theme throughout

**Dimensions:** 1270 × 760 each

---

### VIS-8: Social Preview Card (Open Graph)

**Content:**

- ADA logo
- Tagline: "Ship software with autonomous AI dev teams"
- Clean, recognizable at small size

**Used for:** Twitter cards, Discord embeds, Slack previews

**Dimensions:**

- 1200 × 630 (Twitter/Facebook)
- Also export 1200 × 675 for consistency

**File:** `og-image.png` in repo root or docs

---

## Production Schedule

### Mar 6 (T-9) — Creation Day

| Time      | Task                                        | Asset IDs      |
| --------- | ------------------------------------------- | -------------- |
| Morning   | Check Sprint 3 dashboard status             | VIS-5 decision |
| Morning   | Terminal screenshots (status, init)         | VIS-1, VIS-4   |
| Afternoon | Record terminal GIFs (cycle rotation, hero) | VIS-3, VIS-6   |
| Afternoon | Create role grid in Figma/Canva             | VIS-2          |
| Evening   | Create OG image                             | VIS-8          |

### Mar 7 (T-8) — Polish Day

| Time      | Task                                  | Asset IDs      |
| --------- | ------------------------------------- | -------------- |
| Morning   | Optimize GIF file sizes (target <5MB) | VIS-3, VIS-6   |
| Morning   | Dashboard screenshot if ready         | VIS-5          |
| Afternoon | Product Hunt gallery assembly         | VIS-7          |
| Afternoon | Final review, upload to shared drive  | All            |
| Evening   | Fallback assets if dashboard delayed  | VIS-F1, F2, F3 |

---

## Tools Checklist

### Screenshot Tools

- [ ] CleanShot X (macOS) or ShareX (Windows)
- [ ] Browser DevTools for full-page captures

### Terminal Recording

- [ ] asciinema (`npm install -g asciinema`)
- [ ] iTerm2 with JetBrains Mono font
- [ ] Dark theme (One Dark, Dracula, or VS Code Dark+)

### GIF Creation

- [ ] gifski (`brew install gifski`) — best quality
- [ ] ezgif.com — online optimization
- [ ] ffmpeg for MP4 → GIF: `ffmpeg -i input.mp4 -vf "fps=15,scale=800:-1" output.gif`

### Design

- [ ] Figma (role grid, OG image)
- [ ] Canva (quick graphics)
- [ ] Excalidraw (diagrams)

### Optimization

- [ ] TinyPNG for PNG compression
- [ ] gifsicle for GIF optimization
- [ ] ImageOptim (macOS) for batch optimization

---

## Terminal Setup for Recordings

### Recommended Terminal Config

```bash
# iTerm2 Profile Settings
- Font: JetBrains Mono, 14pt
- Background: #1e1e1e (VS Code dark)
- Foreground: #d4d4d4
- Cursor: Block, blinking
- Scrollback: 0 lines (clean recording)
- Window Size: 120 × 30 (for 16:9 ratio)
```

### Pre-Recording Checklist

- [ ] Clear terminal history: `history -c && clear`
- [ ] Set clean prompt: `export PS1="$ "`
- [ ] Close other apps (no notifications)
- [ ] Maximize terminal window
- [ ] Test commands before recording
- [ ] Have script ready (see below)

### Recording Script (VIS-6 Hero GIF)

```bash
# Pre-stage: npm already installed, example repo ready

$ cd ~/demo-repo
$ ada status
# [wait 3 seconds]
$ ada dispatch start
# [wait for output]
# [action executes - ~10 seconds]
$ ada dispatch complete --action "Example action for demo"
# [show success message]
# [end recording]
```

---

## Quality Checklist

Before using any asset:

- [ ] Correct dimensions (1200 × 675 for Twitter)
- [ ] File size under limit (5MB images, 15MB GIFs)
- [ ] No typos or errors visible
- [ ] Terminal output is real (not mocked)
- [ ] Dark theme consistent across all assets
- [ ] Alt text written for accessibility
- [ ] Saved in high-res (2x) and web-optimized versions

---

## File Naming Convention

```
ada-vis-{id}-{description}-{version}.{ext}

Examples:
- ada-vis-1-terminal-status-v1.png
- ada-vis-3-cycle-rotation-v2.gif
- ada-vis-6-hero-demo-v1.gif
- ada-vis-8-og-image-final.png
```

---

## Storage Location

All assets saved to:

```
docs/marketing/launches/assets/
├── screenshots/
│   ├── ada-vis-1-terminal-status-v1.png
│   ├── ada-vis-4-github-insights-v1.png
│   └── ada-vis-5-dashboard-preview-v1.png
├── gifs/
│   ├── ada-vis-3-cycle-rotation-v1.gif
│   └── ada-vis-6-hero-demo-v1.gif
├── graphics/
│   ├── ada-vis-2-role-grid-v1.png
│   └── ada-vis-8-og-image-v1.png
└── product-hunt/
    ├── 01-hero.png
    ├── 02-roles.png
    ├── 03-cycle.png
    ├── 04-insights.png
    └── 05-pricing.png
```

---

## Dependencies

| Dependency               | Owner       | Needed By | Status |
| ------------------------ | ----------- | --------- | ------ |
| Sprint 3 dashboard live  | Engineering | Mar 6     | 🟡     |
| Terminal tools ready     | Growth      | Mar 6     | ⬜     |
| Example repo for demo    | Growth      | Mar 6     | ⬜     |
| Figma/design tool access | Growth      | Mar 6     | ⬜     |

---

## Notes

- **Dashboard contingency:** If not ready, use terminal-only assets (VIS-F1-F3)
- **GIF optimization is critical:** Twitter compresses aggressively; pre-optimize to avoid artifacts
- **Real content only:** No mock data — use actual repo stats, commands, and outputs
- **Test in context:** Upload to private Twitter to verify rendering before launch day

---

## References

- **SaaS Launch Thread:** `saas-launch-twitter-thread-c1234.md`
- **Pre-Launch Tracker:** `pre-launch-execution-tracker-c1214.md`
- **Launch Playbook:** `launch-execution-playbook-c1204.md`
- **Show HN Draft:** `show-hn-draft.md`

---

_Front-loads Mar 6-7 visual asset production with detailed specs and tooling guidance._

— 🚀 Growth (C1244)
