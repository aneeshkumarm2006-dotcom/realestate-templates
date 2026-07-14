'use client';

/* CMS — Library: reusable content shared across the whole site.
   Four tabs: Media (site-wide images — placeholders, logos, hero, city
   cards, library uploads), Cities, Property types (tiers + unit types)
   and Tags. Property photos live on each property's Photos page, not
   here. Property types and Tags both edit taxonomies.json, so the page
   holds ONE shared taxonomies draft that either tab's savebar persists.

   Publish-once model: uploads only STAGE files. The page holds ONE shared
   staged pool + media.json draft used by both the Media tab dropzone and
   the Cities tab image uploads; whichever publish/save button runs first
   publishes the pool as a single commit (one deploy). */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import {
  commitStaged,
  getContent,
  putContent,
  uploadLibraryFiles,
  type StagedFile,
} from '@/components/admin/api';
import {
  IconCheck,
  IconPlus,
  IconSearch,
  IconSpinner,
  IconUpload,
  IconX,
} from '@/components/admin/icons';
import { ConfirmDialog, Field, PageHead, useToast } from '@/components/admin/ui';
import { Dropdown, type DropdownOption } from '@/components/ui/Dropdown';

/* ============================================================
   Types (content file shapes)
   ============================================================ */

interface CityCenter {
  lat: number;
  lng: number;
  spreadLat: number;
  spreadLng: number;
}

interface City {
  slug: string;
  label: string;
  province: string;
  image: string;
  blurb: string;
  bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number };
  center?: CityCenter;
  comingSoon?: boolean;
}

type Cities = Record<string, City>;

interface Tier {
  value: string;
  label: string;
  line: string;
}

interface UnitType {
  label: string;
  bedrooms: number;
}

interface Taxonomies {
  tiers: Tier[];
  unitTypes: UnitType[];
  photoTags: string[];
}

type SiteMediaGroup = 'Site image' | 'Brand' | 'Library upload';

interface SiteMediaItem {
  path: string;
  name: string;
  group: SiteMediaGroup;
}

/** media.json entry — the register of library uploads. The upload route no
    longer writes it; this page appends per upload and publishes it. */
interface MediaUpload {
  path: string;
  name: string;
  uploadedAt: string;
}

interface PhotoEntry {
  hero: string | null;
  gallery: string[];
  hidden?: string[];
  tags?: Record<string, string>;
  alt?: Record<string, string>;
}

type Photos = Record<string, PhotoEntry>;

interface Building {
  slug: string;
  name: string;
  city: string;
  address: string;
  archived?: boolean;
}

interface Unit {
  unit: string;
  type: string;
  rent: number;
}

type Units = Record<string, Unit[]>;

type Copy = Record<string, { tier?: string }>;

/* ============================================================
   Helpers
   ============================================================ */

const EMPTY_TAXONOMIES: Taxonomies = { tiers: [], unitTypes: [], photoTags: [] };

function kebab(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function fileTail(path: string): string {
  const tail = path.split('/').pop();
  return tail && tail.length > 0 ? tail : path;
}

/** Only render/store local asset paths — never external or javascript: URLs. */
function isSafeAssetPath(path: unknown): path is string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function propertiesCount(n: number): string {
  return n === 1 ? '1 property' : `${n} properties`;
}

/** Site-wide reusable media: top-level assets (hero, coming-soon,
    city cards, placeholder), brand logos and library uploads —
    merged and grouped server-side. */
async function getSiteMedia(): Promise<SiteMediaItem[]> {
  const res = await fetch('/api/admin/site-media', { cache: 'no-store' });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* keep default */
    }
    if (res.status === 401) message = 'Your session has expired. Please sign in again.';
    throw new Error(message);
  }
  const body = await res.json();
  const raw: unknown[] = Array.isArray(body?.items) ? body.items : [];
  const byPath = new Map<string, SiteMediaItem>();
  for (const it of raw) {
    if (!it || typeof it !== 'object') continue;
    const { path, name, group } = it as {
      path?: unknown;
      name?: unknown;
      group?: unknown;
    };
    if (!isSafeAssetPath(path)) continue;
    const safeGroup: SiteMediaGroup =
      group === 'Brand' || group === 'Library upload' ? group : 'Site image';
    byPath.set(path, {
      path,
      name: typeof name === 'string' && name.length > 0 ? name : fileTail(path),
      group: safeGroup,
    });
  }
  return [...byPath.values()];
}

