import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
import './admin.css';

export const metadata: Metadata = {
  title: `${BRAND.shortName} Content Studio`,
  description: `Manage the ${BRAND.name} website — properties, photos, availability, and site settings.`,
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
