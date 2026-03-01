'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Building2,
  DollarSign,
  BarChart3,
  FileText,
  Percent,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSidebar } from './sidebar-context';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/den/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/den/tenants', icon: Building2, label: 'Tenants' },
  { href: '/den/revenue', icon: DollarSign, label: 'Revenue' },
  { href: '/den/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/den/audit-logs', icon: FileText, label: 'Audit Logs' },
  { href: '/den/commission', icon: Percent, label: 'Commission' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebar();
  const w = collapsed ? 80 : 256;

  return (
    <motion.aside
      animate={{ width: w }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed left-0 top-0 z-40 h-screen border-r border-white/5 bg-[#0a0a0b]/95 backdrop-blur-xl"
    >
      <div className="flex h-16 items-center justify-between border-b border-white/5 px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-violet-700">
              <span className="text-lg font-bold text-white">D</span>
            </div>
            <span className="text-xl font-semibold tracking-tight text-white">DEN</span>
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
                  isActive
                    ? 'bg-violet-600/20 text-violet-400'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
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
