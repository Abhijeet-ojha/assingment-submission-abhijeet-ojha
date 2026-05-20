import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
    console.log(JSON.stringify(leads, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
})();
