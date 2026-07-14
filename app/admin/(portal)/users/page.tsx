'use client';

/* CMS — Team management: give teammates their own sign-in, toggle
   roles, deactivate/reactivate, reset passwords, and remove accounts.
   Admin-only — the API enforces it, and this page hides itself from
   Editors too. */

import { Fragment, useCallback, useEffect, useState } from 'react';
import { BRAND } from '@/lib/brand';
import {
  IconEye,
  IconEyeOff,
  IconPlus,
  IconSpinner,
  IconTrash,
  IconX,
} from '@/components/admin/icons';
import { ConfirmDialog, Field, PageHead, useToast } from '@/components/admin/ui';
import { useMe } from '@/components/admin/useMe';
import { Dropdown, type DropdownOption } from '@/components/ui/Dropdown';

interface User {
  email: string;
  name: string;
  role: 'admin' | 'editor';
  createdAt: string;
  active: boolean;
}

interface UsersPayload {
  users: User[];
  rootEmail: string | null;
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;

const ROLE_OPTIONS: DropdownOption[] = [
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Admin' },
];

/* ---------- Helpers ---------- */

/* The API response is untrusted: keep only well-formed user records. */
function parseUsers(data: unknown): UsersPayload {
  const users: User[] = [];
  let rootEmail: string | null = null;
  if (data && typeof data === 'object') {
    const raw = (data as { users?: unknown }).users;
    if (Array.isArray(raw)) {
      for (const u of raw) {
        if (
          !!u &&
          typeof u === 'object' &&
          typeof (u as User).email === 'string' &&
          typeof (u as User).name === 'string' &&
          ((u as User).role === 'admin' || (u as User).role === 'editor') &&
          typeof (u as User).createdAt === 'string' &&
          typeof (u as User).active === 'boolean'
        ) {
          users.push(u as User);
        }
      }
    }
    const root = (data as { rootEmail?: unknown }).rootEmail;
    if (typeof root === 'string' && root !== '') rootEmail = root;
  }
  return { users, rootEmail };
}

function apiError(data: unknown, fallback: string): string {
  return data &&
    typeof data === 'object' &&
    typeof (data as { error?: unknown }).error === 'string'
    ? (data as { error: string }).error
    : fallback;
}

async function usersApi(
  method: 'POST' | 'PUT' | 'DELETE',
  body: Record<string, unknown>
): Promise<void> {
  const res = await fetch('/api/admin/users', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json().catch(() => null);
  const ok =
    res.ok && !!data && typeof data === 'object' && (data as { ok?: unknown }).ok === true;
  if (!ok) throw new Error(apiError(data, 'The request failed. Please try again.'));
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* The brand name, stripped to letters and numbers so it is safe to type.
   Only a readable prefix — the entropy lives entirely in the suffix. */
const PASSWORD_PREFIX = BRAND.shortName.replace(/[^A-Za-z0-9]/g, '') || 'Studio';

/* Readable random password, e.g. Northwind-x8k2m9q4 (no ambiguous 0/O/1/l). */
function generatePassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const values = new Uint32Array(8);
  crypto.getRandomValues(values);
  let suffix = '';
  for (const v of values) suffix += alphabet[v % alphabet.length];
  return `${PASSWORD_PREFIX}-${suffix}`;
}

/* ---------- Password input with show/hide, Generate and Copy ---------- */

function PasswordInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  ariaLabel: string;
}) {
  const toast = useToast();
  const [show, setShow] = useState(false);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    if (value === '') setGenerated(false);
  }, [value]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast('success', 'Password copied — share it securely.');
    } catch {
      toast('error', 'Could not copy. Select the password and copy it manually.');
    }
  };

  return (
    <div className="adm-row" style={{ flexWrap: 'nowrap', gap: 8 }}>
      <div className="adm-password-wrap adm-grow">
        <input
          className="adm-input"
          type={show || generated ? 'text' : 'password'}
          value={value}
          readOnly={generated}
          autoComplete="new-password"
          aria-label={ariaLabel}
          onChange={(e) => onChange(e.target.value)}
          onFocus={generated ? (e) => e.currentTarget.select() : undefined}
        />
        {generated ? (
          <button
            type="button"
            className="adm-password-toggle"
            aria-label="Clear the generated password"
            onClick={() => {
              onChange('');
              setGenerated(false);
            }}
          >
            <IconX />
          </button>
        ) : (
          <button
            type="button"
            className="adm-password-toggle"
            aria-label={show ? 'Hide password' : 'Show password'}
            onClick={() => setShow((s) => !s)}
          >
            {show ? <IconEyeOff /> : <IconEye />}
          </button>
        )}
      </div>
      <button
        type="button"
        className="adm-btn sm ghost"
        onClick={() => {
          onChange(generatePassword());
          setGenerated(true);
        }}
      >
        Generate
      </button>
      {generated && (
        <button type="button" className="adm-btn sm ghost" onClick={() => void copy()}>
          Copy
        </button>
      )}
    </div>
  );
}

