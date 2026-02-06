# 🎬 Terminal Recording Configuration

> Finalized terminal settings and pre-recording validation for v1.0-alpha demo
> **Author:** Growth (🚀 The Dealmaker)
> **Date:** 2026-02-06
> **Recording Window:** February 8-9, 2026
> **Status:** Pre-Recording Validation COMPLETE ✅

---

## Terminal Configuration Spec

### Display Settings

| Setting         | Value                | Rationale                                              |
| --------------- | -------------------- | ------------------------------------------------------ |
| **Font**        | JetBrains Mono, 20pt | Monospace, excellent ligatures, readable at embed size |
| **Theme**       | Dracula              | High contrast, dev-friendly, recognizable              |
| **Window Size** | 100 cols × 28 rows   | Fits Twitter embed, readable text                      |
| **Line Height** | 1.2                  | Comfortable reading, not cramped                       |
| **Cursor**      | Block, blinking      | Visible in recording                                   |

### Prompt Configuration

```bash
# Minimal prompt for recording (avoids clutter)
export PS1='\[\e[36m\]ada-demo\[\e[0m\] $ '
```

**Why this prompt:**

- `ada-demo` prefix → immediately identifies project context
- Cyan color → stands out without being distracting
- No timestamp/git branch → keeps focus on commands
- Single `$` → clean, universal

### Pre-Recording Terminal Commands

```bash
# 1. Set clean prompt
export PS1='\[\e[36m\]ada-demo\[\e[0m\] $ '

# 2. Clear scrollback
clear && printf '\e[3J'

# 3. Set terminal size (if adjustable)
printf '\e[8;28;100t'

# 4. Disable command history display
export HISTCONTROL=ignorespace  # Commands starting with space won't be saved

# 5. Navigate to demo project
cd ~/RIA/ada-demo-project
```

### Color Palette (Dracula)

For reference if using a different terminal:

| Element    | Hex     | RGB           |
| ---------- | ------- | ------------- |
| Background | #282A36 | 40, 42, 54    |
| Foreground | #F8F8F2 | 248, 248, 242 |
| Cyan       | #8BE9FD | 139, 233, 253 |
| Green      | #50FA7B | 80, 250, 123  |
| Purple     | #BD93F9 | 189, 147, 249 |
| Red        | #FF5555 | 255, 85, 85   |
| Yellow     | #F1FA8C | 241, 250, 140 |

---

## Demo Repo Customization

### ⚠️ REQUIRED: Update Roster Before Recording

The template roster has placeholder values. Update before recording:

```bash
cd ~/RIA/ada-demo-project
```

**agents/roster.json** — Replace placeholders:

| Placeholder                | Replace With           |
| -------------------------- | ---------------------- |
| `[CEO_AGENT_NAME]`         | `The Founder`          |
| `[PRODUCT_AGENT_NAME]`     | `The PM`               |
| `[ENGINEERING_AGENT_NAME]` | `The Builder`          |
| `[OPS_AGENT_NAME]`         | `The Guardian`         |
| `[RESEARCH_AGENT_NAME]`    | `The Scout`            |
| `[YOUR_TAGLINE]`           | `Demo project for ADA` |
| `My Company`               | `Demo Corp`            |

**Quick fix script:**

```bash
cd ~/RIA/ada-demo-project/agents
sed -i 's/\[CEO_AGENT_NAME\]/The Founder/g' roster.json
sed -i 's/\[PRODUCT_AGENT_NAME\]/The PM/g' roster.json
sed -i 's/\[ENGINEERING_AGENT_NAME\]/The Builder/g' roster.json
sed -i 's/\[OPS_AGENT_NAME\]/The Guardian/g' roster.json
sed -i 's/\[RESEARCH_AGENT_NAME\]/The Scout/g' roster.json
sed -i 's/\[YOUR_TAGLINE\]/Demo project for ADA/g' roster.json
sed -i 's/My Company/Demo Corp/g' roster.json
```

---

## Pre-Recording Validation Results

### Environment Check (Feb 6, 2026)

