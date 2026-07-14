'use client';

/* CMS — Edit history: a timeline of every content save, with the
   ability to restore the whole site's content to any earlier point. */

import { Fragment, useCallback, useEffect, useState } from 'react';
import { IconSpinner, IconUndo } from '@/components/admin/icons';
import { ConfirmDialog, PageHead, useToast } from '@/components/admin/ui';
import { useMe } from '@/components/admin/useMe';

interface HistoryEntry {
  sha: string;
  message: string;
  author: string;
  date: string;
  cms: boolean;
}

/* ---------- Helpers ---------- */

function parseEntries(data: unknown): HistoryEntry[] {
  if (!data || typeof data !== 'object') return [];
  const raw = (data as { entries?: unknown }).entries;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is HistoryEntry =>
      !!e &&
      typeof e === 'object' &&
      typeof (e as HistoryEntry).sha === 'string' &&
      typeof (e as HistoryEntry).message === 'string' &&
      typeof (e as HistoryEntry).author === 'string' &&
      typeof (e as HistoryEntry).date === 'string' &&
      typeof (e as HistoryEntry).cms === 'boolean'
  );
}

/* "cms: update photos for hamlet" → "Update photos for hamlet" */
function humanize(message: string): string {
  const stripped = message.replace(/^cms:\s*/i, '').trim();
  if (!stripped) return message;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/* "Today", "Yesterday", or "July 8, 2026" — for the day group headings. */
function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown date';
  const now = new Date();
  if (sameDay(d, now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/* "2 hours ago", "yesterday", "Jul 8" — for individual rows. */
function relativeDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = new Date();
  if (sameDay(d, now)) {
    const mins = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 60000));
    if (mins < 1) return 'just now';
    if (mins < 60) return mins === 1 ? '1 minute ago' : `${mins} minutes ago`;
    const hours = Math.floor(mins / 60);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'yesterday';
  const opts: Intl.DateTimeFormatOptions =
    d.getFullYear() === now.getFullYear()
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' };
  return d.toLocaleDateString('en-US', opts);
}

/* Exact date-time, for title attributes and the confirm dialog. */
function exactDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

/* ---------- Page ---------- */

export default function HistoryPage() {
  const me = useMe();
  const toast = useToast();
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmEntry, setConfirmEntry] = useState<HistoryEntry | null>(null);
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/history', { cache: 'no-store' });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string'
            ? (data as { error: string }).error
            : 'Failed to load the edit history.';
        throw new Error(msg);
      }
      setEntries(parseEntries(data));
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load the edit history.';
      setError(msg);
      toast('error', msg);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const restore = async () => {
    if (!confirmEntry) return;
    setRestoring(true);
    try {
      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha: confirmEntry.sha }),
      });
      const data: unknown = await res.json().catch(() => null);
      const ok =
        res.ok &&
        !!data &&
        typeof data === 'object' &&
        (data as { ok?: unknown }).ok === true;
      if (!ok) {
        const msg =
          data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string'
            ? (data as { error: string }).error
            : 'The restore failed. Please try again.';
        throw new Error(msg);
      }
      setConfirmEntry(null);
      toast('success', 'Content restored — the website updates in about 2 minutes.');
      await load();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'The restore failed. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const head = (
    <>
      <PageHead
        eyebrow="Timeline"
        title="Edit history"
        lede="Every change to the website is recorded here. Restoring rewinds the content to that moment — as a new entry, so you can undo a restore too."
      />
      {me?.role === 'editor' && (
        <p className="adm-muted" style={{ margin: '-16px 0 24px', fontSize: 12.5 }}>
          Only admins can restore.
        </p>
      )}
    </>
  );

  if (error && !entries) {
    return (
      <>
        {head}
        <div className="adm-card">
          <div className="adm-empty">
            <div className="t">Something went wrong</div>
            <p>{error}</p>
          </div>
        </div>
      </>
    );
  }

  if (!entries) {
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

  return (
    <>
      {head}

      <div className="adm-card">
        {entries.length === 0 ? (
          <div className="adm-empty">
            <div className="t">No history yet</div>
            <p>Changes you make in the Content Studio will show up here.</p>
          </div>
        ) : (
          entries.map((entry, i) => {
            const prev = i > 0 ? entries[i - 1] : null;
            const newDay = !prev || dayKey(entry.date) !== dayKey(prev.date);
            return (
              <Fragment key={entry.sha}>
                {newDay && (
                  <div
                    className="adm-label"
                    style={{ padding: i === 0 ? '18px 24px 4px' : '24px 24px 4px' }}
                  >
                    {dayLabel(entry.date)}
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '13px 24px',
                    borderBottom:
                      i === entries.length - 1 ? undefined : '1px solid var(--adm-hairline)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      flex: 'none',
                      background: entry.cms ? 'var(--adm-gold)' : 'var(--adm-hairline-strong)',
                    }}
                  />
                  <div className="adm-grow" style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500 }}>{humanize(entry.message)}</div>
                    <div className="adm-row" style={{ gap: 10, marginTop: 2 }}>
                      <span
                        className="adm-muted"
                        style={{ fontSize: 12.5 }}
                        title={exactDate(entry.date)}
                      >
                        {relativeDate(entry.date)}
                      </span>
                      <span
                        className="adm-muted"
                        style={{
                          fontSize: 12,
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        }}
                      >
                        {entry.sha.slice(0, 7)}
                      </span>
                    </div>
                  </div>
                  {entry.cms ? (
                    <span className="adm-badge gold">Content Studio</span>
                  ) : (
                    <span className="adm-badge">{entry.author}</span>
                  )}
                  {i === 0 ? (
                    <span className="adm-badge success">Current</span>
                  ) : me?.role === 'admin' ? (
                    <button
                      className="adm-btn sm ghost"
                      onClick={() => setConfirmEntry(entry)}
                      aria-label={`Restore content to ${exactDate(entry.date)}`}
                    >
                      <IconUndo />
                      Restore
                    </button>
                  ) : null}
                </div>
              </Fragment>
            );
          })
        )}
      </div>

      <ConfirmDialog
        open={confirmEntry !== null}
        title="Restore the website content to this point?"
        body={
          confirmEntry ? (
            <>
              All properties, photo selections, units, and site text will go back to how they
              were at <strong>{exactDate(confirmEntry.date)}</strong>. A new history entry is
              created — so you can undo this restore too — and the change goes live on the
              deployed site in about 2 minutes. Photos stay saved.
            </>
          ) : undefined
        }
        confirmLabel="Restore"
        busy={restoring}
        onConfirm={() => void restore()}
        onCancel={() => {
          if (!restoring) setConfirmEntry(null);
        }}
      />
    </>
  );
}
