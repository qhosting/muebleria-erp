require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testClientesAPI() {
  try {
    console.log('🔍 Probando API de clientes directamente...\n');

    // Simular sesión de admin
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@muebleria.com' }
    });

    if (!adminUser) {
      console.log('❌ Usuario admin no encontrado');
      return;
    }

    console.log(`✅ Usuario admin encontrado: ${adminUser.name} (${adminUser.role})`);

    // Obtener clientes directamente de la base de datos
    const clientes = await prisma.cliente.findMany({
      include: {
        cobradorAsignado: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10, // Solo los primeros 10
    });

    console.log(`\n📋 Clientes encontrados: ${clientes.length}`);

    if (clientes.length > 0) {
      console.log('\n🧑‍🤝‍🧑 Primeros clientes:');
      clientes.forEach((cliente, index) => {
        console.log(`${index + 1}. ${cliente.nombreCompleto} (${cliente.codigoCliente})`);
        console.log(`   - Status: ${cliente.statusCuenta}`);
        console.log(`   - Saldo: $${parseFloat(cliente.saldoActual)}`);
        console.log(`   - Cobrador: ${cliente.cobradorAsignado?.name || 'Sin asignar'}`);
        console.log('');
      });
    } else {
      console.log('❌ No se encontraron clientes');
    }

    // Probar filtros similares al API
    const where = {};
    
    // Filtro por admin (sin restricciones)
    const clientesAdmin = await prisma.cliente.findMany({
      where,
      include: {
        cobradorAsignado: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    console.log(`📊 Clientes para admin (sin filtros): ${clientesAdmin.length}`);

    // Simular consulta de cobrador
    const cobrador = await prisma.user.findFirst({
      where: { role: 'cobrador' }
    });

    if (cobrador) {
      const whereCobradorOnly = {
        cobradorAsignadoId: cobrador.id
      };

      const clientesCobrador = await prisma.cliente.findMany({
        where: whereCobradorOnly,
        include: {
          cobradorAsignado: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      console.log(`📊 Clientes para cobrador ${cobrador.name}: ${clientesCobrador.length}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testClientesAPI();