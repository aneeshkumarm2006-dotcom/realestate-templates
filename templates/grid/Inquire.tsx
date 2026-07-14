'use client';
import './grid.css';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight } from '@/components/icons';
import { LIVE_CITIES, RESIDENCES } from '@/lib/data';
import { SETTINGS } from '@/lib/settings';

/* Markets come from content/cities.json; only live markets can be selected. */
const CITY_OPTIONS = LIVE_CITIES.map((c) => ({ value: c.slug, label: c.label }));

/* Bedroom options are derived from the portfolio rather than assumed, so the
   select never offers a layout nobody actually rents. */
const BED_OPTIONS = Array.from(
  new Set(RESIDENCES.flatMap((r) => r.bedroomOptions))
)
  .sort((a, b) => a - b)
  .map((b) => ({ value: String(b), label: b === 0 ? 'Studio' : `${b} Bedroom` }));

/** Today as YYYY-MM-DD, for the move-in date floor. */
function todayKey(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Social URLs are CMS-editable, so treat them as untrusted: only http(s) may
 *  reach an href (blocks javascript:/data: URLs). Returns null when unusable. */
function safeHttpUrl(raw: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw, 'https://example.invalid');
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

interface SocialLink {
  label: string;
  href: string | null;
}

/* Empty strings (and anything that isn't an http(s) URL) are dropped. */
const SOCIAL: { label: string; href: string }[] = (
  [
    { label: 'Facebook', href: safeHttpUrl(SETTINGS.social.facebook) },
    { label: 'Instagram', href: safeHttpUrl(SETTINGS.social.instagram) },
    { label: 'LinkedIn', href: safeHttpUrl(SETTINGS.social.linkedin) },
  ] as SocialLink[]
).filter((s): s is { label: string; href: string } => s.href !== null);

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  city: '',
  beds: '',
  moveIn: '',
  message: '',
};

/** Grid · Contact — two columns: a real, squared, hairline-bordered form on the
 *  left with local submit state (no backend yet — the submission is held in
 *  component state exactly as the editorial form does), and a bordered contact
 *  panel on the right built from SETTINGS. */
