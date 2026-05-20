const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const cursor = await prisma.allocationCursor.findMany();
    const usage = await prisma.providerMonthlyUsage.findMany({ orderBy: { providerId: 'asc' } });
    const providers = await prisma.provider.findMany({ orderBy: { providerCode: 'asc' } });
    console.log('Cursors:');
    console.log(cursor);
    console.log('\nProvider usages:');
    console.log(usage);
    console.log('\nProviders:');
    console.log(providers.map(p => ({ providerCode: p.providerCode, id: p.id })));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
})();
