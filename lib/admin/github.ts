/* ============================================================
   CMS — GitHub persistence backend.
   When CMS_STORAGE=github (set in Vercel env), every CMS save
   becomes a Git commit on the site repo instead of a local file
   write. Vercel's GitHub integration then redeploys the site
   automatically, so an edit goes live in ~1–2 minutes and every
   change has version history.

   Required env: GITHUB_TOKEN (fine-grained PAT, Contents:RW on
   the repo), GITHUB_REPO ("owner/repo"). Optional: GITHUB_BRANCH
   (default "main").
   ============================================================ */

const API = 'https://api.github.com';

export const githubMode = (): boolean =>
  process.env.CMS_STORAGE === 'github' &&
  !!process.env.GITHUB_TOKEN &&
  !!process.env.GITHUB_REPO;

const repo = () => process.env.GITHUB_REPO as string;
const branch = () => process.env.GITHUB_BRANCH || 'main';

async function gh(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  return res;
}

async function ghJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await gh(path, init);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `GitHub API ${init?.method ?? 'GET'} ${path} failed (${res.status}): ${body.slice(0, 200)}`
    );
  }
  return res.json() as Promise<T>;
}

/** Read a repo file's content (UTF-8), at HEAD or at a specific ref.
 *  Returns null (rather than throwing) when the file doesn't exist there. */
export async function ghReadFileAt(
  filePath: string,
  ref?: string
): Promise<string | null> {
  const res = await gh(
    `/repos/${repo()}/contents/${encodeURI(filePath)}?ref=${ref ?? branch()}`,
    { headers: { Accept: 'application/vnd.github.raw+json' } }
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Could not read ${filePath} from GitHub (${res.status}).`);
  }
  return res.text();
}

/** Read a repo file's current content (UTF-8). Throws if missing. */
export async function ghReadFile(filePath: string): Promise<string> {
  const text = await ghReadFileAt(filePath);
  if (text === null) {
    throw new Error(`Could not read ${filePath} from GitHub (missing).`);
  }
  return text;
}

/** List a repo directory (files only). */
export async function ghListDir(
  dirPath: string
): Promise<Array<{ name: string; path: string }>> {
  const res = await gh(
    `/repos/${repo()}/contents/${encodeURI(dirPath)}?ref=${branch()}`
  );
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`Could not list ${dirPath} from GitHub (${res.status}).`);
  }
  const entries = (await res.json()) as Array<{
    type: string;
    name: string;
    path: string;
  }>;
  return entries
    .filter((e) => e.type === 'file')
    .map((e) => ({ name: e.name, path: e.path }));
}

export interface CommitFile {
  /** Repo-relative path, e.g. "content/photos.json". */
  path: string;
  /** UTF-8 string or binary buffer. Omit when `sha` is given. */
  content?: string | Buffer;
  /** Sha of an already-created blob (see ghCreateBlob) to commit as-is. */
  sha?: string;
}

/** Upload a file blob WITHOUT committing it. Used to stage photo uploads:
 *  blobs sit in the repo's object store (no deploy fires) until a later
 *  ghCommitFiles references their sha in a single publish commit. */
export async function ghCreateBlob(content: string | Buffer): Promise<string> {
  const blob = await ghJson<{ sha: string }>(`/repos/${repo()}/git/blobs`, {
    method: 'POST',
    body: JSON.stringify(
      typeof content === 'string'
        ? { content, encoding: 'utf-8' }
        : { content: content.toString('base64'), encoding: 'base64' }
    ),
  });
  return blob.sha;
}

export interface CommitAuthor {
  name: string;
  email: string;
}

const DEFAULT_AUTHOR: CommitAuthor = {
  name: 'Content Studio',
  email: process.env.CMS_COMMIT_EMAIL ?? 'cms@example.com',
};

/** Commit one or more files atomically (Git Data API: blobs → tree →
 *  commit → ref). Entries may carry inline content or a pre-staged blob
 *  sha. Retries once on a ref race. */
export async function ghCommitFiles(
  files: CommitFile[],
  message: string,
  author?: CommitAuthor
): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      const ref = await ghJson<{ object: { sha: string } }>(
        `/repos/${repo()}/git/ref/heads/${branch()}`
      );
      const headSha = ref.object.sha;
      const head = await ghJson<{ tree: { sha: string } }>(
        `/repos/${repo()}/git/commits/${headSha}`
      );

      const tree = await ghJson<{ sha: string }>(`/repos/${repo()}/git/trees`, {
        method: 'POST',
        body: JSON.stringify({
          base_tree: head.tree.sha,
          tree: await Promise.all(
            files.map(async (f) => {
              const sha =
                f.sha ?? (await ghCreateBlob(f.content ?? ''));
              return { path: f.path, mode: '100644', type: 'blob', sha };
            })
          ),
        }),
      });

      const commit = await ghJson<{ sha: string }>(
        `/repos/${repo()}/git/commits`,
        {
          method: 'POST',
          body: JSON.stringify({
            message,
            tree: tree.sha,
            parents: [headSha],
            author: author ?? DEFAULT_AUTHOR,
          }),
        }
      );

      await ghJson(`/repos/${repo()}/git/refs/heads/${branch()}`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: commit.sha, force: false }),
      });
      return;
    } catch (err) {
      if (attempt >= 1) throw err;
    }
  }
}
