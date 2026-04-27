
import { prisma } from './lib/db';

async function test() {
  const clients = await prisma.cliente.findMany({
    take: 10,
    select: {
      diaPago: true,
      statusCuenta: true,
      saldoVencido: true,
      telefono: true,
      nombreCompleto: true
    }
  });
  console.log('Sample clients:', JSON.stringify(clients, null, 2));
}

test().finally(() => prisma.$disconnect());
