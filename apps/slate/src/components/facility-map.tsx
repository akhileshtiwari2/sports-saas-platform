'use client';

import { useEffect, useRef } from 'react';

interface FacilityMapProps {
  lat?: number | null;
  lng?: number | null;
  name?: string;
  className?: string;
}

export function FacilityMap({ lat, lng, name, className = '' }: FacilityMapProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lat || !lng || !ref.current) return;
    const L = require('leaflet');
    const map = L.map(ref.current).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);
    L.marker([lat, lng]).addTo(map).bindPopup(name ?? 'Facility');
    return () => map.remove();
  }, [lat, lng, name]);

  if (!lat || !lng) {
    return (
      <div className={`flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 ${className}`}>
        <span className="text-sm">No map coordinates</span>
      </div>
    );
  }

  return <div ref={ref} className={`h-48 rounded-xl ${className}`} />;
}
