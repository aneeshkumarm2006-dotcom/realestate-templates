'use client';
import { useState, type MouseEvent } from 'react';
import { useFavorites } from './FavoritesContext';
import { HeartIcon } from './icons';

interface FavoriteHeartProps {
  id: string;
  size?: number;
  onClick?: (e: MouseEvent) => void;
}

export function FavoriteHeart({ id, size = 20, onClick }: FavoriteHeartProps) {
  const { has, toggle } = useFavorites();
  const [animKey, setAnimKey] = useState(0);
  const filled = has(id);

  const handle = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClick?.(e);
    toggle(id);
    setAnimKey((k) => k + 1);
  };

  return (
    <button
      onClick={handle}
      aria-label={filled ? 'Remove from favorites' : 'Save to favorites'}
      aria-pressed={filled}
      style={{
        background: 'transparent',
        border: 0,
        padding: 6,
        margin: -6,
        color: filled ? 'var(--gold)' : 'var(--ink)',
      }}
    >
      <span key={animKey} className="heart-pop" style={{ display: 'inline-flex' }}>
        <HeartIcon filled={filled} size={size} />
      </span>
    </button>
  );
}
