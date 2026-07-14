'use client';

import { useEffect, useState } from 'react';

export interface Me {
  email: string;
  name: string;
  role: 'admin' | 'editor';
}

let cached: Me | null = null;
let inflight: Promise<Me | null> | null = null;

async function fetchMe(): Promise<Me | null> {
  try {
    const res = await fetch('/api/admin/me', { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as Me;
  } catch {
    return null;
  }
}

/** The signed-in user (cached per page load). `undefined` while loading —
 *  render role-gated UI only when `me?.role === 'admin'`, so Editors never
 *  see a flash of admin controls. */
export function useMe(): Me | null | undefined {
  const [me, setMe] = useState<Me | null | undefined>(cached ?? undefined);
  useEffect(() => {
    if (cached) return;
    inflight = inflight ?? fetchMe();
    let cancelled = false;
    inflight.then((m) => {
      cached = m;
      if (!cancelled) setMe(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return me;
}
