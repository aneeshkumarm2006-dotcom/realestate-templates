'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconChevronLeft } from './icons';

const TABS = [
  { suffix: '', label: 'Details' },
  { suffix: '/images', label: 'Photos' },
  { suffix: '/units', label: 'Units & availability' },
];

/** Sub-navigation shared by the per-property admin pages. */
export function PropertyTabs({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/admin/properties/${slug}`;
  return (
    <div className="adm-row" style={{ marginBottom: 24 }}>
      <Link href="/admin/properties" className="adm-btn-bare">
        <IconChevronLeft />
        All properties
      </Link>
      <span style={{ width: 1, height: 20, background: 'var(--adm-hairline-strong)' }} />
      {TABS.map(({ suffix, label }) => {
        const href = base + suffix;
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`adm-btn sm${active ? '' : ' ghost'}`}
            aria-current={active ? 'page' : undefined}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