async function geocodePlace(query: string): Promise<{ lat: number; lng: number }> {
  const res = await fetch('/api/admin/geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  let body: { ok?: boolean; lat?: number; lng?: number; error?: string } | null = null;
  try {
    body = await res.json();
  } catch {
    /* handled below */
  }
  if (
    !res.ok ||
    !body?.ok ||
    typeof body.lat !== 'number' ||
    typeof body.lng !== 'number'
  ) {
    throw new Error(body?.error ?? `Could not locate “${query}”.`);
  }
  return { lat: body.lat, lng: body.lng };
}

/* ============================================================
   Shared bits
   ============================================================ */

const TABS = [
  { id: 'media', label: 'Media' },
  { id: 'cities', label: 'Cities' },
  { id: 'types', label: 'Property types' },
  { id: 'tags', label: 'Tags' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function SaveBar({
  saving,
  onDiscard,
  onSave,
}: {
  saving: boolean;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <div className="adm-savebar">
      <span>You have unsaved changes.</span>
      <div className="adm-row">
        <button
          className="adm-btn sm"
          style={{
            borderColor: 'rgba(247,243,236,0.4)',
            color: 'var(--adm-ivory)',
            background: 'transparent',
          }}
          onClick={onDiscard}
          disabled={saving}
        >
          Discard
        </button>
        <button className="adm-btn sm gold" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Page
   ============================================================ */

export default function LibraryPage() {
  const toast = useToast();
  const [tab, setTab] = useState<TabId>('media');

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  /* Reference data (read-mostly) */
  const [media, setMedia] = useState<SiteMediaItem[]>([]);
  const [photos, setPhotos] = useState<Photos>({});
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Units>({});
  const [copy, setCopy] = useState<Copy>({});

  /* Cities draft + snapshot */
  const [citiesSaved, setCitiesSaved] = useState<Cities>({});
  const [citiesDraft, setCitiesDraft] = useState<Cities>({});

  /* ONE shared taxonomies draft + snapshot — edited by both the Property
     types tab and the Tags tab so they never clobber each other. */
  const [taxSaved, setTaxSaved] = useState<Taxonomies>(EMPTY_TAXONOMIES);
  const [taxDraft, setTaxDraft] = useState<Taxonomies>(EMPTY_TAXONOMIES);

  /* ONE shared staged pool + media.json draft — fed by the Media tab
     dropzone AND the Cities tab image uploads. Uploads only stage files;
     whichever publish/save button runs first publishes the pool. */
  const [mediaSaved, setMediaSaved] = useState<MediaUpload[]>([]);
  const [mediaDraft, setMediaDraft] = useState<MediaUpload[]>([]);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [publishing, setPublishing] = useState(false);
  /* path → object URL for photos uploaded this session; in GitHub mode the
     real URL does not exist until publish, so tiles render from here. */
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const previewsRef = useRef<Record<string, string>>({});
  previewsRef.current = previews;

  /* Free object URLs when the page unmounts. */
  useEffect(
    () => () => {
      for (const url of Object.values(previewsRef.current)) URL.revokeObjectURL(url);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getSiteMedia(),
      getContent<Photos>('photos'),
      getContent<Building[]>('buildings'),
      getContent<Units>('units'),
      getContent<Copy>('copy'),
      getContent<Cities>('cities'),
      getContent<Taxonomies>('taxonomies'),
      /* media.json may not exist yet — start the register empty then. */
      getContent<unknown>('media').catch(() => []),
    ])
      .then(([m, p, b, u, c, cities, tax, md]) => {
        if (cancelled) return;
        setMedia(m);
        setPhotos(p && typeof p === 'object' ? p : {});
        setBuildings(Array.isArray(b) ? b : []);
        setUnits(u && typeof u === 'object' ? u : {});
        setCopy(c && typeof c === 'object' ? c : {});
        const safeCities = cities && typeof cities === 'object' ? cities : {};
        setCitiesSaved(safeCities);
        setCitiesDraft(safeCities);
        const safeTax: Taxonomies = {
          tiers: Array.isArray(tax?.tiers) ? tax.tiers : [],
          unitTypes: Array.isArray(tax?.unitTypes) ? tax.unitTypes : [],
          photoTags: Array.isArray(tax?.photoTags) ? tax.photoTags : [],
        };
        setTaxSaved(safeTax);
        setTaxDraft(safeTax);
        const safeMediaList = (Array.isArray(md) ? md : []).filter(
          (item): item is MediaUpload => {
            if (!item || typeof item !== 'object') return false;
            const { path, name, uploadedAt } = item as Partial<MediaUpload>;
            return (
              isSafeAssetPath(path) &&
              typeof name === 'string' &&
              typeof uploadedAt === 'string'
            );
          }
        );
        setMediaSaved(safeMediaList);
        setMediaDraft(safeMediaList);
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Failed to load library content.';
        setLoadError(message);
        toast('error', message);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  /** Stage library uploads: send the files, register them in the media
      draft and build local previews. Returns the added web paths. */
  const stageUploads = async (files: File[]): Promise<string[]> => {
    const result = await uploadLibraryFiles(files);
    const now = new Date().toISOString();
    const entries: MediaUpload[] = [];
    const urls: Record<string, string> = {};
    /* added[i] corresponds to files[i] — order is preserved. */
    result.added.forEach((path, i) => {
      if (!isSafeAssetPath(path)) return;
      const file = files[i];
      entries.push({ path, name: file?.name ?? fileTail(path), uploadedAt: now });
      if (file) urls[path] = URL.createObjectURL(file);
    });
    setStaged((prev) => [...prev, ...result.staged]);
    setMediaDraft((prev) => [...prev, ...entries]);
    setPreviews((prev) => ({ ...prev, ...urls }));
    return entries.map((e) => e.path);
  };

  const mediaDirty =
    staged.length > 0 || JSON.stringify(mediaDraft) !== JSON.stringify(mediaSaved);

  /** Publish the staged pool + media.json register as one commit. */
  const publishMedia = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      await commitStaged({
        message: 'upload photos to library',
        files: staged,
        content: [{ name: 'media', data: mediaDraft }],
      });
      setStaged([]);
      setMediaSaved(mediaDraft);
      /* Keep previews so freshly published tiles render until reload. */
      toast('success', 'Published — the website updates in about 2 minutes.');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Could not publish photos.');
    } finally {
      setPublishing(false);
    }
  };

  /** The Cities tab save publishes the pool too — mark it flushed here. */
  const onPoolPublished = () => {
    setStaged([]);
    setMediaSaved(mediaDraft);
  };

  const head = (
    <PageHead
      eyebrow="Reusable content"
      title="Library"
      lede="Media, cities, property types and photo tags shared across the whole site."
    />
  );

  if (loadError) {
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

  if (!loaded) {
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

      <div className="adm-tabs" role="tablist" aria-label="Library sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`library-tab-${t.id}`}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`library-panel-${t.id}`}
            className={`adm-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`library-panel-${tab}`}
        aria-labelledby={`library-tab-${tab}`}
      >
        {tab === 'media' && (
          <MediaTab
            media={media}
            mediaDraft={mediaDraft}
            mediaSaved={mediaSaved}
            previews={previews}
            photos={photos}
            setPhotos={setPhotos}
            buildings={buildings}
            onUpload={stageUploads}
            publishReady={mediaDirty}
            publishing={publishing}
            onPublish={publishMedia}
          />
        )}
        {tab === 'cities' && (
          <CitiesTab
            draft={citiesDraft}
            saved={citiesSaved}
            setDraft={setCitiesDraft}
            setSaved={setCitiesSaved}
            buildings={buildings}
            staged={staged}
            mediaDraft={mediaDraft}
            onUpload={stageUploads}
            onPoolPublished={onPoolPublished}
          />
        )}
        {tab === 'types' && (
          <TypesTab
            draft={taxDraft}
            saved={taxSaved}
            setDraft={setTaxDraft}
            setSaved={setTaxSaved}
            units={units}
            copy={copy}
          />
        )}
        {tab === 'tags' && (
          <TagsTab
            draft={taxDraft}
            saved={taxSaved}
            setDraft={setTaxDraft}
            setSaved={setTaxSaved}
            photos={photos}
          />
        )}
      </div>
    </>
  );
}

/* ============================================================
   Shared taxonomies save logic (used by Types + Tags tabs)
   ============================================================ */

function useTaxonomiesSave(
  draft: Taxonomies,
  saved: Taxonomies,
  setDraft: (t: Taxonomies) => void,
  setSaved: (t: Taxonomies) => void
) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved]
  );

  const save = async () => {
    /* Validate the whole draft — this savebar persists tiers, unit types
       AND tags together. */
    if (draft.tiers.some((t) => !t.label.trim())) {
      toast('error', 'Every building tier needs a label.');
      return;
    }
    if (draft.unitTypes.some((u) => !u.label.trim())) {
      toast('error', 'Every unit type needs a label.');
      return;
    }
    /* Materialise values for new tiers (kebab-case of label). */
    const tiers = draft.tiers.map((t) => ({
      ...t,
      label: t.label.trim(),
      value: t.value || kebab(t.label),
    }));
    const tierValues = tiers.map((t) => t.value);
    if (new Set(tierValues).size !== tierValues.length) {
      toast('error', 'Tier values must be unique — two tiers resolve to the same value.');
      return;
    }
    const unitTypes = draft.unitTypes.map((u) => ({ ...u, label: u.label.trim() }));
    const unitLabels = unitTypes.map((u) => u.label.toLowerCase());
    if (new Set(unitLabels).size !== unitLabels.length) {
      toast('error', 'Unit type labels must be unique.');
      return;
    }
    const next: Taxonomies = { ...draft, tiers, unitTypes };
    setSaving(true);
    try {
      await putContent('taxonomies', next);
      setSaved(next);
      setDraft(next);
      toast('success', 'Property types and tags saved.');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const discard = () => setDraft(saved);

  return { dirty, saving, save, discard };
}

/* ============================================================
   TAB 1 — Media (site-wide images only; property photos live on
   each property's Photos page)
   ============================================================ */

const MEDIA_GROUP_ORDER: SiteMediaGroup[] = ['Library upload', 'Site image', 'Brand'];

const MEDIA_GROUP_HEADINGS: Record<SiteMediaGroup, string> = {
  'Library upload': 'Library uploads',
  'Site image': 'Site images',
  Brand: 'Brand',
};

function MediaTab({
  media,
  mediaDraft,
  mediaSaved,
  previews,
  photos,
  setPhotos,
  buildings,
  onUpload,
  publishReady,
  publishing,
  onPublish,
}: {
  media: SiteMediaItem[];
  mediaDraft: MediaUpload[];
  mediaSaved: MediaUpload[];
  previews: Record<string, string>;
  photos: Photos;
  setPhotos: (p: Photos) => void;
  buildings: Building[];
  onUpload: (files: File[]) => Promise<string[]>;
  publishReady: boolean;
  publishing: boolean;
  onPublish: () => Promise<void>;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState('');
  const [adding, setAdding] = useState(false);

  /* The site-media GET lists committed files only — merge in this
     session's not-yet-published uploads so they show immediately. */
  const allMedia = useMemo(() => {
    const committed = new Set(media.map((m) => m.path));
    const draftOnly: SiteMediaItem[] = mediaDraft
      .filter((m) => !committed.has(m.path))
      .map((m) => ({ path: m.path, name: m.name, group: 'Library upload' }));
    return [...draftOnly, ...media];
  }, [media, mediaDraft]);

  const newCount = useMemo(() => {
    const saved = new Set(mediaSaved.map((m) => m.path));
    return mediaDraft.filter((m) => !saved.has(m.path)).length;
  }, [mediaDraft, mediaSaved]);

  /* Search across all groups, then bucket by group for display. */
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = allMedia.filter(
      (m) =>
        isSafeAssetPath(m.path) &&
        (!q ||
          m.name.toLowerCase().includes(q) ||
          fileTail(m.path).toLowerCase().includes(q))
    );
    return MEDIA_GROUP_ORDER.map((group) => ({
      group,
      heading: MEDIA_GROUP_HEADINGS[group],
      items: visible.filter((m) => m.group === group),
    })).filter((g) => g.items.length > 0);
  }, [allMedia, query]);

  const visibleCount = grouped.reduce((n, g) => n + g.items.length, 0);

  const targetOptions: DropdownOption[] = useMemo(
    () => buildings.map((b) => ({ value: b.slug, label: b.name })),
    [buildings]
  );

  const toggle = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  /* -- Upload (stage only — publishing happens from the bar below) -- */
  const doUpload = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (images.length === 0) return;
    setUploading(true);
    try {
      const added = await onUpload(images);
      toast(
        'success',
        `${plural(added.length, 'photo')} uploaded — press Publish to put ${
          added.length === 1 ? 'it' : 'them'
        } in the library.`
      );
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    void doUpload(Array.from(e.dataTransfer.files));
  };

  /* -- Add selection to a property (the reuse mechanic) -- */
  const addToProperty = async () => {
    const building = buildings.find((b) => b.slug === target);
    if (!building || selected.size === 0) return;
    const entry: PhotoEntry = photos[target] ?? { hero: null, gallery: [], hidden: [] };
    const already = new Set<string>([
      ...(entry.hero ? [entry.hero] : []),
      ...(Array.isArray(entry.gallery) ? entry.gallery : []),
    ]);
    const toAdd = [...selected].filter((p) => !already.has(p));
    if (toAdd.length === 0) {
      toast('error', `All selected photos are already on ${building.name}.`);
      return;
    }
    const next: Photos = {
      ...photos,
      [target]: {
        ...entry,
        gallery: [...(Array.isArray(entry.gallery) ? entry.gallery : []), ...toAdd],
      },
    };
    setAdding(true);
    try {
      await commitStaged({ content: [{ name: 'photos', data: next }] });
      setPhotos(next);
      setSelected(new Set());
      setTarget('');
      toast('success', `${plural(toAdd.length, 'photo')} added to ${building.name}.`);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to add photos.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <p className="adm-help" style={{ marginBottom: 16 }}>
        Images used across the site — placeholders, logos, hero and city cards.
        Property photos live on each property&apos;s Photos page.
      </p>

      {/* Upload dropzone */}
      <button
        type="button"
        className={`adm-dropzone${drag ? ' drag' : ''}`}
        style={{ width: '100%', marginBottom: 20 }}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        disabled={uploading}
      >
        {uploading ? <IconSpinner /> : <IconUpload />}
        <span>
          {uploading
            ? 'Uploading…'
            : 'Drag photos here or click to upload to the library'}
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          void doUpload(Array.from(e.target.files ?? []))
        }
      />

      {/* Search */}
      <div className="adm-row" style={{ marginBottom: 18 }}>
        <div className="adm-search adm-grow" style={{ maxWidth: 380 }}>
          <IconSearch />
          <input
            className="adm-input"
            type="search"
            placeholder="Search by filename…"
            aria-label="Search images by filename"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grouped grid: Library uploads, then Site images, then Brand */}
      {allMedia.length === 0 ? (
        <div className="adm-card">
          <div className="adm-empty">
            <div className="t">No photos yet</div>
            <p>Upload photos above to start building the library.</p>
          </div>
        </div>
      ) : visibleCount === 0 ? (
        <div className="adm-card">
          <div className="adm-empty">
            <div className="t">No images match</div>
            <p>Try clearing the search.</p>
          </div>
        </div>
      ) : (
        grouped.map(({ group, heading, items }) => (
          <section key={group} aria-label={heading}>
            <div className="adm-label" style={{ marginTop: 26, marginBottom: 12 }}>
              {heading}
            </div>
            <div className="adm-photo-grid">
              {items.map((t) => (
                <div key={t.path}>
                  <button
                    type="button"
                    className={`adm-photo${selected.has(t.path) ? ' selected' : ''}`}
                    style={{ width: '100%' }}
                    aria-pressed={selected.has(t.path)}
                    aria-label={`Select ${t.name} (${heading})`}
                    onClick={() => toggle(t.path)}
                  >
                    <img src={previews[t.path] ?? t.path} alt="" loading="lazy" />
                    <span className="adm-photo-check">
                      <IconCheck />
                    </span>
                  </button>
                  <div className="adm-muted" style={{ fontSize: 12, marginTop: 6 }}>
                    {t.name}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {/* Selection action bar */}
      {selected.size > 0 && (
        <div className="adm-selectbar">
          <span className="count">{selected.size} selected</span>
          <Dropdown
            variant="admin"
            ariaLabel="Add selected photos to property"
            placeholder="Add to property…"
            value={target}
            onChange={setTarget}
            options={targetOptions}
            style={{ width: 240 }}
            menuStyle={{ maxHeight: 220 }}
          />
          <button
            className="adm-btn gold"
            onClick={() => void addToProperty()}
            disabled={!target || adding}
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
          <button
            className="adm-btn"
            onClick={() => {
              setSelected(new Set());
              setTarget('');
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Publish bar — one commit for every staged upload + media.json */}
      {publishReady && (
        <div className="adm-savebar">
          <span>{plural(newCount, 'new photo')} ready to publish</span>
          <div className="adm-row">
            <button
              type="button"
              className="adm-btn sm gold"
              disabled={publishing}
              onClick={() => void onPublish()}
            >
              {publishing && <IconSpinner />}
              Publish
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================
   TAB 2 — Cities
   ============================================================ */

function CitiesTab({
  draft,
  saved,
  setDraft,
  setSaved,
  buildings,
  staged,
  mediaDraft,
  onUpload,
  onPoolPublished,
}: {
  draft: Cities;
  saved: Cities;
  setDraft: (c: Cities | ((c: Cities) => Cities)) => void;
  setSaved: (c: Cities) => void;
  buildings: Building[];
  staged: StagedFile[];
  mediaDraft: MediaUpload[];
  onUpload: (files: File[]) => Promise<string[]>;
  onPoolPublished: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  /* Add-city form */
  const [newLabel, setNewLabel] = useState('');
  const [newProvince, setNewProvince] = useState('');
  const [addingCity, setAddingCity] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved]
  );

  const usageCount = (slug: string) =>
    buildings.filter((b) => b.city === slug).length;

  const updateCity = (slug: string, patch: Partial<City>) => {
    setDraft((d) => {
      const current = d[slug];
      if (!current) return d;
      return { ...d, [slug]: { ...current, ...patch } };
    });
  };

  const removeCity = (slug: string) => {
    setDraft((d) => {
      const next = { ...d };
      delete next[slug];
      return next;
    });
  };

  const addCity = async () => {
    const label = newLabel.trim();
    const province = newProvince.trim();
    if (!label || !province) {
      toast('error', 'Enter both a city name and a province.');
      return;
    }
    const slug = kebab(label);
    if (!slug) {
      toast('error', 'City name must contain letters or numbers.');
      return;
    }
    if (draft[slug]) {
      toast('error', `A city with the slug “${slug}” already exists.`);
      return;
    }
    setAddingCity(true);
    try {
      const { lat, lng } = await geocodePlace(`${label}, ${province}`);
      const entry: City = {
        slug,
        label,
        province,
        image: '',
        blurb: '',
        comingSoon: true,
        center: { lat, lng, spreadLat: 0.03, spreadLng: 0.05 },
        bounds: {
          minLng: lng - 0.05,
          maxLng: lng + 0.05,
          minLat: lat - 0.03,
          maxLat: lat + 0.03,
        },
      };
      setDraft((d) => ({ ...d, [slug]: entry }));
      setNewLabel('');
      setNewProvince('');
      toast('success', `${label} added to the draft — remember to save.`);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Could not add city.');
    } finally {
      setAddingCity(false);
    }
  };

  const save = async () => {
    for (const c of Object.values(draft)) {
      if (!c.label.trim() || !c.province.trim()) {
        toast('error', 'Every city needs a label and a province.');
        return;
      }
    }
    setSaving(true);
    try {
      /* One commit: the cities JSON, any staged city images and the
         media.json register they belong to. */
      await commitStaged({
        message: 'update cities',
        files: staged,
        content: [
          { name: 'cities', data: draft },
          { name: 'media', data: mediaDraft },
        ],
      });
      setSaved(draft);
      onPoolPublished();
      toast('success', 'Cities saved.');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to save cities.');
    } finally {
      setSaving(false);
    }
  };

  const cityList = Object.values(draft);
  const pendingRemove = confirmRemove ? draft[confirmRemove] : undefined;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {cityList.map((city) => (
          <CityCard
            key={city.slug}
            city={city}
            usedBy={usageCount(city.slug)}
            onChange={(patch) => updateCity(city.slug, patch)}
            onRemove={() => setConfirmRemove(city.slug)}
            onUpload={onUpload}
          />
        ))}

        {/* Add city */}
        <div className="adm-card">
          <div className="adm-card-head">
            <h2 className="adm-card-title">Add city</h2>
          </div>
          <div className="adm-card-pad">
            <div className="adm-form-grid">
              <Field label="City name" required>
                <input
                  className="adm-input"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="City"
                />
              </Field>
              <Field label="Province" required>
                <input
                  className="adm-input"
                  value={newProvince}
                  onChange={(e) => setNewProvince(e.target.value)}
                  placeholder="Province or state"
                />
              </Field>
            </div>
            <div className="adm-row" style={{ marginTop: 18 }}>
              <button
                className="adm-btn gold sm"
                onClick={() => void addCity()}
                disabled={addingCity}
              >
                {addingCity ? <IconSpinner /> : <IconPlus />}
                {addingCity ? 'Locating…' : 'Add'}
              </button>
              <span className="adm-help">
                We locate the city automatically to place it on the map. New cities
                start as “Coming soon (register interest only)” so no listings jump
                live before you are ready.
              </span>
            </div>
          </div>
        </div>
      </div>

      {dirty && <SaveBar saving={saving} onDiscard={() => setDraft(saved)} onSave={() => void save()} />}

      <ConfirmDialog
        open={confirmRemove !== null}
        title={`Remove ${pendingRemove?.label ?? 'city'}?`}
        body="The city will disappear from the site once you save. This cannot be undone after saving."
        confirmLabel="Remove city"
        danger
        onConfirm={() => {
          if (confirmRemove) removeCity(confirmRemove);
          setConfirmRemove(null);
        }}
        onCancel={() => setConfirmRemove(null)}
      />
    </>
  );
}

function CityCard({
  city,
  usedBy,
  onChange,
  onRemove,
  onUpload,
}: {
  city: City;
  usedBy: number;
  onChange: (patch: Partial<City>) => void;
  onRemove: () => void;
  onUpload: (files: File[]) => Promise<string[]>;
}) {
  const toast = useToast();
  const imageRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (images.length === 0) return;
    setUploading(true);
    try {
      /* Stages the file into the page-level pool — it is published together
         with the cities JSON when Save changes runs. */
      const added = await onUpload(images.slice(0, 1));
      if (added.length === 0) throw new Error('Upload returned no files.');
      onChange({ image: added[0] });
      toast(
        'success',
        'Image uploaded and set as the card image — press Save changes to publish.'
      );
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (imageRef.current) imageRef.current.value = '';
    }
  };

  return (
    <div className="adm-card">
      <div className="adm-card-head">
        <div className="adm-row" style={{ gap: 10 }}>
          <h2 className="adm-card-title">{city.label || 'Untitled city'}</h2>
          <span className="adm-muted" style={{ fontSize: 12.5 }}>
            {city.province}
          </span>
          {city.comingSoon && <span className="adm-badge gold">Coming soon</span>}
        </div>
      </div>
      <div className="adm-card-pad">
        <div className="adm-form-grid">
          <Field label="Label" required>
            <input
              className="adm-input"
              value={city.label}
              onChange={(e) => onChange({ label: e.target.value })}
            />
          </Field>
          <Field label="Province" required>
            <input
              className="adm-input"
              value={city.province}
              onChange={(e) => onChange({ province: e.target.value })}
            />
          </Field>
          <Field label="Blurb" span2>
            <textarea
              className="adm-textarea"
              value={city.blurb}
              onChange={(e) => onChange({ blurb: e.target.value })}
            />
          </Field>
          <Field label="Card image path" help="Shown on the city cards across the site.">
            <div className="adm-row" style={{ flexWrap: 'nowrap' }}>
              <input
                className="adm-input adm-grow"
                value={city.image}
                onChange={(e) => onChange({ image: e.target.value })}
                placeholder="/assets/library/…"
              />
              <button
                className="adm-btn sm ghost"
                onClick={() => imageRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <IconSpinner /> : <IconUpload />}
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
              <input
                ref={imageRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  void uploadImage(Array.from(e.target.files ?? []))
                }
              />
            </div>
          </Field>
          <Field label="Availability">
            <label className="adm-switch">
              <input
                type="checkbox"
                checked={Boolean(city.comingSoon)}
                onChange={(e) => onChange({ comingSoon: e.target.checked })}
              />
              <span className="track" />
              Coming soon (register interest only)
            </label>
          </Field>
        </div>

        <div className="adm-row" style={{ marginTop: 20 }}>
          <button className="adm-btn sm danger" onClick={onRemove} disabled={usedBy > 0}>
            Remove city
          </button>
          {usedBy > 0 && (
            <span className="adm-help">
              Used by {propertiesCount(usedBy)} — reassign those buildings to another
              city before removing.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   TAB 3 — Property types (tiers + unit types)
   ============================================================ */

const BEDROOM_OPTIONS: DropdownOption[] = [
  { value: '0', label: 'Studio (0 bedrooms)' },
  { value: '1', label: '1 bedroom' },
  { value: '2', label: '2 bedrooms' },
  { value: '3', label: '3 bedrooms' },
];

function TypesTab({
  draft,
  saved,
  setDraft,
  setSaved,
  units,
  copy,
}: {
  draft: Taxonomies;
  saved: Taxonomies;
  setDraft: (t: Taxonomies) => void;
  setSaved: (t: Taxonomies) => void;
  units: Units;
  copy: Copy;
}) {
  const toast = useToast();
  const { dirty, saving, save, discard } = useTaxonomiesSave(
    draft,
    saved,
    setDraft,
    setSaved
  );
  const [confirmTier, setConfirmTier] = useState<number | null>(null);
  const [confirmUnit, setConfirmUnit] = useState<number | null>(null);

  /* Values that already exist in the saved file are immutable. */
  const savedTierValues = useMemo(
    () => new Set(saved.tiers.map((t) => t.value)),
    [saved.tiers]
  );

  const tierUsage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of Object.values(copy)) {
      const tier = entry?.tier;
      if (typeof tier === 'string') counts.set(tier, (counts.get(tier) ?? 0) + 1);
    }
    return counts;
  }, [copy]);

  const unitTypeUsage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const list of Object.values(units)) {
      if (!Array.isArray(list)) continue;
      for (const u of list) {
        if (typeof u?.type === 'string')
          counts.set(u.type, (counts.get(u.type) ?? 0) + 1);
      }
    }
    return counts;
  }, [units]);

  const updateTier = (i: number, patch: Partial<Tier>) => {
    setDraft({
      ...draft,
      tiers: draft.tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)),
    });
  };

  const requestRemoveTier = (i: number) => {
    const tier = draft.tiers[i];
    if (!tier) return;
    const used = tier.value ? (tierUsage.get(tier.value) ?? 0) : 0;
    if (used > 0) {
      toast(
        'error',
        `“${tier.label || tier.value}” is used by ${propertiesCount(used)} and cannot be removed.`
      );
      return;
    }
    setConfirmTier(i);
  };

  const updateUnitType = (i: number, patch: Partial<UnitType>) => {
    setDraft({
      ...draft,
      unitTypes: draft.unitTypes.map((u, idx) => (idx === i ? { ...u, ...patch } : u)),
    });
  };

  const requestRemoveUnitType = (i: number) => {
    const ut = draft.unitTypes[i];
    if (!ut) return;
    const used = unitTypeUsage.get(ut.label) ?? 0;
    if (used > 0) {
      toast(
        'error',
        `“${ut.label}” is used by ${plural(used, 'unit')} and cannot be removed.`
      );
      return;
    }
    setConfirmUnit(i);
  };

  const pendingTier = confirmTier !== null ? draft.tiers[confirmTier] : undefined;
  const pendingUnit = confirmUnit !== null ? draft.unitTypes[confirmUnit] : undefined;

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 18,
          alignItems: 'start',
        }}
      >
        {/* -- Building tiers -- */}
        <div className="adm-card">
          <div className="adm-card-head">
            <h2 className="adm-card-title">Building tiers</h2>
          </div>
          <div className="adm-card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <span className="adm-help">
              Tiers set the standard description line shown on property pages. The
              value is fixed once a tier has been saved.
            </span>
            {draft.tiers.map((tier, i) => {
              const isExisting = tier.value !== '' && savedTierValues.has(tier.value);
              const shownValue = isExisting ? tier.value : kebab(tier.label) || '—';
              return (
                <div
                  key={i}
                  style={{ display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid var(--adm-hairline)', paddingBottom: 18 }}
                >
                  <div className="adm-row" style={{ flexWrap: 'nowrap' }}>
                    <div className="adm-grow">
                      <Field label="Label" required>
                        <input
                          className="adm-input"
                          value={tier.label}
                          onChange={(e) => updateTier(i, { label: e.target.value })}
                        />
                      </Field>
                    </div>
                    <button
                      className="adm-btn sm danger"
                      style={{ alignSelf: 'flex-end' }}
                      onClick={() => requestRemoveTier(i)}
                    >
                      Remove
                    </button>
                  </div>
                  <span
                    className="adm-muted"
                    style={{ fontFamily: 'monospace', fontSize: 11.5 }}
                  >
                    value: {shownValue}
                  </span>
                  <Field label="Standard description line">
                    <textarea
                      className="adm-textarea"
                      style={{ minHeight: 80 }}
                      value={tier.line}
                      onChange={(e) => updateTier(i, { line: e.target.value })}
                    />
                  </Field>
                </div>
              );
            })}
            <button
              className="adm-btn sm ghost"
              style={{ alignSelf: 'flex-start' }}
              onClick={() =>
                setDraft({ ...draft, tiers: [...draft.tiers, { value: '', label: '', line: '' }] })
              }
            >
              <IconPlus />
              Add tier
            </button>
          </div>
        </div>

        {/* -- Unit types -- */}
        <div className="adm-card">
          <div className="adm-card-head">
            <h2 className="adm-card-title">Unit types</h2>
          </div>
          <div className="adm-card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <span className="adm-help">
              Bedroom count drives pricing and search filters across the site.
            </span>
            {draft.unitTypes.map((ut, i) => (
              <div key={i} className="adm-row" style={{ flexWrap: 'nowrap' }}>
                <div className="adm-grow">
                  <Field label="Label" required>
                    <input
                      className="adm-input"
                      value={ut.label}
                      onChange={(e) => updateUnitType(i, { label: e.target.value })}
                    />
                  </Field>
                </div>
                <div style={{ alignSelf: 'flex-end', width: 190 }}>
                  <Dropdown
                    variant="admin"
                    ariaLabel={`Bedrooms for ${ut.label || 'new unit type'}`}
                    value={String(ut.bedrooms)}
                    onChange={(v) => updateUnitType(i, { bedrooms: Number(v) })}
                    options={BEDROOM_OPTIONS}
                  />
                </div>
                <button
                  className="adm-btn sm danger"
                  style={{ alignSelf: 'flex-end' }}
                  onClick={() => requestRemoveUnitType(i)}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              className="adm-btn sm ghost"
              style={{ alignSelf: 'flex-start' }}
              onClick={() =>
                setDraft({
                  ...draft,
                  unitTypes: [...draft.unitTypes, { label: '', bedrooms: 1 }],
                })
              }
            >
              <IconPlus />
              Add unit type
            </button>
          </div>
        </div>
      </div>

      {dirty && <SaveBar saving={saving} onDiscard={discard} onSave={() => void save()} />}

      <ConfirmDialog
        open={confirmTier !== null}
        title={`Remove tier “${pendingTier?.label || 'untitled'}”?`}
        body="No properties use this tier. It will be removed when you save."
        confirmLabel="Remove tier"
        danger
        onConfirm={() => {
          if (confirmTier !== null) {
            setDraft({ ...draft, tiers: draft.tiers.filter((_, idx) => idx !== confirmTier) });
          }
          setConfirmTier(null);
        }}
        onCancel={() => setConfirmTier(null)}
      />

      <ConfirmDialog
        open={confirmUnit !== null}
        title={`Remove unit type “${pendingUnit?.label || 'untitled'}”?`}
        body="No units use this type. It will be removed when you save."
        confirmLabel="Remove unit type"
        danger
        onConfirm={() => {
          if (confirmUnit !== null) {
            setDraft({
              ...draft,
              unitTypes: draft.unitTypes.filter((_, idx) => idx !== confirmUnit),
            });
          }
          setConfirmUnit(null);
        }}
        onCancel={() => setConfirmUnit(null)}
      />
    </>
  );
}

/* ============================================================
   TAB 4 — Tags
   ============================================================ */

function TagsTab({
  draft,
  saved,
  setDraft,
  setSaved,
  photos,
}: {
  draft: Taxonomies;
  saved: Taxonomies;
  setDraft: (t: Taxonomies) => void;
  setSaved: (t: Taxonomies) => void;
  photos: Photos;
}) {
  const toast = useToast();
  const { dirty, saving, save, discard } = useTaxonomiesSave(
    draft,
    saved,
    setDraft,
    setSaved
  );
  const [input, setInput] = useState('');
  const [confirmTag, setConfirmTag] = useState<string | null>(null);

  const assignedTags = useMemo(() => {
    const set = new Set<string>();
    for (const entry of Object.values(photos)) {
      if (!entry?.tags) continue;
      for (const t of Object.values(entry.tags)) set.add(t);
    }
    return set;
  }, [photos]);

  const addTag = () => {
    const tag = input.trim();
    if (!tag) return;
    if (draft.photoTags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      toast('error', `“${tag}” is already a tag.`);
      return;
    }
    setDraft({ ...draft, photoTags: [...draft.photoTags, tag] });
    setInput('');
  };

  const removeTag = (tag: string) =>
    setDraft({ ...draft, photoTags: draft.photoTags.filter((t) => t !== tag) });

  const requestRemove = (tag: string) => {
    if (assignedTags.has(tag)) setConfirmTag(tag);
    else removeTag(tag);
  };

  return (
    <>
      <div className="adm-card">
        <div className="adm-card-head">
          <h2 className="adm-card-title">Photo tags</h2>
        </div>
        <div className="adm-card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span className="adm-help">
            Tags appear as badges on property photo galleries (e.g. Studio,
            1 Bedroom) and group the View-all-photos view.
          </span>

          {draft.photoTags.length === 0 ? (
            <span className="adm-muted">No tags yet — add one below.</span>
          ) : (
            <div className="adm-chip-row">
              {draft.photoTags.map((tag) => (
                <span key={tag} className="adm-chip">
                  {tag}
                  <button
                    type="button"
                    aria-label={`Remove tag ${tag}`}
                    onClick={() => requestRemove(tag)}
                  >
                    <IconX />
                  </button>
                </span>
              ))}
            </div>
          )}

          <form
            className="adm-row"
            style={{ flexWrap: 'nowrap', maxWidth: 420 }}
            onSubmit={(e) => {
              e.preventDefault();
              addTag();
            }}
          >
            <input
              className="adm-input adm-grow"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="New tag…"
              aria-label="New photo tag"
            />
            <button type="submit" className="adm-btn sm ghost">
              <IconPlus />
              Add
            </button>
          </form>
        </div>
      </div>

      {dirty && <SaveBar saving={saving} onDiscard={discard} onSave={() => void save()} />}

      <ConfirmDialog
        open={confirmTag !== null}
        title={`Remove tag “${confirmTag ?? ''}”?`}
        body="Photos keep this tag until you retag them; it just won't be offered for new tagging."
        confirmLabel="Remove tag"
        danger
        onConfirm={() => {
          if (confirmTag) removeTag(confirmTag);
          setConfirmTag(null);
        }}
        onCancel={() => setConfirmTag(null)}
      />
    </>
  );
}
