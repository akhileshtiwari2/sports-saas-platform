ALTER TABLE "bookings"
ADD CONSTRAINT booking_commission_snapshot_required
CHECK (
  "status" NOT IN ('CONFIRMED', 'COMPLETED')
  OR (
    "commissionRateSnapshot" IS NOT NULL
    AND "commissionAmountSnapshot" IS NOT NULL
    AND "netPayoutSnapshot" IS NOT NULL
  )
);
