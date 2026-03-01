'use client';

import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { AnimatedCounter } from './animated-counter';
import { Skeleton } from '@/components/ui/skeleton';

interface KPICardProps {
  title: string;
  value: string | number;
  previousValue?: number;
  change?: number;
  icon: LucideIcon;
  delay?: number;
  isLoading?: boolean;
  format?: 'number' | 'currency' | 'percent';
}

export function KPICard({
  title,
  value,
  previousValue,
  change,
  icon: Icon,
  delay = 0,
  isLoading = false,
  format = 'number',
}: KPICardProps) {
  const formatValue = (v: string | number) => {
    if (typeof v === 'string') return v;
    if (format === 'currency') return `₹${(v / 100000).toFixed(1)}L`;
    if (format === 'percent') return `${v}%`;
    return v.toLocaleString();
  };

  const numericValue = typeof value === 'string' ? parseFloat(value.toString().replace(/[^0-9.-]/g, '')) || 0 : Number(value);
  const changeVal = change ?? (previousValue != null && previousValue !== 0
    ? ((numericValue - previousValue) / previousValue) * 100
    : undefined);
  const isPositive = (changeVal ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-all hover:border-violet-500/30 hover:bg-white/[0.04]"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(139,92,246,0.05) 100%)',
        boxShadow: '0 0 0 1px rgba(139,92,246,0.1)',
      }}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start justify-between">
        <span className="text-sm font-medium text-zinc-500">{title}</span>
        <div className="rounded-xl bg-violet-600/20 p-2.5 transition-colors group-hover:bg-violet-600/30">
          <Icon className="h-5 w-5 text-violet-400" />
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="mt-4 h-8 w-24" />
      ) : (
        <p className="relative mt-4 text-2xl font-semibold tracking-tight text-white">
          {typeof value === 'number' && (format === 'number' || format === 'percent') ? (
            <AnimatedCounter
              value={numericValue}
              suffix={format === 'percent' ? '%' : ''}
            />
          ) : (
            formatValue(value)
          )}
        </p>
      )}
      {(changeVal !== undefined || previousValue != null) && !isLoading && (
        <div className="relative mt-2 flex items-center gap-2">
          {changeVal !== undefined && (
            <>
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-400" />
              )}
              <span className={`text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? '↑' : '↓'} {Math.abs(changeVal).toFixed(1)}%
              </span>
            </>
          )}
          {previousValue != null && (
            <span className="text-xs text-zinc-500">
              vs prev: {format === 'currency' ? `₹${(previousValue / 100000).toFixed(1)}L` : previousValue.toLocaleString()}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
