'use client';

import { Toaster as Sonner } from 'sonner';

const Toaster = (props: React.ComponentProps<typeof Sonner>) => (
  <Sonner theme="dark" toastOptions={{ classNames: { toast: 'rounded-2xl' } }} {...props} />
);

export { Toaster };
