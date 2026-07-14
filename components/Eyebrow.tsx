import type { CSSProperties, ReactNode } from 'react';

interface EyebrowProps {
  children: ReactNode;
  color?: 'ink' | 'gold' | 'ivory' | '';
  className?: string;
  style?: CSSProperties;
}

export function Eyebrow({ children, color, className = '', style }: EyebrowProps) {
  return (
    <div className={`eyebrow ${color ?? ''} ${className}`} style={style}>
      {children}
    </div>
  );
}
