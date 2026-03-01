'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { SidebarProvider, useSidebar } from '@/components/layout/sidebar-context';
import { AuthGuard } from '@/components/auth/auth-guard';
import { ErrorBoundary } from '@/components/error-boundary';

function SidebarMain({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div className={`transition-[margin] duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}>
      <Header />
      <main className="p-8">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}

export default function DenLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/den/login';

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="min-h-screen bg-[#0a0a0b]">
          <Sidebar />
          <SidebarMain>{children}</SidebarMain>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
