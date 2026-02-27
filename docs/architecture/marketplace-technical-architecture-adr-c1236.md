# Community Playbook Marketplace — Technical Architecture ADR

> **Author:** 🌌 Frontier (C1236)
> **Date:** 2026-02-27
> **Status:** Accepted
> **Related Issue:** #187
> **Sprint:** 4 (front-load per L706)
> **Synthesizes:** C1227 (Product), C1232 (Design), C1235 (Research)

---

## Context

The Community Playbook Marketplace enables users to discover, install, and publish playbook templates. Three specs exist:

- **C1227 (Product):** Features, API endpoints, user stories
- **C1232 (Design):** UX wireframes, components, error states
- **C1235 (Research):** Ecosystem patterns, trust models, validation strategies

This ADR provides the **technical architecture** — how systems connect, data flows, and implementation-ready decisions that make Sprint 4 Day 1 copy-paste ready.

---

## Decision

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ADA MARKETPLACE ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐     ┌──────────────────┐     ┌───────────────────┐   │
│  │   CLI        │────▶│   API Gateway    │────▶│   Marketplace     │   │
│  │  (client)    │     │   (Next.js API)  │     │   Service         │   │
│  └──────────────┘     └──────────────────┘     └───────────────────┘   │
│         │                     │                        │                │
│         │              ┌──────┴──────┐                 │                │
│         │              ▼             ▼                 ▼                │
│         │      ┌─────────────┐  ┌─────────┐   ┌──────────────────┐     │
│         │      │   Auth      │  │  Rate   │   │   PostgreSQL     │     │
│         │      │  (NextAuth) │  │ Limiter │   │   (metadata)     │     │
│         │      └─────────────┘  └─────────┘   └──────────────────┘     │
│         │                                              │                │
│         │                                              ▼                │
│         │                                     ┌──────────────────┐     │
│         │                                     │   S3 + CloudFront│     │
│         └─────────────────────────────────────│   (packages)     │     │
│           (direct download)                   └──────────────────┘     │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    VALIDATION PIPELINE                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐   │  │
│  │  │ Schema   │─▶│ Security │─▶│ Content  │─▶│ Package        │   │  │
│  │  │ Validate │  │ Scan     │  │ Validate │  │ (tarball)      │   │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Decisions

### D1: Database Schema

**Decision:** Extend existing Supabase PostgreSQL with marketplace tables.

```sql
-- Playbook packages (published content)
CREATE TABLE marketplace_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  long_description TEXT,
  version VARCHAR(20) NOT NULL,
  author_id UUID NOT NULL REFERENCES users(id),
  license VARCHAR(50) NOT NULL DEFAULT 'MIT',
  ada_min_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  categories VARCHAR(50)[] NOT NULL DEFAULT '{}',
  tags VARCHAR(50)[] NOT NULL DEFAULT '{}',
  package_url TEXT NOT NULL, -- S3 signed URL
  package_size_bytes INTEGER NOT NULL,
  file_count INTEGER NOT NULL DEFAULT 0,

  -- Stats (denormalized for query performance)
  download_count INTEGER NOT NULL DEFAULT 0,
  rating_avg DECIMAL(2,1) NOT NULL DEFAULT 0.0,
  rating_count INTEGER NOT NULL DEFAULT 0,

  -- Trust signals
  trust_tier VARCHAR(20) NOT NULL DEFAULT 'community', -- official, verified, community
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  flagged_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes for search
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', name), 'A') ||
    setweight(to_tsvector('english', description), 'B') ||
    setweight(to_tsvector('english', array_to_string(tags, ' ')), 'C')
  ) STORED
);

CREATE INDEX idx_playbooks_search ON marketplace_playbooks USING GIN(search_vector);
CREATE INDEX idx_playbooks_categories ON marketplace_playbooks USING GIN(categories);
CREATE INDEX idx_playbooks_download_count ON marketplace_playbooks(download_count DESC);
CREATE INDEX idx_playbooks_rating ON marketplace_playbooks(rating_avg DESC);
CREATE INDEX idx_playbooks_trust_tier ON marketplace_playbooks(trust_tier);
CREATE INDEX idx_playbooks_author ON marketplace_playbooks(author_id);

-- Playbook roles (individual roles within a package)
CREATE TABLE marketplace_playbook_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES marketplace_playbooks(id) ON DELETE CASCADE,
  role_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  file_path VARCHAR(255) NOT NULL, -- Path within package
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_playbook_roles_playbook ON marketplace_playbook_roles(playbook_id);

-- Reviews
CREATE TABLE marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES marketplace_playbooks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  author_response TEXT,
  author_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(playbook_id, user_id) -- One review per user per playbook
);

CREATE INDEX idx_reviews_playbook ON marketplace_reviews(playbook_id);
CREATE INDEX idx_reviews_rating ON marketplace_reviews(rating);

-- Download tracking (anonymized)
CREATE TABLE marketplace_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES marketplace_playbooks(id) ON DELETE CASCADE,
  user_hash VARCHAR(64), -- SHA256 of user_id for deduplication, null for anonymous
  version VARCHAR(20) NOT NULL,
  cli_version VARCHAR(20),
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_downloads_playbook ON marketplace_downloads(playbook_id);
CREATE INDEX idx_downloads_date ON marketplace_downloads(downloaded_at);

-- Helper function: Update playbook stats
CREATE OR REPLACE FUNCTION update_playbook_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'marketplace_reviews' THEN
    UPDATE marketplace_playbooks
    SET
      rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM marketplace_reviews WHERE playbook_id = COALESCE(NEW.playbook_id, OLD.playbook_id)),
      rating_count = (SELECT COUNT(*) FROM marketplace_reviews WHERE playbook_id = COALESCE(NEW.playbook_id, OLD.playbook_id)),
      updated_at = NOW()
    WHERE id = COALESCE(NEW.playbook_id, OLD.playbook_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_review_stats
AFTER INSERT OR UPDATE OR DELETE ON marketplace_reviews
FOR EACH ROW EXECUTE FUNCTION update_playbook_stats();

-- Helper function: Increment download count
CREATE OR REPLACE FUNCTION increment_download_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_playbooks
  SET download_count = download_count + 1, updated_at = NOW()
  WHERE id = NEW.playbook_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_downloads
AFTER INSERT ON marketplace_downloads
FOR EACH ROW EXECUTE FUNCTION increment_download_count();
```

