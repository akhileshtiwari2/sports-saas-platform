'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay, addDays } from 'date-fns';
import { motion } from 'framer-motion';
import { MapPin, ArrowLeft, Star, Shield } from 'lucide-react';
import { FacilityMap } from '@/components/facility-map';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SlotPicker } from '@/components/slot-picker';
import { useFacility, useFacilitySlots } from '@/lib/hooks';
import { useAuthStore } from '@/lib/auth-store';
import type { Facility, Slot } from '@/lib/api';

export default function FacilityPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { token } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const { data: facility, isLoading } = useFacility(id);
  const start = useMemo(() => format(startOfDay(new Date()), 'yyyy-MM-dd'), []);
  const end = useMemo(
    () => format(endOfDay(addDays(new Date(), 14)), 'yyyy-MM-dd'),
    []
  );
  const { data: slots = [], isLoading: slotsLoading } = useFacilitySlots(id, start, end);

  const handleBook = () => {
    if (!selectedSlot || !facility) return;
    if (!token) {
      router.push(`/login?redirect=${encodeURIComponent(`/checkout?slotId=${selectedSlot.slotId}&facilityId=${facility.id}`)}`);
      return;
    }
    router.push(
      `/checkout?slotId=${selectedSlot.slotId}&facilityId=${facility.id}`
    );
  };

  if (isLoading || !facility) {
    return (
      <div className="container px-4 py-8">
        <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mt-8 h-64 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/search"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to search
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="aspect-[21/9] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-violet-100 to-slate-100">
          {facility.coverImageUrl ? (
            <img
              src={facility.coverImageUrl}
              alt={facility.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-6xl font-bold text-slate-300">{facility.name.charAt(0)}</span>
            </div>
          )}
        </div>
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{facility.name}</h1>
            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-700">
              <Star className="h-4 w-4 fill-amber-500" />
              {4.2 + (facility.id.charCodeAt(0) % 8) / 10} ({facility._count?.reviews ?? 12} reviews)
            </span>
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-700">
              <Shield className="h-3.5 w-3.5" />
              Instant confirmation
            </span>
          </div>
          {(facility as { cancellationPolicy?: string }).cancellationPolicy && (
            <p className="mt-2 text-sm text-slate-600">
              Cancellation: {(facility as { cancellationPolicy?: string }).cancellationPolicy === 'FREE_UNTIL_24H'
                ? 'Free until 24h before'
                : (facility as { cancellationPolicy?: string }).cancellationPolicy === 'HALF_REFUND_12H'
                  ? 'Half refund until 12h before'
                  : 'No refund'}
            </p>
          )}
          {facility.description && (
            <p className="mt-2 text-slate-600">{facility.description}</p>
          )}
          <p className="mt-2 flex items-center gap-2 text-slate-600">
            <MapPin className="h-4 w-4 shrink-0" />
            {facility.address}, {facility.city}
          </p>
          {(facility.latitude != null && facility.longitude != null) && (
            <div className="mt-4">
              <FacilityMap
                lat={facility.latitude}
                lng={facility.longitude}
                name={facility.name}
                className="h-48"
              />
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-slate-200 bg-white p-6"
      >
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Select a time slot</h2>
        <SlotPicker
          slots={slots}
          selectedSlotId={selectedSlot?.slotId ?? null}
          onSelect={setSelectedSlot}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          loading={slotsLoading}
        />
        {selectedSlot && (
          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
            <div>
              <p className="font-medium text-slate-900">
                {format(new Date(selectedSlot.startTime), 'EEE, MMM d')} at{' '}
                {format(new Date(selectedSlot.startTime), 'h:mm a')}
              </p>
              <p className="text-violet-600 font-semibold">
                Price shown at checkout
              </p>
            </div>
            <Button onClick={handleBook} className="hidden sm:inline-flex">Proceed to checkout</Button>
          </div>
        )}
      </motion.div>

      {/* Sticky bottom bar (mobile) */}
      {selectedSlot && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] sm:hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">
                {format(new Date(selectedSlot.startTime), 'h:mm a')} · Price shown at checkout
              </p>
            </div>
            <Button onClick={handleBook}>Proceed to checkout</Button>
          </div>
        </div>
      )}
      {selectedSlot && <div className="h-20 sm:hidden" />}
    </div>
  );
}
