import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Property, IslandRegion } from '@/lib/types';
import { ISLAND_PRESETS } from '@/lib/types';

type MapMode = 'public' | 'exact' | 'host-builder';

interface MapViewProps {
  properties: Property[];
  highlightedId: string | null;
  onPinClick?: (id: string) => void;
  exactLocation?: { lat: number; lng: number } | null;
  hostPinBuilder?: boolean;
  onPinPlace?: (lat: number, lng: number) => void;
  region?: IslandRegion;
  mode?: MapMode;
}

export default function MapView({
  properties,
  highlightedId,
  onPinClick,
  exactLocation,
  hostPinBuilder,
  onPinPlace,
  region = 'sint_maarten',
  mode: modeProp,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const circlesRef = useRef<L.Circle[]>([]);
  const renderKeyRef = useRef(0);

  const preset = ISLAND_PRESETS[region] || ISLAND_PRESETS.sint_maarten;
  const mode: MapMode = modeProp || (hostPinBuilder ? 'host-builder' : exactLocation ? 'exact' : 'public');

  // Initialize or re-center map when region changes — force full re-render on load
  useEffect(() => {
    if (!containerRef.current) return;

    // Destroy existing map to force full re-render (prevents Leaflet tile caching bugs)
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markersRef.current = {};
      circlesRef.current = [];
    }

    const map = L.map(containerRef.current, {
      center: preset.center,
      zoom: preset.zoom,
      zoomControl: true,
      attributionControl: false,
    });

    // Force invalidateSize after creation to ensure tiles render correctly
    setTimeout(() => map.invalidateSize(), 100);

    tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(map);

    mapRef.current = map;

    // Host pin-builder: click to place a pin
    if (hostPinBuilder) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onPinPlace?.(e.latlng.lat, e.latlng.lng);
        // Remove previous builder pins
        Object.keys(markersRef.current).forEach((k) => {
          if (k.startsWith('_builder')) {
            markersRef.current[k].remove();
            delete markersRef.current[k];
          }
        });
        const pin = L.marker([e.latlng.lat, e.latlng.lng], {
          icon: L.divIcon({
            className: 'custom-pin',
            html: `<div style="width:28px;height:28px;background:#10b981;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 28],
          }),
        }).addTo(map).bindPopup(`<div style="font-family:Inter,sans-serif;font-size:13px;font-weight:600;">Pin placed here</div>`);
        markersRef.current['_builder'] = pin;
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = {};
        circlesRef.current = [];
      }
    };
  }, [region, hostPinBuilder]);

  // Update markers/circles based on mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear all existing markers and circles
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};
    circlesRef.current.forEach((c) => c.remove());
    circlesRef.current = [];

    const validProps = properties.filter((p) => p.latitude != null && p.longitude != null);
    if (validProps.length === 0) return;

    if (mode === 'public') {
      // PRIVACY MODE: Only show approximate area circles, no exact pins
      validProps.forEach((p) => {
        const isHighlighted = p.id === highlightedId;
        // Draw a generalized area circle (800m radius) to protect host privacy
        const circle = L.circle([p.latitude!, p.longitude!], {
          radius: 800,
          color: isHighlighted ? '#10b981' : '#3a3d4e',
          fillColor: isHighlighted ? '#10b981' : '#3a3d4e',
          fillOpacity: isHighlighted ? 0.2 : 0.1,
          weight: isHighlighted ? 2 : 1,
        }).addTo(map);

        circle.bindPopup(`<div style="font-family:Inter,sans-serif;font-size:13px;font-weight:600;">${p.title}</div><div style="font-size:11px;color:#666;margin-top:2px;">${p.location} Area</div>`);
        circle.on('click', () => onPinClick?.(p.id));
        circlesRef.current.push(circle);

        // Add a small label marker (no pin drop — just text)
        const label = L.marker([p.latitude!, p.longitude!], {
          icon: L.divIcon({
            className: 'area-label',
            html: `<div style="
              background: rgba(20,21,28,0.9);
              color: ${isHighlighted ? '#10b981' : 'rgba(255,255,255,0.7)'};
              font-family: Inter, sans-serif;
              font-size: 11px;
              font-weight: 600;
              padding: 3px 8px;
              border-radius: 6px;
              border: 1px solid ${isHighlighted ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'};
              white-space: nowrap;
              transform: translate(-50%, -50%);
              pointer-events: none;
            ">${p.location} Area</div>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          }),
          interactive: false,
        }).addTo(map);
        markersRef.current[p.id] = label;
      });

      // Fit bounds to show all area circles
      if (validProps.length > 1) {
        const bounds = L.latLngBounds(validProps.map((p) => [p.latitude!, p.longitude!] as [number, number]));
        map.fitBounds(bounds, { padding: [60, 60] });
      } else {
        map.setView([validProps[0].latitude!, validProps[0].longitude!], 13);
      }
    } else if (mode === 'exact' || mode === 'host-builder') {
      // EXACT MODE: Show precise pins (post-booking or host view)
      validProps.forEach((p) => {
        const isHighlighted = p.id === highlightedId;
        const marker = L.marker([p.latitude!, p.longitude!], {
          icon: L.divIcon({
            className: 'custom-pin',
            html: `<div style="
              width: ${isHighlighted ? '32px' : '24px'};
              height: ${isHighlighted ? '32px' : '24px'};
              background: ${isHighlighted ? '#10b981' : '#3a3d4e'};
              border: 2px solid white;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              transition: all 0.2s ease;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            "></div>`,
            iconSize: [isHighlighted ? 32 : 24, isHighlighted ? 32 : 24],
            iconAnchor: [isHighlighted ? 16 : 12, isHighlighted ? 32 : 24],
          }),
        }).addTo(map);

        marker.bindPopup(`<div style="font-family: Inter, sans-serif; font-size: 13px; font-weight: 600;">${p.title}</div>`);
        marker.on('click', () => onPinClick?.(p.id));
        markersRef.current[p.id] = marker;
      });

      if (validProps.length > 1) {
        const bounds = L.latLngBounds(validProps.map((p) => [p.latitude!, p.longitude!] as [number, number]));
        map.fitBounds(bounds, { padding: [40, 40] });
      } else if (validProps.length === 1) {
        map.setView([validProps[0].latitude!, validProps[0].longitude!], 14);
      }
    }
  }, [properties, mode, highlightedId]);

  // Handle exact location (post-booking unlock)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !exactLocation) return;

    // Remove previous exact marker
    if (markersRef.current['_exact']) {
      markersRef.current['_exact'].remove();
    }

    const exactMarker = L.marker([exactLocation.lat, exactLocation.lng], {
      icon: L.divIcon({
        className: 'custom-pin',
        html: `<div style="
          width: 28px; height: 28px;
          background: #10b981; border: 3px solid white;
          border-radius: 50%; transition: all 0.2s;
          box-shadow: 0 0 0 4px rgba(16,185,129,0.3);
        "></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    }).addTo(map);
    exactMarker.bindPopup('<div style="font-family:Inter,sans-serif;font-size:13px;font-weight:600;">Exact Location</div>');
    markersRef.current['_exact'] = exactMarker;

    // Small confirmation circle at exact location
    const confirmCircle = L.circle([exactLocation.lat, exactLocation.lng], {
      radius: 100,
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.15,
    }).addTo(map);
    circlesRef.current.push(confirmCircle);

    map.setView([exactLocation.lat, exactLocation.lng], 16);
  }, [exactLocation]);

  return <div ref={containerRef} className="w-full h-full" style={{ background: '#1e1f28' }} />;
}
