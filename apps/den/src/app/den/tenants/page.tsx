'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { PageTransition } from '@/components/ui/page-transition';
import { useTenants } from '@/lib/hooks';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TenantDrawer } from '@/components/tenants/tenant-drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Building2 } from 'lucide-react';

export default function TenantsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useTenants({ page, limit: 10, search });

  return (
    <PageTransition>
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Tenants</h1>
        <p className="mt-0.5 text-zinc-500">Manage platform tenants</p>
      </div>

      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Search tenants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : data?.items?.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No tenants found"
            description={search ? 'Try a different search' : 'No tenants on the platform yet'}
            className="py-16"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Facilities</TableHead>
                <TableHead>Users</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items?.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(t.id)}
                >
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-zinc-400">{t.slug}</TableCell>
                  <TableCell>{t._count?.facilities ?? 0}</TableCell>
                  <TableCell>{t._count?.users ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant="success">Active</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {data && data.total > 10 && (
          <div className="flex items-center justify-between border-t border-white/5 px-6 py-4">
            <span className="text-sm text-zinc-500">
              {data.total} tenants
            </span>
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
                disabled={page * 10 >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <TenantDrawer
        tenantId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
    </PageTransition>
  );
}
