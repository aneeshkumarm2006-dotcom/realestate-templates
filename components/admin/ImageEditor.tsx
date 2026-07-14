'use client';

/* CMS — in-CMS image editor (crop + rotate). Hand-rolled: no
   dependencies. The image renders scaled to fit the viewport with a
   draggable/resizable crop rectangle (pointer events, so touch works).
   Rotation applies to the source; Apply exports the rotated + cropped
   region at natural resolution as a JPEG File via an offscreen canvas.

   Crop is stored in DISPLAYED (stage) coordinates and converted to
   natural pixels on export. */

import { useEffect, useRef, useState } from 'react';
import { IconRotate, IconSpinner } from './icons';

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
type DragMode = Handle | 'move';

interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Stage (displayed) size plus the crop rect in stage coordinates. */
interface View {
  w: number;
  h: number;
  crop: Crop;
}

const ASPECTS: Array<{ label: string; value: number | null }> = [
  { label: 'Free', value: null },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
  { label: '1:1', value: 1 },
];

const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/** Minimum crop size as a fraction of the displayed image. */
const MIN_FRACTION = 0.1;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

function rotatedDims(img: HTMLImageElement, rotation: number): { rw: number; rh: number } {
  const swap = rotation % 180 !== 0;
  return {
    rw: swap ? img.naturalHeight : img.naturalWidth,
    rh: swap ? img.naturalWidth : img.naturalHeight,
  };
}

/** Fit the (rotated) image into ~80vw x ~65vh. If `prev` is given the crop
 *  is rescaled proportionally (window resize); otherwise it resets to full. */
function computeFit(img: HTMLImageElement, rotation: number, prev: View | null): View {
  const { rw, rh } = rotatedDims(img, rotation);
  const maxW = Math.min(window.innerWidth * 0.8, 1100);
  const maxH = window.innerHeight * 0.65;
  const s = Math.min(maxW / rw, maxH / rh);
  const w = Math.max(1, Math.round(rw * s));
  const h = Math.max(1, Math.round(rh * s));
  if (prev) {
    const fx = w / prev.w;
    const fy = h / prev.h;
    return {
      w,
      h,
      crop: {
        x: prev.crop.x * fx,
        y: prev.crop.y * fy,
        w: prev.crop.w * fx,
        h: prev.crop.h * fy,
      },
    };
  }
  return { w, h, crop: { x: 0, y: 0, w, h } };
}

/** Pure crop-drag math: `c0` is the crop at pointer-down, (dx, dy) the
 *  pointer delta, W/H the stage size, `aspect` the locked ratio (or null). */
function nextCrop(
  mode: DragMode,
  c0: Crop,
  dx: number,
  dy: number,
  W: number,
  H: number,
  aspect: number | null
): Crop {
  const minW = W * MIN_FRACTION;
  const minH = H * MIN_FRACTION;

  if (mode === 'move') {
    return {
      ...c0,
      x: clamp(c0.x + dx, 0, W - c0.w),
      y: clamp(c0.y + dy, 0, H - c0.h),
    };
  }

  const west = mode.includes('w');
  const east = mode.includes('e');
  const north = mode.includes('n');
  const south = mode.includes('s');

  if (aspect === null) {
    let { x, y, w, h } = c0;
    if (west) {
      const nx = clamp(c0.x + dx, 0, c0.x + c0.w - minW);
      w = c0.x + c0.w - nx;
      x = nx;
    }
    if (east) w = clamp(c0.w + dx, minW, W - c0.x);
    if (north) {
      const ny = clamp(c0.y + dy, 0, c0.y + c0.h - minH);
      h = c0.y + c0.h - ny;
      y = ny;
    }
    if (south) h = clamp(c0.h + dy, minH, H - c0.y);
    return { x, y, w, h };
  }

  const A = aspect;
  const minWA = Math.max(minW, minH * A);

  if ((west || east) && (north || south)) {
    /* Corner: anchor is the opposite corner. */
    const ax = west ? c0.x + c0.w : c0.x;
    const ay = north ? c0.y + c0.h : c0.y;
    const availX = west ? ax : W - ax;
    const availY = north ? ay : H - ay;
    const w1 = west ? ax - (c0.x + dx) : c0.x + c0.w + dx - ax;
    const h1 = north ? ay - (c0.y + dy) : c0.y + c0.h + dy - ay;
    let w = Math.max(w1, h1 * A);
    w = clamp(w, minWA, Math.min(availX, availY * A));
    const h = w / A;
    return { x: west ? ax - w : ax, y: north ? ay - h : ay, w, h };
  }

  if (west || east) {
    /* Horizontal edge drag: width leads, height stays centered. */
    const ax = west ? c0.x + c0.w : c0.x;
    const availX = west ? ax : W - ax;
    const cy = c0.y + c0.h / 2;
    const maxHCentered = 2 * Math.min(cy, H - cy);
    let w = west ? ax - (c0.x + dx) : c0.x + c0.w + dx - ax;
    w = clamp(w, minWA, Math.min(availX, maxHCentered * A));
    const h = w / A;
    return { x: west ? ax - w : ax, y: cy - h / 2, w, h };
  }

  /* Vertical edge drag: height leads, width stays centered. */
  const ay = north ? c0.y + c0.h : c0.y;
  const availY = north ? ay : H - ay;
  const cx = c0.x + c0.w / 2;
  const maxWCentered = 2 * Math.min(cx, W - cx);
  const minHA = Math.max(minH, minW / A);
  let h = north ? ay - (c0.y + dy) : c0.y + c0.h + dy - ay;
  h = clamp(h, minHA, Math.min(availY, maxWCentered / A));
  const w = h * A;
  return { x: cx - w / 2, y: north ? ay - h : ay, w, h };
}

