'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  Building2,
  Users,
  BookOpen,
  CalendarCheck,
  DollarSign,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSidebar } from './sidebar-context';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/lineup/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/lineup/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/lineup/courts', icon: Building2, label: 'Courts' },
  { href: '/lineup/coaches', icon: Users, label: 'Coaches' },
  { href: '/lineup/lessons', icon: BookOpen, label: 'Lessons' },
  { href: '/lineup/bookings', icon: CalendarCheck, label: 'Bookings' },
  { href: '/lineup/revenue', icon: DollarSign, label: 'Revenue' },
  { href: '/lineup/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebar();

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 256 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed left-0 top-0 z-40 h-screen border-r border-white/5 bg-[#0a0a0b]/95 backdrop-blur-xl"
    >
      <div className="flex h-16 items-center justify-between border-b border-white/5 px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
              <span className="text-lg font-bold text-white">L</span>
            </div>
            <span className="text-xl font-semibold tracking-tight text-white">LINEUP</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
      <nav className="space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                  isActive ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </motion.div>
            </Link>
          );
        })}
      </nav>
    </motion.aside>
  );
}
