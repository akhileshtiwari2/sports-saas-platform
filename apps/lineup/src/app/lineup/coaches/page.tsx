'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMyFacilities, useCoaches, useCreateCoach, useToggleCoachActive } from '@/lib/hooks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Users, Plus } from 'lucide-react';
import { toast } from 'sonner';
import React from 'react';

const CoachCard = React.memo(function CoachCard({
  coach,
  onToggle,
}: {
  coach: { id: string; name: string; email?: string; phone?: string; isActive: boolean };
  onToggle: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{coach.name}</h3>
          {coach.email && <p className="text-sm text-zinc-400">{coach.email}</p>}
          {coach.phone && <p className="text-sm text-zinc-500">{coach.phone}</p>}
        </div>
        <Badge variant={coach.isActive ? 'success' : 'default'}>{coach.isActive ? 'Active' : 'Inactive'}</Badge>
      </div>
      <Button variant="outline" size="sm" className="mt-4" onClick={() => onToggle(coach.id)}>
        {coach.isActive ? 'Deactivate' : 'Activate'}
      </Button>
    </motion.div>
  );
});

export default function CoachesPage() {
  const [facilityId, setFacilityId] = useState<string | undefined>();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const { data: facilities } = useMyFacilities();
  const { data: coaches = [], isLoading } = useCoaches();
  const createCoach = useCreateCoach();
  const toggleActive = useToggleCoachActive();

  const filteredCoaches = facilityId
    ? coaches.filter((c: { facilityId?: string }) => c.facilityId === facilityId)
    : coaches;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const fid = facilityId ?? facilities?.[0]?.id;
    if (!fid) {
      toast.error('Select a facility');
      return;
    }
    try {
      await createCoach.mutateAsync({ facilityId: fid, name, email: email || undefined, phone: phone || undefined });
      toast.success('Coach added');
      setAddOpen(false);
      setName('');
      setEmail('');
      setPhone('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleActive.mutateAsync(id);
      toast.success('Coach updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Coaches</h1>
          <p className="mt-0.5 text-zinc-500">Manage coaches and assign to lessons</p>
        </div>
        <div className="flex gap-4">
          {facilities && facilities.length > 1 && (
            <select
              value={facilityId ?? ''}
              onChange={(e) => setFacilityId(e.target.value || undefined)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              <option value="">All facilities</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Coach
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-48 rounded-2xl border border-white/10 bg-white/[0.02] animate-pulse" />
      ) : filteredCoaches.length === 0 ? (
        <EmptyState icon={Users} title="No coaches" description="Add a coach to get started" />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCoaches.map((coach: { id: string; name: string; email?: string; phone?: string; isActive: boolean }) => (
            <CoachCard key={coach.id} coach={coach} onToggle={handleToggle} />
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent onClose={() => setAddOpen(false)}>
          <DialogHeader>
            <DialogTitle>Add Coach</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <Button type="submit" disabled={createCoach.isPending}>
              {createCoach.isPending ? 'Adding...' : 'Add Coach'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
