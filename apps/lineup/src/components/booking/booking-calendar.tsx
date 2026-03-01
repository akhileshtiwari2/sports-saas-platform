'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format,
  addDays,
  startOfWeek,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Slot } from '@/lib/slots';

interface BookingCalendarProps {
  slots: Slot[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onSlotSelect: (slot: Slot) => void;
  selectedSlotId?: string | null;
}

export type { Slot } from '@/lib/slots';

export function BookingCalendar({
  slots,
  selectedDate,
  onDateChange,
  onSlotSelect,
  selectedSlotId,
}: BookingCalendarProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(selectedDate, { weekStartsOn: 1 }));
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const isWeekend = (d: Date) => [0, 6].includes(d.getDay());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekStart((w) => subWeeks(w, 1))}
          className="rounded-xl p-2 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-medium text-zinc-500">
          {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </span>
        <button
          onClick={() => setWeekStart((w) => addWeeks(w, 1))}
          className="rounded-xl p-2 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const active = isSameDay(day, selectedDate);
          const today = isToday(day);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateChange(day)}
              className={cn(
                'rounded-xl py-4 px-2 transition-all',
                active ? 'bg-violet-600 text-white' : 'bg-white/5 hover:bg-white/10 border border-white/5',
                today && !active && 'ring-2 ring-violet-500/50'
              )}
            >
              <span className="block text-xs font-medium uppercase opacity-70">{format(day, 'EEE')}</span>
              <span className="block text-lg font-semibold mt-1">{format(day, 'd')}</span>
            </button>
          );
        })}
      </div>

      <div>
        <h3 className="text-sm font-medium text-zinc-500 mb-3">
          Slots for {format(selectedDate, 'EEEE, MMM d')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <AnimatePresence mode="popLayout">
            {slots.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed border-white/10 p-12 text-center text-zinc-500">
                No slots for this day
              </div>
            ) : (
              slots.map((slot, i) => {
                const isSelected = selectedSlotId === slot.id;
                const booked = slot.isBooked;
                const price = slot.weekendPrice && isWeekend(selectedDate) ? slot.weekendPrice : slot.basePrice;
                return (
                  <motion.div
                    key={slot.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className={cn(
                      'rounded-xl border p-4 text-left transition-all',
                      booked ? 'bg-white/5 border-white/5 cursor-pointer' : 'hover:border-violet-500/50',
                      isSelected && 'border-violet-500 bg-violet-600/20 ring-2 ring-violet-500/30'
                    )}
                    onClick={() => onSlotSelect(slot)}
                  >
                    <span className="block font-medium text-white">
                      {format(new Date(slot.startTime), 'h:mm a')} – {format(new Date(slot.endTime), 'h:mm a')}
                    </span>
                    <span className={cn('mt-2 block text-sm font-semibold', isSelected ? 'text-violet-400' : 'text-zinc-500')}>
                      ₹{price}
                    </span>
                    {booked && slot.bookingInfo ? (
                      <div className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                        <span className="block text-xs font-medium text-emerald-400">Booked</span>
                        <span className="block text-xs text-zinc-400 mt-0.5">{slot.bookingInfo.userName}</span>
                        <span className="block text-xs text-zinc-500 truncate">{slot.bookingInfo.userEmail}</span>
                      </div>
                    ) : booked ? (
                      <span className="mt-2 block rounded-lg bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400 w-fit">
                        Booked
                      </span>
                    ) : null}
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
