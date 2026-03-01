'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, startOfWeek, startOfDay, endOfDay, isToday } from 'date-fns';
import { useMyFacilities, useCourts, useFacilitySlots, useBulkDeleteSlots } from '@/lib/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateSlotModal } from '@/components/calendar/create-slot-modal';
import { toast } from 'sonner';
import React from 'react';

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-emerald-500/30 border-emerald-500/50',
  CANCELLED: 'bg-zinc-500/20 border-zinc-500/30',
  COMPLETED: 'bg-blue-500/30 border-blue-500/50',
  NO_SHOW: 'bg-red-500/30 border-red-500/50',
  PENDING: 'bg-amber-500/20 border-amber-500/40',
};

const CalendarSlotCell = React.memo(function CalendarSlotCell({
  slot,
  onClick,
  isSelected,
}: {
  slot: { id: string; startTime: string; status?: string; court?: { name?: string }; userName?: string };
  onClick: () => void;
  isSelected?: boolean;
}) {
  const status = slot.status ?? 'AVAILABLE';
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`rounded-lg border p-3 cursor-pointer transition-colors hover:ring-1 hover:ring-amber-500/50 ${STATUS_COLORS[status] ?? 'bg-white/5 border-white/10'} ${isSelected ? 'ring-2 ring-amber-500' : ''}`}
      onClick={onClick}
    >
      <p className="text-sm font-medium text-white">{format(new Date(slot.startTime), 'h:mm a')}</p>
      <p className="text-xs text-zinc-400">{slot.court?.name ?? 'Court'}</p>
      {slot.userName && <p className="text-xs text-emerald-400 mt-1">{slot.userName}</p>}
    </motion.div>
  );
});

export default function LineupCalendarPage() {
  const [view, setView] = useState<'day' | 'week'>('week');
  const [cursor, setCursor] = useState(new Date());
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | undefined>();
  const [courtFilter, setCourtFilter] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<unknown | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();
  const { data: facilities } = useMyFacilities();
  const facilityId = selectedFacilityId ?? facilities?.[0]?.id;
  const { data: courts = [] } = useCourts(facilityId);
  const start = useMemo(() => format(startOfDay(cursor), 'yyyy-MM-dd'), [cursor]);
  const end = useMemo(() => format(endOfDay(addDays(cursor, view === 'week' ? 6 : 0)), 'yyyy-MM-dd'), [cursor, view]);

  const { data: slots = [], isLoading } = useFacilitySlots(facilityId, start, end);

  const weekStart = startOfWeek(cursor, { weekStartsOn: 1 });
  const days = useMemo(
    () => view === 'day' ? [cursor] : Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [view, cursor, weekStart]
  );

  const slotsByDay = useMemo(() => {
    const map: Record<string, Array<{ id: string; startTime: string; status?: string; court?: { id?: string; name?: string }; userName?: string }>> = {};
    const list = slots as Array<{ id: string; startTime: string; court?: { id?: string; name?: string }; bookings?: Array<{ status?: string; user?: { name?: string } }> }>;
    const filtered = courtFilter ? list.filter((s) => s.court?.id === courtFilter) : list;
    for (const s of filtered) {
      const d = format(new Date(s.startTime), 'yyyy-MM-dd');
      if (!map[d]) map[d] = [];
      const booking = s.bookings?.[0];
      const slotData = {
        ...s,
        status: booking ? (booking as { status?: string }).status : 'AVAILABLE',
        userName: (booking?.user as { name?: string })?.name,
      };
      map[d].push(slotData);
    }
    return map;
  }, [slots, courtFilter]);

  const bulkDelete = useBulkDeleteSlots();
  const refetchSlots = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['facilitySlots'] });
  }, [queryClient]);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error('Select slots to delete');
      return;
    }
    try {
      const res = await bulkDelete.mutateAsync(Array.from(selectedIds));
      toast.success(`Deleted ${res.deleted} slot(s)${res.failed.length ? `, ${res.failed.length} failed` : ''}`);
      setSelectedIds(new Set());
      refetchSlots();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const toggleSelect = (id: string, hasBooking: boolean) => {
    if (hasBooking) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Calendar</h1>
          <p className="mt-0.5 text-zinc-500">Manage slots and bookings</p>
        </div>
        <div className="flex items-center gap-4">
          {facilities && facilities.length > 1 && (
            <select
              value={facilityId ?? ''}
              onChange={(e) => setSelectedFacilityId(e.target.value || undefined)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
          {courts.length > 1 && (
            <select
              value={courtFilter}
              onChange={(e) => setCourtFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              <option value="">All courts</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <select
            value={view}
            onChange={(e) => setView(e.target.value as 'day' | 'week')}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
          </select>
          {selectedIds.size > 0 && (
            <Button variant="outline" onClick={handleBulkDelete} disabled={bulkDelete.isPending} className="border-red-500/50 text-red-400 hover:bg-red-500/10">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete {selectedIds.size} slot(s)
            </Button>
          )}
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Slot
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setCursor((c) => addDays(c, -1))}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-lg font-medium text-white">
          {view === 'week'
            ? `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`
            : format(cursor, 'EEEE, MMM d, yyyy')}
        </span>
        <Button variant="outline" size="icon" onClick={() => setCursor((c) => addDays(c, 1))}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        {isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <div className="grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
            {days.map((day) => {
              const dStr = format(day, 'yyyy-MM-dd');
              const daySlots = slotsByDay[dStr] ?? [];
              return (
                <div key={dStr} className="border-r border-white/5 last:border-r-0 p-4">
                  <p className={isToday(day) ? 'font-semibold text-amber-400' : 'text-zinc-400'}>
                    {format(day, 'EEE d')}
                  </p>
                  <div className="mt-4 space-y-2">
                    <AnimatePresence>
                      {daySlots.map((slot) => {
                        const s = slot as { id: string; startTime: string; status?: string; court?: { name?: string }; userName?: string };
                        const hasBooking = s.status !== 'AVAILABLE';
                        const isSelected = selectedIds.has(s.id);
                        return (
                          <div key={s.id} className="relative">
                            {!hasBooking && (
                              <div className="absolute left-2 top-2 z-10" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelect(s.id, false)}
                                  className="rounded"
                                />
                              </div>
                            )}
                            <CalendarSlotCell
                              slot={s}
                              onClick={() => (hasBooking ? setSelectedSlot(slot) : toggleSelect(s.id, false))}
                              isSelected={isSelected}
                            />
                          </div>
                        );
                      })}
                    </AnimatePresence>
                    {daySlots.length === 0 && (
                      <p className="text-sm text-zinc-500">No slots</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateSlotModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        facilityId={facilityId}
        courts={courts}
        refetch={refetchSlots}
      />
    </motion.div>
  );
}