/* ---------- Page ---------- */

export default function UsersPage() {
  const me = useMe();
  const toast = useToast();

  const [data, setData] = useState<UsersPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'deactivate' | 'remove'; user: User } | null>(
    null
  );
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState('editor');
  const [addPw, setAddPw] = useState('');
  const [addBusy, setAddBusy] = useState(false);

  const isAdmin = me?.role === 'admin';
  const selfEmail = me?.email;

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) throw new Error(apiError(body, 'Failed to load the team.'));
      setData(parseUsers(body));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load the team.');
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  /* ---------- Mutations (each re-fetches the list afterwards) ---------- */

  const toggleRole = async (u: User) => {
    if (busyEmail) return;
    setBusyEmail(u.email);
    try {
      const role = u.role === 'admin' ? 'editor' : 'admin';
      await usersApi('PUT', { email: u.email, role });
      toast('success', `${u.name} is now an ${role === 'admin' ? 'Admin' : 'Editor'}.`);
      await load();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Could not change the role.');
    } finally {
      setBusyEmail(null);
    }
  };

  const reactivate = async (u: User) => {
    if (busyEmail) return;
    setBusyEmail(u.email);
    try {
      await usersApi('PUT', { email: u.email, active: true });
      toast('success', `${u.name} can sign in again.`);
      await load();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Could not reactivate the user.');
    } finally {
      setBusyEmail(null);
    }
  };

  const runConfirm = async () => {
    if (!confirm || confirmBusy) return;
    setConfirmBusy(true);
    try {
      if (confirm.kind === 'deactivate') {
        await usersApi('PUT', { email: confirm.user.email, active: false });
        toast('success', `${confirm.user.name} deactivated. They can no longer sign in.`);
      } else {
        await usersApi('DELETE', { email: confirm.user.email });
        toast('success', `${confirm.user.name} removed.`);
      }
      setConfirm(null);
      await load();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'The request failed. Please try again.');
    } finally {
      setConfirmBusy(false);
    }
  };

  const submitReset = async () => {
    if (!resetFor || resetPw.length < 8 || resetBusy) return;
    setResetBusy(true);
    try {
      await usersApi('PUT', { email: resetFor, newPassword: resetPw });
      toast('success', 'Password reset — share it with them securely.');
      setResetFor(null);
      setResetPw('');
      await load();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Could not reset the password.');
    } finally {
      setResetBusy(false);
    }
  };

  const addEmailInvalid = addEmail.trim() !== '' && !EMAIL_RE.test(addEmail.trim());
  const addPwTooShort = addPw.length > 0 && addPw.length < 8;
  const addValid =
    addName.trim() !== '' && EMAIL_RE.test(addEmail.trim()) && addPw.length >= 8;

  const submitAdd = async () => {
    if (!addValid || addBusy) return;
    setAddBusy(true);
    try {
      await usersApi('POST', {
        email: addEmail.trim(),
        name: addName.trim(),
        role: addRole,
        password: addPw,
      });
      toast('success', 'User added — share their password securely.');
      setAddName('');
      setAddEmail('');
      setAddRole('editor');
      setAddPw('');
      await load();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Could not add the user.');
    } finally {
      setAddBusy(false);
    }
  };

  /* ---------- Render states ---------- */

  const head = (
    <PageHead
      eyebrow="Team"
      title="Users"
      lede="Give teammates their own sign-in. Admins manage everything; Editors manage listings, photos and page copy, but not settings, users, or history restores."
    />
  );

  if (me === undefined) {
    return (
      <>
        {head}
        <p className="adm-muted">Loading…</p>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        {head}
        <div className="adm-card">
          <div className="adm-empty">
            <div className="t">Admins only</div>
            <p>
              Team management is restricted to Admin accounts. Ask an admin if you need a
              role change or a password reset.
            </p>
          </div>
        </div>
      </>
    );
  }

  if (loadError && !data) {
    return (
      <>
        {head}
        <div className="adm-card">
          <div className="adm-empty">
            <div className="t">Something went wrong</div>
            <p>{loadError}</p>
          </div>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        {head}
        <p className="adm-muted">
          <IconSpinner style={{ verticalAlign: '-0.15em', marginRight: 8 }} />
          Loading…
        </p>
      </>
    );
  }

  const nameCell = (name: string, email: string) => (
    <td>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 16.5, fontWeight: 500 }}>{name}</div>
      <div className="adm-muted" style={{ fontSize: 12.5 }}>
        {email}
      </div>
    </td>
  );

  return (
    <>
      {head}

      <div className="adm-card" style={{ overflowX: 'auto' }}>
        {data.rootEmail === null && data.users.length === 0 ? (
          <div className="adm-empty">
            <div className="t">No users yet</div>
            <p>Add your first teammate below to give them their own sign-in.</p>
          </div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Added</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.rootEmail !== null && (
                <tr>
                  {nameCell('Site owner', data.rootEmail)}
                  <td>
                    <span className="adm-badge ink">Owner</span>
                  </td>
                  <td>
                    <span className="adm-badge success">Active</span>
                  </td>
                  <td className="adm-muted" style={{ whiteSpace: 'nowrap' }}>
                    —
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="adm-muted" style={{ fontSize: 12.5 }}>
                      Recovery account — managed in Vercel
                    </span>
                  </td>
                </tr>
              )}
              {data.users.map((u) => {
                const self = u.email === selfEmail;
                const busy = busyEmail === u.email;
                const resetOpen = resetFor === u.email;
                return (
                  <Fragment key={u.email}>
                    <tr>
                      {nameCell(u.name, u.email)}
                      <td>
                        <span className={`adm-badge${u.role === 'admin' ? ' gold' : ''}`}>
                          {u.role === 'admin' ? 'Admin' : 'Editor'}
                        </span>
                      </td>
                      <td>
                        {u.active ? (
                          <span className="adm-badge success">Active</span>
                        ) : (
                          <span className="adm-badge danger">Deactivated</span>
                        )}
                      </td>
                      <td className="adm-muted" style={{ whiteSpace: 'nowrap' }}>
                        {shortDate(u.createdAt)}
                      </td>
                      <td>
                        <div
                          className="adm-row"
                          style={{ gap: 4, justifyContent: 'flex-end', flexWrap: 'nowrap' }}
                        >
                          {busy && <IconSpinner style={{ color: 'var(--adm-muted)' }} />}
                          <button
                            type="button"
                            className="adm-btn-bare"
                            disabled={self || busy}
                            onClick={() => void toggleRole(u)}
                          >
                            {u.role === 'admin' ? 'Make editor' : 'Make admin'}
                          </button>
                          {u.active ? (
                            <button
                              type="button"
                              className="adm-btn-bare"
                              disabled={self || busy}
                              onClick={() => setConfirm({ kind: 'deactivate', user: u })}
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="adm-btn-bare"
                              disabled={busy}
                              onClick={() => void reactivate(u)}
                            >
                              Reactivate
                            </button>
                          )}
                          <button
                            type="button"
                            className="adm-btn-bare"
                            disabled={busy}
                            aria-expanded={resetOpen}
                            onClick={() => {
                              setResetFor(resetOpen ? null : u.email);
                              setResetPw('');
                            }}
                          >
                            Reset password
                          </button>
                          <button
                            type="button"
                            className="adm-btn-bare"
                            disabled={self || busy}
                            aria-label={`Remove ${u.name}`}
                            onClick={() => setConfirm({ kind: 'remove', user: u })}
                          >
                            <IconTrash />
                          </button>
                        </div>
                        {self && (
                          <span
                            className="adm-help"
                            style={{ display: 'block', textAlign: 'right' }}
                          >
                            You can&rsquo;t lock yourself out
                          </span>
                        )}
                      </td>
                    </tr>
                    {resetOpen && (
                      <tr>
                        <td colSpan={5} style={{ background: 'rgba(239, 232, 220, 0.35)' }}>
                          <div style={{ maxWidth: 560, padding: '6px 0' }}>
                            <span className="adm-label">New password for {u.name}</span>
                            <div style={{ marginTop: 8 }}>
                              <PasswordInput
                                value={resetPw}
                                onChange={setResetPw}
                                ariaLabel={`New password for ${u.name}`}
                              />
                            </div>
                            <span className="adm-help" style={{ display: 'block', marginTop: 8 }}>
                              At least 8 characters. Share it with them securely — it
                              won&rsquo;t be shown again.
                            </span>
                            <div className="adm-row" style={{ marginTop: 12 }}>
                              <button
                                type="button"
                                className="adm-btn sm"
                                disabled={resetPw.length < 8 || resetBusy}
                                onClick={() => void submitReset()}
                              >
                                {resetBusy && <IconSpinner />}
                                {resetBusy ? 'Saving…' : 'Set password'}
                              </button>
                              <button
                                type="button"
                                className="adm-btn sm ghost"
                                disabled={resetBusy}
                                onClick={() => {
                                  setResetFor(null);
                                  setResetPw('');
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ---------- Add user ---------- */}
      <div className="adm-card" style={{ marginTop: 22 }}>
        <div className="adm-card-head">
          <h2 className="adm-card-title">Add user</h2>
        </div>
        <div className="adm-card-pad">
          <div className="adm-form-grid">
            <Field label="Name" required>
              <input
                className="adm-input"
                value={addName}
                autoComplete="off"
                onChange={(e) => setAddName(e.target.value)}
              />
            </Field>
            <Field label="Email" required>
              <input
                className="adm-input"
                type="email"
                value={addEmail}
                autoComplete="off"
                aria-invalid={addEmailInvalid || undefined}
                onChange={(e) => setAddEmail(e.target.value)}
              />
              {addEmailInvalid && (
                <span className="adm-error-text">
                  Enter a valid email address, e.g. name@example.com.
                </span>
              )}
            </Field>
            <Field
              label="Role"
              help={
                addRole === 'admin'
                  ? 'Admins manage everything, including users and settings.'
                  : 'Editors manage listings, photos and page copy.'
              }
            >
              <Dropdown
                variant="admin"
                ariaLabel="Role"
                value={addRole}
                options={ROLE_OPTIONS}
                onChange={setAddRole}
              />
            </Field>
            <Field
              label="Password"
              required
              span2
              help="At least 8 characters. Share it with them securely — it isn't shown again after you leave this page."
            >
              <PasswordInput
                value={addPw}
                onChange={setAddPw}
                ariaLabel="Password for the new user"
              />
              {addPwTooShort && (
                <span className="adm-error-text">
                  The password must be at least 8 characters.
                </span>
              )}
            </Field>
          </div>
          <div className="adm-row" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
            <button
              type="button"
              className="adm-btn gold"
              disabled={!addValid || addBusy}
              onClick={() => void submitAdd()}
            >
              {addBusy ? <IconSpinner /> : <IconPlus />}
              {addBusy ? 'Adding…' : 'Add user'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm?.kind === 'deactivate'}
        title={confirm ? `Deactivate ${confirm.user.name}?` : ''}
        body="They can no longer sign in. Nothing they created is lost, and you can reactivate them at any time."
        confirmLabel="Deactivate"
        busy={confirmBusy}
        onConfirm={() => void runConfirm()}
        onCancel={() => {
          if (!confirmBusy) setConfirm(null);
        }}
      />
      <ConfirmDialog
        open={confirm?.kind === 'remove'}
        title={confirm ? `Remove ${confirm.user.name} permanently?` : ''}
        body="This permanently removes their account and sign-in. Content they published stays on the website."
        confirmLabel="Remove"
        danger
        busy={confirmBusy}
        onConfirm={() => void runConfirm()}
        onCancel={() => {
          if (!confirmBusy) setConfirm(null);
        }}
      />
    </>
  );
}
