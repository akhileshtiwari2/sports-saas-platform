'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, LayoutDashboard, Users, Calendar, MapPin } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white antialiased">
      {/* Subtle gradient mesh background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-indigo-600/10 blur-[150px]" />
        <div className="absolute -bottom-40 right-1/3 h-72 w-72 rounded-full bg-purple-600/15 blur-[100px]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <span className="text-lg font-semibold tracking-tight text-zinc-100">SportsHub</span>
        <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
          <Link href="/den" className="hover:text-white transition-colors">Dashboard</Link>
          <a href="http://localhost:3001" target="_blank" rel="noopener" className="hover:text-white transition-colors">Sales</a>
          <a href="http://localhost:3002" target="_blank" rel="noopener" className="hover:text-white transition-colors">Facilities</a>
          <a href="http://localhost:3003" target="_blank" rel="noopener" className="hover:text-white transition-colors">Book</a>
        </nav>
      </header>

      <main className="relative z-10 px-6 md:px-12 pt-16 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl"
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-[1.1]">
            Sports facility
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              booking ecosystem
            </span>
          </h1>
          <p className="mt-6 text-xl text-zinc-400 max-w-2xl leading-relaxed">
            Enterprise-grade platform for managing sports facilities. Multi-tenant, real-time bookings, and built for scale.
          </p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-12 flex flex-wrap gap-4"
          >
            <Link
              href="/den"
              className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-medium text-black transition-all hover:bg-zinc-200"
            >
              <LayoutDashboard className="h-5 w-5" />
              Open DEN Dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-zinc-700 px-6 py-3.5 font-medium text-zinc-300 transition-all hover:border-zinc-500 hover:bg-zinc-900/50"
            >
              <Users className="h-5 w-5" />
              PLAYBALL
            </a>
            <a
              href="http://localhost:3002"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-zinc-700 px-6 py-3.5 font-medium text-zinc-300 transition-all hover:border-zinc-500 hover:bg-zinc-900/50"
            >
              <Calendar className="h-5 w-5" />
              LINEUP
            </a>
            <a
              href="http://localhost:3003"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-zinc-700 px-6 py-3.5 font-medium text-zinc-300 transition-all hover:border-zinc-500 hover:bg-zinc-900/50"
            >
              <MapPin className="h-5 w-5" />
              SLATE
            </a>
          </motion.div>
        </motion.div>

        {/* Product cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-24 grid gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          {[
            { name: 'DEN', desc: 'Super Admin', href: '/den', icon: LayoutDashboard, color: 'from-violet-500/20 to-purple-600/10 border-violet-500/30', external: false },
            { name: 'PLAYBALL', desc: 'Sales & Support', href: 'http://localhost:3001', icon: Users, color: 'from-emerald-500/20 to-teal-600/10 border-emerald-500/30', external: true },
            { name: 'LINEUP', desc: 'Facility Owner', href: 'http://localhost:3002', icon: Calendar, color: 'from-amber-500/20 to-orange-600/10 border-amber-500/30', external: true },
            { name: 'SLATE', desc: 'Consumer App', href: 'http://localhost:3003', icon: MapPin, color: 'from-rose-500/20 to-pink-600/10 border-rose-500/30', external: true },
          ].map((p) => (
            p.external ? (
              <a
                key={p.name}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`group block rounded-2xl border bg-gradient-to-br ${p.color} p-6 transition-all hover:scale-[1.02] hover:shadow-xl`}
              >
                <p.icon className="h-8 w-8 text-white/90" />
                <h3 className="mt-4 font-semibold text-white">{p.name}</h3>
                <p className="mt-1 text-sm text-zinc-400">{p.desc}</p>
              </a>
            ) : (
              <Link
                key={p.name}
                href={p.href}
                className={`group block rounded-2xl border bg-gradient-to-br ${p.color} p-6 transition-all hover:scale-[1.02] hover:shadow-xl`}
              >
                <p.icon className="h-8 w-8 text-white/90" />
                <h3 className="mt-4 font-semibold text-white">{p.name}</h3>
                <p className="mt-1 text-sm text-zinc-400">{p.desc}</p>
              </Link>
            )
          ))}
        </motion.div>
      </main>
    </div>
  );
}
