'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, User } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';

export function Header() {
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((s) => s.user);

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/5 px-8">
      <div />
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
          <User className="h-4 w-4 text-zinc-500" />
          <span className="text-sm text-white">{user?.name ?? 'User'}</span>
        </div>
      </div>
    </header>
  );
}
