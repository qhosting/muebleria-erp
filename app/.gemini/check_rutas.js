const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.rutaCobranza.count();
  console.log('Count RutaCobranza:', count);
  if (count > 0) {
    const sample = await prisma.rutaCobranza.findMany({ take: 3, include: { cobrador: true } });
    console.log('Sample RutaCobranza:', JSON.stringify(sample, null, 2));
  }

  const pagosCount = await prisma.pago.count();
  console.log('Count Pagos:', pagosCount);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
