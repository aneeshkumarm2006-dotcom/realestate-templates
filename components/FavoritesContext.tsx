'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface FavoritesValue {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  count: number;
}

const FavoritesContext = createContext<FavoritesValue>({
  ids: [],
  toggle: () => {},
  has: () => false,
  count: 0,
});

/** Namespaced so the key can't collide with anything else on the origin.
 *  Brand-neutral on purpose: rebranding a site must not orphan a resident's
 *  saved residences. Favourites are UI state only — never anything sensitive. */
const STORAGE_KEY = 'residences:favorites';

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setIds(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // ignore
    }
  }, [ids]);

  const toggle = useCallback((id: string) => {
    setIds((curr) =>
      curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]
    );
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  const value = useMemo(
    () => ({ ids, toggle, has, count: ids.length }),
    [ids, toggle, has]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => useContext(FavoritesContext);
