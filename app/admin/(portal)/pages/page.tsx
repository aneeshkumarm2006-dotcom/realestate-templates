'use client';

/* CMS — Pages: the site-copy editor for the four marketing pages
   (Homepage, About, Why Us, Careers). Edits content/pages.json as ONE
   document: a single draft + snapshot spans all four tabs, so switching
   tabs never loses work and one Save publishes everything.

   The forms are driven by a section config (SECTION_TABS below) so each
   field carries a human label instead of its camelCase key. Array lengths
   are structural — the public layouts are designed for exactly N items —
   so lists render fixed, numbered sub-blocks with no add/remove. */

import { useEffect, useMemo, useState } from 'react';
import { getContent, putContent } from '@/components/admin/api';
import { IconSpinner } from '@/components/admin/icons';
import { Field, PageHead, useToast } from '@/components/admin/ui';
import type { PagesContent } from '@/lib/pages';

/* ============================================================
   Draft helpers (path-based read/write on the pages document)
   ============================================================ */

type Path = ReadonlyArray<string | number>;

function getAt(obj: unknown, path: Path): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string | number, unknown>)[key];
  }
  return cur;
}

function setAt<T>(obj: T, path: Path, value: string): T {
  const head = path[0];
  if (head === undefined) return value as unknown as T;
  const rest = path.slice(1);
  if (Array.isArray(obj)) {
    const copy = [...(obj as unknown[])];
    copy[head as number] = setAt(copy[head as number], rest, value);
    return copy as unknown as T;
  }
  const rec = { ...(obj as Record<string | number, unknown>) };
  rec[head] = setAt(rec[head], rest, value);
  return rec as T;
}

/** Counts strings anywhere in the document that are empty after trimming. */
function countEmpty(v: unknown): number {
  if (typeof v === 'string') return v.trim() === '' ? 1 : 0;
  if (Array.isArray(v)) return v.reduce((n: number, x) => n + countEmpty(x), 0);
  if (v !== null && typeof v === 'object') {
    return Object.values(v).reduce((n: number, x) => n + countEmpty(x), 0);
  }
  return 0;
}

/* ============================================================
   Section config — human labels, no raw keys shown to the client
   ============================================================ */

type Kind = 'input' | 'textarea' | 'textareaWide';

interface FieldDef {
  key: string;
  label: string;
  kind: Kind;
  help?: string;
}

interface ListDef {
  key: string;
  itemLabel: string;
  /** Fields per item; omit when the items are plain strings. */
  fields?: FieldDef[];
  /** Control used for plain-string items (default 'input'). */
  stringKind?: Kind;
}

interface SectionDef {
  title: string;
  path: Path;
  fields?: FieldDef[];
  list?: ListDef;
  /** Fields rendered below the list (matches the on-page order). */
  fieldsAfter?: FieldDef[];
}

interface TabDef {
  id: 'home' | 'about' | 'whyUs' | 'careers';
  label: string;
  sections: SectionDef[];
}

const EYEBROW: FieldDef = {
  key: 'eyebrow',
  label: 'Eyebrow (small label above the title)',
  kind: 'input',
};
const TITLE: FieldDef = { key: 'title', label: 'Title', kind: 'input' };