**Rationale:**

- Full-text search via PostgreSQL `tsvector` — no external search service needed for MVP
- GIN indexes on arrays for fast category/tag filtering
- Denormalized stats (download_count, rating_avg) for query performance
- Triggers for automatic stats updates
- User hash for anonymized download deduplication

---

### D2: Package Storage Architecture

**Decision:** S3 for storage + CloudFront CDN for fast downloads.

```typescript
// packages/core/src/marketplace/storage.ts

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'crypto';
import { Readable } from 'stream';
import { createGzip } from 'zlib';
import tar from 'tar';

export interface PackageMetadata {
  name: string;
  version: string;
  checksum: string; // SHA256
  size: number;
  files: string[];
}

export class MarketplaceStorage {
  private s3: S3Client;
  private bucket: string;
  private cdnDomain: string;

  constructor(config: {
    region: string;
    bucket: string;
    cdnDomain: string;
    accessKeyId: string;
    secretAccessKey: string;
  }) {
    this.s3 = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.bucket = config.bucket;
    this.cdnDomain = config.cdnDomain;
  }

  /**
   * Upload a playbook package to S3.
   * Package format: .tar.gz containing playbooks/, rules/, and ada-playbook.json
   */
  async uploadPackage(
    slug: string,
    version: string,
    packageBuffer: Buffer
  ): Promise<PackageMetadata> {
    // Compute checksum
    const checksum = createHash('sha256').update(packageBuffer).digest('hex');

    // S3 key: packages/{slug}/{version}/{slug}-{version}.tar.gz
    const key = `packages/${slug}/${version}/${slug}-${version}.tar.gz`;

    // Upload to S3
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: packageBuffer,
        ContentType: 'application/gzip',
        ContentDisposition: `attachment; filename="${slug}-${version}.tar.gz"`,
        Metadata: {
          'x-ada-checksum': checksum,
          'x-ada-version': version,
        },
        // Public read via CloudFront, not direct S3
        ACL: 'private',
      })
    );

    // Extract file list from tarball for metadata
    const files = await this.extractFileList(packageBuffer);

    return {
      name: slug,
      version,
      checksum,
      size: packageBuffer.length,
      files,
    };
  }

  /**
   * Generate a signed download URL (1 hour expiry).
   * For authenticated downloads with tracking.
   */
  async getSignedDownloadUrl(slug: string, version: string): Promise<string> {
    const key = `packages/${slug}/${version}/${slug}-${version}.tar.gz`;

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3, command, { expiresIn: 3600 });
  }

  /**
   * Get CDN URL for fast downloads.
   * Used after authentication/tracking is complete.
   */
  getCdnUrl(slug: string, version: string): string {
    return `https://${this.cdnDomain}/packages/${slug}/${version}/${slug}-${version}.tar.gz`;
  }

  /**
   * Delete a package version.
   */
  async deletePackage(slug: string, version: string): Promise<void> {
    const key = `packages/${slug}/${version}/${slug}-${version}.tar.gz`;

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }

  /**
   * Extract file list from tarball without full extraction.
   */
  private async extractFileList(buffer: Buffer): Promise<string[]> {
    const files: string[] = [];

    await new Promise<void>((resolve, reject) => {
      const stream = Readable.from(buffer);
      stream
        .pipe(
          tar.list({
            onentry: entry => {
              if (entry.type === 'File') {
                files.push(entry.path);
              }
            },
          })
        )
        .on('finish', resolve)
        .on('error', reject);
    });

    return files;
  }
}
```

**S3 Bucket Structure:**

```
ada-marketplace-packages/
├── packages/
│   ├── react-typescript-pro/
│   │   ├── 1.0.0/
│   │   │   └── react-typescript-pro-1.0.0.tar.gz
│   │   ├── 1.1.0/
│   │   │   └── react-typescript-pro-1.1.0.tar.gz
│   │   └── latest.json  # Points to latest version
│   └── api-express-starter/
│       └── ...
└── manifests/  # (future: aggregated metadata for offline search)
```

**CloudFront Configuration:**

```yaml
# AWS CloudFormation / Terraform
CloudFrontDistribution:
  Origins:
    - DomainName: ada-marketplace-packages.s3.amazonaws.com
      S3OriginConfig:
        OriginAccessIdentity: !Ref CloudFrontOAI
  DefaultCacheBehavior:
    ViewerProtocolPolicy: redirect-to-https
    CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6 # CachingOptimized
    Compress: true
  # Custom domain: cdn.marketplace.ada.dev
