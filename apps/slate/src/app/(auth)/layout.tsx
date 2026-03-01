import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <Link href="/" className="font-semibold text-slate-900">
            SLATE
          </Link>
        </div>
      </header>
      {children}
    </>
  );
}
