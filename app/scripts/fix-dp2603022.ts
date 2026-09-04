import { PrismaClient } from '@prisma/client';

const dbUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function main() {
  const codigoCliente = 'DP2603022';
  const nuevoSaldo = 7875.00;

  console.log(`\n========================================================`);
  console.log(`🔧 ACTUALIZANDO SALDO DE CLIENTE ${codigoCliente}`);
  console.log(`========================================================\n`);

  const cliente = await prisma.cliente.findUnique({
    where: { codigoCliente },
    include: {
      pagos: { orderBy: { createdAt: 'desc' }, take: 2 }
    }
  });

  if (!cliente) {
    console.error(`❌ Cliente ${codigoCliente} no encontrado.`);
    return;
  }

  const saldoAnterior = cliente.saldoActual;
  console.log(`Cliente: ${cliente.nombreCompleto}`);
  console.log(`Saldo en DB antes de corrección: $${saldoAnterior}`);
  console.log(`Nuevo Saldo a aplicar: $${nuevoSaldo}`);

  // Actualizar cliente y ajustar el último pago para que refleje el saldo correcto
  await prisma.$transaction(async (tx) => {
    // 1. Actualizar el saldo del cliente
    await tx.cliente.update({
      where: { id: cliente.id },
      data: {
        saldoActual: nuevoSaldo
      }
    });

    // 2. Si el último pago tenía saldos erróneos (ej. 23165 -> 22455), actualizarlo
    if (cliente.pagos.length > 0) {
      const ultimoPago = cliente.pagos[0];
      if (Number(ultimoPago.saldoNuevo) > 15000) {
        await tx.pago.update({
          where: { id: ultimoPago.id },
          data: {
            saldoAnterior: nuevoSaldo + Number(ultimoPago.monto),
            saldoNuevo: nuevoSaldo
          }
        });
        console.log(`✅ Ajustado registro del último pago ID ${ultimoPago.id}: SaldoAnt $${nuevoSaldo + Number(ultimoPago.monto)} -> SaldoNvo $${nuevoSaldo}`);
      }
    }
  });

  // Verificar resultado
  const clienteActualizado = await prisma.cliente.findUnique({
    where: { codigoCliente }
  });

  console.log(`\n🎉 Saldo actualizado con éxito:`);
  console.log(`   Cliente: ${clienteActualizado?.nombreCompleto} (${clienteActualizado?.codigoCliente})`);
  console.log(`   Saldo Actual: $${clienteActualizado?.saldoActual}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
