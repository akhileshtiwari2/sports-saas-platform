import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  const plans: Prisma.PlanCreateInput[] = [
    {
      name: 'BASIC',
      maxCourts: 2,
      maxCoaches: 2,
      maxBookingsPerMonth: 100,
      features: { analytics: false, aiPricing: false },
      priceMonthly: new Decimal(1999),
      priceYearly: new Decimal(19990),
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
      sortOrder: 1,
    },
    {
      name: 'PRO',
      maxCourts: 10,
      maxCoaches: 10,
      maxBookingsPerMonth: 500,
      features: { analytics: true, aiPricing: false },
      priceMonthly: new Decimal(4999),
      priceYearly: new Decimal(49990),
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
      sortOrder: 2,
    },
    {
      name: 'ENTERPRISE',
      maxCourts: 999,
      maxCoaches: 999,
      maxBookingsPerMonth: 99999,
      features: { analytics: true, aiPricing: true },
      priceMonthly: new Decimal(14999),
      priceYearly: new Decimal(149990),
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
      sortOrder: 3,
    },
  ];

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { name: p.name },
      create: p,
      update: {
        maxCourts: p.maxCourts,
        maxCoaches: p.maxCoaches,
        maxBookingsPerMonth: p.maxBookingsPerMonth,
        features: p.features,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        sortOrder: p.sortOrder,
      },
    });
  }

  console.info('Seeded plans:', plans.map((p) => p.name));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
