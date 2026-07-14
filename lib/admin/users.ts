import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import {
  ghCommitFiles,
  ghReadFileAt,
  githubMode,
  type CommitAuthor,
} from './github';

const scrypt = promisify(scryptCb);

/* ============================================================
   CMS — user accounts.
   Stored in content/users.json with scrypt-hashed passwords
   (never plaintext). DELIBERATELY excluded from CONTENT_FILES:
   the generic content API can't touch accounts and History
   restores never roll them back. The root account from
   ADMIN_EMAIL/ADMIN_PASSWORD env always works as a recovery
   login and cannot be edited here.
   ============================================================ */

export type Role = 'admin' | 'editor';

export interface User {
  email: string;
  name: string;
  role: Role;
  /** scrypt: `<saltHex>:<hashHex>` */
  passwordHash: string;
  createdAt: string;
  active: boolean;
}

const FILE = 'content/users.json';
const localPath = () => path.join(process.cwd(), FILE);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [salt, hashHex] = stored.split(':');
  if (!salt || !hashHex) return false;
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hashHex, 'hex');
  return hash.length === expected.length && timingSafeEqual(hash, expected);
}

export async function readUsers(): Promise<User[]> {
  try {
    const raw = githubMode()
      ? await ghReadFileAt(FILE)
      : await fs.readFile(localPath(), 'utf8');
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as User[]) : [];
  } catch {
    return [];
  }
}

export async function writeUsers(
  users: User[],
  message: string,
  author?: CommitAuthor
): Promise<void> {
  const json = JSON.stringify(users, null, 2) + '\n';
  if (githubMode()) {
    await ghCommitFiles([{ path: FILE, content: json }], message, author);
    return;
  }
  const tmp = localPath() + '.tmp';
  await fs.writeFile(tmp, json, 'utf8');
  await fs.rename(tmp, localPath());
}

export const isRootEmail = (email: string): boolean =>
  !!process.env.ADMIN_EMAIL &&
  email.trim().toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
