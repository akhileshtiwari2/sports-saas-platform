'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { PageTransition } from '@/components/ui/page-transition';
import { useAuditLogs } from '@/lib/hooks';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBoundaryUI } from '@/components/ui/error-boundary-ui';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';

const ACTION_OPTIONS = [
  'BOOKING_CANCELLED',
  'BOOKING_COMPLETED',
  'BOOKING_NO_SHOW',
  'REFUND_APPROVED',
  'REFUND_REJECTED',
  'REFUND_PROCESSED',
];

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [selectedMeta, setSelectedMeta] = useState<unknown | undefined>(undefined);

  const { data, isLoading, isError, refetch } = useAuditLogs({
    page,
    limit: 15,
    action: action || undefined,
    start: start || undefined,
    end: end || undefined,
  });

  return (
    <PageTransition>
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Audit Logs</h1>
        <p className="mt-0.5 text-zinc-500">System event trail</p>
      </div>

      <div className="flex flex-wrap gap-4">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        >
          <option value="">All actions</option>
          {ACTION_OPTIONS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <Input
          type="date"
          placeholder="Start date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="max-w-[180px]"
        />
        <Input
          type="date"
          placeholder="End date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="max-w-[180px]"
        />
        <Button
          variant="outline"
          onClick={() => {
            setPage(1);
            setAction('');
            setStart('');
            setEnd('');
            toast.success('Filters reset');
          }}
        >
          Reset
        </Button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : isError ? (
          <div className="p-12">
            <ErrorBoundaryUI
              title="Failed to load audit logs"
              message="Please check your connection and try again."
              onRetry={() => refetch()}
            />
          </div>
        ) : !data?.items?.length ? (
          <EmptyState
            icon={FileText}
            title="No audit logs"
            description="No logs match your filters"
            className="py-16"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-zinc-400 text-sm">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span className="rounded-lg bg-violet-600/20 px-2 py-1 text-xs text-violet-400">
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell>
                    {log.entityType}#{log.entityId.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-zinc-400">{log.actorRole}</TableCell>
                  <TableCell className="text-zinc-500">{log.tenantId?.slice(0, 8) ?? '—'}</TableCell>
                  <TableCell>
                    {log.metadata != null ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedMeta(log.metadata)}
                      >
                        View
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {data && data.total > 15 && (
          <div className="flex items-center justify-between border-t border-white/5 px-6 py-4">
            <span className="text-sm text-zinc-500">{data.total} logs</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 15 >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={selectedMeta !== undefined} onOpenChange={(o) => !o && setSelectedMeta(undefined)}>
        <DialogContent onClose={() => setSelectedMeta(undefined)}>
          <DialogHeader>
            <DialogTitle>Metadata</DialogTitle>
          </DialogHeader>
          <pre className="mt-4 max-h-64 overflow-auto rounded-lg bg-black/50 p-4 text-xs text-zinc-300">
            {JSON.stringify(selectedMeta, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
    </PageTransition>
  );
}