export function ImageEditor({
  src,
  filename,
  open,
  onCancel,
  onApply,
  busy,
}: {
  src: string;
  filename?: string;
  open: boolean;
  onCancel: () => void;
  onApply: (file: File) => void | Promise<void>;
  busy?: boolean;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [rotation, setRotation] = useState(0); // 0 | 90 | 180 | 270
  const [aspect, setAspect] = useState<number | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    mode: DragMode;
    startX: number;
    startY: number;
    crop0: Crop;
  } | null>(null);

  const working = busy === true || exporting;

  /* Load the source (same-origin path or blob: URL — no CORS taint). */
  useEffect(() => {
    if (!open) return;
    setImg(null);
    setLoadError(false);
    setRotation(0);
    setAspect(null);
    setView(null);
    setExportError(null);
    let cancelled = false;
    const el = new Image();
    el.onload = () => {
      if (!cancelled) setImg(el);
    };
    el.onerror = () => {
      if (!cancelled) setLoadError(true);
    };
    el.src = src;
    return () => {
      cancelled = true;
    };
  }, [open, src]);

  /* Stage layout: recompute on load and rotation; rescale crop on resize. */
  useEffect(() => {
    if (!open || !img) return;
    setView(computeFit(img, rotation, null));
    const onResize = () => setView((prev) => computeFit(img, rotation, prev));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open, img, rotation]);

  /* Escape cancels (overlay click intentionally does not). */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !working) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, working, onCancel]);

  /* Move focus into the dialog when it opens. */
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const ready = img !== null && view !== null && !loadError;

  const pickAspect = (a: number | null) => {
    setAspect(a);
    if (a === null) return;
    setView((prev) => {
      if (!prev) return prev;
      let cw = prev.w;
      let ch = cw / a;
      if (ch > prev.h) {
        ch = prev.h;
        cw = ch * a;
      }
      return {
        ...prev,
        crop: { x: (prev.w - cw) / 2, y: (prev.h - ch) / 2, w: cw, h: ch },
      };
    });
  };

  const rotate = (delta: -90 | 90) => {
    if (!ready || working) return;
    setAspect(null);
    setRotation((r) => (r + delta + 360) % 360);
  };

  const beginDrag = (e: React.PointerEvent<HTMLElement>, mode: DragMode) => {
    if (!view || working) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      crop0: view.crop,
    };
  };

  const dragMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    e.preventDefault();
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    setView((prev) =>
      prev
        ? { ...prev, crop: nextCrop(d.mode, d.crop0, dx, dy, prev.w, prev.h, aspect) }
        : prev
    );
  };

  const endDrag = (e: React.PointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (d && d.pointerId === e.pointerId) dragRef.current = null;
  };

  const dragHandlers = (mode: DragMode) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => beginDrag(e, mode),
    onPointerMove: dragMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  });

  const applyEdit = async () => {
    if (!img || !view || working) return;
    setExportError(null);
    setExporting(true);
    try {
      const { rw, rh } = rotatedDims(img, rotation);
      /* Stage px → natural px (per axis, so rounding cannot drift). */
      const kx = rw / view.w;
      const ky = rh / view.h;
      const sx = clamp(Math.round(view.crop.x * kx), 0, rw - 1);
      const sy = clamp(Math.round(view.crop.y * ky), 0, rh - 1);
      const sw = clamp(Math.round(view.crop.w * kx), 1, rw - sx);
      const sh = clamp(Math.round(view.crop.h * ky), 1, rh - sy);

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is not supported in this browser.');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, sw, sh);
      /* Rotate first, then crop: map rotated-space (sx, sy) to (0, 0). */
      ctx.translate(-sx, -sy);
      if (rotation === 90) {
        ctx.translate(rw, 0);
        ctx.rotate(Math.PI / 2);
      } else if (rotation === 180) {
        ctx.translate(rw, rh);
        ctx.rotate(Math.PI);
      } else if (rotation === 270) {
        ctx.translate(0, rh);
        ctx.rotate(-Math.PI / 2);
      }
      ctx.drawImage(img, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.9)
      );
      if (!blob) throw new Error('Could not export the edited image.');
      const base = (filename ?? 'edited.jpg').replace(/\.[^.]+$/, '') || 'edited';
      const file = new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
      await onApply(file);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'Could not export the edited image.'
      );
    } finally {
      setExporting(false);
    }
  };

  /* The <img> keeps its un-rotated displayed size and is CSS-rotated about
     the stage centre; for 90/270 the stage dims are already swapped. */
  const imgStyle: React.CSSProperties | undefined =
    view !== null
      ? {
          width: rotation % 180 === 0 ? view.w : view.h,
          height: rotation % 180 === 0 ? view.h : view.w,
          left: (view.w - (rotation % 180 === 0 ? view.w : view.h)) / 2,
          top: (view.h - (rotation % 180 === 0 ? view.h : view.w)) / 2,
          transform: `rotate(${rotation}deg)`,
        }
      : undefined;

  return (
    <div className="adm-overlay" role="presentation">
      <div
        ref={panelRef}
        className="adm-imged-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Edit photo"
        tabIndex={-1}
      >
        <div className="adm-imged-head">
          <div className="adm-imged-title">Edit photo</div>
          <div className="adm-imged-pills" role="group" aria-label="Aspect ratio">
            {ASPECTS.map((a) => (
              <button
                key={a.label}
                type="button"
                className={`adm-imged-pill${aspect === a.value ? ' active' : ''}`}
                aria-pressed={aspect === a.value}
                disabled={!ready || working}
                onClick={() => pickAspect(a.value)}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="adm-imged-rotates" role="group" aria-label="Rotate">
            <button
              type="button"
              className="adm-imged-toolbtn"
              aria-label="Rotate 90 degrees left"
              title="Rotate 90° left"
              disabled={!ready || working}
              onClick={() => rotate(-90)}
            >
              <IconRotate style={{ transform: 'scaleX(-1)' }} />
            </button>
            <button
              type="button"
              className="adm-imged-toolbtn"
              aria-label="Rotate 90 degrees right"
              title="Rotate 90° right"
              disabled={!ready || working}
              onClick={() => rotate(90)}
            >
              <IconRotate />
            </button>
          </div>
        </div>

        <div className="adm-imged-stagewrap">
          {loadError ? (
            <p className="adm-imged-error" role="alert">
              Could not load this photo for editing. Close and try again.
            </p>
          ) : !ready ? (
            <div className="adm-imged-loading">
              <IconSpinner />
              <span>Loading photo…</span>
            </div>
          ) : (
            <div
              className="adm-imged-stage"
              style={{ width: view.w, height: view.h }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="adm-imged-img"
                src={src}
                alt=""
                draggable={false}
                style={imgStyle}
              />
              <div className="adm-imged-mask" aria-hidden="true">
                <div
                  className="adm-imged-maskrect"
                  style={{
                    left: view.crop.x,
                    top: view.crop.y,
                    width: view.crop.w,
                    height: view.crop.h,
                  }}
                />
              </div>
              <div
                className="adm-imged-crop"
                style={{
                  left: view.crop.x,
                  top: view.crop.y,
                  width: view.crop.w,
                  height: view.crop.h,
                }}
                {...dragHandlers('move')}
              >
                {HANDLES.map((h) => (
                  <div
                    key={h}
                    className={`adm-imged-handle h-${h}`}
                    aria-hidden="true"
                    {...dragHandlers(h)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="adm-imged-foot">
          {exportError && (
            <span className="adm-imged-error" role="alert">
              {exportError}
            </span>
          )}
          <button
            type="button"
            className="adm-btn ghost"
            style={{
              borderColor: 'rgba(247,243,236,0.4)',
              color: 'var(--adm-ivory)',
              background: 'transparent',
            }}
            onClick={onCancel}
            disabled={working}
          >
            Cancel
          </button>
          <button
            type="button"
            className="adm-btn gold"
            onClick={() => void applyEdit()}
            disabled={!ready || working}
          >
            {working && <IconSpinner />}
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
