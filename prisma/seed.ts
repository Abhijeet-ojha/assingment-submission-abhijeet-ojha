import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const services = [
  { code: 'SERVICE_1' as const, name: 'Service 1' },
  { code: 'SERVICE_2' as const, name: 'Service 2' },
  { code: 'SERVICE_3' as const, name: 'Service 3' }
] as const;

const providers = [
  { providerCode: 1, name: 'Provider 1', monthlyQuota: 10 },
  { providerCode: 2, name: 'Provider 2', monthlyQuota: 10 },
  { providerCode: 3, name: 'Provider 3', monthlyQuota: 10 },
  { providerCode: 4, name: 'Provider 4', monthlyQuota: 10 },
  { providerCode: 5, name: 'Provider 5', monthlyQuota: 10 },
  { providerCode: 6, name: 'Provider 6', monthlyQuota: 10 },
  { providerCode: 7, name: 'Provider 7', monthlyQuota: 10 },
  { providerCode: 8, name: 'Provider 8', monthlyQuota: 10 }
] as const;

async function main() {
  for (const service of services) {
    await prisma.service.upsert({
      where: { code: service.code },
      update: { name: service.name, active: true },
      create: service
    });
  }

  for (const provider of providers) {
    await prisma.provider.upsert({
      where: { providerCode: provider.providerCode },
      update: { name: provider.name, monthlyQuota: provider.monthlyQuota, active: true },
      create: provider
    });
  }

  const createdServices = await prisma.service.findMany({
    orderBy: { code: 'asc' }
  });

  for (const service of createdServices) {
    await prisma.allocationCursor.upsert({
      where: { serviceId: service.id },
      update: {},
      create: { serviceId: service.id, nextIndex: 0 }
    });
  }
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
