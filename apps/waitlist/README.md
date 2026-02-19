# ADA Waitlist Website

Temporary waitlist landing page for ADA SaaS launch. Collects email signups while the full marketing site is in development.

## Tech Stack

- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **Deployment:** Vercel

## Features

- 🎨 Modern, responsive landing page
- 📧 Email waitlist signup with Supabase
- 📊 Real-time waitlist count display
- 🔒 Duplicate email prevention
- ⚡ Optimized build with code splitting

## Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Fill in your Supabase credentials in .env
# Get them from: https://supabase.com/dashboard/project/<project-id>/settings/api

# Start dev server
npm run dev
```

## Environment Variables

| Variable                        | Description              | Required |
| ------------------------------- | ------------------------ | -------- |
| `VITE_SUPABASE_URL`             | Supabase project URL     | ✅       |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key | ✅       |

## Deployment (Vercel)

### Quick Deploy

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/new)
   - Import the `autonomous-dev-agents` repo
   - Set Root Directory to `apps/waitlist`

2. **Configure Environment Variables**
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
   - Get values from [Supabase Dashboard](https://supabase.com/dashboard)

3. **Deploy**
   - Vercel will auto-detect Vite and deploy

### Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your domain (e.g., `waitlist.ada.dev`)
3. Configure DNS as instructed

## Supabase Setup

The waitlist uses these Supabase resources:

### Table: `waitlist`

```sql
CREATE TABLE waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous inserts
CREATE POLICY "Allow anonymous inserts" ON waitlist
  FOR INSERT TO anon
  WITH CHECK (true);
```

### Function: `get_waitlist_count`

```sql
CREATE OR REPLACE FUNCTION get_waitlist_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM waitlist;
$$ LANGUAGE SQL SECURITY DEFINER;
```

## Scripts

| Script              | Description              |
| ------------------- | ------------------------ |
| `npm run dev`       | Start development server |
| `npm run build`     | Build for production     |
| `npm run preview`   | Preview production build |
| `npm run lint`      | Run ESLint               |
| `npm run typecheck` | Run TypeScript checks    |

## Lifecycle

1. **Now:** Active — collecting signups
2. **Later:** Deprecate when `apps/web/` is production-ready
3. **Eventually:** Archive or remove, migrate signups

## Related

- Issue: [#200](https://github.com/ishan190425/autonomous-dev-agents/issues/200)
- Full Marketing Site: `apps/web/` (planned)
- Supabase Project: `ldzxplhmtxfhiunpzmnt`