const SECTION_TABS: TabDef[] = [
  {
    id: 'home',
    label: 'Homepage',
    sections: [
      {
        title: 'Hero',
        path: ['home', 'hero'],
        fields: [
          EYEBROW,
          TITLE,
          { key: 'subtitle', label: 'Subtitle', kind: 'textareaWide' },
          { key: 'searchButton', label: 'Search button label', kind: 'input' },
          {
            key: 'disclaimer',
            label: 'Pricing disclaimer (fine print under the search button)',
            kind: 'textarea',
          },
        ],
      },
      {
        title: 'Our cities',
        path: ['home', 'cities'],
        fields: [
          EYEBROW,
          TITLE,
          { key: 'blurb', label: 'Blurb', kind: 'textareaWide' },
          { key: 'comingSoonBadge', label: 'Coming-soon badge', kind: 'input' },
          { key: 'comingSoonCta', label: 'Coming-soon link label', kind: 'input' },
          { key: 'liveCta', label: 'Live-city link label', kind: 'input' },
        ],
      },
      {
        title: 'Featured residences',
        path: ['home', 'featured'],
        fields: [
          EYEBROW,
          TITLE,
          { key: 'viewAllLabel', label: 'View-all button label', kind: 'input' },
        ],
      },
      {
        title: 'Benefits (why rent with us)',
        path: ['home', 'benefits'],
        fields: [
          EYEBROW,
          TITLE,
          { key: 'subtitle', label: 'Subtitle', kind: 'textareaWide' },
        ],
        list: {
          key: 'items',
          itemLabel: 'Benefit',
          fields: [
            TITLE,
            { key: 'body', label: 'Body', kind: 'textarea' },
          ],
        },
      },
      {
        title: 'How to rent',
        path: ['home', 'steps'],
        fields: [EYEBROW, TITLE],
        list: { key: 'items', itemLabel: 'Step', stringKind: 'input' },
      },
      {
        title: 'Our story',
        path: ['home', 'story'],
        fields: [
          EYEBROW,
          TITLE,
          { key: 'paragraph', label: 'Paragraph', kind: 'textareaWide' },
        ],
        list: {
          key: 'timeline',
          itemLabel: 'Timeline entry',
          fields: [
            { key: 'year', label: 'Year', kind: 'input' },
            { key: 'label', label: 'Label', kind: 'input' },
          ],
        },
        fieldsAfter: [{ key: 'ctaLabel', label: 'Button label', kind: 'input' }],
      },
      {
        title: 'Call to action',
        path: ['home', 'cta'],
        fields: [
          EYEBROW,
          TITLE,
          { key: 'body', label: 'Body', kind: 'textareaWide' },
          { key: 'primaryLabel', label: 'Primary button label', kind: 'input' },
          { key: 'secondaryLabel', label: 'Secondary button label', kind: 'input' },
        ],
      },
    ],
  },
  {
    id: 'about',
    label: 'About',
    sections: [
      {
        title: 'Hero',
        path: ['about', 'hero'],
        fields: [
          EYEBROW,
          {
            key: 'titleItalic',
            label: 'Title — italic part',
            kind: 'input',
            help: 'Rendered in italics before the rest of the title.',
          },
          { key: 'titleRest', label: 'Title — remaining part', kind: 'input' },
          { key: 'subtitle', label: 'Subtitle', kind: 'textareaWide' },
        ],
      },
      {
        title: 'Our story',
        path: ['about', 'story'],
        fields: [
          EYEBROW,
          { key: 'lead', label: 'Lead paragraph', kind: 'textareaWide' },
        ],
        list: {
          key: 'cards',
          itemLabel: 'Card',
          fields: [
            { key: 'numeral', label: 'Numeral (I, II, III…)', kind: 'input' },
            { key: 'eyebrow', label: 'Eyebrow', kind: 'input' },
            { key: 'quote', label: 'Quote', kind: 'textareaWide' },
            { key: 'body', label: 'Body', kind: 'textareaWide' },
          ],
        },
        fieldsAfter: [
          { key: 'close', label: 'Closing paragraph', kind: 'textareaWide' },
        ],
      },
      {
        title: 'Standards',
        path: ['about', 'standards'],
        fields: [EYEBROW, TITLE],
        list: { key: 'items', itemLabel: 'Standard', stringKind: 'textarea' },
      },
      {
        title: 'Figures',
        path: ['about', 'figures'],
        fields: [
          EYEBROW,
          TITLE,
          { key: 'blurb', label: 'Blurb', kind: 'textareaWide' },
        ],
        list: {
          key: 'items',
          itemLabel: 'Figure',
          fields: [
            { key: 'value', label: 'Value (the large number)', kind: 'input' },
            { key: 'label', label: 'Label', kind: 'input' },
            { key: 'body', label: 'Body', kind: 'textarea' },
          ],
        },
      },
      {
        title: 'Call to action',
        path: ['about', 'cta'],
        fields: [
          EYEBROW,
          TITLE,
          { key: 'buttonLabel', label: 'Button label', kind: 'input' },
        ],
      },
    ],
  },
  {
    id: 'whyUs',
    label: 'Why Us',
    sections: [
      {
        title: 'Hero',
        path: ['whyUs', 'hero'],
        fields: [EYEBROW, TITLE],
      },
      {
        title: 'Introduction',
        path: ['whyUs', 'intro'],
        fields: [
          { key: 'pullQuote', label: 'Pull quote', kind: 'textareaWide' },
          { key: 'attribution', label: 'Quote attribution', kind: 'input' },
          { key: 'paragraph1', label: 'First paragraph', kind: 'textareaWide' },
          { key: 'paragraph2', label: 'Second paragraph', kind: 'textareaWide' },
        ],
      },
      {
        title: 'Pillars',
        path: ['whyUs'],
        list: {
          key: 'pillars',
          itemLabel: 'Pillar',
          fields: [
            { key: 'eyebrow', label: 'Eyebrow (numeral and theme)', kind: 'input' },
            TITLE,
            { key: 'body', label: 'Body', kind: 'textareaWide' },
          ],
        },
      },
      {
        title: 'Statistics',
        path: ['whyUs'],
        list: {
          key: 'stats',
          itemLabel: 'Stat',
          fields: [
            { key: 'value', label: 'Value (the large number)', kind: 'input' },
            { key: 'label', label: 'Label', kind: 'input' },
          ],
        },
      },
      {
        title: 'Call to action',
        path: ['whyUs', 'cta'],
        fields: [
          TITLE,
          { key: 'buttonLabel', label: 'Button label', kind: 'input' },
        ],
      },
    ],
  },
  {
    id: 'careers',
    label: 'Careers',
    sections: [
      {
        title: 'Hero',
        path: ['careers', 'hero'],
        fields: [
          EYEBROW,
          TITLE,
          { key: 'subtitle', label: 'Subtitle', kind: 'textareaWide' },
        ],
      },
      {
        title: 'Openings',
        path: ['careers', 'openings'],
        fields: [
          EYEBROW,
          TITLE,
          {
            key: 'noOpeningsMessage',
            label: 'No-openings message (also shown in the top navigation)',
            kind: 'textarea',
          },
          {
            key: 'contactIntro',
            label: 'Contact line (shown before the email address)',
            kind: 'textarea',
          },
          { key: 'buttonLabel', label: 'Button label', kind: 'input' },
        ],
      },
      {
        title: 'Key benefits',
        path: ['careers', 'benefits'],
        fields: [EYEBROW, TITLE],
        list: { key: 'items', itemLabel: 'Benefit', stringKind: 'input' },
      },
    ],
  },
];

