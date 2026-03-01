'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import type { Slot } from '@/lib/slots';

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  slot: Slot | null;
  onConfirm?: () => void;
  isLoading?: boolean;
}

export function BookingModal({ open, onClose, slot, onConfirm, isLoading }: BookingModalProps) {
  if (!slot) return null;
  const price = slot.weekendPrice ?? slot.basePrice;
  const isWeekend = [0, 6].includes(new Date(slot.startTime).getDay());
  const displayPrice = isWeekend && slot.weekendPrice ? slot.weekendPrice : slot.basePrice;
  const isBooked = slot.isBooked;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#18181b] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                {isBooked ? 'Booking Details' : 'Slot Details'}
              </h2>
              <button onClick={onClose} className="rounded-xl p-2 text-zinc-400 hover:bg-white/5 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-zinc-500">Time</p>
                <p className="font-medium text-white">{format(new Date(slot.startTime), 'EEEE, MMM d')}</p>
                <p className="text-zinc-400">
                  {format(new Date(slot.startTime), 'h:mm a')} – {format(new Date(slot.endTime), 'h:mm a')}
                </p>
              </div>
              {isBooked && slot.bookingInfo && (
                <div className="rounded-xl bg-white/5 p-4 space-y-2">
                  <p className="text-sm text-zinc-500">Booked by</p>
                  <p className="font-medium text-white">{slot.bookingInfo.userName}</p>
                  <p className="text-sm text-zinc-400">{slot.bookingInfo.userEmail}</p>
                  {slot.bookingInfo.userPhone && (
                    <p className="text-sm text-zinc-400">{slot.bookingInfo.userPhone}</p>
                  )}
                  <p className="text-xs text-violet-400 font-mono">{slot.bookingInfo.id}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-zinc-500">Amount</p>
                <p className="text-2xl font-bold text-violet-400">₹{displayPrice}</p>
              </div>
            </div>
            {!isBooked && onConfirm && (
              <div className="mt-8 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-white/10 py-3 font-medium text-zinc-300 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex-1 rounded-xl bg-violet-600 py-3 font-medium text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
