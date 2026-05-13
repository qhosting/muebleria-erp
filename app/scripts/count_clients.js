const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.cliente.groupBy({
    by: ['cobradorAsignadoId'],
    _count: {
      id: true
    },
    where: {
        statusCuenta: 'activo'
    }
  });
  console.log(JSON.stringify(counts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