```

**Rationale:**

- S3 provides durable, scalable storage
- CloudFront CDN reduces latency globally (packages are immutable)
- Signed URLs for authenticated tracking before redirect to CDN
- Version-based paths enable simple cache invalidation on updates

---

### D3: API Architecture

**Decision:** Extend existing Next.js API routes with dedicated marketplace endpoints.

```typescript
// apps/web/app/api/marketplace/playbooks/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// GET /api/marketplace/playbooks
// Query params: q, category, sort, page, limit
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const query = searchParams.get('q');
  const category = searchParams.get('category');
  const sort = searchParams.get('sort') || 'popular'; // popular, recent, rating
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
  const offset = (page - 1) * limit;

  // Build query
  let whereClause: any = { flagged: false };

  if (query) {
    whereClause.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { tags: { hasSome: query.split(' ') } },
    ];
  }

  if (category) {
    whereClause.categories = { has: category };
  }

  // Build sort
  let orderBy: any;
  switch (sort) {
    case 'recent':
      orderBy = { publishedAt: 'desc' };
      break;
    case 'rating':
      orderBy = [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }];
      break;
    case 'popular':
    default:
      orderBy = { downloadCount: 'desc' };
  }

  const [playbooks, total] = await Promise.all([
    prisma.marketplacePlaybook.findMany({
      where: whereClause,
      orderBy,
      skip: offset,
      take: limit,
      include: {
        author: {
          select: { id: true, name: true, username: true, image: true },
        },
        roles: {
          select: { roleId: true, name: true, description: true },
        },
      },
    }),
    prisma.marketplacePlaybook.count({ where: whereClause }),
  ]);

  return NextResponse.json({
    playbooks: playbooks.map(formatPlaybookResponse),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

// POST /api/marketplace/playbooks
// Publish a new playbook (requires auth)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const body = await request.json();

  // Validate schema
  const schema = z.object({
    name: z
      .string()
      .min(3)
      .max(100)
      .regex(/^[a-z0-9-]+$/),
    description: z.string().min(10).max(500),
    longDescription: z.string().optional(),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    license: z.string().default('MIT'),
    adaMinVersion: z.string().default('1.0.0'),
    categories: z.array(z.string()).min(1).max(3),
    tags: z.array(z.string()).max(10),
    packageBase64: z.string(), // Base64-encoded tarball
  });

  const validated = schema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validated.error.issues },
      { status: 400 }
    );
  }

  const data = validated.data;

  // Check slug uniqueness
  const existing = await prisma.marketplacePlaybook.findUnique({
    where: { slug: data.name },
  });

  if (existing && existing.authorId !== session.user.id) {
    return NextResponse.json(
      { error: 'Playbook name already taken' },
      { status: 409 }
    );
  }

  // Decode and validate package
  const packageBuffer = Buffer.from(data.packageBase64, 'base64');

  const validationResult = await validatePackage(packageBuffer);
  if (!validationResult.valid) {
    return NextResponse.json(
      { error: 'Package validation failed', details: validationResult.errors },
      { status: 400 }
    );
  }

  // Upload to S3
  const storage = new MarketplaceStorage(/* config */);
  const packageMeta = await storage.uploadPackage(
    data.name,
    data.version,
    packageBuffer
  );

  // Create/update database record
  const playbook = await prisma.marketplacePlaybook.upsert({
    where: { slug: data.name },
    create: {
      slug: data.name,
      name: data.name,
      description: data.description,
      longDescription: data.longDescription,
      version: data.version,
      authorId: session.user.id,
      license: data.license,
      adaMinVersion: data.adaMinVersion,
      categories: data.categories,
      tags: data.tags,
      packageUrl: packageMeta.checksum, // Store checksum, generate URL on demand
      packageSizeBytes: packageMeta.size,
      fileCount: packageMeta.files.length,
    },
    update: {
      description: data.description,
      longDescription: data.longDescription,
      version: data.version,
      categories: data.categories,
      tags: data.tags,
      packageUrl: packageMeta.checksum,
      packageSizeBytes: packageMeta.size,
      fileCount: packageMeta.files.length,
      updatedAt: new Date(),
    },
  });

  // Create role records
  await prisma.marketplacePlaybookRole.deleteMany({
    where: { playbookId: playbook.id },
  });
  await prisma.marketplacePlaybookRole.createMany({
    data: validationResult.roles.map(role => ({
      playbookId: playbook.id,
      roleId: role.id,
      name: role.name,
      description: role.description,
      filePath: role.filePath,
    })),
  });

  return NextResponse.json(
    { playbook: formatPlaybookResponse(playbook) },
    { status: 201 }
  );
}

