'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateSlot } from '@/lib/hooks';
import { toast } from 'sonner';

interface CreateSlotModalProps {
  open: boolean;
  onClose: () => void;
  facilityId: string | undefined;
  courts: Array<{ id: string; name: string }>;
  refetch: () => void;
}

export function CreateSlotModal({ open, onClose, facilityId, courts, refetch }: CreateSlotModalProps) {
  const createSlot = useCreateSlot();
  const [courtId, setCourtId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState(60);
  const [basePrice, setBasePrice] = useState('500');
  const [weekendPrice, setWeekendPrice] = useState('600');
  const [recurring, setRecurring] = useState(false);
  const [weeks, setWeeks] = useState(4);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courtId || !date) {
      toast.error('Select court and date');
      return;
    }
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(start.getTime() + duration * 60 * 1000);
    try {
      await createSlot.mutateAsync({
        courtId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        basePrice: Number(basePrice),
        weekendPrice: Number(weekendPrice) || undefined,
        weeks: recurring ? weeks : undefined,
      });
      toast.success(recurring ? `Created ${weeks} weekly slots` : 'Slot created');
      onClose();
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create slot');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Create Slot</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-zinc-400">Court</label>
            <select
              value={courtId}
              onChange={(e) => setCourtId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
              required
            >
              <option value="">Select court</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm text-zinc-400">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Start Time</label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Duration (min)</label>
              <Input type="number" min={30} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Base Price (₹)</label>
              <Input value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Weekend Price (₹)</label>
              <Input value={weekendPrice} onChange={(e) => setWeekendPrice(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recurring"
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
                className="rounded border-white/10"
              />
              <label htmlFor="recurring" className="text-sm text-zinc-400">Recurring weekly</label>
            </div>
            {recurring && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-zinc-400">Weeks</label>
                <Input type="number" min={2} max={52} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="w-20" />
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={createSlot.isPending}>
              {createSlot.isPending ? 'Creating...' : 'Create Slot'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
