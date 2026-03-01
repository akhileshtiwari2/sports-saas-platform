'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Calendar, MapPin, CalendarPlus, RotateCcw, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useMyBookings, useCancelBooking } from '@/lib/hooks';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from 'sonner';
import { CountdownTimer } from '@/components/countdown-timer';
import { createIcsContent, downloadIcs } from '@/lib/calendar';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  CONFIRMED: 'success',
  COMPLETED: 'default',
  CANCELLED: 'destructive',
  PENDING: 'warning',
  NO_SHOW: 'destructive',
};

export default function BookingsPage() {
  const { token } = useAuthStore();
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const { data, isLoading } = useMyBookings({
    status: filter === 'upcoming' ? 'CONFIRMED' : undefined,
    limit: 20,
  });
  const cancelBooking = useCancelBooking();

  const bookings = (data?.items ?? []).filter((b) => {
    if (filter === 'upcoming')
      return ['CONFIRMED', 'PENDING'].includes(b.status ?? '') && new Date(b.slot?.startTime ?? 0) >= new Date();
    return true;
  });

  const handleCancel = async (id: string) => {
    try {
      await cancelBooking.mutateAsync({ bookingId: id, reason: 'User requested' });
      toast.success('Booking cancelled');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  if (!token) {
    return (
      <div className="container flex min-h-[50vh] flex-col items-center justify-center px-4">
        <Calendar className="h-16 w-16 text-slate-300" />
        <p className="mt-4 text-slate-600">Log in to view your bookings</p>
        <Link href="/login">
          <Button className="mt-4">Log in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">My bookings</h1>
      <p className="mt-1 text-slate-600">View and manage your reservations</p>

      <div className="mt-6 flex gap-2">
        <Button
          variant={filter === 'upcoming' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('upcoming')}
        >
          Upcoming
        </Button>
        <Button
          variant={filter === 'past' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('past')}
        >
          Past
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-slate-600">No bookings yet</p>
          <Link href="/search">
            <Button className="mt-4">Find a court</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {bookings.map((b) => {
            const slotStart = b.slot?.startTime ? new Date(b.slot.startTime) : null;
            const slotEnd = slotStart && b.slot?.endTime ? new Date(b.slot.endTime) : slotStart ? new Date(slotStart.getTime() + 60 * 60 * 1000) : null;
            const isUpcoming = ['CONFIRMED', 'PENDING'].includes(b.status ?? '') && slotStart && slotStart >= new Date();
            const isCompleted = b.status === 'COMPLETED';

            return (
              <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{b.facility?.name ?? 'Facility'}</p>
                      <p className="text-sm text-slate-600">{b.court?.name ?? 'Court'}</p>
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <MapPin className="h-4 w-4" />
                        {b.facility?.city}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {slotStart ? format(slotStart, 'EEE, MMM d, h:mm a') : '—'}
                      </p>
                      {isUpcoming && slotStart && (
                        <p className="mt-2 text-sm font-medium text-violet-600">
                          In <CountdownTimer target={slotStart} />
                        </p>
                      )}
                      <p className="font-medium text-violet-600">₹{Number(b.totalAmount)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={STATUS_VARIANT[b.status ?? ''] ?? 'default'}>{b.status}</Badge>
                      {isUpcoming && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => {
                              const ics = createIcsContent({
                                title: `Booking: ${b.facility?.name ?? 'Court'}`,
                                start: slotStart!,
                                end: slotEnd ?? new Date(slotStart!.getTime() + 3600000),
                                location: b.facility?.address,
                              });
                              downloadIcs(ics, `booking-${b.id}.ics`);
                              toast.success('Calendar file downloaded');
                            }}
                          >
                            <CalendarPlus className="h-4 w-4" />
                            Add to calendar
                          </Button>
                          <Link href={`/facility/${b.facilityId}`}>
                            <Button variant="outline" size="sm" className="gap-1.5">
                              <RotateCcw className="h-4 w-4" />
                              Rebook
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancel(b.id)}
                            disabled={cancelBooking.isPending}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {isCompleted && (
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <Star className="h-4 w-4" />
                          Leave a review
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