function formatPlaybookResponse(playbook: any) {
  return {
    id: playbook.id,
    slug: playbook.slug,
    name: playbook.name,
    description: playbook.description,
    version: playbook.version,
    author: playbook.author
      ? {
          username: playbook.author.username || playbook.author.name,
          avatarUrl: playbook.author.image,
        }
      : undefined,
    license: playbook.license,
    categories: playbook.categories,
    tags: playbook.tags,
    roles: playbook.roles?.map((r: any) => ({
      id: r.roleId,
      name: r.name,
      description: r.description,
    })),
    stats: {
      downloads: playbook.downloadCount,
      rating: playbook.ratingAvg,
      reviewCount: playbook.ratingCount,
    },
    trustTier: playbook.trustTier,
    isVerified: playbook.isVerified,
    packageSize: playbook.packageSizeBytes,
    fileCount: playbook.fileCount,
    createdAt: playbook.createdAt,
    updatedAt: playbook.updatedAt,
  };
}
```

**API Endpoint Matrix:**

| Method | Endpoint                                    | Auth     | Rate Limit | Purpose                  |
| ------ | ------------------------------------------- | -------- | ---------- | ------------------------ |
| GET    | `/api/marketplace/playbooks`                | Optional | 60/min     | List/search playbooks    |
| GET    | `/api/marketplace/playbooks/:slug`          | Optional | 60/min     | Get playbook details     |
| GET    | `/api/marketplace/playbooks/:slug/download` | Optional | 30/min     | Get download URL + track |
| POST   | `/api/marketplace/playbooks`                | Required | 5/min      | Publish playbook         |
| PUT    | `/api/marketplace/playbooks/:slug`          | Required | 10/min     | Update playbook          |
| DELETE | `/api/marketplace/playbooks/:slug`          | Required | 5/min      | Unpublish playbook       |
| GET    | `/api/marketplace/playbooks/:slug/reviews`  | Optional | 60/min     | List reviews             |
| POST   | `/api/marketplace/playbooks/:slug/reviews`  | Required | 5/min      | Add review               |
| PUT    | `/api/marketplace/reviews/:id`              | Required | 10/min     | Update review            |
| GET    | `/api/marketplace/categories`               | Optional | 60/min     | List categories + counts |

---

### D4: Content Validation Pipeline

**Decision:** Multi-stage validation pipeline with security scanning.

```typescript
// packages/core/src/marketplace/validation.ts

import tar from 'tar';
import { Readable } from 'stream';
import Ajv from 'ajv';
import { z } from 'zod';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  manifest: PlaybookManifest | null;
  roles: ParsedRole[];
}

export interface ValidationError {
  code: string;
  message: string;
  file?: string;
  line?: number;
}

export interface ValidationWarning {
  code: string;
  message: string;
  file?: string;
}

export interface ParsedRole {
  id: string;
  name: string;
  description?: string;
  filePath: string;
}

