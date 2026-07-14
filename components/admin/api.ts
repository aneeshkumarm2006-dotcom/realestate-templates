/* CMS — client-side API helpers. All admin pages talk to the content
   store through these. Non-OK responses throw with the server's message. */

async function toError(res: Response): Promise<Error> {
  let message = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    if (body?.error) message = body.error;
  } catch {
    /* keep default */
  }
  if (res.status === 401) message = 'Your session has expired. Please sign in again.';
  return new Error(message);
}

export async function getContent<T>(name: string): Promise<T> {
  const res = await fetch(`/api/admin/content/${name}`, { cache: 'no-store' });
  if (!res.ok) throw await toError(res);
  return res.json();
}

export async function putContent(name: string, data: unknown): Promise<void> {
  const res = await fetch(`/api/admin/content/${name}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await toError(res);
}

/* Vercel functions reject request bodies over ~4.5 MB (HTTP 413), so images
   are downscaled in the browser first and sent ONE per request. */

const CLIENT_MAX_EDGE = 1800;
const REQUEST_LIMIT = 4 * 1024 * 1024; // stay safely under Vercel's 4.5 MB

async function compressForUpload(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, CLIENT_MAX_EDGE / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    );
    // Keep the original if the browser couldn't encode or made it bigger.
    return blob && blob.size < file.size ? blob : file;
  } catch {
    // Formats the browser can't decode (e.g. HEIC on Chrome) go up as-is.
    return file;
  }
}

export interface StagedFile {
  path: string;
  sha: string;
}

export interface UploadResult {
  /** Web paths, e.g. /assets/<slug>/uploads/123.jpg */
  added: string[];
  /** Uncommitted GitHub blobs (empty in local mode). Hold these and pass
   *  them to commitStaged so the whole session publishes as one commit. */
  staged: StagedFile[];
}

async function uploadOne(
  fields: Record<string, string>,
  file: File
): Promise<UploadResult> {
  const blob = await compressForUpload(file);
  if (blob.size > REQUEST_LIMIT) {
    throw new Error(
      `"${file.name}" is too large to upload (over 4 MB even after compression). Export it as JPG and try again.`
    );
  }
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  form.append('files', blob, name);
  const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
  if (!res.ok) throw await toError(res);
  const body = await res.json();
  return {
    added: (body.added ?? []) as string[],
    staged: (body.staged ?? []) as StagedFile[],
  };
}

const collect = async (
  files: File[],
  fields: Record<string, string>
): Promise<UploadResult> => {
  const out: UploadResult = { added: [], staged: [] };
  for (const f of files) {
    const r = await uploadOne(fields, f);
    out.added.push(...r.added);
    out.staged.push(...r.staged);
  }
  return out;
};

export const uploadPhotos = (slug: string, files: File[]): Promise<UploadResult> =>
  collect(files, { slug });

export const uploadLibraryFiles = (files: File[]): Promise<UploadResult> =>
  collect(files, { dest: 'library' });

/** Upload photos for one unit; the units editor holds the result and
 *  publishes it with its Save button. */
export const uploadUnitPhotos = (
  slug: string,
  unit: string,
  files: File[]
): Promise<UploadResult> => collect(files, { dest: 'unit', slug, unit });

/** Publish an editing session as ONE commit (one deploy): all staged photo
 *  blobs plus the content files that reference them. Works in local mode
 *  too (files are already on disk there; only the JSON is written). */
export async function commitStaged(opts: {
  message?: string;
  files?: StagedFile[];
  content?: Array<{ name: string; data: unknown }>;
}): Promise<void> {
  const res = await fetch('/api/admin/commit-staged', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
  if (!res.ok) throw await toError(res);
}

export async function logout(): Promise<void> {
  await fetch('/api/admin/logout', { method: 'POST' });
}
