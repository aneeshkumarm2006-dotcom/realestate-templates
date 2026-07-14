import { Fragment, type ReactNode } from 'react';

/** Render `text` with its final word italicised — the signature Boutique
 *  display-serif emphasis (see Home.tsx). Data-driven, so it works with any
 *  headline copy coming out of the CMS. */
export function italicLast(text: string): ReactNode {
  const parts = text.trim().split(/\s+/);
  if (parts.length <= 1) return <em>{text}</em>;
  const last = parts.pop() as string;
  return (
    <Fragment>
      {parts.join(' ')} <em>{last}</em>
    </Fragment>
  );
}

/** Roman numerals for ordered passages/pillars — used only as a fallback when
 *  the CMS copy doesn't already carry its own numeral. */
export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

/** Copy such as whyUs.pillars[].eyebrow arrives as "I · OWNERSHIP" — one field
 *  holding both a numeral and a label. Split it so the numeral can be set as an
 *  oversized display glyph and the label as a tiny tracked one. Falls back to a
 *  roman numeral by index when the separator isn't there. */
export function splitNumeralEyebrow(
  raw: string,
  index: number
): { numeral: string; label: string } {
  const at = raw.indexOf('·');
  if (at === -1) {
    return { numeral: ROMAN[index] ?? String(index + 1), label: raw.trim() };
  }
  const numeral = raw.slice(0, at).trim();
  const label = raw.slice(at + 1).trim();
  return {
    numeral: numeral || ROMAN[index] || String(index + 1),
    label: label || raw.trim(),
  };
}