/* ============================================================
   Field + section renderers
   ============================================================ */

type UpdateFn = (path: Path, value: string) => void;

function CopyField({
  def,
  path,
  draft,
  onChange,
}: {
  def: FieldDef;
  path: Path;
  draft: PagesContent;
  onChange: UpdateFn;
}) {
  const full = [...path, def.key];
  const raw = getAt(draft, full);
  const value = typeof raw === 'string' ? raw : '';
  const empty = value.trim() === '';
  const wide = def.kind === 'textareaWide';
  return (
    <Field label={def.label} help={def.help} span2={wide} required>
      {def.kind === 'input' ? (
        <input
          className="adm-input"
          type="text"
          value={value}
          aria-invalid={empty || undefined}
          onChange={(e) => onChange(full, e.target.value)}
        />
      ) : (
        <textarea
          className="adm-textarea"
          value={value}
          aria-invalid={empty || undefined}
          onChange={(e) => onChange(full, e.target.value)}
        />
      )}
      {empty && <span className="adm-error-text">This field cannot be empty.</span>}
    </Field>
  );
}

function StringItemField({
  label,
  kind,
  path,
  draft,
  onChange,
}: {
  label: string;
  kind: Kind;
  path: Path;
  draft: PagesContent;
  onChange: UpdateFn;
}) {
  const raw = getAt(draft, path);
  const value = typeof raw === 'string' ? raw : '';
  const empty = value.trim() === '';
  return (
    <Field label={label} span2={kind === 'textareaWide'} required>
      {kind === 'input' ? (
        <input
          className="adm-input"
          type="text"
          value={value}
          aria-invalid={empty || undefined}
          onChange={(e) => onChange(path, e.target.value)}
        />
      ) : (
        <textarea
          className="adm-textarea"
          value={value}
          aria-invalid={empty || undefined}
          onChange={(e) => onChange(path, e.target.value)}
        />
      )}
      {empty && <span className="adm-error-text">This field cannot be empty.</span>}
    </Field>
  );
}

