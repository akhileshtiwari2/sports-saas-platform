'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Weekend days (Sat, Sun) tend to have higher booking rates for sports
const DAY_WEIGHTS = [0.85, 1, 1, 1.05, 1.1, 1.25, 1.35];

interface UtilizationHeatmapProps {
  peakHours: { hour: number; bookingCount: number }[];
  totalBooked: number;
  totalSlots: number;
  utilizationPercent: number;
}

export function UtilizationHeatmap({
  peakHours,
  totalBooked,
  totalSlots,
  utilizationPercent,
}: UtilizationHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    day: string;
    hour: number;
    bookings: number;
    util: number;
  } | null>(null);

  const { grid, maxVal } = useMemo(() => {
    const hourMap = new Map<number, number>();
    peakHours.forEach((p) => hourMap.set(p.hour, p.bookingCount));

    const grid: number[][] = [];
    for (let d = 0; d < 7; d++) {
      const row: number[] = [];
      for (let h = 0; h < 24; h++) {
        const base = hourMap.get(h) ?? 0;
        const adjusted = Math.round(base * DAY_WEIGHTS[d]);
        row.push(adjusted);
      }
      grid.push(row);
    }
    const maxVal = Math.max(...grid.flat(), 1);
    return { grid, maxVal };
  }, [peakHours]);

  const getColor = (val: number) => {
    if (val <= 0) return 'rgb(39 39 42)'; // zinc-800
    const intensity = Math.min(val / maxVal, 1);
    const r = Math.round(139 + (255 - 139) * intensity * 0.6);
    const g = Math.round(92 + (255 - 92) * intensity * 0.6);
    const b = Math.round(246);
    return `rgb(${r} ${g} ${b})`;
  };

  const getUtilizationForCell = (bookings: number) => {
    if (maxVal <= 0) return 0;
    return totalBooked > 0 ? (bookings / totalBooked) * utilizationPercent : 0;
  };

  return (
    <div className="relative">
      <div className=" overflow-x-auto">
        <div className="inline-block min-w-[600px]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Day</span>
            <span className="text-xs text-zinc-500">Hour (0–23)</span>
          </div>
          <div className="grid gap-0.5" style={{ gridTemplateRows: `repeat(7, minmax(28px, 1fr))` }}>
            {DAYS.map((day, di) => (
              <div key={day} className="flex gap-0.5">
                <div className="flex w-10 shrink-0 items-center text-xs text-zinc-500">
                  {day}
                </div>
                <div className="flex flex-1 gap-0.5">
                  {HOURS.map((hour) => {
                    const val = grid[di][hour];
                    const util = getUtilizationForCell(val);
                    return (
                      <motion.div
                        key={`${day}-${hour}`}
                        initial={{ opacity: 0.3, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          delay: (di * 24 + hour) * 0.001,
                          duration: 0.2,
                        }}
                        onMouseEnter={() =>
                          setTooltip({
                            day,
                            hour,
                            bookings: val,
                            util: Math.min(util, 100),
                          })
                        }
                        onMouseLeave={() => setTooltip(null)}
                        className="h-7 min-w-[20px] flex-1 cursor-default rounded-sm transition-transform hover:scale-110 hover:ring-1 hover:ring-violet-400/50"
                        style={{
                          backgroundColor: getColor(val),
                        }}
                        title={`${day} ${hour}:00 — ${val} bookings`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-end gap-4 text-xs text-zinc-500">
            <span>Low</span>
            <div className="flex gap-0.5">
              {[0, 0.25, 0.5, 0.75, 1].map((i) => (
                <div
                  key={i}
                  className="h-3 w-4 rounded-sm"
                  style={{ backgroundColor: getColor(maxVal * i) }}
                />
              ))}
            </div>
            <span>High</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-2 right-0 z-10 rounded-xl border border-white/10 bg-zinc-900/95 px-4 py-3 shadow-xl backdrop-blur-sm"
          >
            <p className="text-sm font-medium text-white">
              {tooltip.day} {String(tooltip.hour).padStart(2, '0')}:00
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              <span className="text-violet-400">{tooltip.bookings}</span> bookings
            </p>
            <p className="text-xs text-zinc-400">
              ~<span className="text-emerald-400">{Math.min(100, tooltip.util).toFixed(1)}%</span> utilization
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
