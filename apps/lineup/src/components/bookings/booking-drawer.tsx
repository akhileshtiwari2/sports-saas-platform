'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface BookingDrawerProps {
  booking: unknown | null;
  onClose: () => void;
}

export function BookingDrawer({ booking, onClose }: BookingDrawerProps) {
  if (!booking) return null;
  const b = booking as {
    id: string;
    user?: { name?: string; email?: string; phone?: string };
    court?: { name?: string };
    slot?: { startTime?: string; endTime?: string };
    status?: string;
    payment?: { status?: string; amount?: number };
    totalAmount?: number;
    createdAt?: string;
  };

  return (
    <Sheet open={!!booking} onOpenChange={(o) => !o && onClose()}>
      <SheetContent onClose={onClose}>
        <SheetHeader>
          <SheetTitle>Booking Details</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div>
            <p className="text-sm text-zinc-500">User</p>
            <p className="font-medium text-white">{b.user?.name ?? '—'}</p>
            <p className="text-sm text-zinc-400">{b.user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Court</p>
            <p className="font-medium text-white">{b.court?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Time</p>
            <p className="font-medium text-white">
              {b.slot?.startTime && b.slot?.endTime
                ? `${format(new Date(b.slot.startTime), 'MMM d, h:mm a')} – ${format(new Date(b.slot.endTime), 'h:mm a')}`
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Status</p>
            <Badge variant={b.status === 'CONFIRMED' ? 'success' : b.status === 'CANCELLED' ? 'destructive' : 'default'}>
              {b.status ?? '—'}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Amount</p>
            <p className="font-medium text-white">₹{Number(b.totalAmount ?? b.payment?.amount ?? 0).toLocaleString()}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
