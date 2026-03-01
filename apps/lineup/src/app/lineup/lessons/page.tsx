'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMyFacilities, useLessons, useCoaches, useFacilitySlots, useCreateLesson } from '@/lib/hooks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { BookOpen, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import React from 'react';

const LessonRow = React.memo(function LessonRow({ lesson }: { lesson: { id: string; title: string; startTime: string; coach?: { name: string }; maxStudents: number; price: number } }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
      <div>
        <span className="font-medium text-white">{lesson.title}</span>
        <p className="text-sm text-zinc-400">{lesson.coach?.name} · {format(new Date(lesson.startTime), 'MMM d, h:mm a')}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="default">{lesson.maxStudents} max</Badge>
        <span className="text-sm font-medium text-amber-400">₹{Number(lesson.price).toLocaleString()}</span>
      </div>
    </div>
  );
});

export default function LessonsPage() {
  const [facilityId, setFacilityId] = useState<string | undefined>();
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [coachId, setCoachId] = useState('');
  const [courtId, setCourtId] = useState('');
  const [slotId, setSlotId] = useState('');
  const [price, setPrice] = useState('500');
  const [maxStudents, setMaxStudents] = useState('10');

  const { data: facilities } = useMyFacilities();
  const fid = facilityId ?? facilities?.[0]?.id;
  const { data: lessons = [], isLoading } = useLessons(fid);
  const { data: coaches = [] } = useCoaches();
  const facility = facilities?.find((f) => f.id === fid);
  const courts = facility?.courts ?? [];
  const now = new Date();
  const start = format(now, 'yyyy-MM-dd');
  const end = format(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  const { data: slots = [] } = useFacilitySlots(fid, start, end);
  const createLesson = useCreateLesson();

  const availableSlots = (slots as Array<{ id: string; courtId: string; startTime: string; endTime: string; isBooked?: boolean; bookings?: unknown[] }>).filter(
    (s) => !s.isBooked && (!s.bookings || (s.bookings as unknown[]).length === 0)
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachId || !courtId || !slotId) {
      toast.error('Select coach, court and slot');
      return;
    }
    const slot = availableSlots.find((s) => s.id === slotId);
    if (!slot) {
      toast.error('Slot not available');
      return;
    }
    try {
      await createLesson.mutateAsync({
        coachId,
        courtId,
        slotId,
        title: title || 'Lesson',
        price: Number(price),
        maxStudents: Number(maxStudents),
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
      toast.success('Lesson created');
      setAddOpen(false);
      setTitle('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Lessons</h1>
          <p className="mt-0.5 text-zinc-500">Create lesson batches and manage enrollment</p>
        </div>
        <div className="flex gap-4">
          {facilities && facilities.length > 1 && (
            <select
              value={facilityId ?? ''}
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
            Create Lesson
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-48 rounded-2xl border border-white/10 bg-white/[0.02] animate-pulse" />
      ) : lessons.length === 0 ? (
        <EmptyState icon={BookOpen} title="No lessons" description="Create a lesson batch to get started" />
      ) : (
        <div className="space-y-3">
          {(lessons as Array<{ id: string; title: string; startTime: string; coach?: { name: string }; maxStudents: number; price: number }>).map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} />
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent onClose={() => setAddOpen(false)}>
          <DialogHeader>
            <DialogTitle>Create Lesson</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Tennis Basics" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Coach</label>
              <select
                value={coachId}
                onChange={(e) => setCoachId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
                required
              >
                <option value="">Select coach</option>
                {(coaches as Array<{ id: string; name: string; facilityId?: string }>)
                  .filter((c) => !fid || c.facilityId === fid)
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Court</label>
              <select
                value={courtId}
                onChange={(e) => {
                  setCourtId(e.target.value);
                  setSlotId('');
                }}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
                required
              >
                <option value="">Select court</option>
                {courts.map((c: { id: string; name: string }) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Available Slot</label>
              <select
                value={slotId}
                onChange={(e) => setSlotId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
                required
              >
                <option value="">Select slot</option>
                {availableSlots
                  .filter((s) => !courtId || s.courtId === courtId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {format(new Date(s.startTime), 'MMM d, h:mm a')}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm text-zinc-400">Price (₹)</label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm text-zinc-400">Max Students</label>
                <Input type="number" value={maxStudents} onChange={(e) => setMaxStudents(e.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={createLesson.isPending}>
              {createLesson.isPending ? 'Creating...' : 'Create Lesson'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
