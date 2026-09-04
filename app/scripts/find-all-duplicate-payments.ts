import { PrismaClient } from '@prisma/client';

const dbUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

async function main() {
  console.log('🔍 Conectando a base de datos y buscando pagos duplicados o sospechosos en todos los clientes...\n');

  const clientes = await prisma.cliente.findMany({
    include: {
      pagos: {
        orderBy: [{ fechaPago: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });

  console.log(`📊 Total de clientes analizados: ${clientes.length}`);

  const casosDetectados: any[] = [];

  for (const c of clientes) {
    const pagos = c.pagos;
    if (pagos.length <= 1) continue;

    const duplicados: any[] = [];

    for (let i = 0; i < pagos.length; i++) {
      for (let j = i + 1; j < pagos.length; j++) {
        const p1 = pagos[i];
        const p2 = pagos[j];
        const m1 = parseFloat(p1.monto.toString());
        const m2 = parseFloat(p2.monto.toString());

        if (m1 === m2 && m1 > 0) {
          const t1 = new Date(p1.createdAt).getTime();
          const t2 = new Date(p2.createdAt).getTime();
          const diffMin = Math.abs(t2 - t1) / (1000 * 60);
          const diffHoras = diffMin / 60;
          const mismaFechaPago = new Date(p1.fechaPago).toISOString().slice(0, 10) === new Date(p2.fechaPago).toISOString().slice(0, 10);

          // Criterios de sospecha:
          // A) Menos de 120 minutos de diferencia entre inserciones
          // B) Misma fecha de pago y mismo monto cuando al menos uno proviene de BOT/Tickets
          const esBot1 = p1.metodoPago?.includes('BOT') || p1.concepto?.includes('TKT');
          const esBot2 = p2.metodoPago?.includes('BOT') || p2.concepto?.includes('TKT');

          if (diffHoras <= 2 || (mismaFechaPago && (esBot1 || esBot2 || diffHoras <= 24))) {
            duplicados.push({
              pago1: {
                id: p1.id,
                monto: m1,
                metodo: p1.metodoPago,
                concepto: p1.concepto,
                fechaPago: p1.fechaPago.toISOString().slice(0, 10),
                createdAt: p1.createdAt.toISOString(),
              },
              pago2: {
                id: p2.id,
                monto: m2,
                metodo: p2.metodoPago,
                concepto: p2.concepto,
                fechaPago: p2.fechaPago.toISOString().slice(0, 10),
                createdAt: p2.createdAt.toISOString(),
              },
              diffMinutos: parseFloat(diffMin.toFixed(1)),
              motivo: diffMin <= 120 ? 'Inserción casi simultánea (<2h)' : 'Misma fecha + Bot/Ticket vs Manual',
            });
          }
        }
      }
    }

    if (duplicados.length > 0) {
      casosDetectados.push({
        codigoCliente: c.codigoCliente,
        nombreCompleto: c.nombreCompleto,
        saldoActual: parseFloat(c.saldoActual.toString()),
        totalPagos: pagos.length,
        duplicados,
      });
    }
  }

  console.log(`\n======================================================`);
  console.log(`🚨 RESULTADO: Se encontraron ${casosDetectados.length} cliente(s) con pagos duplicados o sospechosos:`);
  console.log(`======================================================\n`);

  casosDetectados.forEach((item, idx) => {
    console.log(`[#${idx + 1}] Contrato: ${item.codigoCliente} | Cliente: ${item.nombreCompleto}`);
    console.log(`     Saldo Actual: $${item.saldoActual} | Total Pagos: ${item.totalPagos}`);
    item.duplicados.forEach((d: any, dIdx: number) => {
      console.log(`     👉 Caso duplicado ${dIdx + 1} (${d.motivo}, diff: ${d.diffMinutos} min):`);
      console.log(`        - Pago A: ID ${d.pago1.id} | $${d.pago1.monto} | ${d.pago1.metodo} | ${d.pago1.concepto} | Creado: ${d.pago1.createdAt}`);
      console.log(`        - Pago B: ID ${d.pago2.id} | $${d.pago2.monto} | ${d.pago2.metodo} | ${d.pago2.concepto} | Creado: ${d.pago2.createdAt}`);
    });
    console.log('------------------------------------------------------');
  });

  return casosDetectados;
}

main()
  .catch((err) => {
    console.error('Error al ejecutar:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
