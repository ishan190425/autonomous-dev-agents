# Community Content Ecosystem Patterns — C1235

> **Research:** Ecosystem analysis for Community Playbook Marketplace (#187)
> **Author:** 🔬 Research (C1235)
> **Date:** 2026-02-27
> **Sprint:** 4 front-load (per L706)
> **Related:** C1227 (Product spec), C1232 (Design spec)

---

## Executive Summary

This research analyzes how successful community content ecosystems handle template/plugin distribution, trust, and discovery. Findings inform ADA's Community Playbook Marketplace design decisions for Sprint 4.

**Key insight:** Successful ecosystems balance **low friction** (easy publish/install) with **trust signals** (verified authors, quality metrics, community ratings). The CLI-first constraint means we must innovate on terminal-native discovery UX.

---

## Ecosystem Comparison Matrix

| Platform               | Content Type      | Auth Model | Trust Model             | Discovery           | CLI Native |
| ---------------------- | ----------------- | ---------- | ----------------------- | ------------------- | ---------- |
| **npm**                | Packages          | Token      | Downloads, GitHub stars | Search, categories  | ✅ Full    |
| **Homebrew**           | Formulae/Casks    | GitHub PR  | Core team review        | Search, taps        | ✅ Full    |
| **cargo crates**       | Rust crates       | API token  | Downloads, owners       | Search, categories  | ✅ Full    |
| **pip/PyPI**           | Python packages   | Token      | Downloads, maintainers  | Search, classifiers | ✅ Full    |
| **VS Code**            | Extensions        | MS account | Installs, ratings       | Marketplace web     | ⚠️ Partial |
| **GitHub Marketplace** | Actions/Apps      | OAuth      | Stars, verified badge   | Web search          | ⚠️ Partial |
| **Hugging Face**       | Models/Datasets   | Token      | Downloads, likes        | Tags, tasks         | ⚠️ Partial |
| **Terraform Registry** | Providers/Modules | Token      | Downloads, verified     | Search, namespaces  | ✅ Full    |

---

## Deep Dive: CLI-Native Ecosystems

### 1. npm — The Gold Standard

**What works:**

- `npm search <query>` — Fast, terminal-native discovery
- `npm info <package>` — Rich metadata without leaving terminal
- Scoped packages (`@org/pkg`) — Clear ownership
- `package.json` dependencies — Declarative, version-pinned
- Weekly download counts — Social proof at a glance

**What doesn't work:**

- Namespace squatting (typosquatting attacks)
- No built-in security scanning (added later via `npm audit`)
- Quality varies wildly (no curation)

**ADA takeaway:** Download counts + scoped namespaces work. Need content validation npm lacks.

### 2. Homebrew Taps — Community Curation

**What works:**

- Official core = high trust, curated
- Taps = community formulae, lower bar
- `brew search` + `brew info` — Terminal-native
- Formula review via GitHub PRs — Transparent quality gate
- Cask for GUI apps — Clear separation

**What doesn't work:**

- Tap discovery is poor (must know tap name)
- No ratings/feedback mechanism
- Cask security is trust-on-first-use

**ADA takeaway:** Tiered trust (official vs community) is smart. PR-based review is too slow for ADA's velocity. Need async trust signals.

### 3. Terraform Registry — Enterprise Pattern

**What works:**

- Verified badge for HashiCorp partners
- Module versioning with semantic versioning
- Namespace hierarchy (`hashicorp/aws/vpc`)
- `terraform init` auto-downloads — Zero friction install
- Documentation generated from code

**ADA takeaway:** Verified publishers + auto-generated docs reduce friction. Namespace hierarchy prevents collisions.

### 4. Cargo Crates — Rust Community

**What works:**

- `cargo search` — Fast, relevant results
- `crates.io` categories + keywords — Structured taxonomy
- Owner transfer protocol — Clear succession
- Yanking (soft delete) vs hard delete — Safety net
- Build badges in README — Quality signals

**What doesn't work:**

- No ratings (downloads only)
- Category taxonomy gets messy at scale

**ADA takeaway:** Yanking is essential for safe rollbacks. Badges integrate with GitHub README.

---

## Trust Model Analysis

### Trust Signal Hierarchy

Based on ecosystem analysis, trust signals (in order of effectiveness):

1. **Verified author badge** — Publisher identity confirmed (npm verified, TF verified)
2. **Install/download count** — Social proof, scales with adoption
3. **Community ratings** — Explicit quality signal (VS Code ⭐)
4. **Automated scans** — Security/quality checks (npm audit, Snyk)
5. **Recency** — Last update date (stale = risk)
6. **Documentation quality** — README completeness score
7. **Test coverage** — Automated quality indicator
8. **Maintainer response time** — Issue/PR velocity

### Trust Model Recommendation for ADA

**Tier 1: Official** (ADA team-maintained)

- Verified badge ✅
- Full review before publish
- Highest trust, shown first in search

**Tier 2: Verified** (Identity-confirmed community)

- GitHub OAuth verification
- > 10 installs required for promotion
- Automated security scan passes

**Tier 3: Community** (Anyone can publish)

- Basic validation (schema, no malicious code)
- Warning on first install
- Can be flagged/removed

---

## Discovery UX Patterns

### CLI Discovery Best Practices

| Pattern             | Example                                  | Effectiveness |
| ------------------- | ---------------------------------------- | ------------- |
| **Fuzzy search**    | `npm search reac` finds `react`          | ⭐⭐⭐⭐⭐    |
| **Category browse** | `cargo search --category async`          | ⭐⭐⭐⭐      |
| **Tag filtering**   | `pip search --tag ml`                    | ⭐⭐⭐⭐      |
| **Popularity sort** | `brew search --sort=downloads`           | ⭐⭐⭐⭐      |
| **Recency sort**    | `--sort=updated`                         | ⭐⭐⭐        |
| **Author filter**   | `npm search --author=@ada-ai`            | ⭐⭐⭐        |
| **Recommendations** | "Users who installed X also installed Y" | ⭐⭐⭐⭐⭐    |

### Terminal-Native Discovery Innovation

Most ecosystems push users to web for discovery. ADA opportunity: **rich terminal discovery**.

```bash
# Proposed: Rich terminal browsing
ada marketplace browse --interactive
# Opens TUI with:
# - Category sidebar
# - Playbook cards with ratings
# - Live preview of playbook roles
# - One-key install

# Proposed: Smart recommendations
ada marketplace recommend
# Based on:
# - Current playbook roles
# - Project type (detected from repo)
# - Popular in similar projects
```

---

## Content Validation Patterns

### Pre-Publish Validation

| Check               | npm             | Homebrew        | ADA Recommendation                 |
| ------------------- | --------------- | --------------- | ---------------------------------- |
| Schema validation   | ✅ package.json | ✅ Formula DSL  | ✅ playbook.json schema            |
| Name collision      | ✅ Unique names | ✅ Unique names | ✅ Scoped + unique                 |
| Malicious code scan | ⚠️ Post-hoc     | ✅ PR review    | ✅ AST scan for dangerous patterns |
| License check       | ⚠️ Optional     | ✅ Required     | ✅ Required, SPDX format           |
| README required     | ⚠️ Warning      | ✅ Required     | ✅ Required, min 100 chars         |
| Test execution      | ❌              | ✅ CI in PR     | ⚠️ Optional dry-run                |

### Dangerous Pattern Detection

For playbooks (which contain prompts/instructions), scan for:

- **Prompt injection attempts** — Instructions that override system prompts
- **External data exfiltration** — Curl/wget to unknown hosts
- **Credential harvesting** — Prompts asking for API keys/passwords
- **Destructive commands** — `rm -rf`, `git push --force`
- **Resource abuse** — Infinite loops, fork bombs

### Sandboxed Dry-Run

Before install, offer:

```bash
ada marketplace install awesome-playbook --dry-run
# Shows:
# - Roles that will be added
# - Files that will be created
# - Conflicts with existing roles
# - Estimated token usage per cycle
```

---

## Versioning Patterns

### Semantic Versioning Adoption

| Ecosystem | Versioning | Lockfile            | ADA Recommendation              |
| --------- | ---------- | ------------------- | ------------------------------- |
| npm       | SemVer     | package-lock.json   | ✅ SemVer                       |
| Cargo     | SemVer     | Cargo.lock          | ✅ Lockfile for reproducibility |
| pip       | PEP 440    | requirements.txt    | ⚠️ Too loose                    |
| Terraform | SemVer     | .terraform.lock.hcl | ✅ Provider locks               |

### Version Pinning Strategy

```json
// playbook.json
{
  "dependencies": {
    "@ada-ai/security-playbook": "^2.0.0", // Compatible updates
    "@community/experimental": "=1.2.3" // Exact pin (untrusted)
  }
}
```

**Recommendation:**

- Official playbooks: Allow compatible updates (`^`)
- Community playbooks: Default to exact pin, allow opt-in to updates
- Lock playbook versions in `ada.lock.json` for reproducibility

---

## Monetization Patterns (Future)

| Model                | Example              | Pros              | Cons                   |
| -------------------- | -------------------- | ----------------- | ---------------------- |
| **Free + donations** | Homebrew             | Low friction      | Unsustainable          |
| **Freemium**         | npm (free) + npm Pro | Wide adoption     | Feature gating complex |
| **Pay-per-use**      | OpenAI API           | Aligns with value | Metering complexity    |
| **Marketplace cut**  | App Store (30%)      | Platform revenue  | Creator friction       |
| **Sponsorship**      | GitHub Sponsors      | Direct support    | Discovery hard         |

**ADA recommendation (Sprint 6+):**

- Free tier: Unlimited community playbooks
- Pro tier: Private playbooks, team sharing, priority support
- Marketplace: 15% cut on paid playbooks (creator-friendly)

---

## Implementation Recommendations

### Phase 1: MVP (Sprint 4 W1-2)

1. **Simple search** — `ada marketplace search <query>`
2. **Install** — `ada marketplace install <name>`
3. **Local validation** — Schema + conflict check
4. **No auth required** — Read-only access

### Phase 2: Publishing (Sprint 4 W3-4)

1. **GitHub OAuth** — Publisher identity
2. **Publish flow** — `ada marketplace publish`
3. **Automated validation** — Schema, README, license
4. **Basic moderation** — Flag + remove

### Phase 3: Trust (Sprint 5)

1. **Install counts** — Track anonymized usage
2. **Ratings** — 1-5 stars post-install prompt
3. **Verified badge** — For >100 installs + identity
4. **Security scans** — Dangerous pattern detection

### Phase 4: Discovery (Sprint 6+)

1. **Interactive TUI browse** — Rich terminal discovery
2. **Recommendations** — "Similar playbooks"
3. **Categories** — Structured taxonomy
4. **Trending** — Time-weighted popularity

---

## Risk Analysis

| Risk                         | Likelihood | Impact | Mitigation                         |
| ---------------------------- | ---------- | ------ | ---------------------------------- |
| Malicious playbook uploaded  | Medium     | High   | Automated scan + flag system       |
| Namespace squatting          | Medium     | Medium | Reserved names + scoped namespaces |
| Stale playbooks              | High       | Low    | Recency signals + archive policy   |
| API abuse                    | Low        | Medium | Rate limiting + auth               |
| Trust gaming (fake installs) | Low        | Medium | Anonymized + deduplicated counts   |

---

## Metrics for Success

**Sprint 4 (Launch):**

- 5+ playbooks published by team
- > 95% install success rate
- <500ms search response time

**Sprint 5 (Trust):**

- 20+ community playbooks
- Rating coverage >50%
- 0 security incidents

**Sprint 6+ (Growth):**

- 100+ playbooks
- 10+ verified publishers
- Recommendation CTR >20%

---

## References

1. npm Registry API documentation
2. Homebrew Tap creation guide
3. crates.io policies and guidelines
4. Terraform Registry design principles
5. VS Code Extension Marketplace trust model
6. GitHub Marketplace security requirements
7. Hugging Face Hub documentation

---

## Appendix: Playbook Schema Proposal

```json
{
  "$schema": "https://ada.dev/schemas/playbook.json",
  "name": "@community/example-playbook",
  "version": "1.0.0",
  "description": "Example playbook for demonstration",
  "author": {
    "name": "Jane Developer",
    "github": "janedev"
  },
  "license": "MIT",
  "keywords": ["example", "starter"],
  "repository": "https://github.com/janedev/example-playbook",
  "roles": [
    {
      "id": "custom-role",
      "title": "Custom Role",
      "playbook": "playbooks/custom.md"
    }
  ],
  "dependencies": {},
  "ada": {
    "minVersion": "1.0.0"
  }
}
```

---

_Research complete. Ready for Sprint 4 implementation._
