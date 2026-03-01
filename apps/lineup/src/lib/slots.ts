import { addHours } from 'date-fns';

export interface Slot {
  id: string;
  startTime: Date;
  endTime: Date;
  basePrice: number;
  weekendPrice?: number | null;
  isBooked: boolean;
  bookingInfo?: {
    id: string;
    userName: string;
    userEmail: string;
    userPhone: string;
  };
}

const DEFAULT_SLOTS = [
  { start: 9, end: 10, price: 500, weekendPrice: 600 },
  { start: 10, end: 11, price: 500, weekendPrice: 600 },
  { start: 11, end: 12, price: 500, weekendPrice: 600 },
  { start: 14, end: 15, price: 500, weekendPrice: 600 },
  { start: 15, end: 16, price: 500, weekendPrice: 600 },
  { start: 16, end: 17, price: 500, weekendPrice: 600 },
  { start: 17, end: 18, price: 600, weekendPrice: 700 },
];

export interface ApiBooking {
  id: string;
  facilityName: string;
  facilityId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  date: string;
  timeSlot: string;
  price: string;
}

/** Generate slots for a date and merge with bookings */
export function getSlotsForDate(date: Date, bookings: ApiBooking[]): Slot[] {
  const dateStr = date.toISOString().split('T')[0];

  return DEFAULT_SLOTS.map((s, i) => {
    const startTime = new Date(date);
    startTime.setHours(s.start, 0, 0, 0);
    const endTime = addHours(startTime, 1);
    const timeSlotStr = `${String(s.start).padStart(2, '0')}:00 - ${String(s.end).padStart(2, '0')}:00`;
    const booking = bookings.find(
      (b) => b.date === dateStr && b.timeSlot === timeSlotStr
    );

    return {
      id: `slot-${dateStr}-${i}`,
      startTime,
      endTime,
      basePrice: s.price,
      weekendPrice: s.weekendPrice,
      isBooked: !!booking,
      bookingInfo: booking
        ? {
            id: booking.id,
            userName: booking.userName,
            userEmail: booking.userEmail,
            userPhone: booking.userPhone,
          }
        : undefined,
    };
  });
}
