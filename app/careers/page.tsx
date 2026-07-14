/* Route dispatcher — renders the active template's view.
   The template is resolved per request (lib/active.ts): fixed by
   content/brand.json normally, cookie-overridable in showcase mode. */
import { getActive } from '@/lib/active';
import { viewsFor } from '@/templates/registry';

export default function Page() {
  const View = viewsFor(getActive().template).Careers;
  return <View />;
}
