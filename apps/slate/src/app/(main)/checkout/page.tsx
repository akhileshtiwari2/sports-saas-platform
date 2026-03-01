'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { motion } from 'framer-motion';
import { CheckCircle, Lock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PaymentForm } from '@/components/payment-form';
import { useFacility, useCreatePaymentIntent } from '@/lib/hooks';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from 'sonner';

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

function CheckoutForm({
  clientSecret,
  facilityName,
  onSuccess,
}: {
  clientSecret: string;
  facilityName: string;
  onSuccess: () => void;
}) {
  const [succeeded, setSucceeded] = useState(false);

  if (succeeded) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <CheckCircle className="mx-auto h-20 w-20 text-emerald-500" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-xl font-semibold text-emerald-900"
        >
          Booking confirmed!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-2 text-emerald-700"
        >
          Your slot at {facilityName} is reserved.
        </motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <Link href="/bookings" className="mt-6 inline-block">
            <Button>View my bookings</Button>
          </Link>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <Lock className="h-5 w-5 text-slate-500" />
        <span className="text-sm font-medium text-slate-600">Secured by Stripe</span>
      </div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Payment</h2>
      <PaymentForm
        onSuccess={() => setSucceeded(true)}
        onError={(msg) => toast.error(msg)}
      />
    </div>
  );
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAuthStore();
  const slotId = searchParams.get('slotId');
  const facilityId = searchParams.get('facilityId');

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const { data: facility } = useFacility(facilityId ?? undefined);
  const createPI = useCreatePaymentIntent();

  useEffect(() => {
    if (!token || !slotId || !facilityId) {
      if (!token) router.push('/login?redirect=/checkout');
      return;
    }
    createPI
      .mutateAsync({
        slotId,
        facilityId,
      })
      .then(({ clientSecret: cs, bookingId: bid }) => {
        setClientSecret(cs);
        setBookingId(bid);
      })
      .catch((err) => {
        toast.error(err?.message ?? 'Failed to create payment');
      });
  }, [token, slotId, facilityId]);

  if (!token) {
    return (
      <div className="container flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-slate-600">Please log in to checkout.</p>
      </div>
    );
  }

  if (!slotId || !facilityId) {
    return (
      <div className="container flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-slate-600">Invalid checkout session. Start from a facility.</p>
        <Link href="/search">
          <Button variant="outline" className="ml-4">Browse facilities</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-2xl font-bold text-slate-900">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-semibold text-slate-900">Booking summary</h2>
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Free cancellation until 24h before. After that, no refund applies.
          </p>
          <p className="mt-4 text-slate-700">{facility?.name}</p>
          <p className="text-slate-600">Court details verified at payment confirmation</p>
          <p className="mt-2 text-slate-600">
            {bookingId ? 'Slot selected' : 'Loading...'}
          </p>
          <p className="mt-4 text-lg font-semibold text-violet-600">
            Total: Shown by secure Stripe checkout
          </p>
        </div>

        <div>
          {createPI.isPending && !clientSecret ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
                <p className="text-sm font-medium text-slate-700">Preparing secure payment...</p>
                <p className="text-xs text-slate-500">Please wait a moment</p>
              </div>
            </div>
          ) : clientSecret ? (
            stripePromise ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm
                clientSecret={clientSecret}
                facilityName={facility?.name ?? ''}
                onSuccess={() => {}}
              />
            </Elements>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-8">
                <p className="text-slate-600">Stripe publishable key is not configured.</p>
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <p className="text-slate-600">Setting up payment...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="container flex min-h-[50vh] items-center justify-center px-4">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
