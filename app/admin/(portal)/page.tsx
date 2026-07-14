'use client';

/* CMS — Dashboard: portfolio stats and an at-a-glance building table. */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getContent } from '@/components/admin/api';
import { PageHead } from '@/components/admin/ui';

interface Building {
  slug: string;
  name: string;
  city: string;
  address: string;
  featured?: boolean;
}

interface Unit {
  unit: string;
  type: string;
  rent: number;
}

interface Photos {
  hero: string | null;
  gallery: string[];
  hidden?: string[];
}

interface CityEntry {
  slug: string;
  label: string;
  province: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [buildings, setBuildings] = useState<Building[] | null>(null);
  const [units, setUnits] = useState<Record<string, Unit[]>>({});
  const [photos, setPhotos] = useState<Record<string, Photos>>({});
  const [cityLabels, setCityLabels] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getContent<Building[]>('buildings'),
      getContent<Record<string, Unit[]>>('units'),
      getContent<Record<string, Photos>>('photos'),
      getContent<Record<string, CityEntry>>('cities'),
    ])
      .then(([b, u, p, cities]) => {
        if (cancelled) return;
        setBuildings(Array.isArray(b) ? b : []);
        setUnits(u ?? {});
        setPhotos(p ?? {});
        const labels: Record<string, string> = {};
        for (const entry of Object.values(
          cities && typeof cities === 'object' ? cities : {}
        )) {
          if (entry && typeof entry.slug === 'string' && typeof entry.label === 'string') {
            labels[entry.slug] = entry.label;
          }
        }
        setCityLabels(labels);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <>
        <PageHead
          eyebrow="Overview"
          title="Dashboard"
          lede="Welcome back — manage your properties, photos, and site content from here."
        />
        <div className="adm-card">
          <div className="adm-empty">
            <div className="t">Something went wrong</div>
            <p>{error}</p>
          </div>
        </div>
      </>
    );
  }

  if (!buildings) {
    return (
      <>
        <PageHead
          eyebrow="Overview"
          title="Dashboard"
          lede="Welcome back — manage your properties, photos, and site content from here."
        />
        <p className="adm-muted">Loading…</p>
      </>
    );
  }

  const unitCount = (slug: string) => units[slug]?.length ?? 0;
  const totalUnits = Object.values(units).reduce(
    (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
    0
  );
  const buildingsWithSuites = buildings.filter((b) => unitCount(b.slug) > 0).length;
  const hiddenPhotos = Object.values(photos).reduce(
    (sum, p) => sum + (p?.hidden?.length ?? 0),
    0
  );

  const photoCounts = (slug: string) => {
    const p = photos[slug];
    if (!p) return { total: 0, hidden: 0 };
    return {
      total: (p.hero ? 1 : 0) + (p.gallery?.length ?? 0),
      hidden: p.hidden?.length ?? 0,
    };
  };

  return (
    <>
      <PageHead
        eyebrow="Overview"
        title="Dashboard"
        lede="Welcome back — manage your properties, photos, and site content from here."
      />

      <div className="adm-stat-grid">
        <div className="adm-stat">
          <div className="adm-stat-value">{buildings.length}</div>
          <div className="adm-stat-label">Properties</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-value">{totalUnits}</div>
          <div className="adm-stat-label">Available units</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-value">{buildingsWithSuites}</div>
          <div className="adm-stat-label">Buildings with suites</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-value">{hiddenPhotos}</div>
          <div className="adm-stat-label">Hidden photos</div>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <h2 className="adm-card-title">Portfolio at a glance</h2>
        </div>
        <table className="adm-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">City</th>
              <th scope="col" className="num">Available units</th>
              <th scope="col" className="num">Photos</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {buildings.map((b) => {
              const pc = photoCounts(b.slug);
              return (
                <tr
                  key={b.slug}
                  className="adm-row-link"
                  onClick={() => router.push(`/admin/properties/${b.slug}`)}
                >
                  <td style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 500 }}>
                    <Link
                      href={`/admin/properties/${b.slug}`}
                      style={{ color: 'inherit', textDecoration: 'none' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {b.name}
                    </Link>
                  </td>
                  <td>{cityLabels[b.city] ?? b.city}</td>
                  <td className="num">{unitCount(b.slug)}</td>
                  <td className="num">
                    {pc.total}
                    {pc.hidden > 0 && (
                      <span className="adm-muted"> · {pc.hidden} hidden</span>
                    )}
                  </td>
                  <td>
                    {b.featured ? (
                      <span className="adm-badge gold">Featured</span>
                    ) : (
                      <span className="adm-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {buildings.length === 0 && (
          <div className="adm-empty">
            <div className="t">No properties yet</div>
            <p>Buildings you add will appear here.</p>
          </div>
        )}
      </div>
    </>
  );
}
