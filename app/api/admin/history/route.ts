import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { githubMode } from '@/lib/admin/github';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const run = promisify(execFile);
const API = 'https://api.github.com';

export interface HistoryEntry {
  sha: string;
  message: string;
  author: string;
  date: string; // ISO
  /** True when the commit was made by the CMS itself. */
  cms: boolean;
}

/** Recent commit history for the edit-history page. Uses the GitHub API on
 *  the deployed site and local `git log` in dev. */
export async function GET() {
  let entries: HistoryEntry[];

  if (githubMode()) {
    const res = await fetch(
      `${API}/repos/${process.env.GITHUB_REPO}/commits?sha=${process.env.GITHUB_BRANCH || 'main'}&per_page=40`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        cache: 'no-store',
      }
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: `Could not load history from GitHub (${res.status}).` },
        { status: 502 }
      );
    }
    const commits = (await res.json()) as Array<{
      sha: string;
      commit: {
        message: string;
        author: { name: string; date: string };
      };
    }>;
    entries = commits.map((c) => ({
      sha: c.sha,
      message: c.commit.message.split('\n')[0],
      author: c.commit.author.name,
      date: c.commit.author.date,
      cms: c.commit.message.startsWith('cms:'),
    }));
  } else {
    try {
      const { stdout } = await run('git', [
        'log',
        '-40',
        '--format=%H%x1f%an%x1f%aI%x1f%s',
      ]);
      entries = stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [sha, author, date, message] = line.split('\x1f');
          return {
            sha,
            message,
            author,
            date,
            cms: message.startsWith('cms:'),
          };
        });
    } catch {
      return NextResponse.json(
        { error: 'Could not read local git history.' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ entries });
}
