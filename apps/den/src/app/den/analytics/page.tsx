'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useDenAnalytics, useSlotUtilization } from '@/lib/hooks';
import { UtilizationHeatmap } from '@/components/analytics/utilization-heatmap';
import { PageTransition } from '@/components/ui/page-transition';
import { EmptyState } from '@/components/ui/empty-state';
import { BarChart3, Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const statusData = [
  { name: 'Confirmed', value: 60, color: '#10b981' },
  { name: 'Completed', value: 25, color: '#8b5cf6' },
  { name: 'Cancelled', value: 10, color: '#ef4444' },
  { name: 'No Show', value: 5, color: '#f59e0b' },
];

export default function AnalyticsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const startDate = useMemo(
    () => new Date(year, month - 1, 1).toISOString().slice(0, 10),
    [year, month]
  );
  const endDate = useMemo(
    () => new Date(year, month, 0).toISOString().slice(0, 10),
    [year, month]
  );

  const { data: analytics, isLoading: analyticsLoading } = useDenAnalytics(year, month);
  const { data: utilization, isLoading: utilLoading } = useSlotUtilization(startDate, endDate);

  const peakHours = utilization?.peakHours ?? [];
  const hasHeatmapData = peakHours.length > 0;

  return (
    <PageTransition>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Analytics</h1>
            <p className="mt-0.5 text-zinc-500">Slot utilization, peak hours, and growth</p>
          </div>
          <select
            value={`${year}-${month}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number);
              setYear(y);
              setMonth(m);
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            {Array.from({ length: 6 }, (_, i) => {
              const d = new Date(year, month - 1 - i, 1);
              return (
                <option key={i} value={`${d.getFullYear()}-${d.getMonth() + 1}`}>
                  {d.toLocaleString('default', { month: 'long' })} {d.getFullYear()}
                </option>
              );
            })}
          </select>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
          >
            <h2 className="text-lg font-semibold text-white">Slot Utilization Heatmap</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Hour (0–23) × Day of week · Color = booking intensity
            </p>
            <div className="mt-6">
              {utilLoading ? (
                <Skeleton className="h-[280px] w-full rounded-xl" />
              ) : hasHeatmapData ? (
                <UtilizationHeatmap
                  peakHours={peakHours}
                  totalBooked={utilization?.bookedSlots ?? 0}
                  totalSlots={utilization?.totalSlots ?? 1}
                  utilizationPercent={utilization?.utilizationPercent ?? 0}
                />
              ) : (
                <EmptyState
                  icon={BarChart3}
                  title="No utilization data"
                  description="Select a date range with bookings to see the heatmap"
                  className="min-h-[240px]"
                />
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
          >
            <h2 className="text-lg font-semibold text-white">Booking Status Breakdown</h2>
            <p className="mt-1 text-sm text-zinc-500">Distribution by status</p>
            <div className="mt-6 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={statusData[i].color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      color: '#fff',
                    }}
                    formatter={(v: number) => [`${v}%`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
        >
          <h2 className="text-lg font-semibold text-white">Growth Summary</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {analyticsLoading ? (
              <>
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </>
            ) : (
              <>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="text-sm text-zinc-500">Monthly Growth</p>
                  <p
                    className={`mt-2 text-2xl font-semibold ${
                      (analytics?.monthlyGrowth ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {(analytics?.monthlyGrowth ?? 0).toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="text-sm text-zinc-500">Utilization %</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {(utilization?.utilizationPercent ?? 0).toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="text-sm text-zinc-500">Revenue per Tenant</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    ₹{(analytics?.revenuePerTenant ?? 0).toLocaleString()}
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