export default function Inquire() {
  const [form, setForm] = useState(EMPTY);
  const [sent, setSent] = useState(false);
  const successRef = useRef<HTMLHeadingElement>(null);

  const update = (k: keyof typeof EMPTY, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Move focus into the confirmation so keyboard/AT users aren't left behind.
  useEffect(() => {
    if (sent) successRef.current?.focus();
  }, [sent]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    // UX-level validation only — a real endpoint must re-validate server-side.
    if (!form.name.trim() || !form.email.trim()) return;
    // TODO(api): POST to the inquiries endpoint when one exists. Until then the
    // inquiry is acknowledged locally — nothing is transmitted or persisted.
    setSent(true);
  };

  const tel = SETTINGS.contactPhone.replace(/[^+\d]/g, '');

  return (
    <main className="page-enter">
      <header className="g-pagehead">
        <div className="g-container">
          <nav className="g-crumb" aria-label="Breadcrumb" style={{ marginBottom: 14 }}>
            <Link href="/">Home</Link>
            <span className="sep" aria-hidden="true">/</span>
            <span className="cur" aria-current="page">Contact</span>
          </nav>
          <span className="g-label">Contact</span>
          <h1 className="g-page-title">Tell us what you&apos;re looking for.</h1>
          <p className="g-page-sub">
            Send the details and a member of the team responds within one business day.
          </p>
        </div>
      </header>

      <section className="g-section">
        <div className="g-container">
          <div className="g-form-layout">
            {/* LEFT — inquiry form */}
            <div className="g-formcard">
              {!sent ? (
                <form onSubmit={submit} noValidate={false}>
                  <div className="g-formcard-head">
                    <span className="g-label">Send an inquiry</span>
                    <span className="g-form-req">* required</span>
                  </div>

                  <div className="g-form">
                    <div className="g-field">
                      <label className="g-label" htmlFor="g-in-name">
                        Full name <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="g-in-name"
                        className="g-input"
                        name="name"
                        autoComplete="name"
                        required
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                      />
                    </div>

                    <div className="g-field">
                      <label className="g-label" htmlFor="g-in-email">
                        Email <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="g-in-email"
                        className="g-input"
                        type="email"
                        name="email"
                        autoComplete="email"
                        required
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                      />
                    </div>

                    <div className="g-field">
                      <label className="g-label" htmlFor="g-in-phone">Phone</label>
                      <input
                        id="g-in-phone"
                        className="g-input"
                        type="tel"
                        name="phone"
                        autoComplete="tel"
                        placeholder="Optional"
                        value={form.phone}
                        onChange={(e) => update('phone', e.target.value)}
                      />
                    </div>

                    {CITY_OPTIONS.length > 0 && (
                      <div className="g-field">
                        <label className="g-label" htmlFor="g-in-city">City</label>
                        <select
                          id="g-in-city"
                          className="g-select"
                          name="city"
                          value={form.city}
                          onChange={(e) => update('city', e.target.value)}
                        >
                          <option value="">Any city</option>
                          {CITY_OPTIONS.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {BED_OPTIONS.length > 0 && (
                      <div className="g-field">
                        <label className="g-label" htmlFor="g-in-beds">Bedrooms</label>
                        <select
                          id="g-in-beds"
                          className="g-select"
                          name="bedrooms"
                          value={form.beds}
                          onChange={(e) => update('beds', e.target.value)}
                        >
                          <option value="">Any layout</option>
                          {BED_OPTIONS.map((b) => (
                            <option key={b.value} value={b.value}>{b.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="g-field">
                      <label className="g-label" htmlFor="g-in-movein">Move-in date</label>
                      <input
                        id="g-in-movein"
                        className="g-input"
                        type="date"
                        name="moveIn"
                        min={todayKey()}
                        value={form.moveIn}
                        onChange={(e) => update('moveIn', e.target.value)}
                      />
                    </div>

                    <div className="g-field full">
                      <label className="g-label" htmlFor="g-in-message">Message</label>
                      <textarea
                        id="g-in-message"
                        className="g-textarea"
                        name="message"
                        rows={5}
                        placeholder="Neighbourhood, budget, timing — anything that helps."
                        value={form.message}
                        onChange={(e) => update('message', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="g-form-actions">
                    <p className="g-form-note">
                      We use these details only to answer your inquiry.
                    </p>
                    <button type="submit" className="btn btn-primary btn-sm">
                      Send inquiry <ArrowRight size={14} />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="g-success">
                  <span className="g-success-mark g-num" aria-hidden="true">01</span>
                  <h2 ref={successRef} tabIndex={-1}>Inquiry received.</h2>
                  <p>
                    Thank you, {form.name.trim()}. A member of the team will respond to{' '}
                    {form.email.trim()} within one business day.
                  </p>
                  <div className="g-success-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setForm(EMPTY);
                        setSent(false);
                      }}
                    >
                      Send another
                    </button>
                    <Link href="/residences" className="btn btn-primary btn-sm">
                      Browse residences <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT — contact panel */}
            <aside className="g-contact" aria-label="Contact details">
              <div className="g-contact-head">
                <span className="g-label">Direct</span>
              </div>

              <div className="g-contact-row">
                <span className="g-label">Email</span>
                <a className="g-contact-val" href={`mailto:${SETTINGS.contactEmail}`}>
                  {SETTINGS.contactEmail}
                </a>
              </div>

              <div className="g-contact-row">
                <span className="g-label">Phone</span>
                <a className="g-contact-val g-num" href={`tel:${tel}`}>
                  {SETTINGS.contactPhone}
                </a>
              </div>

              {SETTINGS.officeLocation && (
                <div className="g-contact-row">
                  <span className="g-label">Office</span>
                  <span className="g-contact-val">{SETTINGS.officeLocation}</span>
                </div>
              )}

              <div className="g-contact-row">
                <span className="g-label">Hours</span>
                <span className="g-contact-val">{SETTINGS.officeHoursWeekdays}</span>
                <div className="g-contact-sub">{SETTINGS.officeHoursWeekend}</div>
              </div>

              {SOCIAL.length > 0 && (
                <div className="g-contact-row">
                  <span className="g-label">Follow</span>
                  <div className="g-social">
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
          </div>
        </div>
      </section>
    </main>
  );
}
