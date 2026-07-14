'use client';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ChevronDown } from '@/components/icons';
import { LIVE_CITIES, RESIDENCES } from '@/lib/data';
import { SETTINGS } from '@/lib/settings';
import { Reveal } from './Reveal';
import './boutique.css';

/* Inquire — a refined contact page.
   Underline-only fields (no boxes), one calm column of them, with the contact
   details kept as a quiet aside. There is no backend: submit is local state
   only, exactly as the editorial page fakes it. Required-field checks here are
   UX, never a security control — a real endpoint must validate server-side. */

/** Bedroom choices are derived from the portfolio rather than hardcoded, so the
 *  select can never offer a size the buildings don't have. */
const BED_OPTIONS: number[] = Array.from(
  new Set(RESIDENCES.flatMap((r) => r.bedroomOptions))
).sort((a, b) => a - b);

const bedLabel = (b: number) =>
  b === 0 ? 'Studio' : `${b} bedroom${b === 1 ? '' : 's'}`;

/** Social URLs come from CMS-managed content — treat them as untrusted. Only
 *  absolute http(s) links are rendered; anything else (empty string, relative
 *  path, `javascript:`) is dropped. */
function safeHttpUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

const SOCIAL: { label: string; href: string }[] = (
  [
    ['Instagram', SETTINGS.social.instagram],
    ['Facebook', SETTINGS.social.facebook],
    ['LinkedIn', SETTINGS.social.linkedin],
  ] as const
).flatMap(([label, raw]) => {
  const href = safeHttpUrl(raw);
  return href ? [{ label, href }] : [];
});

function todayKey(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  city: '',
  bedrooms: '',
  moveIn: '',
  message: '',
};

