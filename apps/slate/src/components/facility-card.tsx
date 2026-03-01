'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDistance } from '@/lib/geo';
import type { Facility } from '@/lib/api';

interface FacilityCardProps {
  facility: Facility;
  index?: number;
  distanceKm?: number | null;
  rating?: number | null;
  minPrice?: number | null;
}

export function FacilityCard({ facility, index = 0, distanceKm, rating, minPrice }: FacilityCardProps) {

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="overflow-hidden">
        <div className="aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-violet-100 to-slate-100">
          {facility.coverImageUrl ? (
            <img
              src={facility.coverImageUrl}
              alt={facility.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-4xl font-bold text-slate-300">{facility.name.charAt(0)}</span>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-slate-900">{facility.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {facility.city}
            {facility.address && ` • ${facility.address}`}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {rating != null ? (
              <span className="flex items-center gap-1 text-sm text-amber-600">
                <Star className="h-4 w-4 fill-amber-400" />
                {rating.toFixed(1)}
              </span>
            ) : (
              <span className="text-sm text-slate-500">Rating unavailable</span>
            )}
            {minPrice != null ? (
              <span className="font-semibold text-violet-600">₹{minPrice}/hr</span>
            ) : (
              <span className="font-semibold text-violet-600">Price at checkout</span>
            )}
            {distanceKm != null && (
              <span className="w-full text-xs text-slate-500">{formatDistance(distanceKm)} away</span>
            )}
          </div>
          <Link href={`/facility/${facility.id}`} className="mt-4 block">
            <Button className="w-full">Book Now</Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}
