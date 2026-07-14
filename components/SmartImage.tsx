'use client';
import { useState, type CSSProperties } from 'react';

type Tone = 'warm' | 'cool' | 'deep' | 'light';

const TONES: Record<Tone, { from: string; to: string; mark: string }> = {
  warm:  { from: '#E8DEC8', to: '#D4C3A0', mark: 'rgba(10,25,41,0.18)' },
  cool:  { from: '#DDD8CD', to: '#BAB5A8', mark: 'rgba(10,25,41,0.20)' },
  deep:  { from: '#C9BFA6', to: '#A89C7E', mark: 'rgba(10,25,41,0.22)' },
  light: { from: '#F1ECDF', to: '#E0D9C8', mark: 'rgba(10,25,41,0.16)' },
};

interface PlaceholderProps {
  label?: string;
  tone?: Tone;
  children?: React.ReactNode;
  style?: CSSProperties;
}

export function PlaceholderImg({
  label = 'Residence interior',
  tone = 'warm',
  children,
  style,
}: PlaceholderProps) {
  const t = TONES[tone];
  return (
    <div
      className="placeholder-img"
      data-label={label}
      style={{
        background: `repeating-linear-gradient(135deg, rgba(184,150,90,0.05) 0 14px, rgba(184,150,90,0.11) 14px 28px), linear-gradient(160deg, ${t.from}, ${t.to})`,
        ...style,
      }}
    >
      <span className="mono-mark" style={{ color: t.mark }}>
        {children || '·'}
      </span>
    </div>
  );
}

interface SmartImageProps {
  src?: string;
  alt?: string;
  fallbackLabel?: string;
  fallbackTone?: Tone;
  fallbackChar?: string;
  style?: CSSProperties;
  className?: string;
  loading?: 'eager' | 'lazy';
  kenBurns?: boolean;
}

export function SmartImage({
  src,
  alt = '',
  fallbackLabel,
  fallbackTone = 'warm',
  fallbackChar,
  style,
  className,
  loading = 'lazy',
  kenBurns = false,
}: SmartImageProps) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <PlaceholderImg
        label={fallbackLabel || alt}
        tone={fallbackTone}
        style={style}
      >
        {fallbackChar || (alt && alt[0]) || '·'}
      </PlaceholderImg>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={loading}
      onError={() => setErrored(true)}
      className={`${className ?? ''}${kenBurns ? ' ken-burns' : ''}`}
      style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }}
    />
  );
}