| Check               | Status | Details                         |
| ------------------- | ------ | ------------------------------- |
| Demo repo exists    | ✅     | `~/RIA/ada-demo-project`        |
| ADA CLI built       | ✅     | `npm run build` successful      |
| CLI globally linked | ✅     | `ada --version` → 0.1.0         |
| `ada init` works    | ✅     | Creates agents/ with 5 roles    |
| `ada status` works  | ✅     | Shows rotation state            |
| Recording tools     | ✅     | asciinema 2.4.0, svg-term 2.1.1 |

### Test Recording Flow

```bash
# Validated Feb 6, 2026
cd ~/RIA/ada-demo-project
rm -rf agents/

# 1. Init (5 seconds)
ada init
# ✅ Output: "📋 Detected: Node.js project", "✅ Agent team initialized"

# 2. Status (5 seconds)
ada status
# ✅ Output: Shows Current Role, Next Role, Cycle: 0
```

### Known Issues & Mitigations

| Issue                       | Impact | Mitigation                      |
| --------------------------- | ------ | ------------------------------- |
| Placeholder names in roster | Medium | Run sed script before recording |
| `ada run` requires LLM API  | High   | Use `--dry-run` if API issues   |
| Long LLM response time      | Low    | Edit pauses in post-production  |

---

## Recording Commands

### Terminal Recording (asciinema)

```bash
# Start recording
asciinema rec --cols 100 --rows 28 demo-raw.cast

# [Run demo script]

# Stop recording
# Press Ctrl+D

# Preview
asciinema play demo-raw.cast

# Convert to SVG (animated)
svg-term --in demo-raw.cast --out demo.svg --window --width 100 --height 28

# Convert to GIF (if needed)
# Requires additional tool: agg or gifski
```

### Recording Tips

1. **Pace yourself** — Type at ~40 WPM (readable, not rushed)
2. **Pause after output** — 2-3 seconds for viewer to read
3. **No typos** — Practice the sequence 3x before recording
4. **Clear between takes** — `clear && printf '\e[3J'`

---

## Final Checklist (Feb 7 EOD)

Before recording begins:

- [ ] Roster placeholders updated
- [ ] Terminal theme set to Dracula
- [ ] Font set to JetBrains Mono 20pt
- [ ] Window sized to 100×28
- [ ] Prompt configured (cyan `ada-demo $`)
- [ ] Demo repo reset (`rm -rf agents/`)
- [ ] Test run completed (`ada init` → `ada status`)
- [ ] asciinema test recording works
- [ ] API key verified (for `ada run` if using)

---

## Recording Day Quick Reference

**Feb 8 Morning — Before First Take:**

```bash
# 1. Set prompt
export PS1='\[\e[36m\]ada-demo\[\e[0m\] $ '

# 2. Clear terminal
clear && printf '\e[3J'

# 3. Navigate
cd ~/RIA/ada-demo-project

# 4. Reset demo repo
rm -rf agents/

# 5. Start recording
asciinema rec --cols 100 --rows 28 demo-take-1.cast

# 6. Execute demo script
ada init
ada status

# 7. Stop (Ctrl+D) and preview
asciinema play demo-take-1.cast
```

**Between Takes:**

```bash
rm -rf agents/
clear && printf '\e[3J'
asciinema rec --cols 100 --rows 28 demo-take-N.cast
```

---

## Dependencies & Blockers

| Item                 | Status | Owner       | Notes                              |
| -------------------- | ------ | ----------- | ---------------------------------- |
| CLI works            | ✅     | Engineering | v0.1.0 linked                      |
| Demo repo            | ✅     | Product     | Phase 1-4 complete                 |
| Recording tools      | ✅     | Growth      | Validated Cycle 78                 |
| Roster customization | 🔄     | Growth      | Run sed script Feb 7               |
| npm publish          | ⏳     | Ops         | Not blocking demo (use linked CLI) |

**No blockers for Feb 8-9 recording.** ✅

---

## Related Issues

- **Issue #39:** Demo Asset Production Plan
- **Issue #41:** Demo Repository
- **Issue #26:** v1.0-alpha Launch Coordination

---

_🚀 Growth | Cycle 88 | Pre-Recording Configuration Finalized_
