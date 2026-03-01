'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyFacilities, useTenantBookings, useCompleteBooking, useNoShowBooking, useCancelBooking } from '@/lib/hooks';
import { BookingDrawer } from '@/components/bookings/booking-drawer';
import { toast } from 'sonner';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  CONFIRMED: 'success',
  COMPLETED: 'default',
  CANCELLED: 'destructive',
  NO_SHOW: 'destructive',
  PENDING: 'warning',
};

type BookingRowType = {
  id: string;
  user?: { name?: string; email?: string };
  court?: { name?: string };
  slot?: { startTime?: string; endTime?: string };
  status?: string;
  payment?: { status?: string };
  totalAmount?: number;
};

const BookingRow = React.memo(function BookingRow({
  booking,
  onSelect,
  onComplete,
  onNoShow,
  onCancel,
}: {
  booking: BookingRowType;
  onSelect: () => void;
  onComplete: (id: string) => void;
  onNoShow: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  return (
    <TableRow className="cursor-pointer" onClick={onSelect}>
      <TableCell><span className="font-medium">{booking.user?.name ?? '—'}</span></TableCell>
      <TableCell>{booking.court?.name ?? '—'}</TableCell>
      <TableCell>
        {booking.slot?.startTime ? format(new Date(booking.slot.startTime), 'MMM d, h:mm a') : '—'}
      </TableCell>
      <TableCell>
        <Badge variant={STATUS_VARIANT[booking.status ?? ''] ?? 'default'}>{booking.status ?? '—'}</Badge>
      </TableCell>
      <TableCell>{booking.payment?.status ?? '—'}</TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        {booking.status === 'CONFIRMED' && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onComplete(booking.id)}>Complete</Button>
            <Button size="sm" variant="ghost" onClick={() => onNoShow(booking.id)}>No-show</Button>
            <Button size="sm" variant="ghost" onClick={() => onCancel(booking.id)}>Cancel</Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
});

const defaultStart = format(startOfDay(subDays(new Date(), 7)), 'yyyy-MM-dd');
const defaultEnd = format(endOfDay(new Date()), 'yyyy-MM-dd');

export default function BookingsPage() {
  const [page, setPage] = useState(1);
  const [facilityId, setFacilityId] = useState<string | undefined>();
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [dateStart, setDateStart] = useState(defaultStart);
  const [dateEnd, setDateEnd] = useState(defaultEnd);
  const [selectedBooking, setSelectedBooking] = useState<unknown | null>(null);

  const { data: facilities } = useMyFacilities();
  useEffect(() => {
    const t = setTimeout(() => setAppliedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    setPage(1);
  }, [appliedSearch, status, dateStart, dateEnd, facilityId]);

  const { data, isLoading } = useTenantBookings({
    facilityId,
    page,
    limit: 15,
    status: status || undefined,
    search: appliedSearch || undefined,
    start: dateStart,
    end: dateEnd,
  });
  const complete = useCompleteBooking();
  const noShow = useNoShowBooking();
  const cancel = useCancelBooking();

  const bookings = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleComplete = useCallback(async (id: string) => {
    try {
      await complete.mutateAsync(id);
      toast.success('Marked completed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  }, [complete]);

  const handleNoShow = useCallback(async (id: string) => {
    try {
      await noShow.mutateAsync(id);
      toast.success('Marked no-show');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  }, [noShow]);

  const handleCancel = useCallback(async (id: string) => {
    try {
      await cancel.mutateAsync({ bookingId: id });
      toast.success('Cancelled');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  }, [cancel]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Bookings</h1>
            <p className="mt-0.5 text-zinc-500">Manage all bookings</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {facilities && facilities.length > 1 && (
            <select
              value={facilityId ?? ''}
              onChange={(e) => { setFacilityId(e.target.value || undefined); setPage(1); }}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              <option value="">All facilities</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No-show</option>
          </select>
          <Input
            placeholder="Search by user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 bg-white/5 border-white/10 min-w-[120px]"
          />
          <div className="flex items-center gap-2">
            <Input type="date" value={dateStart} onChange={(e) => { setDateStart(e.target.value); setPage(1); }} className="w-40 bg-white/5 border-white/10" />
            <span className="text-zinc-500">–</span>
            <Input type="date" value={dateEnd} onChange={(e) => { setDateEnd(e.target.value); setPage(1); }} className="w-40 bg-white/5 border-white/10" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-x-auto overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Court</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <BookingRow
                  key={(b as BookingRowType).id}
                  booking={b as BookingRowType}
                  onSelect={() => setSelectedBooking(b)}
                  onComplete={handleComplete}
                  onNoShow={handleNoShow}
                  onCancel={handleCancel}
                />
              ))}
            </TableBody>
          </Table>
        )}
        {total > 15 && (
          <div className="flex items-center justify-between border-t border-white/5 px-6 py-4">
            <span className="text-sm text-zinc-500">{total} bookings</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page * 15 >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <BookingDrawer booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
    </motion.div>
  );
}
