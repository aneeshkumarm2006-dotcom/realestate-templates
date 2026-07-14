'use client';
import dynamic from 'next/dynamic';

export const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#F4F1EA',
      }}
      aria-label="Loading map"
    />
  ),
});
