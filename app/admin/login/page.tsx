'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import {
  IconAlert,
  IconEye,
  IconEyeOff,
  IconSpinner,
} from '@/components/admin/icons';

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? 'Sign in failed. Please try again.');
        setBusy(false);
        return;
      }
      const from = params.get('from');
      router.push(from && from.startsWith('/admin') ? from : '/admin');
      router.refresh();
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
      setBusy(false);
    }
  };

  return (
    <div className="adm-login">
      <div className="adm-login-visual" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/admin-login.jpg" alt="" loading="eager" />
        <div className="scrim" />
        <div className="visual-copy">
          <div className="adm-eyebrow">{BRAND.name}</div>
          <p className="visual-line">{BRAND.tagline}</p>
          <div className="visual-foot">
            Content Studio · Properties, photos, availability &amp; site copy
          </div>
        </div>
      </div>

      <div className="adm-login-form-col">
        <div className="adm-login-card">
          <div className="adm-eyebrow">Content Studio</div>
          <h1 className="adm-login-title">Welcome back</h1>
          <p className="adm-login-sub">
            Sign in to manage the {BRAND.name} website.
          </p>

          <form onSubmit={submit} noValidate>
            <div className="adm-login-fields">
              {error && (
                <div className="adm-login-error" role="alert">
                  <IconAlert />
                  <span>{error}</span>
                </div>
              )}

              <div className="adm-field">
                <label className="adm-label" htmlFor="cms-email">
                  Email
                </label>
                <input
                  id="cms-email"
                  className="adm-input"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="adm-field">
                <label className="adm-label" htmlFor="cms-password">
                  Password
                </label>
                <div className="adm-password-wrap">
                  <input
                    id="cms-password"
                    className="adm-input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="adm-password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
              </div>

              <button
                className="adm-btn"
                type="submit"
                disabled={busy || !email || !password}
                style={{ width: '100%', marginTop: 6 }}
              >
                {busy ? <IconSpinner /> : null}
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="adm-login-foot">
            Access is limited to the {BRAND.shortName} team. Need help? Contact your
            site administrator.
          </div>
        </div>
      </div>
    </div>
  );
}
