'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PageTransition } from '@/components/ui/page-transition';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Bar,
  BarChart,
} from 'recharts';
import { KPICard } from '@/components/dashboard/kpi-card';
import { DollarSign, Building2, TrendingUp, Activity, Calendar } from 'lucide-react';
import { useDenAnalytics, useSlotUtilization, useCommissionMonthly } from '@/lib/hooks';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function DenDashboardPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const startDate = useMemo(() => {
    const d = new Date(year, month - 1, 1);
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }, [year, month]);
  const endDate = useMemo(() => new Date(year, month, 0).toISOString().slice(0, 10), [year, month]);

  const prevMonth = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const { data: analytics, isLoading: analyticsLoading } = useDenAnalytics(year, month);
  const { data: prevAnalytics } = useDenAnalytics(prevMonth.y, prevMonth.m);
  const { data: utilization, isLoading: utilLoading } = useSlotUtilization(startDate, endDate);
  const { data: monthlyData } = useCommissionMonthly(year, month);

  const revenueTrendData = useMemo(() => {
    if (!monthlyData?.length) return [];
    const byMonth = monthlyData.reduce((acc: Record<string, number>, t) => {
      acc[t.month] = (acc[t.month] ?? 0) + t.grossRevenue;
      return acc;
    }, {});
    return Object.entries(byMonth).map(([monthStr, rev]) => ({
      month: MONTHS[parseInt(monthStr.slice(5, 7), 10) - 1] || monthStr,
      revenue: Math.round(rev),
    }));
  }, [monthlyData]);

  const topTenants = useMemo(() => {
    if (!monthlyData?.length) return [];
    return [...monthlyData]
      .sort((a, b) => b.grossRevenue - a.grossRevenue)
      .slice(0, 5)
      .map((t, i) => ({ rank: i + 1, name: t.tenantId.slice(0, 8), revenue: t.grossRevenue }));
  }, [monthlyData]);

  const utilizationChartData = useMemo(() => {
    if (!utilization?.peakHours?.length) return [];
    return utilization.peakHours.slice(0, 7).map((p) => ({
      hour: `${p.hour}:00`,
      count: p.bookingCount,
    }));
  }, [utilization]);

  const chartData = revenueTrendData.length > 0 ? revenueTrendData : [
    { month: 'Jan', revenue: 0 },
    { month: 'Feb', revenue: 0 },
    { month: 'Mar', revenue: 0 },
  ];

  return (
    <PageTransition>
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Dashboard</h1>
        <p className="mt-0.5 text-zinc-500">Overview of your sports facility platform</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="GMV"
          value={analytics?.gmv ?? 0}
          previousValue={prevAnalytics?.gmv}
          change={analytics?.monthlyGrowth}
          icon={DollarSign}
          delay={0}
          isLoading={analyticsLoading}
          format="currency"
        />
        <KPICard
          title="Active Tenants"
          value={analytics?.activeTenants ?? 0}
          previousValue={prevAnalytics?.activeTenants}
          icon={Building2}
          delay={0.05}
          isLoading={analyticsLoading}
        />
        <KPICard
          title="Monthly Revenue"
          value={analytics?.monthlyRevenue ?? 0}
          previousValue={prevAnalytics?.monthlyRevenue}
          change={analytics?.monthlyGrowth}
          icon={TrendingUp}
          delay={0.1}
          isLoading={analyticsLoading}
          format="currency"
        />
        <KPICard
          title="Growth %"
          value={analytics?.monthlyGrowth ?? 0}
          previousValue={prevAnalytics?.monthlyGrowth}
          change={analytics?.monthlyGrowth}
          icon={Activity}
          delay={0.15}
          isLoading={analyticsLoading}
          format="percent"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Revenue Trend</h2>
              <p className="text-sm text-zinc-500">Monthly revenue</p>
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
                    {MONTHS[d.getMonth()]} {d.getFullYear()}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    color: '#fff',
                  }}
                  formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8b5cf6"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
        >
          <h2 className="text-lg font-semibold text-white">Slot Utilization</h2>
          <p className="mb-6 text-sm text-zinc-500">
            {utilization?.utilizationPercent?.toFixed(1) ?? '0'}% utilization
          </p>
          <div className="h-[280px]">
            {utilizationChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilizationChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="hour" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">
                {utilLoading ? 'Loading...' : 'No utilization data'}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
      >
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar className="h-5 w-5 text-violet-400" />
          Top 5 Tenants
        </h2>
        <div className="mt-6 space-y-4">
          {topTenants.length > 0 ? (
            topTenants.map((t, i) => (
              <div
                key={t.name + i}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/20 text-sm font-medium text-violet-400">
                    {t.rank}
                  </span>
                  <span className="font-medium text-white">{t.name}</span>
                </div>
                <span className="rounded-lg bg-emerald-500/20 px-2 py-1 text-sm text-emerald-400">
                  ₹{t.revenue.toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 p-12 text-center text-zinc-500">
              No tenant data for this period
            </div>
          )}
        </div>
      </motion.div>
    </div>
    </PageTransition>
  );
}
