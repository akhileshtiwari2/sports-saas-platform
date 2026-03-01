'use client';

import { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenant, useCommissionMonthly, useCommissions } from '@/lib/hooks';
import {
  Ban,
  RotateCcw,
  Percent,
  CreditCard,
  BarChart2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface TenantDrawerProps {
  tenantId: string | null;
  onClose: () => void;
  onCommissionClick?: () => void;
}

export function TenantDrawer({ tenantId, onClose, onCommissionClick }: TenantDrawerProps) {
  const { data: tenant, isLoading } = useTenant(tenantId);
  const now = new Date();
  const { data: monthlyData } = useCommissionMonthly(now.getFullYear(), now.getMonth());
  const { data: commissions } = useCommissions(tenantId ?? undefined);

  const tenantRevenue = useMemo(() => {
    if (!tenantId || !monthlyData?.length) return null;
    const row = monthlyData.find((t) => t.tenantId === tenantId);
    return row
      ? { gross: row.grossRevenue, commission: row.commissionAmount, net: row.netPayout }
      : null;
  }, [tenantId, monthlyData]);

  const commissionRate =
    (tenant?.commissions?.[0] as { percentage?: number })?.percentage ??
    (commissions?.[0] ? (typeof commissions[0].percentage === 'number' ? commissions[0].percentage : Number(commissions[0].percentage)) : 0);

  const sub = tenant?.tenantSubscriptions?.[0];
  const planName = sub?.plan?.name ?? (tenant?.subscriptions?.[0] as { planName?: string })?.planName ?? '—';
  const subStatus = sub?.status ?? '—';
  const isSuspended = false; // Backend may have status field

  const handleSuspend = () => {
    toast.info('Suspend action requires PATCH /tenants/:id/status API');
  };

  const handleReactivate = () => {
    toast.info('Reactivate action requires PATCH /tenants/:id/status API');
  };

  return (
    <Sheet open={!!tenantId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent onClose={onClose} className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {tenant?.name ?? 'Tenant'}
            {isSuspended ? (
              <Badge variant="destructive">Suspended</Badge>
            ) : (
              <Badge variant="success">Active</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="mt-6 space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : tenant ? (
          <div className="mt-6 space-y-6">
            <div className="flex gap-2">
              <Button
                variant={isSuspended ? 'default' : 'destructive'}
                size="sm"
                onClick={handleSuspend}
                disabled={isSuspended}
              >
                <Ban className="mr-2 h-4 w-4" />
                Suspend
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReactivate}
                disabled={!isSuspended}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reactivate
              </Button>
            </div>

            <div>
              <p className="text-sm text-zinc-500">Slug</p>
              <p className="font-medium text-white">{tenant.slug}</p>
            </div>

            <div>
              <p className="text-sm text-zinc-500">Subscription Plan</p>
              <div className="mt-1 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-zinc-500" />
                <span className="font-medium text-white">{planName}</span>
                <Badge variant={subStatus === 'ACTIVE' ? 'success' : subStatus === 'PAST_DUE' ? 'warning' : 'default'}>
                  {subStatus}
                </Badge>
              </div>
              {sub && (
                <p className="mt-1 text-xs text-zinc-500">
                  ₹{Number(sub.plan?.priceMonthly)}/mo · {sub.cancelAtPeriodEnd ? 'Downgrades at period end' : `Renews ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm text-zinc-500">Commission</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-medium text-white">{commissionRate}%</span>
                <Link href="/den/commission" onClick={onClose}>
                  <Button variant="ghost" size="sm" className="flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Override
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <p className="text-sm text-zinc-500 flex items-center gap-1">
                <BarChart2 className="h-4 w-4" />
                Revenue (last 30 days)
              </p>
              {tenantRevenue ? (
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-zinc-500">Gross</p>
                    <p className="font-semibold text-white">₹{tenantRevenue.gross.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Commission</p>
                    <p className="font-semibold text-violet-400">₹{tenantRevenue.commission.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Net</p>
                    <p className="font-semibold text-emerald-400">₹{tenantRevenue.net.toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">No revenue this month</p>
              )}
            </div>

            <div>
              <p className="text-sm text-zinc-500">Facilities</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {tenant.facilities?.length ? (
                  tenant.facilities.map((f) => (
                    <Badge
                      key={f.id}
                      variant={f.status === 'ACTIVE' ? 'success' : 'default'}
                    >
                      {f.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-zinc-500">None</span>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
