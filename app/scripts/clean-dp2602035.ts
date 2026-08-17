import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const codigoCliente = 'DP2602035';
  console.log(`Buscando cliente ${codigoCliente}...`);

  const cliente = await prisma.cliente.findUnique({
    where: { codigoCliente },
    include: {
      pagos: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!cliente) {
    console.error(`Cliente ${codigoCliente} no encontrado`);
    return;
  }

  console.log(`Cliente: ${cliente.nombreCompleto} (${cliente.codigoCliente})`);
  console.log(`Saldo actual en DB: $${cliente.saldoActual}`);
  console.log(`Total de pagos registrados: ${cliente.pagos.length}`);

  // Mostrar los últimos pagos
  cliente.pagos.slice(0, 5).forEach((p, idx) => {
    console.log(`Pago #${idx + 1}: ID=${p.id}, Monto=$${p.monto}, Metodo=${p.metodoPago}, Fecha=${p.fechaPago}, CreatedAt=${p.createdAt}, LocalId=${p.localId}`);
  });

  // Identificar pagos duplicados/triplicados del mismo monto con minutos de diferencia
  const pagos = [...cliente.pagos].reverse(); // De más antiguo a más reciente
  const duplicadosAEliminar: string[] = [];
  let montoTotalRestaurar = 0;

  for (let i = 0; i < pagos.length; i++) {
    const current = pagos[i];
    if (duplicadosAEliminar.includes(current.id)) continue;

    for (let j = i + 1; j < pagos.length; j++) {
      const next = pagos[j];
      if (duplicadosAEliminar.includes(next.id)) continue;

      if (parseFloat(current.monto.toString()) === parseFloat(next.monto.toString())) {
        const diffMinutes = Math.abs(new Date(next.createdAt).getTime() - new Date(current.createdAt).getTime()) / (1000 * 60);
        if (diffMinutes <= 120) { // dentro de 2 horas
          console.log(`-> Duplicado detectado: Pago ${next.id} creado con ${diffMinutes.toFixed(2)} min de diferencia vs ${current.id}`);
          duplicadosAEliminar.push(next.id);
          montoTotalRestaurar += parseFloat(next.monto.toString());
        }
      }
    }
  }

  console.log(`Duplicados a eliminar: ${duplicadosAEliminar.length}, Monto a restaurar al saldo: $${montoTotalRestaurar}`);

  if (duplicadosAEliminar.length > 0) {
    const saldoAnterior = parseFloat(cliente.saldoActual.toString());
    const saldoNuevo = saldoAnterior + montoTotalRestaurar;

    await prisma.$transaction(async (tx) => {
      await tx.pago.deleteMany({
        where: { id: { in: duplicadosAEliminar } }
      });

      await tx.cliente.update({
        where: { id: cliente.id },
        data: { saldoActual: saldoNuevo }
      });
    });

    console.log(`✅ Limpieza completada exitosamente.`);
    console.log(`Saldo anterior: $${saldoAnterior} -> Nuevo saldo restaurado: $${saldoNuevo}`);
  } else {
    console.log('No se encontraron pagos duplicados para eliminar.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
