const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reactivateClients() {
  try {
    const result = await prisma.cliente.updateMany({
      where: {
        saldoActual: { gt: 0 },
        statusCuenta: 'inactivo'
      },
      data: {
        statusCuenta: 'activo'
      }
    });
    console.log(`Se reactivaron ${result.count} clientes con saldo pendiente.`);
  } catch (err) {
    console.error('Error reactivando clientes:', err);
  } finally {
    await prisma.$disconnect();
  }
}

reactivateClients();
