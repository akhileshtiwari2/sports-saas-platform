'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, MoreVertical } from 'lucide-react';
import { useTenantSubscriptions } from '@/lib/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

export default function SubscriptionsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTenantSubscriptions({ page, limit: 10 });
  const subscriptions = data?.items ?? [];

  const statusStyle = (s: string) =>
    s === 'ACTIVE'
      ? 'bg-emerald-500/20 text-emerald-400'
      : s === 'PAST_DUE'
      ? 'bg-amber-500/20 text-amber-400'
      : 'bg-zinc-500/20 text-zinc-400';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-2xl font-semibold text-white">Subscriptions</h1>
        <p className="text-zinc-500 mt-0.5">Manage tenant subscription plans</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : subscriptions.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No subscriptions yet"
          description="Tenant subscriptions will appear when they subscribe via LINEUP"
          className="py-16"
        />
      ) : (
      <div className="grid gap-6 md:grid-cols-2">
        {subscriptions.map((s) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-violet-600/20 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{s.tenant?.name ?? 'Unknown'}</h3>
                  <p className="text-sm text-zinc-500">{s.plan?.name ?? '—'} Plan</p>
                </div>
              </div>
              <button className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-500">Amount</p>
                <p className="font-medium text-white">₹{Number(s.plan?.priceMonthly ?? 0).toLocaleString()}/mo</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Next billing</p>
                <p className="font-medium text-zinc-400">
                  {s.cancelAtPeriodEnd ? 'Cancels' : new Date(s.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${statusStyle(s.status)}`}>
                {s.status}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
      )}
    </motion.div>
  );
}