export default function Inquire() {
  const uid = useId();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const sentRef = useRef<HTMLHeadingElement>(null);

  /* "Today" is resolved on the client only: the server's clock/timezone can sit
     on a different date, and rendering that into `min` would trip a hydration
     mismatch. Until it resolves, the field simply has no lower bound. */
  const [minDate, setMinDate] = useState<string | undefined>(undefined);
  useEffect(() => setMinDate(todayKey()), []);

  const update = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    // UX guard only — the browser has already enforced `required`/`type=email`.
    if (!form.name.trim() || !form.email.trim()) return;
    setSent(true);
    // Move focus to the confirmation so the change is announced, not just seen.
    window.requestAnimationFrame(() => sentRef.current?.focus());
  };

  const reset = () => {
    setForm(EMPTY_FORM);
    setSent(false);
  };

  const telHref = `tel:${SETTINGS.contactPhone.replace(/[^\d+]/g, '')}`;

  return (
    <main className="page-enter">
      <section className="b-page-hero">
        <div className="b-container">
          <p className="b-label gold">Inquire</p>
          <h1 className="b-page-title">
            Begin a <em>conversation.</em>
          </h1>
          <p className="b-page-sub">
            Tell us what you are looking for. A member of our team will respond
            within one business day.
          </p>
        </div>
      </section>

      <section className="b-section" style={{ paddingTop: 'clamp(2.5rem, 5vw, 4.5rem)' }}>
        <div className="b-container">
          <div className="b-contact-layout">
            {/* ---------- Form ---------- */}
            <Reveal>
              {!sent ? (
                <form className="b-form" onSubmit={submit}>
                  <div className="b-form-grid">
                    <div className="b-field-u">
                      <label className="b-label" htmlFor={`${uid}-name`}>
                        Full name
                      </label>
                      <input
                        id={`${uid}-name`}
                        className="b-input"
                        name="name"
                        autoComplete="name"
                        required
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                      />
                    </div>

                    <div className="b-field-u">
                      <label className="b-label" htmlFor={`${uid}-email`}>
                        Email
                      </label>
                      <input
                        id={`${uid}-email`}
                        className="b-input"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                      />
                    </div>

                    <div className="b-field-u">
                      <label className="b-label" htmlFor={`${uid}-phone`}>
                        Telephone
                      </label>
                      <input
                        id={`${uid}-phone`}
                        className="b-input"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="Optional"
                        value={form.phone}
                        onChange={(e) => update('phone', e.target.value)}
                      />
                    </div>

                    <div className="b-field-u">
                      <label className="b-label" htmlFor={`${uid}-city`}>
                        City of interest
                      </label>
                      <span className="b-field-select">
                        <select
                          id={`${uid}-city`}
                          className="b-select-u"
                          name="city"
                          value={form.city}
                          onChange={(e) => update('city', e.target.value)}
                        >
                          <option value="">No preference</option>
                          {LIVE_CITIES.map((c) => (
                            <option key={c.slug} value={c.slug}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="b-chev" />
                      </span>
                    </div>

                    <div className="b-field-u">
                      <label className="b-label" htmlFor={`${uid}-beds`}>
                        Bedrooms
                      </label>
                      <span className="b-field-select">
                        <select
                          id={`${uid}-beds`}
                          className="b-select-u"
                          name="bedrooms"
                          value={form.bedrooms}
                          onChange={(e) => update('bedrooms', e.target.value)}
                        >
                          <option value="">No preference</option>
                          {BED_OPTIONS.map((b) => (
                            <option key={b} value={String(b)}>
                              {bedLabel(b)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="b-chev" />
                      </span>
                    </div>

                    <div className="b-field-u">
                      <label className="b-label" htmlFor={`${uid}-movein`}>
                        Preferred move-in date
                      </label>
                      <input
                        id={`${uid}-movein`}
                        className="b-input"
                        name="moveIn"
                        type="date"
                        min={minDate}
                        value={form.moveIn}
                        onChange={(e) => update('moveIn', e.target.value)}
                      />
                    </div>

                    <div className="b-field-u is-wide">
                      <label className="b-label" htmlFor={`${uid}-message`}>
                        Message
                      </label>
                      <textarea
                        id={`${uid}-message`}
                        className="b-input b-textarea"
                        name="message"
                        rows={4}
                        placeholder="Optional"
                        value={form.message}
                        onChange={(e) => update('message', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="b-form-actions">
                    <button type="submit" className="btn btn-primary">
                      Send inquiry
                    </button>
                    <p className="b-form-note">
                      We reply within one business day.
                    </p>
                  </div>
                </form>
              ) : (
                <div className="b-sent" role="status">
                  <p className="b-label gold">Thank you</p>
                  <h2 className="b-sent-title" ref={sentRef} tabIndex={-1}>
                    Your inquiry is <em>with us.</em>
                  </h2>
                  <p className="b-sent-copy">
                    A member of our team will respond within one business day.
                    If it is urgent, reach us directly at{' '}
                    <a
                      className="b-inline-link"
                      href={`mailto:${SETTINGS.contactEmail}`}
                    >
                      {SETTINGS.contactEmail}
                    </a>
                    .
                  </p>
                  <button type="button" className="b-link" onClick={reset}>
                    Send another inquiry
                  </button>
                </div>
              )}
            </Reveal>

            {/* ---------- Quiet contact aside ---------- */}
            <Reveal delay={120}>
              <aside className="b-contact-aside" aria-label="Contact details">
                <div className="b-contact-item">
                  <p className="b-label">Email</p>
                  <a
                    className="b-contact-val"
                    href={`mailto:${SETTINGS.contactEmail}`}
                  >
                    {SETTINGS.contactEmail}
                  </a>
                </div>

                <div className="b-contact-item">
                  <p className="b-label">Telephone</p>
                  <a className="b-contact-val" href={telHref}>
                    {SETTINGS.contactPhone}
                  </a>
                </div>

                <div className="b-contact-item">
                  <p className="b-label">Office</p>
                  <p className="b-contact-val">{SETTINGS.officeLocation}</p>
                </div>

                <div className="b-contact-item">
                  <p className="b-label">Hours</p>
                  <p className="b-contact-val">{SETTINGS.officeHoursWeekdays}</p>
                  <p className="b-contact-note">{SETTINGS.officeHoursWeekend}</p>
                </div>

                {SOCIAL.length > 0 && (
                  <div className="b-contact-item is-last">
                    <p className="b-label">Follow</p>
                    <div className="b-social">
                      {SOCIAL.map((s) => (
                        <a
                          key={s.label}
                          href={s.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {s.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </aside>
            </Reveal>
          </div>
        </div>
      </section>
    </main>
  );
}
