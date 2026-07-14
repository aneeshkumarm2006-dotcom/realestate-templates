'use client';
import { useRouter } from 'next/navigation';
import { BRAND } from '@/lib/brand';

interface LogoProps {
  /** "light" = dark mark on ivory/light bg, "dark" = light mark on ink/dark bg */
  variant?: 'light' | 'dark';
  /** Pixel height of the mark; width follows brand.logo.aspectRatio. */
  height?: number;
}

export function Logo({ variant = 'light', height = 30 }: LogoProps) {
  const router = useRouter();
  const { logo, name } = BRAND;
  const src = variant === 'dark' ? logo.dark : logo.light;
  return (
    <button
      type="button"
      onClick={() => router.push('/')}
      aria-label={`${name}, home`}
      style={{
        background: 'transparent',
        border: 0,
        padding: 0,
        margin: 0,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        style={{
          height,
          // Sized from the declared ratio so the header doesn't shift while the
          // mark loads; `contain` letterboxes rather than distorts if a client
          // drops in artwork whose true ratio differs from brand.json.
          width: height * logo.aspectRatio,
          objectFit: 'contain',
          objectPosition: 'left center',
          display: 'block',
        }}
      />
    </button>
  );
}
