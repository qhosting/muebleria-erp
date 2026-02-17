require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('🔍 Verificando base de datos...\n');

    // Contar usuarios
    const userCount = await prisma.user.count();
    console.log(`👥 Usuarios totales: ${userCount}`);

    // Mostrar usuarios por rol
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true
      }
    });

    console.log('\n👤 Usuarios en el sistema:');
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - Rol: ${user.role} - Activo: ${user.isActive ? '✅' : '❌'}`);
    });

    // Contar clientes
    const clientCount = await prisma.cliente.count();
    console.log(`\n🧑‍🤝‍🧑 Clientes totales: ${clientCount}`);

    if (clientCount > 0) {
      // Mostrar algunos clientes
      const clientes = await prisma.cliente.findMany({
        take: 5,
        include: {
          cobradorAsignado: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      console.log('\n📋 Primeros 5 clientes:');
      clientes.forEach(cliente => {
        console.log(`  - ${cliente.nombreCompleto} (${cliente.codigoCliente}) - Cobrador: ${cliente.cobradorAsignado?.name || 'Sin asignar'}`);
      });

      // Contar clientes por status
      const activos = await prisma.cliente.count({ where: { statusCuenta: 'activo' } });
      const inactivos = await prisma.cliente.count({ where: { statusCuenta: 'inactivo' } });
      
      console.log(`\n📊 Estado de clientes:`);
      console.log(`  - Activos: ${activos}`);
      console.log(`  - Inactivos: ${inactivos}`);
    }

    // Verificar pagos
    const pagoCount = await prisma.pago.count();
    console.log(`\n💰 Pagos totales: ${pagoCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();