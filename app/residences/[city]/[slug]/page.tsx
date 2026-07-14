/* Route dispatcher — renders the active template's Property view.
   The template is resolved per request (lib/active.ts). */
import { getActive } from '@/lib/active';
import { viewsFor } from '@/templates/registry';

export default function Page({ params }: { params: { slug: string } }) {
  const View = viewsFor(getActive().template).Property;
  return <View params={params} />;
}
