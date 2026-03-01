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
} from 'recharts';
import { useMyFacilities, useFacilityAnalytics } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { toast } from 'sonner';

export default function RevenuePage() {
  const [facilityId, setFacilityId] = useState<string | undefined>();
  const [monthOffset, setMonthOffset] = useState(0);

  const { data: facilities } = useMyFacilities();
  const fid = facilityId ?? facilities?.[0]?.id;
  const now = new Date();
  const start = useMemo(() => format(subMonths(now, monthOffset + 1), 'yyyy-MM-dd'), [monthOffset]);
  const end = useMemo(() => format(now, 'yyyy-MM-dd'), []);

  const { data: analytics } = useFacilityAnalytics(fid, start, end);

  const chartData = useMemo(() => {
    const occ = (analytics as { occupancyByDate?: Array<{ date: string; booked?: number }> })?.occupancyByDate ?? [];
    return occ.map((x) => ({
      date: format(new Date(x.date), 'MMM d'),
      bookings: x.booked ?? 0,
    }));
  }, [analytics]);

  const totalRevenue = (analytics as { totalRevenue?: number })?.totalRevenue ?? 0;

  const exportCsv = () => {
    const occ = (analytics as { occupancyByDate?: Array<{ date: string; booked?: number }> })?.occupancyByDate ?? [];
    const rows = occ.map((x) => [x.date, x.booked ?? 0].join(','));
    const csv = ['Date,Bookings', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-${start}-${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Revenue</h1>
          <p className="mt-0.5 text-zinc-500">Monthly revenue and breakdown</p>
        </div>
        <div className="flex gap-4">
          {facilities && facilities.length > 1 && (
            <select
              value={fid ?? ''}
              onChange={(e) => setFacilityId(e.target.value || undefined)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
          <select
            value={monthOffset}
            onChange={(e) => setMonthOffset(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            {[0, 1, 2, 3].map((i) => (
              <option key={i} value={i}>
                {format(subMonths(now, i + 1), 'MMMM yyyy')}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
        >
          <p className="text-sm text-zinc-500">Total Revenue</p>
          <p className="mt-2 text-2xl font-semibold text-white">₹{Number(totalRevenue).toLocaleString()}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
        >
          <p className="text-sm text-zinc-500">Bookings</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {(analytics as { bookingCount?: number })?.bookingCount ?? 0}
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
      >
        <h2 className="text-lg font-semibold text-white">Bookings by Date</h2>
        <div className="mt-6 h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" stroke="#71717a" fontSize={12} />
              <YAxis stroke="#71717a" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff' }} formatter={(v: number) => [v.toLocaleString(), 'Bookings']} />
              <Bar dataKey="bookings" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  );
}
