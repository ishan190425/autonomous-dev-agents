import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

function verifySignature(payload: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) return false;
  const expected =
    'sha256=' +
    crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-hub-signature-256');

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = req.headers.get('x-github-event');
  const payload = JSON.parse(body);

  if (event === 'installation_repositories') {
    const installationId = payload.installation?.id;
    if (!installationId) {
      return NextResponse.json({ ok: true });
    }

    // Handle added repos
    if (payload.repositories_added) {
      for (const repo of payload.repositories_added) {
        // Find the owner of this installation
        const existing = await prisma.repository.findFirst({
          where: { installationId },
          select: { ownerId: true },
        });

        if (existing) {
          await prisma.repository.upsert({
            where: { githubId: repo.id },
            update: {
              name: repo.name,
              fullName: repo.full_name,
              status: 'ACTIVE',
            },
            create: {
              name: repo.name,
              fullName: repo.full_name,
              githubId: repo.id,
              installationId,
              ownerId: existing.ownerId,
              status: 'ACTIVE',
            },
          });
        }
      }
    }

    // Handle removed repos
    if (payload.repositories_removed) {
      for (const repo of payload.repositories_removed) {
        await prisma.repository.updateMany({
          where: { githubId: repo.id },
          data: { status: 'DISCONNECTED' },
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
