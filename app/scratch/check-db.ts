
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  let startDate = new Date(now);
  startDate.setDate(now.getDate() - (now.getDay() + 1) % 7); // Last Saturday
  startDate.setHours(0, 0, 0, 0);

  let endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6); // Next Friday
  endDate.setHours(23, 59, 59, 999);

  console.log('Range:', startDate.toISOString(), 'to', endDate.toISOString());

  const pagosRange = await prisma.pago.findMany({
    where: {
      fechaPago: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      cobrador: true,
      cliente: true
    }
  });

  console.log('Pagos in Range:', pagosRange.length);
  if (pagosRange.length > 0) {
    console.log('Sample Pago:', {
      fecha: pagosRange[0].fechaPago,
      cliente: pagosRange[0].cliente.codigoCliente,
      metodo: pagosRange[0].metodoPago
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
