'use client';

/* CMS — Units & availability editor: the rows here power the public
   "Available suites" table and the advertised from-prices. Removing every
   row makes the site show "no suites available" for the building. */

import { Fragment, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  commitStaged,
  getContent,
  uploadUnitPhotos,
  type StagedFile,
} from '@/components/admin/api';
import { ConfirmDialog, PageHead, useToast } from '@/components/admin/ui';
import { PropertyTabs } from '@/components/admin/PropertyTabs';
import { Dropdown, type DropdownOption } from '@/components/ui/Dropdown';
import {
  IconImage,
  IconPlus,
  IconSpinner,
  IconTrash,
  IconUpload,
  IconX,
} from '@/components/admin/icons';

interface Building {
  slug: string;
  name: string;
  address: string;
}

interface UnitRow {
  unit: string;
  type: string;
  rent: number;
  image?: string;
  images?: string[];
  applyUrl?: string;
}

interface Taxonomies {
  unitTypes: Array<{ label: string; bedrooms: number }>;
}

type UnitsRecord = Record<string, UnitRow[]>;

const FALLBACK_UNIT_TYPES = ['Studio', '1 Bedroom', '2 Bedroom', '3 Bedroom'];

export default function PropertyUnitsPage() {
  const { slug } = useParams<{ slug: string }>();
  const toast = useToast();

  const [buildings, setBuildings] = useState<Building[] | null>(null);
  const [record, setRecord] = useState<UnitsRecord>({});
  const [rows, setRows] = useState<UnitRow[]>([]);
  const [snapshot, setSnapshot] = useState<UnitRow[]>([]);
  const [unitTypes, setUnitTypes] = useState<string[]>(FALLBACK_UNIT_TYPES);
  const [pendingRemove, setPendingRemove] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openPhotos, setOpenPhotos] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  /* Uploads only stage files now — these are published with Save changes. */
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  /* path → object URL for photos uploaded this session; in GitHub mode the
     real URL does not exist until publish, so thumbnails render from here. */
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const previewsRef = useRef<Record<string, string>>({});
  previewsRef.current = previews;
  const fileRef = useRef<HTMLInputElement>(null);

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
      getContent<Building[]>('buildings'),
      getContent<UnitsRecord>('units'),
      getContent<Taxonomies>('taxonomies'),
    ])
      .then(([b, u, tax]) => {
        if (cancelled) return;
        setBuildings(Array.isArray(b) ? b : []);
        const labels = (Array.isArray(tax?.unitTypes) ? tax.unitTypes : [])
          .map((t) => t?.label)
          .filter((l): l is string => typeof l === 'string' && l !== '');
        if (labels.length > 0) setUnitTypes(labels);
        const rec = u ?? {};
        setRecord(rec);
        const initial = Array.isArray(rec[slug]) ? rec[slug] : [];
        setRows(initial);
        setSnapshot(initial);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load units.');
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const building = buildings?.find((b) => b.slug === slug);

  const dirty = JSON.stringify(rows) !== JSON.stringify(snapshot);
  const valid = rows.every((r) => r.unit.trim() !== '' && r.rent > 0);

  const editRow = (index: number, patch: Partial<UnitRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addUnit = () => {
    setRows((prev) => [
      ...prev,
      { unit: '', type: unitTypes.includes('1 Bedroom') ? '1 Bedroom' : unitTypes[0] ?? '', rent: 0 },
    ]);
  };

  /** Per-row options: keep an unknown legacy type selectable instead of blanking it. */
  const typeOptions = (current: string): DropdownOption[] => {
    const opts = unitTypes.map((t) => ({ value: t, label: t }));
    if (current && !unitTypes.includes(current)) opts.unshift({ value: current, label: current });
    return opts;
  };

  const confirmRemove = () => {
    if (pendingRemove === null) return;
    setRows((prev) => prev.filter((_, i) => i !== pendingRemove));
    setPendingRemove(null);
    setOpenPhotos(null);
  };

  const addUnitPhotos = async (index: number, list: FileList | null) => {
    const files = list ? Array.from(list) : [];
    const row = rows[index];
    if (!row || files.length === 0) return;
    const unitNo = row.unit.trim();
    if (!unitNo) {
      toast('error', 'Give the unit a number before uploading its photos.');
      return;
    }
    setUploading(true);
    try {
      const result = await uploadUnitPhotos(slug, unitNo, files);
      editRow(index, { images: [...(row.images ?? []), ...result.added] });
      setStagedFiles((prev) => [...prev, ...result.staged]);
      /* added[i] corresponds to files[i] — build local previews so the
         thumbnails render before the photos exist on the website. */
      setPreviews((prev) => {
        const next = { ...prev };
        result.added.forEach((path, i) => {
          const file = files[i];
          if (file) next[path] = URL.createObjectURL(file);
        });
        return next;
      });
      const n = result.added.length;
      toast(
        'success',
        `${n} photo${n === 1 ? '' : 's'} uploaded — press Save changes to publish.`
      );
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeUnitPhoto = (index: number, photo: string) => {
    const row = rows[index];
    if (!row) return;
    editRow(index, { images: (row.images ?? []).filter((p) => p !== photo) });
    const url = previews[photo];
    if (url) {
      URL.revokeObjectURL(url);
      setPreviews((prev) => {
        const next = { ...prev };
        delete next[photo];
        return next;
      });
    }
  };

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const cleaned = rows.map((r) => {
      const next: UnitRow = { ...r, unit: r.unit.trim(), rent: Number(r.rent) || 0 };
      const applyUrl = r.applyUrl?.trim();
      if (applyUrl) next.applyUrl = applyUrl;
      else delete next.applyUrl;
      if (!next.images || next.images.length === 0) delete next.images;
      return next;
    });
    const nextRecord: UnitsRecord = { ...record };
    if (cleaned.length === 0) delete nextRecord[slug];
    else nextRecord[slug] = cleaned;
    try {
      await commitStaged({
        message: `update units for ${slug}`,
        files: stagedFiles,
        content: [{ name: 'units', data: nextRecord }],
      });
      setRecord(nextRecord);
      setRows(cleaned);
      setSnapshot(cleaned);
      /* Keep previews so freshly published thumbnails render until reload. */
      setStagedFiles([]);
      toast('success', 'Availability saved.');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Could not save availability.');
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <>
        <PropertyTabs slug={slug} />
        <div className="adm-card">
          <div className="adm-empty">
            <div className="t">Something went wrong</div>
            <p>{loadError}</p>
          </div>
        </div>
      </>
    );
  }

  if (!buildings) {
    return (
      <>
        <PropertyTabs slug={slug} />
        <p className="adm-muted">Loading…</p>
      </>
    );
  }

  if (!building) {
    return (
      <>
        <PropertyTabs slug={slug} />
        <div className="adm-card">
          <div className="adm-empty">
            <div className="t">Property not found</div>
            <p>No building with this address exists in the portfolio.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PropertyTabs slug={slug} />
      <PageHead
        eyebrow="Availability"
        title={`${building.name} — Units`}
        lede='These units power the "Available suites" table and the advertised from-prices on the website. Remove all units to show "no suites available".'
      />

      <div className="adm-card">
        {rows.length === 0 ? (
          <div className="adm-empty">
            <div className="t">No available suites</div>
            <p>
              The website shows &lsquo;There are no suites available at the
              moment.&rsquo; for this building.
            </p>
            <button
              type="button"
              className="adm-btn ghost sm"
              style={{ marginTop: 14 }}
              onClick={addUnit}
            >
              <IconPlus />
              Add unit
            </button>
          </div>
        ) : (
          <>
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Unit #</th>
                  <th scope="col">Type</th>
                  <th scope="col">Monthly rent</th>
                  <th scope="col">Apply URL</th>
                  <th scope="col">Photos</th>
                  <th scope="col" aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <Fragment key={i}>
                  <tr>
                    <td>
                      <input
                        className="adm-input"
                        style={{ width: 90 }}
                        value={row.unit}
                        aria-label={`Unit number, row ${i + 1}`}
                        onChange={(e) => editRow(i, { unit: e.target.value })}
                      />
                    </td>
                    <td>
                      <Dropdown
                        variant="admin"
                        ariaLabel={`Unit type, row ${i + 1}`}
                        style={{ width: 150 }}
                        value={row.type}
                        options={typeOptions(row.type)}
                        onChange={(type) => editRow(i, { type })}
                      />
                    </td>
                    <td>
                      <div className="adm-row" style={{ flexWrap: 'nowrap', gap: 8 }}>
                        <span className="adm-muted">$</span>
                        <input
                          type="number"
                          className="adm-input num"
                          style={{ width: 110 }}
                          min={0}
                          value={row.rent === 0 ? '' : row.rent}
                          aria-label={`Monthly rent, row ${i + 1}`}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            editRow(i, { rent: Number.isFinite(v) ? v : 0 });
                          }}
                        />
                      </div>
                    </td>
                    <td>
                      <input
                        type="url"
                        className="adm-input"
                        style={{ minWidth: 220 }}
                        placeholder="Optional — apply link"
                        value={row.applyUrl ?? ''}
                        aria-label={`Apply URL, row ${i + 1}`}
                        onChange={(e) => editRow(i, { applyUrl: e.target.value })}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="adm-btn-bare"
                        aria-expanded={openPhotos === i}
                        aria-label={`Manage photos for unit ${row.unit.trim() || `#${i + 1}`}`}
                        onClick={() => setOpenPhotos(openPhotos === i ? null : i)}
                      >
                        <IconImage />
                        {row.images?.length
                          ? `${row.images.length} photo${row.images.length === 1 ? '' : 's'}`
                          : 'Add photos'}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="adm-btn-bare"
                        aria-label={`Remove unit ${row.unit.trim() || `#${i + 1}`}`}
                        onClick={() => setPendingRemove(i)}
                      >
                        <IconTrash />
                      </button>
                    </td>
                  </tr>
                  {openPhotos === i && (
                    <tr>
                      <td colSpan={6} style={{ background: 'rgba(239,232,220,0.3)' }}>
                        <div className="adm-row" style={{ alignItems: 'flex-start', padding: '6px 0' }}>
                          <div className="adm-row adm-grow" style={{ gap: 10 }}>
                            {(row.images ?? []).map((photo) => (
                              <div key={photo} style={{ position: 'relative' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={previews[photo] ?? photo}
                                  alt=""
                                  loading="lazy"
                                  style={{ width: 84, height: 64, objectFit: 'cover', border: '1px solid var(--adm-hairline)' }}
                                />
                                <button
                                  type="button"
                                  aria-label="Remove this photo"
                                  onClick={() => removeUnitPhoto(i, photo)}
                                  style={{
                                    position: 'absolute', top: -7, right: -7,
                                    width: 20, height: 20, display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    background: 'var(--adm-ink)', color: 'var(--adm-ivory)',
                                    border: 0, borderRadius: '50%', cursor: 'pointer',
                                  }}
                                >
                                  <IconX style={{ width: 10, height: 10 }} />
                                </button>
                              </div>
                            ))}
                            {(row.images ?? []).length === 0 && (
                              <span className="adm-muted" style={{ fontSize: 13 }}>
                                No photos yet — renters see these in the suite&apos;s
                                &lsquo;View&rsquo; gallery.
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="adm-btn ghost sm"
                            disabled={uploading}
                            onClick={() => fileRef.current?.click()}
                          >
                            {uploading ? <IconSpinner /> : <IconUpload />}
                            {uploading ? 'Uploading…' : 'Upload photos'}
                          </button>
                        </div>
                        {!row.unit.trim() && (
                          <p className="adm-help" style={{ margin: '0 0 8px' }}>
                            Give the unit a number first — photos are filed under it.
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '14px 24px' }}>
              <button type="button" className="adm-btn ghost sm" onClick={addUnit}>
                <IconPlus />
                Add unit
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                if (openPhotos !== null) void addUnitPhotos(openPhotos, e.target.files);
              }}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        open={pendingRemove !== null}
        title={`Remove unit ${
          pendingRemove !== null
            ? rows[pendingRemove]?.unit.trim() || `#${pendingRemove + 1}`
            : ''
        }?`}
        body="The website will stop advertising it immediately after you save."
        confirmLabel="Remove"
        danger
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemove(null)}
      />

      {(dirty || stagedFiles.length > 0) && (
        <>
          {!valid && (
            <p className="adm-error-text" style={{ marginTop: 16, marginBottom: 0 }}>
              Every unit needs a unit number and a monthly rent above $0 before you
              can save.
            </p>
          )}
          <div className="adm-savebar">
            <span>You have unsaved changes</span>
            <div className="adm-row">
              <button
                type="button"
                className="adm-btn ghost"
                style={{
                  borderColor: 'rgba(247,243,236,0.4)',
                  color: 'var(--adm-ivory)',
                  background: 'transparent',
                }}
                onClick={() => {
                  setRows(snapshot);
                  setStagedFiles([]);
                  for (const url of Object.values(previews)) URL.revokeObjectURL(url);
                  setPreviews({});
                }}
              >
                Discard
              </button>
              <button
                type="button"
                className="adm-btn gold"
                disabled={!valid || busy}
                onClick={() => void save()}
              >
                {busy && <IconSpinner />}
                Save changes
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
