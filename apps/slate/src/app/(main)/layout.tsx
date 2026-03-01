import { Nav } from '@/components/layout/nav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="min-h-[calc(100vh-7rem)]">{children}</main>
    </>
  );
}