// Dangerous patterns to detect
const DANGEROUS_PATTERNS = [
  // Shell injection
  {
    pattern: /\$\([^)]+\)/g,
    code: 'SHELL_INJECTION',
    message: 'Shell command substitution detected',
  },
  {
    pattern: /`[^`]+`/g,
    code: 'SHELL_BACKTICK',
    message: 'Backtick command execution detected',
  },

  // Destructive commands
  {
    pattern: /rm\s+-rf?\s+[\/~]/gi,
    code: 'DESTRUCTIVE_RM',
    message: 'Destructive rm command detected',
  },
  {
    pattern: /git\s+push\s+--force/gi,
    code: 'FORCE_PUSH',
    message: 'Force push command detected',
  },
  {
    pattern: /git\s+reset\s+--hard/gi,
    code: 'HARD_RESET',
    message: 'Hard reset command detected',
  },

  // Data exfiltration
  {
    pattern: /curl\s+.*\|\s*sh/gi,
    code: 'CURL_PIPE_SH',
    message: 'Curl to shell pipe detected',
  },
  {
    pattern: /wget\s+.*-O-?\s*\|\s*sh/gi,
    code: 'WGET_PIPE_SH',
    message: 'Wget to shell pipe detected',
  },

  // Credential harvesting
  {
    pattern: /password|api[_-]?key|secret[_-]?key|access[_-]?token/gi,
    code: 'CREDENTIAL_PROMPT',
    message: 'Possible credential harvesting',
  },

  // Secrets in content
  {
    pattern: /sk_live_[a-zA-Z0-9]+/g,
    code: 'STRIPE_LIVE_KEY',
    message: 'Stripe live key detected',
  },
  {
    pattern: /ghp_[a-zA-Z0-9]+/g,
    code: 'GITHUB_PAT',
    message: 'GitHub personal access token detected',
  },
  {
    pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g,
    code: 'PRIVATE_KEY',
    message: 'Private key detected',
  },
  {
    pattern: /AKIA[A-Z0-9]{16}/g,
    code: 'AWS_ACCESS_KEY',
    message: 'AWS access key detected',
  },
];

// Size limits
const MAX_PACKAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILE_SIZE = 500 * 1024; // 500KB per file
const MAX_FILES = 50;

// Manifest schema
const manifestSchema = z.object({
  name: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(10).max(500),
  author: z.object({
    name: z.string(),
    github: z.string().optional(),
  }),
  license: z.string(),
  categories: z.array(z.string()).min(1).max(3),
  tags: z.array(z.string()).max(10).optional(),
  ada: z
    .object({
      minVersion: z.string().default('1.0.0'),
    })
    .optional(),
  roles: z.array(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      playbook: z.string(),
      description: z.string().optional(),
    })
  ),
  rules: z
    .array(
      z.object({
        file: z.string(),
        description: z.string().optional(),
      })
    )
    .optional(),
});

export async function validatePackage(
  packageBuffer: Buffer
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let manifest: PlaybookManifest | null = null;
  const roles: ParsedRole[] = [];
  const files: Map<string, Buffer> = new Map();

  // Stage 1: Size validation
  if (packageBuffer.length > MAX_PACKAGE_SIZE) {
    errors.push({
      code: 'PACKAGE_TOO_LARGE',
      message: `Package size ${(packageBuffer.length / 1024 / 1024).toFixed(2)}MB exceeds limit of ${MAX_PACKAGE_SIZE / 1024 / 1024}MB`,
    });
    return { valid: false, errors, warnings, manifest: null, roles: [] };
  }

  // Stage 2: Extract and parse tarball
  try {
    await new Promise<void>((resolve, reject) => {
      const stream = Readable.from(packageBuffer);
      const chunks: Map<string, Buffer[]> = new Map();

      stream
        .pipe(
          tar.parse({
            onentry: entry => {
              const path = entry.path;
              const entryChunks: Buffer[] = [];

              entry.on('data', chunk => entryChunks.push(chunk));
              entry.on('end', () => {
                files.set(path, Buffer.concat(entryChunks));
              });
            },
          })
        )
        .on('finish', resolve)
        .on('error', reject);
    });
  } catch (e) {
    errors.push({
      code: 'INVALID_TARBALL',
      message: 'Failed to parse package tarball',
    });
    return { valid: false, errors, warnings, manifest: null, roles: [] };
  }

  // Stage 3: File count validation
  if (files.size > MAX_FILES) {
    errors.push({
      code: 'TOO_MANY_FILES',
      message: `Package contains ${files.size} files, limit is ${MAX_FILES}`,
    });
  }

  // Stage 4: Manifest validation
  const manifestBuffer = files.get('ada-playbook.json');
  if (!manifestBuffer) {
    errors.push({
      code: 'MISSING_MANIFEST',
      message: 'Package must contain ada-playbook.json',
    });
    return { valid: false, errors, warnings, manifest: null, roles: [] };
  }

  try {
    const manifestJson = JSON.parse(manifestBuffer.toString('utf-8'));
    const parsed = manifestSchema.safeParse(manifestJson);

    if (!parsed.success) {
      parsed.error.issues.forEach(issue => {
        errors.push({
          code: 'MANIFEST_INVALID',
          message: `${issue.path.join('.')}: ${issue.message}`,
          file: 'ada-playbook.json',
        });
      });
    } else {
      manifest = parsed.data as PlaybookManifest;
    }
  } catch (e) {
    errors.push({
      code: 'MANIFEST_PARSE_ERROR',
      message: 'Failed to parse ada-playbook.json as JSON',
    });
  }

  // Stage 5: README validation
  const hasReadme = files.has('README.md') || files.has('readme.md');
  if (!hasReadme) {
    errors.push({
      code: 'MISSING_README',
      message: 'Package must contain README.md',
    });
  } else {
    const readme = files.get('README.md') || files.get('readme.md');
    if (readme && readme.length < 100) {
      warnings.push({
        code: 'SHORT_README',
        message: 'README.md should be at least 100 characters',
        file: 'README.md',
      });
    }
  }

  // Stage 6: Security scan all files
  for (const [path, content] of files) {
    // Skip binary files
    if (!isTextFile(path)) continue;

    const text = content.toString('utf-8');

    // File size check
    if (content.length > MAX_FILE_SIZE) {
      errors.push({
        code: 'FILE_TOO_LARGE',
        message: `File exceeds ${MAX_FILE_SIZE / 1024}KB limit`,
        file: path,
      });
    }

    // Dangerous pattern scan
    for (const { pattern, code, message } of DANGEROUS_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        errors.push({ code, message, file: path });
      }
    }
  }

  // Stage 7: Role validation
  if (manifest?.roles) {
    for (const role of manifest.roles) {
      const playbookPath = role.playbook.replace(/^\//, '');
      if (!files.has(playbookPath)) {
        errors.push({
          code: 'MISSING_PLAYBOOK',
          message: `Role "${role.id}" references missing playbook: ${playbookPath}`,
          file: 'ada-playbook.json',
        });
      } else {
        roles.push({
          id: role.id,
          name: role.name || role.id,
          description: role.description,
          filePath: playbookPath,
        });
      }
    }
  }

  // Stage 8: License validation
  if (manifest?.license) {
    const validLicenses = [
      'MIT',
      'Apache-2.0',
      'GPL-3.0',
      'BSD-3-Clause',
      'ISC',
      'Unlicense',
      'CC0-1.0',
    ];
    if (!validLicenses.includes(manifest.license)) {
      warnings.push({
        code: 'UNKNOWN_LICENSE',
        message: `License "${manifest.license}" is not a common SPDX identifier`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    manifest,
    roles,
  };
}

function isTextFile(path: string): boolean {
  const textExtensions = [
    '.md',
    '.json',
    '.yaml',
    '.yml',
    '.txt',
    '.ts',
    '.js',
  ];
  return textExtensions.some(ext => path.toLowerCase().endsWith(ext));
}
```

