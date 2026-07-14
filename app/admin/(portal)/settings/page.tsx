'use client';

/* CMS — Site settings: contact details, office hours, and social
   profiles shown in the footer, contact page, and property pages. */

import { useEffect, useMemo, useState } from 'react';
import { getContent, putContent } from '@/components/admin/api';
import { IconSpinner } from '@/components/admin/icons';
import { Field, PageHead, useToast } from '@/components/admin/ui';

interface Settings {
  contactEmail: string;
  contactPhone: string;
  officeLocation: string;
  officeHoursWeekdays: string;
  officeHoursWeekend: string;
  social: {
    facebook: string;
    instagram: string;
    linkedin: string;
  };
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function SettingsPage() {
  const toast = useToast();
  const [snapshot, setSnapshot] = useState<Settings | null>(null);
  const [value, setValue] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNext, setPwNext] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getContent<Settings>('settings')
      .then((s) => {
        if (cancelled) return;
        setSnapshot(s);
        setValue(s);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load settings.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = useMemo(
    () => !!value && !!snapshot && JSON.stringify(value) !== JSON.stringify(snapshot),
    [value, snapshot]
  );

  const emailInvalid = !!value && !EMAIL_RE.test(value.contactEmail);

  const set = (patch: Partial<Settings>) =>
    setValue((v) => (v ? { ...v, ...patch } : v));

  const setSocial = (patch: Partial<Settings['social']>) =>
    setValue((v) => (v ? { ...v, social: { ...v.social, ...patch } } : v));

  const save = async () => {
    if (!value || saving || emailInvalid) return;
    setSaving(true);
    try {
      await putContent('settings', value);
      setSnapshot(value);
      toast('success', 'Settings saved. Changes go live on the next deploy.');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const pwTooShort = pwNext.length > 0 && pwNext.length < 8;
  const pwMismatch = pwConfirm.length > 0 && pwConfirm !== pwNext;
  const canChangePassword =
    !pwBusy && pwCurrent.length > 0 && pwNext.length >= 8 && pwConfirm === pwNext;

  const changePassword = async () => {
    if (!canChangePassword) return;
    setPwBusy(true);
    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current: pwCurrent, next: pwNext }),
      });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error ?? 'Could not change the password.');
      }
      setPwCurrent('');
      setPwNext('');
      setPwConfirm('');
      toast('success', 'Password changed.');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Could not change the password.');
    } finally {
      setPwBusy(false);
    }
  };

  const head = (
    <PageHead
      eyebrow="Site-wide"
      title="Site settings"
      lede="These details appear in the footer, the contact page, and on property pages."
    />
  );

  if (error) {
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

  if (!value) {
    return (
      <>
        {head}
        <p className="adm-muted">Loading…</p>
      </>
    );
  }

  return (
    <>
      {head}

      <div className="adm-card adm-card-pad">
        <div className="adm-form-grid">
          <Field label="Contact email" required>
            <input
              className="adm-input"
              type="email"
              value={value.contactEmail}
              onChange={(e) => set({ contactEmail: e.target.value })}
              aria-invalid={emailInvalid || undefined}
            />
            {emailInvalid && (
              <span className="adm-error-text">
                Enter a valid email address, e.g. name@example.com.
              </span>
            )}
          </Field>
          <Field label="Contact phone">
            <input
              className="adm-input"
              type="tel"
              value={value.contactPhone}
              onChange={(e) => set({ contactPhone: e.target.value })}
            />
          </Field>
          <Field label="Office location">
            <input
              className="adm-input"
              type="text"
              value={value.officeLocation}
              onChange={(e) => set({ officeLocation: e.target.value })}
            />
          </Field>
          <Field label="Office hours (weekdays)">
            <input
              className="adm-input"
              type="text"
              value={value.officeHoursWeekdays}
              onChange={(e) => set({ officeHoursWeekdays: e.target.value })}
            />
          </Field>
          <Field label="Office hours (weekend)">
            <input
              className="adm-input"
              type="text"
              value={value.officeHoursWeekend}
              onChange={(e) => set({ officeHoursWeekend: e.target.value })}
            />
          </Field>

          <div className="span-2" style={{ marginTop: 8 }}>
            <span className="adm-label">Social profiles</span>
          </div>

          <Field label="Facebook URL">
            <input
              className="adm-input"
              type="url"
              value={value.social.facebook}
              onChange={(e) => setSocial({ facebook: e.target.value })}
            />
          </Field>
          <Field label="Instagram URL">
            <input
              className="adm-input"
              type="url"
              value={value.social.instagram}
              onChange={(e) => setSocial({ instagram: e.target.value })}
            />
          </Field>
          <Field label="LinkedIn URL">
            <input
              className="adm-input"
              type="url"
              value={value.social.linkedin}
              onChange={(e) => setSocial({ linkedin: e.target.value })}
            />
          </Field>
        </div>
      </div>

      <div className="adm-card" style={{ marginTop: 22 }}>
        <div className="adm-card-head">
          <h2 className="adm-card-title">Account</h2>
        </div>
        <div className="adm-card-pad">
          <p className="adm-help" style={{ margin: '0 0 16px' }}>
            Changes the CMS sign-in password. It takes effect immediately here; on a
            deployed server it applies after the next restart.
          </p>
          <div className="adm-form-grid">
            <Field label="Current password">
              <input
                className="adm-input"
                type="password"
                autoComplete="off"
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
              />
            </Field>
            <Field label="New password" help="At least 8 characters.">
              <input
                className="adm-input"
                type="password"
                autoComplete="off"
                value={pwNext}
                aria-invalid={pwTooShort || undefined}
                onChange={(e) => setPwNext(e.target.value)}
              />
              {pwTooShort && (
                <span className="adm-error-text">
                  The new password must be at least 8 characters.
                </span>
              )}
            </Field>
            <Field label="Confirm new password">
              <input
                className="adm-input"
                type="password"
                autoComplete="off"
                value={pwConfirm}
                aria-invalid={pwMismatch || undefined}
                onChange={(e) => setPwConfirm(e.target.value)}
              />
              {pwMismatch && (
                <span className="adm-error-text">Passwords do not match.</span>
              )}
            </Field>
          </div>
          <div className="adm-row" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
            <button
              type="button"
              className="adm-btn"
              onClick={() => void changePassword()}
              disabled={!canChangePassword}
            >
              {pwBusy && <IconSpinner />}
              {pwBusy ? 'Changing…' : 'Change password'}
            </button>
          </div>
        </div>
      </div>

      {dirty && (
        <div className="adm-savebar">
          <span>You have unsaved changes</span>
          <div className="adm-row" style={{ flexWrap: 'nowrap' }}>
            <button
              className="adm-btn ghost"
              style={{
                borderColor: 'rgba(247,243,236,0.4)',
                color: 'var(--adm-ivory)',
                background: 'transparent',
              }}
              onClick={() => setValue(snapshot)}
              disabled={saving}
            >
              Discard
            </button>
            <button
              className="adm-btn gold"
              onClick={save}
              disabled={saving || emailInvalid}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
