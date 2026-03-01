'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  useMyFacilities,
  useFacilityById,
  useUpdateFacilitySettings,
  useSubscription,
  useUsage,
  usePlans,
  useCreateCheckoutSession,
} from '@/lib/hooks';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CreditCard } from 'lucide-react';

export default function SettingsPage() {
  const [facilityId, setFacilityId] = useState<string | undefined>();
  const [cancellationPolicy, setCancellationPolicy] = useState('');
  const [weekendPricingPercent, setWeekendPricingPercent] = useState('');
  const [defaultSlotDuration, setDefaultSlotDuration] = useState('');
  const [taxPercent, setTaxPercent] = useState('');

  const { data: facilities } = useMyFacilities();
  const fid = facilityId ?? facilities?.[0]?.id;
  const { data: facility } = useFacilityById(fid);
  const updateSettings = useUpdateFacilitySettings(fid);
  const { data: subscription } = useSubscription();
  const { data: usage } = useUsage();
  const { data: plans } = usePlans();
  const createCheckout = useCreateCheckoutSession();

  const f = facility as { cancellationPolicy?: string; settings?: { weekendPricingPercent?: number; defaultSlotDuration?: number; taxPercent?: number } } | undefined;
  const settings = f?.settings ?? {};

  useEffect(() => {
    if (facility) {
      const s = (facility as { settings?: { weekendPricingPercent?: number; defaultSlotDuration?: number; taxPercent?: number } })?.settings ?? {};
      setCancellationPolicy((facility as { cancellationPolicy?: string }).cancellationPolicy ?? 'FREE_UNTIL_24H');
      setWeekendPricingPercent(String(s.weekendPricingPercent ?? 120));
      setDefaultSlotDuration(String(s.defaultSlotDuration ?? 60));
      setTaxPercent(String(s.taxPercent ?? 18));
    }
  }, [facility]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fid) return;
    try {
      await updateSettings.mutateAsync({
        cancellationPolicy: cancellationPolicy || undefined,
        weekendPricingPercent: weekendPricingPercent ? Number(weekendPricingPercent) : undefined,
        defaultSlotDuration: defaultSlotDuration ? Number(defaultSlotDuration) : undefined,
        taxPercent: taxPercent ? Number(taxPercent) : undefined,
      });
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Settings</h1>
          <p className="mt-0.5 text-zinc-500">Facility configuration</p>
        </div>
        {facilities && facilities.length > 1 && (
          <select
            value={facilityId ?? facilities?.[0]?.id ?? ''}
            onChange={(e) => setFacilityId(e.target.value || undefined)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            {facilities.map((fac) => (
              <option key={fac.id} value={fac.id}>{fac.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Subscription & Usage */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Plan & Usage
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-sm text-zinc-400">Current plan</p>
            <p className="font-semibold text-white">
              {subscription?.plan?.name ?? usage?.limits?.planName ?? 'FREE'}
            </p>
            {subscription?.cancelAtPeriodEnd && (
              <p className="text-xs text-amber-400 mt-1">Downgrading at period end</p>
            )}
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-sm text-zinc-400">Usage this month</p>
            <div className="mt-1 space-y-1 text-sm">
              <p>Courts: {usage?.courts ?? 0} / {usage?.limits?.maxCourts ?? 2}</p>
              <p>Coaches: {usage?.coaches ?? 0} / {usage?.limits?.maxCoaches ?? 2}</p>
              <p>Bookings: {usage?.bookingsThisMonth ?? 0} / {usage?.limits?.maxBookingsPerMonth ?? 100}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {plans?.map((plan) => {
            const hasPrice = plan.stripePriceIdMonthly || plan.stripePriceIdYearly;
            const interval = plan.stripePriceIdMonthly ? 'monthly' as const : 'yearly' as const;
            return (
              <Button
                key={plan.id}
                variant="outline"
                size="sm"
                disabled={createCheckout.isPending || !hasPrice}
                onClick={async () => {
                  try {
                    const res = await createCheckout.mutateAsync({
                      planId: plan.id,
                      billingInterval: interval,
                    });
                    if (res?.url) window.location.href = res.url;
                    else toast.error('Stripe not configured');
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Failed');
                  }
                }}
              >
                Upgrade to {plan.name}
              </Button>
            );
          })}
          {(!plans?.length || plans.every((p) => !p.stripePriceIdMonthly && !p.stripePriceIdYearly)) && (
            <p className="text-sm text-zinc-500">Contact support to configure Stripe prices</p>
          )}
        </div>
      </div>

      <div className="space-y-6 max-w-2xl">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">Facility Info</h2>
          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Name</label>
              <Input defaultValue={(facility as { name?: string })?.name} placeholder="Facility name" readOnly className="bg-white/5" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Address</label>
              <Input defaultValue={(facility as { address?: string })?.address} placeholder="Address" readOnly className="bg-white/5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">Pricing & Policy</h2>
          <form onSubmit={handleSave} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Cancellation Policy</label>
              <select
                value={cancellationPolicy}
                onChange={(e) => setCancellationPolicy(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
              >
                <option value="FREE_UNTIL_24H">Free until 24h before</option>
                <option value="HALF_REFUND_12H">Half refund until 12h</option>
                <option value="NO_REFUND">No refund</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Weekend Pricing %</label>
              <Input
                type="number"
                value={weekendPricingPercent}
                onChange={(e) => setWeekendPricingPercent(e.target.value)}
                placeholder="e.g. 120"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Default Slot Duration (min)</label>
              <Input
                type="number"
                value={defaultSlotDuration}
                onChange={(e) => setDefaultSlotDuration(e.target.value)}
                placeholder="60"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Tax/GST %</label>
              <Input type="number" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} placeholder="18" />
            </div>
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
