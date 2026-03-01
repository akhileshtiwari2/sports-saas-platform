UPDATE "bookings"
SET "status" = 'CONFIRMED',
    "commissionRateSnapshot" = NULL,
    "commissionAmountSnapshot" = NULL,
    "netPayoutSnapshot" = NULL
WHERE "id" IN (SELECT id FROM "bookings" LIMIT 1);
