import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Buscando cliente DQ2506046...');
  const cliente = await prisma.cliente.findUnique({
    where: { codigoCliente: 'DQ2506046' },
    include: {
      pagos: {
        orderBy: { fechaPago: 'desc' },
        take: 5
      },
      tickets: {
        orderBy: { creadoEn: 'desc' },
        take: 5
      }
    }
  });

  if (!cliente) {
    console.log('Cliente NO encontrado.');
  } else {
    console.log(`Cliente encontrado: ${cliente.nombreCompleto}`);
    console.log('Últimos Pagos:');
    console.log(JSON.stringify(cliente.pagos, null, 2));
    console.log('Últimos Tickets:');
    console.log(JSON.stringify(cliente.tickets, null, 2));
  }

  console.log('\nBuscando tickets de julio 2026 para este cliente o sin cliente...');
  const ticketsJulio = await prisma.ticket.findMany({
    where: {
      fecha: {
        gte: new Date('2026-07-01T00:00:00.000Z'),
        lt: new Date('2026-08-01T00:00:00.000Z')
      },
      OR: [
        { clienteId: cliente?.id },
        { referencia: { contains: 'DQ2506046', mode: 'insensitive' } },
        { concepto: { contains: 'DQ2506046', mode: 'insensitive' } }
      ]
    }
  });

  console.log(`Tickets encontrados en julio: ${ticketsJulio.length}`);
  console.log(JSON.stringify(ticketsJulio, null, 2));
  
  console.log('\nBuscando movimientos bancarios que mencionen DQ2506046...');
  const movs = await prisma.movimientoBancario.findMany({
    where: {
      OR: [
        { concepto: { contains: 'DQ2506046', mode: 'insensitive' } },
        { descripcionGeneral: { contains: 'DQ2506046', mode: 'insensitive' } },
        { descripcionDetallada: { contains: 'DQ2506046', mode: 'insensitive' } },
        { referencia: { contains: 'DQ2506046', mode: 'insensitive' } }
      ]
    },
    take: 5
  });
  console.log(JSON.stringify(movs, null, 2));
  
  const movsBanorte = await prisma.movimientoBanorte0330253963.findMany({
    where: {
      OR: [
        { concepto: { contains: 'DQ2506046', mode: 'insensitive' } },
        { descripcionGeneral: { contains: 'DQ2506046', mode: 'insensitive' } },
        { descripcionDetallada: { contains: 'DQ2506046', mode: 'insensitive' } },
        { referencia: { contains: 'DQ2506046', mode: 'insensitive' } }
      ]
    },
    take: 5
  });
  console.log('\nMovimientos Banorte:', JSON.stringify(movsBanorte, null, 2));
  
  console.log('\nBuscando en buzon_tesoreria (tickets por revisar)...');
  const buzon = await prisma.buzonTesoreria.findMany({
    where: {
      OR: [
        { referencia: { contains: 'DQ2506046', mode: 'insensitive' } },
        { contractId: { contains: 'DQ2506046', mode: 'insensitive' } }
      ]
    },
    take: 5
  });
  console.log(JSON.stringify(buzon, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
