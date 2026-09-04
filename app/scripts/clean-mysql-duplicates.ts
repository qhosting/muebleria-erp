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
  console.log('🚀 INICIANDO CORRECCIÓN SEGURA DE PAGOS DUPLICADOS...\n');

  const clientes = await prisma.cliente.findMany({
    include: {
      pagos: {
        orderBy: [{ fechaPago: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });

  const correcciones: Array<{
    clienteId: string;
    codigoCliente: string;
    nombreCompleto: string;
    saldoAnterior: number;
    saldoNuevo: number;
    montoRestaurado: number;
    pagosEliminar: string[];
    detalles: string;
  }> = [];

  for (const c of clientes) {
    const pagos = c.pagos;
    if (pagos.length <= 1) continue;

    const duplicadosParaEsteCliente: string[] = [];
    let montoTotal = 0;
    const detallesLog: string[] = [];

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

          const c1 = p1.concepto || '';
          const c2 = p2.concepto || '';
          const isMySQL1 = c1.includes('Alineación automática desde MySQL');
          const isMySQL2 = c2.includes('Alineación automática desde MySQL');

          // Caso: Uno de los dos fue insertado por la alineación de MySQL (ID: ...)
          if (isMySQL1 || isMySQL2) {
            const diffDias = Math.abs(new Date(p1.fechaPago).getTime() - new Date(p2.fechaPago).getTime()) / (1000 * 60 * 60 * 24);
            if (diffDias <= 7) {
              const pagoAEliminar = isMySQL2 ? p2 : p1;
              const pagoConservar = isMySQL2 ? p1 : p2;

              if (!duplicadosParaEsteCliente.includes(pagoAEliminar.id)) {
                duplicadosParaEsteCliente.push(pagoAEliminar.id);
                montoTotal += m1;
                detallesLog.push(
                  `Eliminar pago MySQL (ID: ${pagoAEliminar.id}, $${m1}, Creado: ${pagoAEliminar.createdAt.toISOString()}) conservando pago original (${pagoConservar.metodoPago}, ID: ${pagoConservar.id})`
                );
              }
            }
          }
        }
      }
    }

    if (duplicadosParaEsteCliente.length > 0) {
      const saldoActualNum = parseFloat(c.saldoActual.toString());
      correcciones.push({
        clienteId: c.id,
        codigoCliente: c.codigoCliente,
        nombreCompleto: c.nombreCompleto,
        saldoAnterior: saldoActualNum,
        saldoNuevo: saldoActualNum + montoTotal,
        montoRestaurado: montoTotal,
        pagosEliminar: duplicadosParaEsteCliente,
        detalles: detallesLog.join(' | '),
      });
    }
  }

  console.log(`📋 Total de clientes con pagos duplicados de MySQL a corregir: ${correcciones.length}\n`);

  if (correcciones.length === 0) {
    console.log('✅ No se encontraron duplicados pendientes.');
    return;
  }

  let clientesActualizados = 0;
  let totalPagosEliminados = 0;
  let totalDineroRestaurado = 0;

  for (const item of correcciones) {
    console.log(`🔧 Corrigiendo ${item.codigoCliente} (${item.nombreCompleto}):`);
    console.log(`   - Saldo: $${item.saldoAnterior.toFixed(2)} -> $${item.saldoNuevo.toFixed(2)} (+$${item.montoRestaurado})`);
    console.log(`   - Pagos a eliminar: ${item.pagosEliminar.length} [${item.pagosEliminar.join(', ')}]`);

    await prisma.$transaction(async (tx) => {
      // 1. Eliminar pagos duplicados
      await tx.pago.deleteMany({
        where: { id: { in: item.pagosEliminar } },
      });

      // 2. Restaurar saldo del cliente
      await tx.cliente.update({
        where: { id: item.clienteId },
        data: { saldoActual: item.saldoNuevo },
      });
    });

    clientesActualizados++;
    totalPagosEliminados += item.pagosEliminar.length;
    totalDineroRestaurado += item.montoRestaurado;
    console.log(`   ✅ Aplicado con éxito.\n`);
  }

  console.log(`======================================================`);
  console.log(`🎉 ¡LIMPIEZA COMPLETADA CON ÉXITO!`);
  console.log(`======================================================`);
  console.log(`👤 Clientes corregidos:       ${clientesActualizados}`);
  console.log(`🗑️ Pagos duplicados borrados: ${totalPagosEliminados}`);
  console.log(`💰 Saldo total restaurado:    $${totalDineroRestaurado.toFixed(2)}`);
  console.log(`======================================================\n`);
}

main()
  .catch((err) => {
    console.error('❌ Error durante la limpieza:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
