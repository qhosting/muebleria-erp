const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.convenioPago.count();
  const sample = await prisma.convenioPago.findMany({ take: 5 });
  console.log('Count:', count);
  console.log('Sample:', JSON.stringify(sample, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
