'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMyFacilities, useCourts, useCreateCourt, useToggleCourtActive } from '@/lib/hooks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Building2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import React from 'react';

const CourtCard = React.memo(function CourtCard({
  court,
  onToggle,
}: {
  court: { id: string; name: string; sportType?: string; isActive?: boolean };
  onToggle: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
    >
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-white">{court.name}</h3>
        <Badge variant={court.isActive !== false ? 'success' : 'default'}>
          {court.isActive !== false ? 'Active' : 'Inactive'}
        </Badge>
      </div>
      <p className="mt-2 text-sm text-zinc-500">Sport: {court.sportType ?? 'General'}</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={() => onToggle(court.id)}>
        {court.isActive !== false ? 'Deactivate' : 'Activate'}
      </Button>
    </motion.div>
  );
});

export default function CourtsPage() {
  const [facilityId, setFacilityId] = useState<string | undefined>();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [sportType, setSportType] = useState('Tennis');

  const { data: facilities } = useMyFacilities();
  const { data: courts = [], isLoading } = useCourts(facilityId ?? facilities?.[0]?.id);
  const createCourt = useCreateCourt();
  const toggleActive = useToggleCourtActive();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const fid = facilityId ?? facilities?.[0]?.id;
    if (!fid) {
      toast.error('Select a facility');
      return;
    }
    try {
      await createCourt.mutateAsync({ facilityId: fid, name, sportType });
      toast.success('Court added');
      setAddOpen(false);
      setName('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleActive.mutateAsync(id);
      toast.success('Court updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Courts</h1>
          <p className="mt-0.5 text-zinc-500">Manage courts and pricing</p>
        </div>
        <div className="flex gap-4">
          {facilities && facilities.length > 1 && (
            <select
              value={facilityId ?? facilities?.[0]?.id ?? ''}
              onChange={(e) => setFacilityId(e.target.value || undefined)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Court
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-48 rounded-2xl border border-white/10 bg-white/[0.02] animate-pulse" />
      ) : courts.length === 0 ? (
        <EmptyState icon={Building2} title="No courts" description="Add a court to get started" />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courts.map((court: { id: string; name: string; sportType?: string; isActive?: boolean }) => (
            <CourtCard key={court.id} court={court} onToggle={handleToggle} />
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent onClose={() => setAddOpen(false)}>
          <DialogHeader>
            <DialogTitle>Add Court</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Sport Type</label>
              <select
                value={sportType}
                onChange={(e) => setSportType(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
              >
                <option>Tennis</option>
                <option>Badminton</option>
                <option>Squash</option>
                <option>Basketball</option>
                <option>General</option>
              </select>
            </div>
            <Button type="submit" disabled={createCourt.isPending}>
              {createCourt.isPending ? 'Adding...' : 'Add Court'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
