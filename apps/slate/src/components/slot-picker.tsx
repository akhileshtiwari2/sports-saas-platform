'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import { format, isSameDay, addDays, startOfDay, isBefore } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';
import type { Slot } from '@/lib/api';

interface SlotPickerProps {
  slots: Slot[];
  selectedSlotId: string | null;
  onSelect: (slot: Slot) => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  loading?: boolean;
}

export const SlotPicker = React.memo(function SlotPicker({
  slots,
  selectedSlotId,
  onSelect,
  selectedDate,
  onDateChange,
  loading,
}: SlotPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const now = new Date();

  const days = useMemo(() => {
    const start = startOfDay(now);
    return Array.from({ length: 14 }, (_, i) => addDays(start, i));
  }, []);

  const slotsForDay = useMemo(() => {
    const d = format(selectedDate, 'yyyy-MM-dd');
    return slots
      .filter((s) => format(new Date(s.startTime), 'yyyy-MM-dd') === d)
      .map((s) => {
        const slotTime = new Date(s.startTime);
        const isPast = isBefore(slotTime, now);
        const hourKey = format(slotTime, 'HH');
        const isBooked = s.availability === 'BOOKED';
        return { ...s, isPast, hourKey, isBooked };
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [slots, selectedDate]);

  const availableSlots = slotsForDay.filter((s) => !s.isPast && !s.isBooked);
  const popularHours = useMemo(() => {
    const counts: Record<string, number> = {};
    slots.forEach((s) => {
      if (s.availability !== 'BOOKED') {
        const h = format(new Date(s.startTime), 'HH');
        counts[h] = (counts[h] ?? 0) + 1;
      }
    });
    const max = Math.max(...Object.values(counts), 1);
    return new Set(Object.entries(counts).filter(([, c]) => c >= max * 0.6).map(([h]) => h));
  }, [slots]);

  const firstAvailableRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (availableSlots.length > 0 && !selectedSlotId && firstAvailableRef.current) {
      firstAvailableRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [availableSlots.length, selectedSlotId]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-medium text-slate-700">Select date</h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {days.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isPast = isBefore(day, now);
            return (
              <button
                key={day.toISOString()}
                onClick={() => !isPast && onDateChange(day)}
                disabled={isPast}
                className={cn(
                  'shrink-0 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all',
                  isPast && 'cursor-not-allowed opacity-50',
                  isSelected
                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                    : !isPast && 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                {format(day, 'EEE d')}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-slate-700">Available slots</h3>
        {loading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-200" />
            ))}
          </div>
        ) : slotsForDay.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-500">
            No slots available on this date
          </p>
        ) : (
          <div ref={containerRef} className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slotsForDay.map((slot) => {
              const isSelected = selectedSlotId === slot.slotId;
              const isDisabled = slot.isPast || slot.isBooked;
              const isPopular = popularHours.has(slot.hourKey);

              if (isDisabled) {
                return (
                  <button
                    key={slot.slotId}
                    disabled
                    className={cn(
                      'rounded-xl border border-slate-100 bg-slate-50 py-3 text-sm text-slate-400 line-through'
                    )}
                  >
                    {format(new Date(slot.startTime), 'h:mm a')}
                    <br />
                    <span className="text-xs">{slot.isBooked ? 'Booked' : 'Past'}</span>
                  </button>
                );
              }

              return (
                <motion.button
                  key={slot.slotId}
                  ref={
                    !selectedSlotId && slot.slotId === availableSlots[0]?.slotId
                      ? firstAvailableRef
                      : undefined
                  }
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  animate={isSelected ? { scale: 1.02 } : { scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => onSelect(slot)}
                  className={cn(
                    'relative rounded-xl border py-3 text-sm font-medium transition-all',
                    isSelected
                      ? 'border-violet-500 bg-violet-600 text-white shadow-lg ring-2 ring-violet-300 ring-offset-2'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50'
                  )}
                >
                  {isPopular && !isSelected && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                      <TrendingUp className="h-2.5 w-2.5" />
                    </span>
                  )}
                  {format(new Date(slot.startTime), 'h:mm a')}
                  <br />
                  <span className={cn('text-xs', isSelected ? 'opacity-90' : 'text-slate-500')}>
                    Price at checkout
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