function SectionCard({
  section,
  draft,
  onChange,
}: {
  section: SectionDef;
  draft: PagesContent;
  onChange: UpdateFn;
}) {
  const list = section.list;
  const listFields = list?.fields;
  const listPath = list ? [...section.path, list.key] : null;
  const rawItems = listPath ? getAt(draft, listPath) : null;
  const items: unknown[] = Array.isArray(rawItems) ? rawItems : [];

  return (
    <div className="adm-card" style={{ marginBottom: 22 }}>
      <div className="adm-card-head">
        <h2 className="adm-card-title">{section.title}</h2>
      </div>
      <div className="adm-card-pad">
        {section.fields && section.fields.length > 0 && (
          <div className="adm-form-grid">
            {section.fields.map((f) => (
              <CopyField
                key={f.key}
                def={f}
                path={section.path}
                draft={draft}
                onChange={onChange}
              />
            ))}
          </div>
        )}

        {list && listPath && (
          <>
            <p
              className="adm-help"
              style={{ margin: section.fields ? '18px 0 0' : '0' }}
            >
              The design uses exactly {items.length} items — edit the text, the
              layout stays fixed.
            </p>
            {listFields ? (
              items.map((_, i) => (
                <div key={i} style={{ marginTop: 16 }}>
                  <span
                    className="adm-label"
                    style={{ display: 'block', marginBottom: 10 }}
                  >
                    {list.itemLabel} {i + 1}
                  </span>
                  <div className="adm-form-grid">
                    {listFields.map((f) => (
                      <CopyField
                        key={f.key}
                        def={f}
                        path={[...listPath, i]}
                        draft={draft}
                        onChange={onChange}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="adm-form-grid" style={{ marginTop: 16 }}>
                {items.map((_, i) => (
                  <StringItemField
                    key={i}
                    label={`${list.itemLabel} ${i + 1}`}
                    kind={list.stringKind ?? 'input'}
                    path={[...listPath, i]}
                    draft={draft}
                    onChange={onChange}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {section.fieldsAfter && section.fieldsAfter.length > 0 && (
          <div className="adm-form-grid" style={{ marginTop: 16 }}>
            {section.fieldsAfter.map((f) => (
              <CopyField
                key={f.key}
                def={f}
                path={section.path}
                draft={draft}
                onChange={onChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Page
   ============================================================ */

export default function PagesPage() {
  const toast = useToast();
  const [snapshot, setSnapshot] = useState<PagesContent | null>(null);
  const [value, setValue] = useState<PagesContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabDef['id']>('home');

  useEffect(() => {
    let cancelled = false;
    getContent<PagesContent>('pages')
      .then((p) => {
        if (cancelled) return;
        setSnapshot(p);
        setValue(p);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load page copy.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = useMemo(
    () => !!value && !!snapshot && JSON.stringify(value) !== JSON.stringify(snapshot),
    [value, snapshot]
  );

  const emptyCount = useMemo(() => (value ? countEmpty(value) : 0), [value]);

  const update: UpdateFn = (path, v) =>
    setValue((cur) => (cur ? setAt(cur, path, v) : cur));

  const save = async () => {
    if (!value || saving || emptyCount > 0) return;
    setSaving(true);
    try {
      await putContent('pages', value);
      setSnapshot(value);
      toast('success', 'Page copy saved. Live in about 2 minutes on the deployed site.');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to save page copy.');
    } finally {
      setSaving(false);
    }
  };

  const head = (
    <PageHead
      eyebrow="Site copy"
      title="Pages"
      lede="Edit the wording of the Homepage, About, Why Us and Careers pages; layout and photos stay as designed."
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

  const active = SECTION_TABS.find((t) => t.id === tab) ?? SECTION_TABS[0];

  return (
    <>
      {head}

      <div className="adm-tabs" role="tablist" aria-label="Pages">
        {SECTION_TABS.map((t) => (
          <button
            key={t.id}
            id={`pages-tab-${t.id}`}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`pages-panel-${t.id}`}
            className={`adm-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`pages-panel-${active.id}`}
        aria-labelledby={`pages-tab-${active.id}`}
      >
        {active.sections.map((s) => (
          <SectionCard key={s.title} section={s} draft={value} onChange={update} />
        ))}
      </div>

      {dirty && (
        <div className="adm-savebar">
          <span>
            You have unsaved changes
            {emptyCount > 0 && (
              <span
                className="adm-error-text"
                style={{ display: 'block', marginTop: 4, color: '#e8a79b' }}
              >
                {emptyCount === 1
                  ? '1 field is empty'
                  : `${emptyCount} fields are empty`}
                {' — every field needs text before you can save.'}
              </span>
            )}
          </span>
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
              onClick={() => void save()}
              disabled={saving || emptyCount > 0}
            >
              {saving && <IconSpinner />}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
