# nw_wrld Visual Sequencer Integration Evaluation

> Research evaluation of [nw_wrld](https://github.com/aagentah/nw_wrld) for real-time visualization of ADA agent activity.
>
> **Author:** 🔬 Research (The Scout)
> **Issue:** #53
> **Date:** 2026-02-06
> **Status:** Research Complete

---

## Executive Summary

nw_wrld is a promising candidate for visualizing ADA agent dispatch cycles in real-time. Its event-driven architecture, OSC support, and hot-reloadable visual modules align well with ADA's need for live observability. However, the current beta status and lack of HTTP/WebSocket input require a bridge implementation.

**Verdict:** ✅ Feasible for v1.1+ with moderate implementation effort (~5-8 cycles).

---

## Technical Architecture Analysis

### What nw_wrld Provides

| Component             | Description                                | ADA Relevance                |
| --------------------- | ------------------------------------------ | ---------------------------- |
| **Dashboard**         | React-based control center                 | Track/channel configuration  |
| **Projector**         | Visual output window                       | Display on external monitors |
| **16-step Sequencer** | Built-in pattern programming               | Could map to dispatch cycles |
| **MIDI/OSC Input**    | External trigger support                   | Primary integration point    |
| **Visual Modules**    | Hot-reloadable JS (p5.js, Three.js, D3.js) | Custom agent visualizations  |
| **Project Folders**   | Self-contained, portable setups            | Easy distribution            |

### Technology Stack

- **Runtime:** Electron v39.2.7, Node.js v20+
- **Frontend:** React (Dashboard), vanilla JS (Projector)
- **Graphics:** p5.js (2D), Three.js (3D), D3.js (data viz)
- **Input Protocols:** MIDI, OSC (UDP)
- **Testing:** Vitest, Playwright E2E

### Input Signal Flow

```
Current Architecture:
┌──────────────┐
│  Sequencer   │──┐
│  (Built-in)  │  │
└──────────────┘  │
                  ├──▶ Dashboard ──▶ Projector
┌──────────────┐  │    (Control)     (Visuals)
│ External     │──┘
│ MIDI/OSC     │
└──────────────┘

Proposed ADA Integration:
┌──────────────────┐
│  ADA Dispatch    │
│  Events (JSON)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  ADA→OSC Bridge  │◄── New component
│  (Node.js/Python)│
└────────┬─────────┘
         │ OSC/UDP
         ▼
┌──────────────────┐
│    nw_wrld       │
│  (Projector)     │
└──────────────────┘
```

---

## Integration Pathways

### Option 1: OSC Bridge (Recommended for v1.1)

**Approach:** Build a lightweight bridge that converts ADA dispatch events to OSC messages.

**Implementation:**

```javascript
// ada-osc-bridge.js (conceptual)
import { Client as OSCClient } from 'node-osc';
import { watchDispatchEvents } from '@ada/core';

const osc = new OSCClient('127.0.0.1', 57121);

// Map ADA events to OSC addresses
const EVENT_MAPPINGS = {
  'dispatch.start': '/ada/dispatch/start',
  'dispatch.complete': '/ada/dispatch/complete',
  'role.enter': '/ada/role', // + role name
  'pr.created': '/ada/github/pr',
  'pr.merged': '/ada/github/merge',
  'issue.created': '/ada/github/issue',
  'memory.update': '/ada/memory/write',
  'memory.compress': '/ada/memory/compress',
  'ci.pass': '/ada/ci/pass',
  'ci.fail': '/ada/ci/fail',
};

watchDispatchEvents(event => {
  const address = EVENT_MAPPINGS[event.type];
  if (address) {
    osc.send(address, event.payload);
  }
});
```

**Pros:**

- OSC is already supported by nw_wrld
- Low latency (~1-5ms)
- No nw_wrld code changes required
- Works with existing MIDI/OSC configuration

**Cons:**

- Requires running a separate bridge process
- OSC is UDP (no guaranteed delivery)
- Limited payload complexity

**Effort:** ~3-4 cycles

### Option 2: WebSocket Server (Best for v2.0)

**Approach:** Wait for nw_wrld's roadmap item: "Remote API input source with HTTP/WebSocket client."

**Implementation:** Direct WebSocket connection from ADA dispatch loop.

```javascript
// Future: direct integration
const ws = new WebSocket('ws://localhost:3030/nwwrld');
ws.send(
  JSON.stringify({
    type: 'trigger',
    track: 'agent-activity',
    method: 'flash',
    params: { color: roleColors[currentRole], intensity: 1.0 },
  })
);
```

**Pros:**

- Bidirectional communication
- Rich JSON payloads
- No bridge process
- Future-proof

**Cons:**

- Depends on nw_wrld roadmap completion
- Unknown timeline

**Effort:** ~1-2 cycles (once nw_wrld ships WebSocket support)

### Option 3: File Watcher Pattern

**Approach:** ADA writes events to a JSON file; nw_wrld module reads it.

```javascript
// nw_wrld module: ADAMonitor.js
class ADAMonitor extends ModuleBase {
  async init() {
    setInterval(async () => {
      const events = await loadJson('ada-events.json');
      this.processEvents(events);
    }, 500); // Poll every 500ms
  }
}
```

**Pros:**

- Zero dependencies
- Works immediately
- Cross-platform

**Cons:**

- Higher latency (500ms+)
- Disk I/O overhead
- Not suitable for rapid events

**Effort:** ~1-2 cycles

---

## Visual Module Design

### Proposed ADA Visual Vocabulary

| Role           | Color                 | Shape     | Animation |
| -------------- | --------------------- | --------- | --------- |
| 👔 CEO         | Gold (#FFD700)        | Star      | Pulse     |
| 🔬 Research    | Cyan (#00FFFF)        | Hexagon   | Rotate    |
| 📦 Product     | Green (#00FF00)       | Square    | Scale     |
| 📋 Scrum       | Orange (#FFA500)      | Grid      | Slide     |
| 🔍 QA          | Purple (#9900FF)      | Magnifier | Scan      |
| ⚙️ Engineering | Silver (#C0C0C0)      | Gear      | Spin      |
| 🛡️ Ops         | Blue (#0066FF)        | Shield    | Glow      |
| 🚀 Growth      | Red (#FF3300)         | Rocket    | Launch    |
| 🎨 Design      | Pink (#FF66CC)        | Palette   | Fade      |
| 🌌 Frontier    | Deep Purple (#4B0082) | Nebula    | Wave      |

### Event Visualizations

| Event                | Visual Effect              | Intensity |
| -------------------- | -------------------------- | --------- |
| Dispatch cycle start | Ring expansion from center | Medium    |
| Role rotation        | Color shift + role icon    | High      |
| PR created           | Branch line animation      | Medium    |
| PR merged            | Celebration burst          | High      |
| CI pass              | Green flash + checkmark    | Low       |
| CI fail              | Red pulse + warning        | High      |
| Memory update        | Ripple effect              | Low       |
| Memory compression   | Wave collapse animation    | Medium    |
| Issue created        | Dot appears in grid        | Low       |

### Example Module: Role Activity Ring

```javascript
/*
@nwWrld name: ADA Role Ring
@nwWrld category: 2D
@nwWrld imports: ModuleBase, p5
*/

const ROLE_COLORS = {
  ceo: '#FFD700',
  research: '#00FFFF',
  product: '#00FF00',
  scrum: '#FFA500',
  qa: '#9900FF',
  engineering: '#C0C0C0',
  ops: '#0066FF',
  growth: '#FF3300',
  design: '#FF66CC',
  frontier: '#4B0082',
};

class ADARoleRing extends ModuleBase {
  setup() {
    this.p = new p5(sketch => {
      sketch.setup = () => {
        sketch.createCanvas(800, 800);
        sketch.noFill();
        sketch.strokeWeight(8);
      };

      sketch.draw = () => {
        sketch.background(10);
        this.drawRoleRing(sketch);
      };
    }, this.container);
  }

  drawRoleRing(sketch) {
    const roles = Object.keys(ROLE_COLORS);
    const arcSize = sketch.TWO_PI / roles.length;

    roles.forEach((role, i) => {
      const isActive = role === this.currentRole;
      sketch.stroke(ROLE_COLORS[role]);
      sketch.strokeWeight(isActive ? 20 : 8);
      sketch.arc(
        sketch.width / 2,
        sketch.height / 2,
        600,
        600,
        i * arcSize - sketch.HALF_PI,
        (i + 1) * arcSize - sketch.HALF_PI
      );
    });
  }

  // Triggered via OSC: /ada/role
  setRole(role) {
    this.currentRole = role;
  }
}

export default ADARoleRing;
```

---

## Use Case Evaluation

### 1. Agent Activity Visualizer ⭐⭐⭐⭐⭐

**Feasibility:** High

Render dispatch cycles as visual events. Each role rotation, PR, and CI event triggers corresponding visuals.

**Implementation Path:**

1. OSC bridge in `@ada/core` (exported function)
2. ADA visual module pack for nw_wrld
3. Configuration in `ada.config.json` to enable visualization

### 2. Live Demo Mode ⭐⭐⭐⭐

**Feasibility:** High

Valuable for presentations and demo videos (connects to Issue #39).

**Considerations:**

- Need pre-recorded event playback for consistent demos
- Should support "demo speed" (2x-4x faster than real dispatch)
- Issue #41 demo repo could include nw_wrld project folder

### 3. TUI Dashboard Alternative ⭐⭐⭐

**Feasibility:** Medium

Alternative to Issue #25 (Ink-based TUI).

**Trade-offs:**
| Aspect | Ink TUI | nw_wrld |
|--------|---------|---------|
| Install | npm install | Electron app |
| Startup | Instant | ~2-3 seconds |
| Resources | Low (terminal) | Medium (Electron) |
| Visual richness | ASCII art | Full graphics |
| Accessibility | Screen readers | Limited |

**Recommendation:** Keep Issue #25 for CLI users; nw_wrld for visual presentations.

### 4. Dev Team Monitoring ⭐⭐

**Feasibility:** Lower priority

Office "big board" display for teams using ADA.

**Blockers:**

- Requires persistent long-running process
- Network event streaming (not local dispatch)
- v2.0+ scope

---

## Feasibility Assessment

### Technical Feasibility

| Factor              | Score     | Notes                           |
| ------------------- | --------- | ------------------------------- |
| Protocol support    | ✅ High   | OSC already supported           |
| Event mapping       | ✅ High   | Clear 1:1 mapping possible      |
| Visual module dev   | ✅ High   | Well-documented SDK             |
| Hot reload workflow | ✅ High   | Edit → instant update           |
| Cross-platform      | ⚠️ Medium | macOS solid; Windows/Linux beta |
| Resource usage      | ⚠️ Medium | Electron overhead               |

### Integration Risks

| Risk                           | Likelihood | Mitigation                   |
| ------------------------------ | ---------- | ---------------------------- |
| nw_wrld beta instability       | Medium     | Pin to specific release      |
| OSC packet loss                | Low        | Use TCP fallback or retry    |
| Performance under rapid events | Low        | Event batching, throttling   |
| User confusion (two apps)      | Medium     | Clear docs, optional feature |

### Implementation Effort

| Component                   | Cycles  | Dependencies           |
| --------------------------- | ------- | ---------------------- |
| OSC bridge module           | 2       | `node-osc`             |
| ADA module pack for nw_wrld | 2       | nw_wrld project folder |
| Config & docs               | 1       | None                   |
| Integration tests           | 1-2     | Both apps running      |
| **Total**                   | **5-8** | —                      |

---

## Recommendations

### For v1.1 (Post-Launch)

1. **Ship OSC bridge as optional feature** in `@ada/core`
   - `ada.config.json`: `visualization.enabled: true`
   - `ada.config.json`: `visualization.oscPort: 57121`

2. **Create ADA module pack** for nw_wrld
   - Publish as separate repo or npm package
   - Include Role Ring, PR Flow, CI Status modules

3. **Document integration** in `docs/guides/visualization.md`

### For v2.0

1. **Wait for nw_wrld WebSocket support**, then add direct integration
2. **Consider ADA Hub (Issue #18)** as primary visualization surface

### Not Recommended

- ❌ Building visualization into core CLI (bloat)
- ❌ Forking nw_wrld (maintenance burden)
- ❌ Using file watcher pattern (latency issues)

---

## Related Issues & Docs

- **Issue #53** — This evaluation's parent issue
- **Issue #25** — TUI Dashboard (alternative approach)
- **Issue #39** — Demo Asset Production (use case)
- **Issue #41** — Demo Repository (could include nw_wrld project)
- **Issue #18** — ADA Hub Dashboard (v2.0 visualization surface)
- [nw_wrld GitHub](https://github.com/aagentah/nw_wrld)
- [nw_wrld Module Development Guide](https://github.com/aagentah/nw_wrld/blob/main/MODULE_DEVELOPMENT.md)

---

## Appendix: OSC Address Mapping Spec

```yaml
# ADA → nw_wrld OSC Address Schema

/ada/dispatch/start:
  description: Dispatch cycle beginning
  payload: [cycle_number: int]

/ada/dispatch/complete:
  description: Dispatch cycle finished
  payload: [cycle_number: int, action_summary: string]

/ada/role:
  description: Role entered
  payload: [role_id: string, role_emoji: string]

/ada/github/pr/create:
  description: PR opened
  payload: [pr_number: int, title: string]

/ada/github/pr/merge:
  description: PR merged
  payload: [pr_number: int]

/ada/github/issue:
  description: Issue created
  payload: [issue_number: int, title: string]

/ada/ci/status:
  description: CI check result
  payload: [passed: bool, check_count: int]

/ada/memory/update:
  description: Memory bank written
  payload: [section: string, lines_changed: int]

/ada/memory/compress:
  description: Memory compression triggered
  payload: [old_version: int, new_version: int]
```

---

_Research complete. Ready for Product/Engineering prioritization._
