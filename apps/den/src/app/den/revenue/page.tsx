'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useCommissionMonthly } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Download, DollarSign, Percent, TrendingUp, Wallet } from 'lucide-react';
import { PageTransition } from '@/components/ui/page-transition';
import { EmptyState } from '@/components/ui/empty-state';
import { BarChart2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function RevenuePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: monthlyData, isLoading } = useCommissionMonthly(year, month);

  const chartData = useMemo(() => {
    if (!monthlyData?.length) return [];
    return monthlyData.map((t) => ({
      name: t.tenantId.slice(0, 8),
      gross: t.grossRevenue,
      commission: t.commissionAmount,
      net: t.netPayout,
    }));
  }, [monthlyData]);

  const totals = useMemo(() => {
    if (!monthlyData?.length) return { gmv: 0, commission: 0, payout: 0, margin: 0 };
    const gmv = monthlyData.reduce((a, t) => a + t.grossRevenue, 0);
    const commission = monthlyData.reduce((a, t) => a + t.commissionAmount, 0);
    const payout = monthlyData.reduce((a, t) => a + t.netPayout, 0);
    const margin = gmv > 0 ? (commission / gmv) * 100 : 0;
    return { gmv, commission, payout, margin };
  }, [monthlyData]);

  const exportCsv = () => {
    if (!monthlyData?.length) {
      toast.error('No data to export');
      return;
    }
    const headers = ['Tenant', 'Gross Revenue', 'Commission', 'Net Payout'];
    const rows = monthlyData.map((t) =>
      [t.tenantId, t.grossRevenue, t.commissionAmount, t.netPayout].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-${year}-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Revenue exported');
  };

  const summaryCards = [
    {
      label: 'GMV',
      value: totals.gmv,
      icon: DollarSign,
      format: (v: number) => `₹${v.toLocaleString()}`,
      className: 'text-white',
    },
    {
      label: 'Platform Commission',
      value: totals.commission,
      icon: Percent,
      format: (v: number) => `₹${v.toLocaleString()}`,
      className: 'text-violet-400',
    },
    {
      label: 'Net Payout',
      value: totals.payout,
      icon: Wallet,
      format: (v: number) => `₹${v.toLocaleString()}`,
      className: 'text-emerald-400',
    },
    {
      label: 'Margin %',
      value: totals.margin,
      icon: TrendingUp,
      format: (v: number) => `${v.toFixed(1)}%`,
      className: 'text-amber-400',
    },
  ];

  return (
    <PageTransition>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Revenue</h1>
            <p className="mt-0.5 text-zinc-500">Revenue by tenant and commission breakdown</p>
          </div>
          <div className="flex gap-4">
            <select
              value={`${year}-${month}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-').map(Number);
                setYear(y);
                setMonth(m);
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              {Array.from({ length: 12 }, (_, i) => {
                const d = new Date(year, i, 1);
                return (
                  <option key={i} value={`${year}-${i + 1}`}>
                    {d.toLocaleString('default', { month: 'long' })} {year}
                  </option>
                );
              })}
            </select>
            <Button variant="outline" onClick={exportCsv} disabled={!monthlyData?.length}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -2 }}
              className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-all hover:border-violet-500/20"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-zinc-500">{card.label}</p>
                  {isLoading ? (
                    <Skeleton className="mt-2 h-8 w-24" />
                  ) : (
                    <p className={`mt-2 text-2xl font-semibold ${card.className}`}>
                      {card.format(card.value)}
                    </p>
                  )}
                </div>
                <div className="rounded-xl bg-violet-600/20 p-2.5">
                  <card.icon className="h-5 w-5 text-violet-400" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
        >
          <h2 className="text-lg font-semibold text-white">Revenue by Tenant</h2>
          <p className="mt-1 text-sm text-zinc-500">Gross vs Commission vs Net (stacked)</p>
          <div className="mt-6 h-[380px]">
            {isLoading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      color: '#fff',
                    }}
                    formatter={(v: number, name: string) => [`₹${v.toLocaleString()}`, name]}
                  />
                  <Legend
                    formatter={(value) => (
                      <span className="text-sm text-zinc-400">{value}</span>
                    )}
                  />
                  <Bar dataKey="commission" stackId="a" fill="#06b6d4" radius={[0, 0, 0, 0]} name="Commission" />
                  <Bar dataKey="net" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} name="Net Payout" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={BarChart2}
                title="No revenue data"
                description="No revenue recorded for this period"
                className="min-h-[320px]"
              />
            )}
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
