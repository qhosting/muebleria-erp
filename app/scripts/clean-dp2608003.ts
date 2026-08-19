import { PrismaClient } from '@prisma/client';

const dbUrl = 'postgres://postgres:d0a4221856f4ba5ea1ec@212.56.42.193:1080/dasoplus-db?sslmode=disable';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

async function main() {
  const codigoCliente = process.argv[2] || 'DP2608003';
  console.log(`\n======================================================`);
  console.log(`🔍 BUSCANDO CLIENTE: ${codigoCliente}`);
  console.log(`======================================================\n`);

  const cliente = await prisma.cliente.findUnique({
    where: { codigoCliente },
    include: {
      pagos: {
        orderBy: { createdAt: 'desc' },
      },
      tickets: {
        orderBy: { creadoEn: 'desc' },
      },
    },
  });

  if (!cliente) {
    console.error(`❌ Cliente con código "${codigoCliente}" no fue encontrado en la base de datos.`);
    return;
  }

  console.log(`📋 Cliente: ${cliente.nombreCompleto} (${cliente.codigoCliente})`);
  console.log(`💰 Saldo actual registrado en DB: $${cliente.saldoActual}`);
  console.log(`📊 Total de pagos registrados: ${cliente.pagos.length}\n`);

  if (cliente.pagos.length <= 1) {
    console.log(`ℹ️ El cliente tiene ${cliente.pagos.length} pago(s). No requiere eliminación de duplicados.`);
    cliente.pagos.forEach((p, idx) => {
      console.log(`  Pago #${idx + 1}: ID=${p.id} | Monto=$${p.monto} | Método=${p.metodoPago} | Concepto=${p.concepto} | Fecha=${p.fechaPago} | Creado=${p.createdAt}`);
    });
    return;
  }

  console.log(`--- DETALLE DE PAGOS ---`);
  cliente.pagos.forEach((p, idx) => {
    console.log(`[#${idx + 1}] ID: ${p.id}`);
    console.log(`     Monto: $${p.monto} | Método: ${p.metodoPago} | Tipo: ${p.tipoPago}`);
    console.log(`     Concepto: ${p.concepto}`);
    console.log(`     Ticket ID: ${p.ticketId || 'Ninguno'}`);
    console.log(`     Fecha Pago: ${p.fechaPago} | Creado En: ${p.createdAt}`);
    console.log(`     Saldos: Anterior=$${p.saldoAnterior} -> Nuevo=$${p.saldoNuevo}\n`);
  });

  // Ordenar cronológicamente (más antiguo primero)
  const pagos = [...cliente.pagos].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const duplicadosAEliminar: string[] = [];
  let montoTotalRestaurar = 0;

  for (let i = 0; i < pagos.length; i++) {
    const current = pagos[i];
    if (duplicadosAEliminar.includes(current.id)) continue;

    for (let j = i + 1; j < pagos.length; j++) {
      const next = pagos[j];
      if (duplicadosAEliminar.includes(next.id)) continue;

      const mismoMonto = parseFloat(current.monto.toString()) === parseFloat(next.monto.toString());
      
      // Caso 1: Mismo monto con diferencia de tiempo corta (duplicado de app/red)
      const diffHoras = Math.abs(new Date(next.createdAt).getTime() - new Date(current.createdAt).getTime()) / (1000 * 60 * 60);
      
      // Caso 2: Mismo abono (uno por BOT y otro manual/gestor) o doble registro del mismo día
      const mismoDia = new Date(current.fechaPago).toDateString() === new Date(next.fechaPago).toDateString();

      if (mismoMonto && (diffHoras <= 24 || mismoDia)) {
        console.log(`🚩 PAGO DUPLICADO DETECTADO:`);
        console.log(`   - Original: ID ${current.id} ($${current.monto}, ${current.metodoPago}, Creado: ${current.createdAt})`);
        console.log(`   - Duplicado a eliminar: ID ${next.id} ($${next.monto}, ${next.metodoPago}, Creado: ${next.createdAt})`);
        
        duplicadosAEliminar.push(next.id);
        montoTotalRestaurar += parseFloat(next.monto.toString());
      }
    }
  }

  if (duplicadosAEliminar.length === 0) {
    console.log(`⚠️ No se detectaron pagos idénticos automáticos por fecha/monto.`);
    console.log(`Si deseas forzar la eliminación de un pago específico, revisa los IDs listados arriba.`);
    return;
  }

  console.log(`\n------------------------------------------------------`);
  console.log(`⚡ APLICANDO CORRECCIÓN EN BASE DE DATOS`);
  console.log(`------------------------------------------------------`);
  console.log(`Pagos a eliminar: ${duplicadosAEliminar.length}`);
  console.log(`Monto total a restaurar al saldo: $${montoTotalRestaurar}`);

  const saldoAnterior = parseFloat(cliente.saldoActual.toString());
  const saldoNuevo = saldoAnterior + montoTotalRestaurar;

  await prisma.$transaction(async (tx) => {
    // 1. Eliminar pagos duplicados
    await tx.pago.deleteMany({
      where: { id: { in: duplicadosAEliminar } },
    });

    // 2. Restaurar saldo del cliente
    await tx.cliente.update({
      where: { id: cliente.id },
      data: { saldoActual: saldoNuevo },
    });
  });

  console.log(`\n✅ ¡CORRECCIÓN COMPLETADA CON ÉXITO!`);
  console.log(`👤 Cliente: ${cliente.nombreCompleto} (${codigoCliente})`);
  console.log(`💰 Saldo corregido: de $${saldoAnterior.toFixed(2)} a $${saldoNuevo.toFixed(2)}\n`);
}

main()
  .catch((err) => {
    console.error('❌ Error durante la ejecución:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
