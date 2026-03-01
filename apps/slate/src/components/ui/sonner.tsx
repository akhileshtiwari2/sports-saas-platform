'use client';

import { Toaster as Sonner } from 'sonner';

const Toaster = (props: React.ComponentProps<typeof Sonner>) => (
  <Sonner theme="light" toastOptions={{ classNames: { toast: 'rounded-2xl' } }} {...props} />
);

export { Toaster };