**Validation Pipeline Stages:**

| Stage | Check               | Blocking | Rationale                  |
| ----- | ------------------- | -------- | -------------------------- |
| 1     | Package size        | ✅       | DoS prevention             |
| 2     | Tarball parsing     | ✅       | Valid format required      |
| 3     | File count          | ✅       | DoS prevention             |
| 4     | Manifest schema     | ✅       | Required for installation  |
| 5     | README presence     | ✅       | User experience            |
| 6     | Security patterns   | ✅       | Prevent malicious content  |
| 7     | Role file existence | ✅       | Installation would fail    |
| 8     | License validity    | ⚠️       | Warning only, not blocking |

---

### D5: CLI-to-API Communication

**Decision:** REST API with structured responses and progress streaming.

```typescript
// packages/cli/src/marketplace/client.ts

import fetch from 'node-fetch';
import { config } from '../config';
import ora from 'ora';
import chalk from 'chalk';

export interface MarketplaceConfig {
  baseUrl: string;
  authToken?: string;
}

export class MarketplaceClient {
  private baseUrl: string;
  private authToken?: string;

  constructor(cfg?: Partial<MarketplaceConfig>) {
    this.baseUrl =
      cfg?.baseUrl || config.marketplace?.url || 'https://api.ada.dev';
    this.authToken = cfg?.authToken || config.auth?.token;
  }

  private async request<T>(
    method: string,
    path: string,
    options?: { body?: any; spinner?: ora.Ora }
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': `ada-cli/${config.version}`,
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new MarketplaceError(
          error.error || `HTTP ${response.status}`,
          response.status,
          error.details
        );
      }

      return response.json() as Promise<T>;
    } catch (e) {
      if (e instanceof MarketplaceError) throw e;
      throw new MarketplaceError(
        'Network error: Unable to connect to marketplace',
        0,
        undefined
      );
    }
  }

  /**
   * Search/list playbooks
   */
  async search(params: {
    query?: string;
    category?: string;
    sort?: 'popular' | 'recent' | 'rating';
    page?: number;
    limit?: number;
  }): Promise<{ playbooks: Playbook[]; pagination: Pagination }> {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set('q', params.query);
    if (params.category) searchParams.set('category', params.category);
    if (params.sort) searchParams.set('sort', params.sort);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    return this.request('GET', `/api/marketplace/playbooks?${searchParams}`);
  }

  /**
   * Get playbook details
   */
  async getPlaybook(slug: string): Promise<Playbook> {
    const result = await this.request<{ playbook: Playbook }>(
      'GET',
      `/api/marketplace/playbooks/${slug}`
    );
    return result.playbook;
  }

  /**
   * Download playbook package
   */
  async download(
    slug: string,
    version?: string
  ): Promise<{
    downloadUrl: string;
    checksum: string;
    size: number;
  }> {
    const path = version
      ? `/api/marketplace/playbooks/${slug}/download?version=${version}`
      : `/api/marketplace/playbooks/${slug}/download`;

    return this.request('GET', path);
  }

  /**
   * Publish playbook
   */
  async publish(
    manifest: PlaybookManifest,
    packageBuffer: Buffer
  ): Promise<Playbook> {
    const result = await this.request<{ playbook: Playbook }>(
      'POST',
      '/api/marketplace/playbooks',
      {
        body: {
          name: manifest.name,
          description: manifest.description,
          version: manifest.version,
          license: manifest.license,
          categories: manifest.categories,
          tags: manifest.tags || [],
          packageBase64: packageBuffer.toString('base64'),
        },
      }
    );
    return result.playbook;
  }

  /**
   * List categories with counts
   */
  async getCategories(): Promise<
    { category: string; count: number; emoji: string }[]
  > {
    const result = await this.request<{ categories: any[] }>(
      'GET',
      '/api/marketplace/categories'
    );
    return result.categories;
  }

  /**
   * Submit review
   */
  async submitReview(
    slug: string,
    rating: number,
    text?: string
  ): Promise<void> {
    await this.request('POST', `/api/marketplace/playbooks/${slug}/reviews`, {
      body: { rating, text },
    });
  }
}

export class MarketplaceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'MarketplaceError';
  }
}
```

