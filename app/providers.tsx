'use client';
import type { ReactNode } from 'react';
import { FavoritesProvider } from '@/components/FavoritesContext';

export function Providers({ children }: { children: ReactNode }) {
  return <FavoritesProvider>{children}</FavoritesProvider>;
}
