'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

export function AuthGuard(props: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token && pathname !== '/lineup/login') {
      router.replace('/lineup/login');
    }
  }, [token, pathname, router]);

  return <>{props.children}</>;
}