**CLI Command Implementation:**

```typescript
// packages/cli/src/commands/marketplace/install.ts

import { Command } from 'commander';
import { MarketplaceClient } from '../../marketplace/client';
import { installPlaybook } from '../../marketplace/installer';
import ora from 'ora';
import chalk from 'chalk';
import prompts from 'prompts';

export const installCommand = new Command('install')
  .description('Install a playbook from the marketplace')
  .argument('<playbook>', 'Playbook slug or name')
  .option('--version <version>', 'Specific version to install')
  .option('--dry-run', 'Preview installation without making changes')
  .option('--force', 'Force install even with warnings')
  .option('--roles <roles>', 'Only install specific roles (comma-separated)')
  .action(async (playbook, options) => {
    const spinner = ora();
    const client = new MarketplaceClient();

    try {
      // 1. Fetch playbook metadata
      spinner.start(`Fetching ${chalk.cyan(playbook)}...`);
      const pkg = await client.getPlaybook(playbook);
      spinner.succeed(`Found ${chalk.cyan(pkg.name)} v${pkg.version}`);

      // 2. Check compatibility
      spinner.start('Checking compatibility...');
      const compat = await checkCompatibility(pkg);
      if (!compat.compatible && !options.force) {
        spinner.fail(`Incompatible: ${compat.reason}`);
        console.log(
          `\n  Run with ${chalk.yellow('--force')} to install anyway.`
        );
        process.exit(1);
      }
      spinner.succeed('Compatibility check passed');

      // 3. Dry run preview
      if (options.dryRun) {
        await showDryRunPreview(pkg, options);
        return;
      }

      // 4. Download package
      spinner.start('Downloading package...');
      const { downloadUrl, checksum, size } = await client.download(
        playbook,
        options.version
      );
      const packageBuffer = await downloadPackage(downloadUrl);
      spinner.succeed(`Downloaded ${(size / 1024).toFixed(1)} KB`);

      // 5. Verify checksum
      spinner.start('Verifying package integrity...');
      const computedChecksum = computeChecksum(packageBuffer);
      if (computedChecksum !== checksum) {
        spinner.fail('Checksum mismatch - package may be corrupted');
        process.exit(1);
      }
      spinner.succeed('Package verified');

      // 6. Check for conflicts
      const conflicts = await detectConflicts(pkg, options);
      if (conflicts.length > 0 && !options.force) {
        spinner.stop();
        await handleConflicts(conflicts);
      }

      // 7. Confirm installation
      if (!options.force) {
        const { confirm } = await prompts({
          type: 'confirm',
          name: 'confirm',
          message: `Install ${pkg.name} (${pkg.roles.length} roles)?`,
        });
        if (!confirm) {
          console.log(chalk.yellow('Installation cancelled.'));
          return;
        }
      }

      // 8. Install
      spinner.start('Installing playbooks...');
      const result = await installPlaybook(packageBuffer, {
        roles: options.roles?.split(','),
        force: options.force,
      });
      spinner.succeed(
        `Installed ${result.rolesInstalled} roles, ${result.rulesInstalled} rules`
      );

      // 9. Success message
      console.log(
        '\n' + chalk.green('✅ Successfully installed ') + chalk.cyan(pkg.name)
      );
      console.log('\n  Next steps:');
      console.log(
        `  1. Review playbooks:     ${chalk.dim('cat agents/playbooks/frontend.md')}`
      );
      console.log(`  2. Update roster:        ${chalk.dim('ada roster edit')}`);
      console.log(
        `  3. Start dispatch:       ${chalk.dim('ada dispatch start')}`
      );
      console.log(
        `\n  💡 ${chalk.dim(`Run 'ada marketplace review ${playbook}' after trying it!`)}`
      );
    } catch (e) {
      spinner.fail(e.message);
      if (e.details) {
        console.log(chalk.dim(JSON.stringify(e.details, null, 2)));
      }
      process.exit(1);
    }
  });
```

---

### D6: Rate Limiting & Security

**Decision:** Tiered rate limiting with abuse detection.

```typescript
// apps/web/lib/rate-limit.ts

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

// Tiered rate limits
export const rateLimits = {
  // Public read operations (browse, search)
  public: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'), // 60/min
    analytics: true,
    prefix: 'marketplace:public',
  }),

  // Authenticated read operations
  authenticated: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(120, '1 m'), // 120/min
    analytics: true,
    prefix: 'marketplace:authenticated',
  }),

  // Download operations (tracked for stats)
  download: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'), // 30/min
    analytics: true,
    prefix: 'marketplace:download',
  }),

  // Write operations (publish, review)
  write: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10/min
    analytics: true,
    prefix: 'marketplace:write',
  }),

  // Publishing (strict)
  publish: new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(5, '1 h'), // 5/hour
    analytics: true,
    prefix: 'marketplace:publish',
  }),
};

export async function checkRateLimit(
  type: keyof typeof rateLimits,
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const limiter = rateLimits[type];
  const result = await limiter.limit(identifier);

  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
```

