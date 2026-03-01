'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { SidebarProvider, useSidebar } from '@/components/layout/sidebar-context';
import { AuthGuard } from '@/components/auth/auth-guard';

function MainLayout(props: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div className={collapsed ? 'ml-20' : 'ml-64'} style={{ transition: 'margin 0.3s' }}>
      <Header />
      <main className="p-8">{props.children}</main>
    </div>
  );
}

export default function LineupLayout(props: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/lineup/login';

  if (isLogin) {
    return <>{props.children}</>;
  }

  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="min-h-screen bg-[#0a0a0b]">
          <Sidebar />
          <MainLayout>{props.children}</MainLayout>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
