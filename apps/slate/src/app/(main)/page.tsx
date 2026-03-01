'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, Search, Dumbbell, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FacilityCard } from '@/components/facility-card';
import { useSearchFacilities } from '@/lib/hooks';

const SPORTS = [
  'Tennis',
  'Badminton',
  'Basketball',
  'Squash',
  'Football',
  'Cricket',
];

export default function HomePage() {
  const [city, setCity] = useState('');
  const { data: facilities = [], isLoading } = useSearchFacilities({ city: city || undefined, limit: 6 });

  return (
    <div className="container px-4 py-8 sm:px-6 lg:px-8">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-violet-500 to-indigo-600 px-8 py-16 text-white sm:px-12 lg:px-16"
      >
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Book sports facilities
            <br />
            <span className="text-violet-100">near you</span>
          </h1>
          <p className="mt-4 text-lg text-violet-100/90">
            Find courts, reserve slots, and play. Simple as that.
          </p>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/10 to-transparent" />
        <Sparkles className="absolute right-12 top-12 h-24 w-24 text-white/20" />
      </motion.section>

      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by city..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="pl-12"
            />
          </div>
          <Link href="/search" className="sm:w-auto">
            <Button className="w-full gap-2 sm:w-auto">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </Link>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-10"
      >
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-slate-500">
          Popular sports
        </h2>
        <div className="flex flex-wrap gap-2">
          {SPORTS.map((sport) => (
            <Link key={sport} href={`/search?sport=${encodeURIComponent(sport)}`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Dumbbell className="h-4 w-4" />
                {sport}
              </Button>
            </Link>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-12"
      >
        <h2 className="mb-6 text-xl font-semibold">Featured facilities</h2>
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : facilities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <MapPin className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-slate-600">No facilities found. Try a different search.</p>
            <Link href="/search">
              <Button variant="outline" className="mt-4">
                Browse all
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {facilities.map((f, i) => (
              <FacilityCard key={f.id} facility={f} index={i} />
            ))}
          </div>
        )}
        {facilities.length > 0 && (
          <div className="mt-8 text-center">
            <Link href="/search">
              <Button variant="outline">View all facilities</Button>
            </Link>
          </div>
        )}
      </motion.section>
    </div>
  );
}
