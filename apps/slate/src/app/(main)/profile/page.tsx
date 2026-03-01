'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Wallet, CreditCard, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const { token, user, logout } = useAuthStore();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!token || !user) {
    return (
      <div className="container flex min-h-[50vh] flex-col items-center justify-center px-4">
        <p className="text-slate-600">Log in to view your profile</p>
        <Link href="/login">
          <Button className="mt-4">Log in</Button>
        </Link>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Profile updated');
  };

  const handleLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    toast.success('Logged out');
  };

  return (
    <div className="container px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
      <p className="mt-1 text-slate-600">Manage your account</p>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 space-y-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <Wallet className="h-5 w-5" />
            Wallet
          </h2>
          <div className="flex flex-wrap gap-6">
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-sm text-slate-500">Balance</p>
              <p className="text-xl font-bold text-slate-900">Unavailable</p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-4 py-3">
              <p className="text-sm text-emerald-600">Refund credit</p>
              <p className="text-xl font-bold text-emerald-700">Unavailable</p>
              <p className="text-xs text-emerald-600">Wallet APIs not connected</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <CreditCard className="h-5 w-5" />
            Recent transactions
          </h2>
          <p className="text-sm text-slate-500">No transaction data available.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-semibold text-slate-900">Personal details</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <Input value={user.email} disabled className="bg-slate-50" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." />
            </div>
            <Button type="submit">Save changes</Button>
          </form>
        </div>

        <div className="border-t border-slate-200 pt-8">
          <Button
            variant="outline"
            className="gap-2 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            onClick={() => setShowLogoutConfirm(true)}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showLogoutConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setShowLogoutConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            >
              <h3 className="text-lg font-semibold text-slate-900">Log out?</h3>
              <p className="mt-2 text-sm text-slate-600">
                You can log back in anytime with your email and password.
              </p>
              <div className="mt-6 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowLogoutConfirm(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-500"
                  onClick={handleLogout}
                >
                  Log out
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
