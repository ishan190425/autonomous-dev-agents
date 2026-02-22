# Multi-Tenant Memory Architecture for SaaS (C1075)

> **Author:** 🔬 Research | **Cycle:** 1075 | **Date:** 2026-02-21
>
> Research analysis addressing memory isolation requirements for Sprint 3 SaaS Container (#155).
> Extends Cognitive Memory Spec (C756) with multi-tenant considerations.

## Executive Summary

ADA's SaaS Container requires **memory isolation between tenants** while preserving the Innate/Learned/Hot/Warm/Cold architecture. This document analyzes isolation patterns from database and agent research, recommending a **namespace-based isolation with shared innate tier** approach.

**Key recommendations:**

1. **Namespace isolation:** Per-tenant learned memory with shared innate tier
2. **Schema strategy:** Shared database, separate tables with tenant prefix
3. **Cross-agent heat:** Reference counts scoped to tenant, not global
4. **Compression interaction:** Per-tenant compression schedules, shared archive format

---

## 1. Problem Statement

### 1.1 Current Architecture (Single-Tenant)

The cognitive memory spec (C756) assumes single-tenant deployment:

```
agents/memory/
├── innate.json       # Protected innate memories
├── hot.json          # HOT tier learned memories
├── warm.json         # WARM tier learned memories
├── cold.json         # COLD tier learned memories
└── archives/
```

### 1.2 SaaS Requirements (#155)

Sprint 3 SaaS Container requires:

1. **Multiple users** running ADA on shared infrastructure
2. **Memory isolation** — User A cannot read User B's memories
3. **Cost efficiency** — Shared infrastructure, not per-user databases
4. **Consistency** — Same memory semantics as self-hosted

### 1.3 Open Questions from C756

This research addresses:

- **Q2: Innate bootstrapping** — How populated for SaaS tenants?
- **Q3: Cross-agent heat** — Should reference counts include other tenants?
- **Q4: Compression interaction** — How does per-tenant compression work?

---

## 2. Multi-Tenant Isolation Patterns

### 2.1 Academic and Industry Approaches

| Pattern               | Isolation Level | Cost   | Complexity | Example                 |
| --------------------- | --------------- | ------ | ---------- | ----------------------- |
| **Shared-nothing**    | Complete        | High   | High       | Dedicated DB per tenant |
| **Schema-per-tenant** | Strong          | Medium | Medium     | PostgreSQL schemas      |
| **Table-per-tenant**  | Strong          | Medium | Medium     | Prefixed tables         |
| **Row-per-tenant**    | Moderate        | Low    | Low        | tenant_id column        |
| **Namespace**         | Moderate        | Low    | Low        | Key prefixes (Redis)    |

**Reference:** Jacobs & Aulbach (2007) — Multi-tenant database patterns; Chong et al. (2006) — SaaS architecture

### 2.2 Vector Database Multi-Tenancy

Vector stores handle multi-tenancy differently:

| Vector DB    | Multi-Tenant Approach                               |
| ------------ | --------------------------------------------------- |
| **Pinecone** | Namespace-per-tenant (same index, isolated queries) |
| **Qdrant**   | Collection-per-tenant or payload filtering          |
| **Weaviate** | Multi-tenancy mode with tenant isolation            |
| **Chroma**   | Collection-per-tenant                               |
| **pgvector** | Row-level security with tenant_id                   |

**Key insight:** Most production vector DBs use **namespace isolation** — same storage engine, logical separation via tenant identifier.

### 2.3 LLM Agent Multi-Tenancy

Limited prior work exists:

- **MemGPT:** Single-user focus, no multi-tenant design
- **OpenAI Assistants:** Per-assistant thread isolation
- **Langchain Memory:** Per-chain isolation, no shared tiers

**ADA's opportunity:** First framework to document multi-tenant agent memory architecture with tiered design.

---

## 3. Recommended Architecture

### 3.1 Namespace-Based Isolation with Shared Innate Tier

```
                    ┌─────────────────────────────────────┐
                    │         INNATE TIER                 │
                    │    (Shared across all tenants)      │
                    │  ───────────────────────────────    │
                    │  • RULES.md enforcement             │
                    │  • Safety constraints               │
                    │  • Core ADA behaviors               │
                    │  • Tool schemas                     │
                    └─────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
    ┌───────────────────────────┐   ┌───────────────────────────┐
    │    TENANT A (namespace)   │   │    TENANT B (namespace)   │
    │  ─────────────────────    │   │  ─────────────────────    │
    │  🔥 HOT: user prefs       │   │  🔥 HOT: user prefs       │
    │  🟠 WARM: project ctx     │   │  🟠 WARM: project ctx     │
    │  🧊 COLD: history         │   │  🧊 COLD: history         │
    │  ─────────────────────    │   │  ─────────────────────    │
    │  Heat: Tenant-scoped      │   │  Heat: Tenant-scoped      │
    │  References: Isolated     │   │  References: Isolated     │
    └───────────────────────────┘   └───────────────────────────┘
```

### 3.2 Why This Architecture

**Shared Innate Benefits:**

1. **Consistency:** All tenants get same safety constraints
2. **Updates:** Innate improvements apply globally
3. **Storage:** No duplication of unchanging data
4. **Identity:** ADA "is ADA" regardless of tenant

**Isolated Learned Benefits:**

1. **Privacy:** User data never crosses tenant boundaries
2. **Independence:** Tenant A's hot memories don't affect B
3. **Billing:** Per-tenant storage metrics
4. **Deletion:** Complete tenant data removal on churn

---

## 4. Schema Design

### 4.1 SQLite Per-Tenant (Recommended for v1)

Simplest approach for initial SaaS:

```
data/
├── innate.db                  # Shared, read-only for tenants
└── tenants/
    ├── tenant_abc123/
    │   ├── memory.db          # Learned memories (hot/warm/cold)
    │   └── archives/
    ├── tenant_def456/
    │   ├── memory.db
    │   └── archives/
    └── ...
```

**Advantages:**

- Complete isolation (separate files)
- Easy backup/restore per tenant
- Simple tenant deletion (rm -rf)
- Matches self-hosted semantics

**Disadvantages:**

- File handle overhead at scale
- No cross-tenant queries (but we don't want those)

### 4.2 PostgreSQL Shared (Recommended for Scale)

For production scale (1000+ tenants):

```sql
-- Shared innate tier (read-only)
CREATE TABLE innate_memories (
    id UUID PRIMARY KEY,
    content TEXT NOT NULL,
    category innate_category NOT NULL,
    embedding VECTOR(256),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Per-tenant learned memories with RLS
CREATE TABLE learned_memories (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    content TEXT NOT NULL,
    category learned_category NOT NULL,
    tier heat_tier NOT NULL DEFAULT 'warm',
    heat FLOAT NOT NULL DEFAULT 0.5,
    reference_count INTEGER DEFAULT 0,
    embedding VECTOR(256),
    created_at TIMESTAMP DEFAULT NOW(),
    last_accessed TIMESTAMP DEFAULT NOW()
);

-- Row-level security
ALTER TABLE learned_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON learned_memories
    USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

**Advantages:**

- Single database, easier ops
- Row-level security is battle-tested
- Cross-tenant analytics possible (admin only)
- Better connection pooling

**Disadvantages:**

- More complex setup
- Requires careful RLS policy testing
- Tenant deletion more complex (DELETE vs DROP)

---

## 5. Answering Open Questions

### 5.1 Q2: Innate Bootstrapping for SaaS

**Question:** How are innate memories initially populated for SaaS tenants?

**Answer:** Innate tier is **shared and pre-populated** — tenants don't bootstrap it.

```
Innate Memory Sources (Admin-Managed):
├── RULES.md → Safety rules, commit standards
├── Core playbooks → Role behaviors
├── Tool schemas → CLI command structures
└── System prompts → ADA identity constants
```

**On tenant creation:**

1. No innate population needed (shared tier)
2. Learned tiers start empty
3. Optional: Seed warm tier with onboarding context

**On ADA update:**

1. Update shared innate tier
2. All tenants immediately get new innate memories
3. No migration needed for learned tiers

### 5.2 Q3: Cross-Agent Heat Mechanics

**Question:** Should reference_count include retrievals by other roles?

**Answer:** **Yes for same tenant, no across tenants.**

```
Heat Calculation (Multi-Tenant):

heat = base_importance × recency_factor × (1 + α × log(reference_count + 1))

Where reference_count =
  COUNT(*) FROM memory_access_log
  WHERE memory_id = :id
  AND tenant_id = :current_tenant  -- SCOPED TO TENANT
```

**Rationale:**

- **Same tenant, different roles:** References compound (Engineering accessing Product's memory increases heat)
- **Different tenants:** Isolated (Tenant A's usage doesn't affect Tenant B)
- **Global innate:** No decay (heat fixed at 1.0)

### 5.3 Q4: Compression Interaction

**Question:** How does R-002 bank.md compression interact with JSON tiers?

**Answer:** **Per-tenant compression with global archive format.**

```
Compression Triggers (Per-Tenant):
├── Tenant hot.json > 50 items → Compress oldest to warm
├── Tenant warm.json > 200 items → Demote coldest to cold
├── Tenant cold.json > 1000 items → Archive to monthly file
├── 10+ cycles since tenant's last compression → Trigger
└── Tenant churns → Archive all to cold then delete
```

**Archive format remains consistent:**

```
data/tenants/tenant_abc123/archives/
├── cold-2026-02.json     # Monthly cold archives
├── cold-2026-03.json
└── compressed-c1000.json  # Snapshot compressions
```

**Global compression (admin):**

```
data/global-archives/
└── innate-2026-02.json   # Versioned innate snapshots
```

---

## 6. Security Considerations

### 6.1 Threat Model

| Threat                 | Mitigation                                 |
| ---------------------- | ------------------------------------------ |
| Cross-tenant data leak | Namespace isolation, RLS policies          |
| Tenant impersonation   | JWT-based tenant context, audit logging    |
| Innate poisoning       | Innate tier read-only for tenants          |
| Memory exfiltration    | No cross-tenant queries, encrypted at rest |
| Embedding inference    | Rate limiting, no raw embedding export     |

### 6.2 Audit Trail

Every memory access logged:

```typescript
interface MemoryAccessLog {
  timestamp: string;
  tenant_id: string;
  memory_id: string;
  action: 'read' | 'write' | 'search';
  role?: string;
  cycle?: number;
  query_hash?: string; // For search auditing
}
```

---

## 7. Cost Model

### 7.1 Per-Tenant Storage

```
Storage Cost Estimation:

Hot tier:    ~50 items × 500 chars = 25 KB
Warm tier:   ~200 items × 500 chars = 100 KB
Cold tier:   ~1000 items × 500 chars = 500 KB
Embeddings:  ~1250 items × 256 dims × 4 bytes = 1.25 MB
───────────────────────────────────────────────
Total per tenant: ~2 MB active + archives

At 1000 tenants: ~2 GB active storage
At 10,000 tenants: ~20 GB active storage
```

### 7.2 Billing Metrics

Track per tenant:

- `memory_items_count` — Hot + Warm + Cold
- `memory_bytes_active` — Current storage
- `memory_bytes_archived` — Historical storage
- `memory_searches_count` — Vector searches (compute cost)

---

## 8. Implementation Phases

| Phase       | Scope                                       | Sprint   |
| ----------- | ------------------------------------------- | -------- |
| **Phase 1** | SQLite per-tenant, shared innate JSON       | Sprint 3 |
| **Phase 2** | Memory access logging, billing metrics      | Sprint 3 |
| **Phase 3** | PostgreSQL migration for scale              | Sprint 4 |
| **Phase 4** | Advanced RLS, cross-role heat within tenant | Sprint 4 |

### Phase 1 Implementation (Sprint 3)

```typescript
// Tenant context injection
class TenantMemoryStore {
  constructor(
    private readonly tenantId: string,
    private readonly innateStore: InnateMemoryStore, // Shared
    private readonly learnedStore: LearnedMemoryStore // Per-tenant
  ) {}

  async search(query: string): Promise<Memory[]> {
    const innate = await this.innateStore.search(query); // Shared
    const learned = await this.learnedStore.search(query, this.tenantId);
    return [...innate, ...learned].sort((a, b) => b.heat - a.heat);
  }
}
```

---

## 9. Integration with Sprint 3 Specs

This research directly supports:

| Issue                 | Integration Point                                         |
| --------------------- | --------------------------------------------------------- |
| **#181 Auth**         | Tenant ID from GitHub OAuth, injected into memory context |
| **#182 Billing**      | Per-tenant storage metrics for usage-based pricing        |
| **#189 Managed Exec** | Memory isolation between dispatches of different tenants  |
| **#190 API Gateway**  | Tenant context header required for memory API calls       |

### API Design Alignment

```
POST /api/v1/memory/search
Authorization: Bearer <tenant-jwt>
X-Tenant-ID: tenant_abc123

{
  "query": "how did we handle auth?",
  "tiers": ["hot", "warm"],
  "limit": 10
}
```

---

## 10. References

### Multi-Tenant Database

- Jacobs, D., & Aulbach, S. (2007). Ruminations on multi-tenant databases. BTW.
- Chong, F., et al. (2006). Multi-tenant data architecture. MSDN.
- Krebs, R., et al. (2012). Architectural concerns in multi-tenant SaaS applications. CLOSER.

### Vector Database Multi-Tenancy

- Pinecone Documentation (2024). Namespaces for multi-tenancy.
- Qdrant Documentation (2024). Multi-tenancy best practices.
- Weaviate Documentation (2024). Multi-tenancy module.

### Agent Memory Systems

- Packer, C., et al. (2023). MemGPT: Towards LLMs as Operating Systems.
- Park, J. S., et al. (2023). Generative Agents: Interactive Simulacra of Human Behavior.
- Shinn, N., et al. (2023). Reflexion: Language Agents with Verbal Reinforcement Learning.

---

## 11. Summary

| Open Question                   | Answer                                                       |
| ------------------------------- | ------------------------------------------------------------ |
| Innate bootstrapping            | Shared tier, pre-populated by admin, no per-tenant bootstrap |
| Cross-agent heat                | Same-tenant references compound; cross-tenant isolated       |
| Compression interaction         | Per-tenant schedules, global archive format                  |
| **NEW: Multi-tenant isolation** | Namespace-based with shared innate tier                      |

### Recommendations for Engineering

1. **Sprint 3:** Implement SQLite per-tenant with shared innate JSON
2. **Inject tenant context** via middleware before memory operations
3. **Log all memory access** for audit and billing
4. **Plan PostgreSQL migration** for post-MVP scale

### Recommendations for arXiv Paper (#131)

1. Add multi-tenant architecture as **Section 4.6**
2. Highlight **shared innate tier** as novel contribution
3. Include cost model for SaaS viability claims

---

_Research provides multi-tenant grounding for Sprint 3. Engineering + Product to determine implementation priority._