**Security Headers:**

```typescript
// apps/web/middleware.ts

import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers for marketplace API
  if (request.nextUrl.pathname.startsWith('/api/marketplace')) {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // CORS for CLI access
    const origin = request.headers.get('origin');
    if (!origin || origin === 'null') {
      // CLI requests have no origin
      response.headers.set('Access-Control-Allow-Origin', '*');
    }
  }

  return response;
}
```

---

## Implementation Phases

### Sprint 4 Week 1-2: Browse & Install (MVP)

**Days 1-3: Infrastructure**

- [ ] Database migrations (marketplace tables)
- [ ] S3 bucket + CloudFront setup
- [ ] Rate limiting middleware

**Days 4-7: Read API**

- [ ] GET /api/marketplace/playbooks (list/search)
- [ ] GET /api/marketplace/playbooks/:slug (details)
- [ ] GET /api/marketplace/categories

**Days 8-10: CLI Browse/Search**

- [ ] `ada marketplace browse`
- [ ] `ada marketplace search`
- [ ] `ada marketplace info`

**Days 11-14: CLI Install**

- [ ] `ada marketplace install`
- [ ] `ada marketplace install --dry-run`
- [ ] Conflict resolution prompts
- [ ] Local playbook installer

### Sprint 4 Week 3-4: Publishing

**Days 15-17: Validation Pipeline**

- [ ] Package validator (schema, security, content)
- [ ] S3 upload flow

**Days 18-21: Write API**

- [ ] POST /api/marketplace/playbooks (publish)
- [ ] PUT /api/marketplace/playbooks/:slug (update)
- [ ] DELETE /api/marketplace/playbooks/:slug (unpublish)

**Days 22-28: CLI Publish**

- [ ] `ada marketplace pack`
- [ ] `ada marketplace publish`
- [ ] `ada marketplace update`

### Sprint 5: Ratings & Trust

**Week 1: Reviews**

- [ ] Review API endpoints
- [ ] `ada marketplace review`
- [ ] Rating aggregation triggers

**Week 2: Trust Signals**

- [ ] Verified badge logic
- [ ] Install count deduplication
- [ ] Flag/report system

---

## Testing Strategy

**Unit Tests:**

- Validation pipeline: schema, security patterns, file checks
- MarketplaceClient: API calls, error handling
- Package installer: extraction, conflict detection

**Integration Tests:**

- Full publish → install cycle
- Search with various filters
- Rate limiting behavior

**E2E Tests (Playwright):**

- Web dashboard flows (Sprint 6)

**Test Fixtures:**

```
packages/core/tests/marketplace/fixtures/
├── valid-playbook/           # Valid minimal package
├── invalid-manifest/         # Missing required fields
├── malicious-content/        # Contains dangerous patterns
├── oversized/                # Exceeds size limits
└── with-conflicts/           # Conflicts with existing roles
```

---

## Performance Targets

| Metric               | Target | Measurement                  |
| -------------------- | ------ | ---------------------------- |
| Search response time | <200ms | P95 latency                  |
| Package download     | <2s    | 10MB package, global CDN     |
| Install (local)      | <5s    | Package + extraction + write |
| Publish (validation) | <10s   | Full pipeline                |
| Full-text search     | <100ms | PostgreSQL tsvector          |

---

## Migration Path

**From MVP to Scale:**

1. **Search (Sprint 4 → Sprint 7+):**
   - MVP: PostgreSQL full-text search
   - Scale: Elasticsearch/Meilisearch for advanced ranking

2. **Storage (Sprint 4 → Sprint 7+):**
   - MVP: Single S3 bucket + CloudFront
   - Scale: Multi-region replication

3. **Analytics (Sprint 5 → Sprint 7+):**
   - MVP: Download counts in PostgreSQL
   - Scale: ClickHouse for usage analytics

---

## Related Documents

- `docs/product/community-playbook-marketplace-spec-c1227.md` — Product requirements
- `docs/design/marketplace-ux-design-spec-c1232.md` — UX specification
- `docs/research/community-content-ecosystem-patterns-c1235.md` — Ecosystem research
- `docs/architecture/sprint3-saas-architecture-adr-c1196.md` — SaaS infrastructure

---

## Open Questions (Resolved)

| Question            | Decision            | Rationale                                   |
| ------------------- | ------------------- | ------------------------------------------- |
| Search backend?     | PostgreSQL tsvector | Simpler MVP, migrate to Elasticsearch later |
| Package format?     | .tar.gz             | Standard, streamable, widely supported      |
| Auth for downloads? | Optional            | Track for stats, but allow anonymous        |
| Namespace?          | Scoped (@user/pkg)  | Prevents conflicts per C1235 research       |

---

_🌌 Technical Architecture ADR by The Frontier | C1236 | 2026-02-27_
