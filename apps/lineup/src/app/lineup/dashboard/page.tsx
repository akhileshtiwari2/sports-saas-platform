'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { useMyFacilities, useTenantBookings, useFacilityAnalytics } from '@/lib/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CalendarCheck,
  DollarSign,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export default function LineupDashboardPage() {
  const [facilityId, setFacilityId] = useState<string | undefined>();
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const weekAgo = useMemo(() => format(subDays(new Date(), 7), 'yyyy-MM-dd'), []);

  const { data: facilities } = useMyFacilities();
  const { data: bookingsData, isLoading: bookingsLoading } = useTenantBookings({
    facilityId,
    limit: 100,
  });
  const { data: analytics } = useFacilityAnalytics(
    facilityId ?? facilities?.[0]?.id,
    weekAgo,
    today
  );

  const facility = facilityId ?? facilities?.[0]?.id;
  const bookings = bookingsData?.items ?? [];
  const todayBookings = useMemo(() => {
    const start = startOfDay(new Date()).toISOString();
    const end = endOfDay(new Date()).toISOString();
    return bookings.filter((b) => {
      const slot = (b as { slot?: { startTime?: string } }).slot;
      const t = slot?.startTime ?? b.startTime ?? b.createdAt;
      return t && t >= start && t <= end;
    });
  }, [bookings]);

  const todayRevenue = useMemo(
    () =>
      todayBookings.reduce((s, b) => s + Number((b as { totalAmount?: number }).totalAmount ?? (b as { price?: string }).price ?? 0), 0),
    [todayBookings]
  );

  const revenueChartData = useMemo(() => {
    const occ = (analytics as { occupancyByDate?: Array<{ date: string; booked?: number }> })?.occupancyByDate ?? [];
    return occ.map((x) => ({
      date: format(new Date(x.date), 'MMM d'),
      bookings: x.booked ?? 0,
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [analytics]);

  const upcomingBookings = useMemo(
    () =>
      bookings
        .filter((b) => (b as { status?: string }).status === 'CONFIRMED')
        .slice(0, 5),
    [bookings]
  );

  const totalSlots = useMemo(() => {
    const occ = (analytics as { occupancyByDate?: Array<{ total?: number }> })?.occupancyByDate ?? [];
    return occ.reduce((s, o) => s + (o.total ?? 0), 0);
  }, [analytics]);
  const bookedSlots = useMemo(() => {
    const occ = (analytics as { occupancyByDate?: Array<{ booked?: number }> })?.occupancyByDate ?? [];
    return occ.reduce((s, o) => s + (o.booked ?? 0), 0);
  }, [analytics]);
  const occupancy = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

  const kpis = [
    { label: "Today's Bookings", value: todayBookings.length, icon: CalendarCheck },
    { label: "Today's Revenue", value: `₹${todayRevenue.toLocaleString()}`, icon: DollarSign },
    { label: 'Upcoming', value: upcomingBookings.length, icon: TrendingUp },
    { label: 'Occupancy %', value: `${occupancy.toFixed(1)}%`, icon: Activity },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Dashboard</h1>
          <p className="mt-0.5 text-zinc-500">Overview of your facility</p>
        </div>
        {facilities && facilities.length > 1 && (
          <select
            value={facility ?? ''}
            onChange={(e) => setFacilityId(e.target.value || undefined)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
          >
            <div className="flex items-start justify-between">
              <span className="text-sm text-zinc-500">{kpi.label}</span>
              <kpi.icon className="h-5 w-5 text-amber-400" />
            </div>
            {bookingsLoading ? (
              <Skeleton className="mt-4 h-8 w-24" />
            ) : (
              <p className="mt-4 text-2xl font-semibold text-white">{kpi.value}</p>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
        >
          <h2 className="text-lg font-semibold text-white">Last 7 Days Bookings</h2>
          <div className="mt-6 h-[240px]">
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="lineupRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff' }}
                    formatter={(v: number) => [v.toLocaleString(), 'Bookings']}
                  />
                  <Area type="monotone" dataKey="bookings" stroke="#f59e0b" fill="url(#lineupRev)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">No data</div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
        >
          <h2 className="text-lg font-semibold text-white">Upcoming Bookings</h2>
          <div className="mt-6 space-y-3">
            {upcomingBookings.length > 0 ? (
              upcomingBookings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
                >
                  <span className="font-medium text-white">{(b as { user?: { name?: string } }).user?.name ?? (b as { userName?: string }).userName ?? '—'}</span>
                  <span className="text-sm text-zinc-400">
                    {(() => {
                      const st = (b as { slot?: { startTime?: string } }).slot?.startTime;
                      return st ? format(new Date(st), 'MMM d, h:mm a') : '—';
                    })()}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-zinc-500">
                No upcoming bookings
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
