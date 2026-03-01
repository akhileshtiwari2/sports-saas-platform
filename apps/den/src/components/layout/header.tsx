'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, User, LogOut } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-end gap-4 border-b border-white/5 bg-[#0a0a0b]/80 px-8 backdrop-blur-xl">
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="rounded-xl p-2 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </button>
      {user && (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600/30">
            <User className="h-4 w-4 text-violet-400" />
          </div>
          <span className="text-sm text-zinc-400 hidden sm:inline">{user.email}</span>
          <button
            onClick={logout}
            className="rounded-xl p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      )}
    </header>
  );
}
