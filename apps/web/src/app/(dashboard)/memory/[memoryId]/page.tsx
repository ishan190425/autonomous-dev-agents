import fs from 'node:fs/promises';
import path from 'node:path';

import Link from 'next/link';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function findMemoryOccurrences(memoryId: string) {
  const repoRoot = path.join(process.cwd(), '..', '..');
  const memoryRoot = path.join(repoRoot, 'agents', 'memory');

  const files: string[] = [];

  files.push(path.join(memoryRoot, 'bank.md'));

  const archivesDir = path.join(memoryRoot, 'archives');
  const banksDir = path.join(memoryRoot, 'banks');

  try {
    const archiveEntries = await fs.readdir(archivesDir);
    for (const file of archiveEntries) {
      if (file.endsWith('.md')) {
        files.push(path.join(archivesDir, file));
      }
    }
  } catch {
    // ignore
  }

  try {
    const bankEntries = await fs.readdir(banksDir);
    for (const file of bankEntries) {
      if (file.endsWith('.md')) {
        files.push(path.join(banksDir, file));
      }
    }
  } catch {
    // ignore
  }

  const results: {
    file: string;
    snippets: string[];
  }[] = [];

  for (const file of files) {
    const content = await readFileSafe(file);
    if (!content) continue;

    const lines = content.split('\n');
    const snippets: string[] = [];

    lines.forEach((line, index) => {
      if (line.includes(memoryId)) {
        const start = Math.max(0, index - 2);
        const end = Math.min(lines.length, index + 3);
        const snippet = lines.slice(start, end).join('\n').trim();
        snippets.push(snippet);
      }
    });

    if (snippets.length > 0) {
      results.push({
        file: path.relative(repoRoot, file),
        snippets,
      });
    }
  }

  return results;
}

export default async function MemoryDetailPage({
  params,
}: {
  params: { memoryId: string };
}) {
  const memoryId = decodeURIComponent(params.memoryId);
  const occurrences = await findMemoryOccurrences(memoryId);

  const isRule = memoryId.startsWith('L');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-1">
            Memory Detail
          </p>
          <h1 className="text-heading-1">
            {memoryId}{' '}
            {isRule ? <span className="text-body text-text-muted">Learned Rule</span> : null}
          </h1>
          <p className="text-body text-text-secondary">
            Showing occurrences from the memory bank and archives where this ID is referenced.
          </p>
        </div>
        <Link
          href="/memory"
          className="text-sm text-ada-primary hover:text-ada-primary-hover hover:underline"
        >
          ← Back to Memory Bank
        </Link>
      </div>

      {occurrences.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No references found</CardTitle>
            <CardDescription>
              This ID does not appear in the current memory bank or archives. It may be newly added
              or pruned during compression.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {occurrences.map((occurrence) => (
            <Card key={occurrence.file}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono">{occurrence.file}</CardTitle>
                <CardDescription>
                  Snippets around lines that mention <code>{memoryId}</code>.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {occurrence.snippets.map((snippet, index) => (
                  <pre
                    key={index}
                    className="whitespace-pre-wrap rounded-md bg-bg-secondary/80 p-3 text-xs text-text-secondary"
                  >
                    {snippet}
                  </pre>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

