/* Route dispatcher — renders the active template's City view.
   The template is resolved per request (lib/active.ts). */
import { getActive } from '@/lib/active';
import { viewsFor } from '@/templates/registry';

export default function Page({ params }: { params: { city: string } }) {
  const View = viewsFor(getActive().template).City;
  return <View params={params} />;
}
