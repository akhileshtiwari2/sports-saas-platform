'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useCommissions } from '@/lib/hooks';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { PageTransition } from '@/components/ui/page-transition';
import { EmptyState } from '@/components/ui/empty-state';
import { History, Percent } from 'lucide-react';

interface CommissionEditState {
  id: string;
  tenantId: string;
  percentage: number;
  facilityId: string | null;
}

export default function CommissionPage() {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<CommissionEditState | null>(null);
  const [editPercentage, setEditPercentage] = useState('');
  const [commissionHistory, setCommissionHistory] = useState<
    Array<{ id: string; tenantId: string; rate: number; reason: string; updatedBy: string; effectiveDate: string }>
  >([]);

  const { data: commissions, isLoading } = useCommissions();

  const handleEdit = (c: {
    id: string;
    tenantId: string;
    percentage: number;
    facilityId: string | null;
  }) => {
    setSelectedCommission({
      ...c,
      percentage: typeof c.percentage === 'number' ? c.percentage : Number(c.percentage),
    });
    setEditPercentage(String(c.percentage));
    setEditOpen(true);
  };

  const handleSave = () => {
    const pct = parseFloat(editPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast.error('Enter a valid percentage (0–100)');
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmSave = () => {
    if (!selectedCommission) return;
    setCommissionHistory((prev) => [
      ...prev,
      {
        id: selectedCommission.id,
        tenantId: selectedCommission.tenantId,
        rate: parseFloat(editPercentage),
        reason: 'Rate updated via DEN dashboard',
        updatedBy: 'Current user',
        effectiveDate: new Date().toISOString().slice(0, 10),
      },
    ]);
    toast.success('Commission updated (requires PATCH /commission/:id API)');
    setEditOpen(false);
    setConfirmOpen(false);
    setSelectedCommission(null);
  };

  const historyRows = commissionHistory;

  return (
    <PageTransition>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Commission</h1>
          <p className="mt-0.5 text-zinc-500">Global and facility-specific commission rates</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.tenantId.slice(0, 8)}</TableCell>
                    <TableCell>
                      {c.facilityId ? (
                        <Badge variant="default">{c.facilityId.slice(0, 8)}</Badge>
                      ) : (
                        <Badge variant="success">Default</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {typeof c.percentage === 'number' ? c.percentage : Number(c.percentage)}%
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleEdit({
                            ...c,
                            percentage: typeof c.percentage === 'number' ? c.percentage : Number(c.percentage),
                          })
                        }
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {commissions?.length === 0 && !isLoading && (
            <EmptyState
              icon={Percent}
              title="No commission rules"
              description="Add default commission per tenant in database"
            />
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
        >
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <History className="h-5 w-5 text-violet-400" />
            Commission History
          </h2>
          <p className="mt-1 text-sm text-zinc-500">Last updated by, effective date, change reason</p>
          <div className="mt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Last Updated By</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Change Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyRows.length > 0 ? (
                  historyRows.map((r) => (
                    <TableRow key={`${r.id}-${r.effectiveDate}`}>
                      <TableCell className="font-medium">{r.tenantId.slice(0, 8)}</TableCell>
                      <TableCell>{r.rate}%</TableCell>
                      <TableCell className="text-zinc-400">{r.updatedBy}</TableCell>
                      <TableCell className="text-zinc-400">{r.effectiveDate}</TableCell>
                      <TableCell className="text-zinc-500">{r.reason}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-zinc-500 py-8">
                      No history. Edits will appear here.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </motion.div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent onClose={() => setEditOpen(false)}>
            <DialogHeader>
              <DialogTitle>Edit Commission</DialogTitle>
            </DialogHeader>
            {selectedCommission && (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Percentage</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={editPercentage}
                    onChange={(e) => setEditPercentage(e.target.value)}
                    className="max-w-[120px]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave}>Save</Button>
                  <Button variant="outline" onClick={() => setEditOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent onClose={() => setConfirmOpen(false)}>
            <DialogHeader>
              <DialogTitle>Confirm change</DialogTitle>
            </DialogHeader>
            <p className="mt-4 text-sm text-zinc-400">
              Update commission to {editPercentage}%? This will apply to future bookings.
            </p>
            <div className="mt-6 flex gap-2">
              <Button onClick={handleConfirmSave}>Confirm</Button>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
