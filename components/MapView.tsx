'use client';
import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import type { Residence } from '@/lib/data';
import { bedroomShort, formatPrice } from '@/lib/data';
import { Eyebrow } from './Eyebrow';
import { PlaceholderImg } from './SmartImage';

const POSITRON_TILES =
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const POSITRON_ATTR = '© OpenStreetMap  ·  © CARTO';

function pinSvg(active: boolean): string {
  const scale = active ? 1.18 : 1;
  const w = 32 * scale;
  const h = 44 * scale;
  return `
    <svg width="${w}" height="${h}" viewBox="0 0 32 44" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 6px rgba(10,25,41,0.30));">
      <path d="M16 1 C 7.7 1, 1 7.7, 1 16 C 1 26, 16 43, 16 43 C 16 43, 31 26, 31 16 C 31 7.7, 24.3 1, 16 1 Z"
            fill="#0A1929" stroke="#F7F3EC" stroke-width="1.2" />
      <circle cx="16" cy="16" r="4.5" fill="#F7F3EC" />
    </svg>
  `;
}

interface MapViewProps {
  residences: Residence[];
  selectedId?: string | null;
  onSelect?: (id: string, navigateTo?: boolean) => void;
  height?: string;
  showPreview?: boolean;
  interactive?: boolean;
}

export default function MapView({
  residences,
  selectedId,
  onSelect,
  height = '100%',
  showPreview = true,
  interactive = true,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!containerRef.current || mapRef.current) return;
      const L = (await import('leaflet')).default;
      if (cancelled) return;

      const m = L.map(containerRef.current!, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: interactive,
        dragging: interactive,
        doubleClickZoom: interactive,
        touchZoom: interactive,
        keyboard: interactive,
        boxZoom: interactive,
        preferCanvas: false,
        zoomSnap: 0.25,
        wheelPxPerZoomLevel: 120,
      });

      L.tileLayer(POSITRON_TILES, {
        maxZoom: 19,
        minZoom: 4,
        subdomains: 'abcd',
        detectRetina: true,
        attribution: POSITRON_ATTR,
      }).addTo(m);

      if (interactive) {
        L.control.zoom({ position: 'bottomright' }).addTo(m);
      }
      L.control.attribution({ position: 'bottomleft', prefix: '' }).addTo(m);

      mapRef.current = m;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      try {
        mapRef.current?.remove();
      } catch {
        // ignore
      }
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = mapRef.current;
    if (!m || !containerRef.current) return;
    const ro = new ResizeObserver(() => {
      try {
        m.invalidateSize();
      } catch {
        // ignore
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [ready]);

  // Build markers and fit the map to them. Runs only when the residence set
  // changes, NOT on hover/select, so user zoom/pan is never reset.
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !mapRef.current) return;

      Object.values(markersRef.current).forEach((mk) => mk.remove());
      markersRef.current = {};

      if (!residences.length) return;

      residences.forEach((r) => {
        const active = r.id === selectedId || r.id === hoverId;
        const icon = L.divIcon({
          className: 'map-pin-wrap' + (active ? ' active' : ''),
          html: pinSvg(active),
          iconSize: active ? [38, 52] : [32, 44],
          iconAnchor: active ? [19, 52] : [16, 44],
        });
        const mk = L.marker([r.coordinates.lat, r.coordinates.lng], {
          icon,
          riseOnHover: true,
          zIndexOffset: active ? 1000 : 0,
        }).addTo(m);

        mk.on('click', () => onSelect?.(r.id));
        mk.on('mouseover', () => setHoverId(r.id));
        mk.on('mouseout', () => setHoverId(null));

        markersRef.current[r.id] = mk;
      });

      const latlngs = residences.map(
        (r) => [r.coordinates.lat, r.coordinates.lng] as [number, number]
      );
      if (latlngs.length === 1) {
        m.setView(latlngs[0], 14);
      } else {
        const bounds = L.latLngBounds(latlngs);
        m.fitBounds(bounds, {
          padding: [60, 60],
          maxZoom: 13.5,
          animate: true,
          duration: 0.6,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residences, ready]);

  // Update marker styling for hover/selection without re-fitting the view.
  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !mapRef.current) return;

      residences.forEach((r) => {
        const mk = markersRef.current[r.id];
        if (!mk) return;
        const active = r.id === selectedId || r.id === hoverId;
        mk.setIcon(
          L.divIcon({
            className: 'map-pin-wrap' + (active ? ' active' : ''),
            html: pinSvg(active),
            iconSize: active ? [38, 52] : [32, 44],
            iconAnchor: active ? [19, 52] : [16, 44],
          })
        );
        mk.setZIndexOffset(active ? 1000 : 0);
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, hoverId, ready]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m || !selectedId) return;
    const r = residences.find((x) => x.id === selectedId);
    if (!r) return;
    m.flyTo([r.coordinates.lat, r.coordinates.lng], Math.max(m.getZoom(), 14), {
      duration: 0.8,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const previewId = hoverId || selectedId;
  const preview = showPreview && previewId
    ? residences.find((r) => r.id === previewId)
    : null;

  return (
    <div
      style={{ position: 'relative', height, width: '100%' }}
      className="map-view"
    >
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', background: '#F4F1EA' }}
      />
      {preview && (
        <div
          className="map-preview-card"
          onClick={() => onSelect?.(preview.id, true)}
        >
          <div className="thumb">
            {preview.heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.heroImage}
                alt={preview.name}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <PlaceholderImg label="" tone="warm">
                {preview.name.charAt(0)}
              </PlaceholderImg>
            )}
          </div>
          <div className="info">
            <Eyebrow style={{ fontSize: 9.5, marginBottom: 4 }}>
              {preview.cityLabel}
            </Eyebrow>
            <div
              className="serif"
              style={{
                fontWeight: 500,
                fontSize: 16,
                marginBottom: 4,
                lineHeight: 1.2,
              }}
            >
              {preview.name}
            </div>
            <div className="caption muted">
              {bedroomShort(preview.bedroomOptions)}
            </div>
            <div className="small serif" style={{ marginTop: 4 }}>
              From {formatPrice(preview.priceFrom)}
              <span
                className="caption muted"
                style={{ fontFamily: 'var(--sans)' }}
              >
                {' '}/mo
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
