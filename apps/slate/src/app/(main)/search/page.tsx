'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FacilityCard } from '@/components/facility-card';
import { SearchMap } from '@/components/search-map';
import { useSearchFacilities } from '@/lib/hooks';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Map, List } from 'lucide-react';
import { distanceKm } from '@/lib/geo';
import type { Facility } from '@/lib/api';

type SortOption = 'price_asc' | 'price_desc' | 'rating' | 'distance';

function getDerivedRating(f: Facility): number {
  const count = f._count?.reviews ?? 0;
  if (count === 0) return 4.2 + (f.id.charCodeAt(0) % 8) / 10; // Stable derived rating
  return 4 + (count % 10) / 10;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const [city, setCity] = useState(searchParams.get('city') ?? '');
  const [sport, setSport] = useState(searchParams.get('sport') ?? '');
  const [page, setPage] = useState(1);
  const [ratingMin, setRatingMin] = useState('');
  const [sort, setSort] = useState<SortOption>('rating');
  const [mapMode, setMapMode] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { data: facilities = [], isLoading } = useSearchFacilities({
    city: city || undefined,
    sport: sport || undefined,
    page,
    limit: 24,
  });

  useEffect(() => {
    setCity(searchParams.get('city') ?? '');
    setSport(searchParams.get('sport') ?? '');
  }, [searchParams]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {}
    );
  }, []);

  const filteredAndSorted = useMemo(() => {
    let list = [...facilities].map((f) => ({
      ...f,
      _derivedRating: getDerivedRating(f),
      _distanceKm: userLocation && f.latitude != null && f.longitude != null
        ? distanceKm(userLocation.lat, userLocation.lng, f.latitude, f.longitude)
        : null as number | null,
    }));

    const rMin = ratingMin ? Number(ratingMin) : 0;
    list = list.filter((f) => f._derivedRating >= rMin);

    if (sort === 'rating') list.sort((a, b) => b._derivedRating - a._derivedRating);
    else if (sort === 'distance')
      list.sort((a, b) => (a._distanceKm ?? 999) - (b._distanceKm ?? 999));

    return list;
  }, [facilities, ratingMin, sort, userLocation]);

  return (
    <div className="container px-4 py-8 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Search facilities</h1>
        <p className="mt-1 text-slate-600">Find courts by location and sport</p>
      </motion.div>

      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input placeholder="City..." value={city} onChange={(e) => setCity(e.target.value)} className="pl-12" />
          </div>
          <Input placeholder="Sport (e.g. Tennis)" value={sport} onChange={(e) => setSport(e.target.value)} className="sm:w-48" />
          <Button onClick={() => setPage(1)}>Search</Button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Rating:</span>
            <select
              value={ratingMin}
              onChange={(e) => setRatingMin(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Any</option>
              <option value="4">4+ stars</option>
              <option value="4.5">4.5+ stars</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="rating">Top Rated</option>
              <option value="distance">Nearest</option>
            </select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMapMode((m) => !m)}
            className="ml-auto gap-2"
          >
            {mapMode ? <List className="h-4 w-4" /> : <Map className="h-4 w-4" />}
            {mapMode ? 'List view' : 'Map view'}
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mapMode ? (
          <motion.div
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 mt-14 overflow-hidden bg-white"
          >
            <SearchMap
              facilities={filteredAndSorted}
              userLocation={userLocation}
              onClose={() => setMapMode(false)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-80 animate-pulse rounded-2xl bg-slate-200" />
                ))}
              </div>
            ) : filteredAndSorted.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <p className="text-slate-600">No facilities found. Try different filters.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredAndSorted.map((f, i) => (
                    <FacilityCard
                      key={f.id}
                      facility={f}
                      index={i}
                      distanceKm={(f as { _distanceKm?: number | null })._distanceKm}
                      rating={(f as { _derivedRating?: number })._derivedRating}
                      minPrice={null}
                    />
                  ))}
                </div>
                <div className="mt-8 flex justify-center">
                  <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={facilities.length < 24}>
                    Load more
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container px-4 py-8">Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
