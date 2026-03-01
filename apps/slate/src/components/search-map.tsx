'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Facility } from '@/lib/api';

interface SearchMapProps {
  facilities: Facility[];
  userLocation: { lat: number; lng: number } | null;
  onClose: () => void;
}

export function SearchMap({ facilities, userLocation, onClose }: SearchMapProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const L = require('leaflet');
    const hasCoords = facilities.filter((f) => f.latitude != null && f.longitude != null);
    const center: [number, number] = userLocation
      ? [userLocation.lat, userLocation.lng]
      : hasCoords.length
        ? [hasCoords[0].latitude!, hasCoords[0].longitude!]
        : [19.076, 72.877];

    const map = L.map(ref.current).setView(center, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    if (userLocation) {
      L.marker([userLocation.lat, userLocation.lng])
        .addTo(map)
        .bindPopup('You are here');
    }

    hasCoords.forEach((f) => {
      L.marker([f.latitude!, f.longitude!])
        .addTo(map)
        .bindPopup(`<strong>${f.name}</strong><br/>${f.city}`);
    });

    if (hasCoords.length > 1 || (userLocation && hasCoords.length > 0)) {
      try {
        map.fitBounds(map.getBounds().pad(0.1));
      } catch (_) {}
    }

    return () => map.remove();
  }, [facilities, userLocation]);

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="absolute inset-0" />
      <Button
        size="icon"
        variant="outline"
        className="absolute right-4 top-4 z-[1000] bg-white shadow-lg"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
