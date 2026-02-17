require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Simular llamada al API con diferentes usuarios
async function testUserAccess() {
  console.log('🔐 Probando acceso para diferentes perfiles...\n');

  const users = [
    { email: 'admin@muebleria.com', role: 'admin', name: 'Administrador Sistema' },
    { email: 'gestor@muebleria.com', role: 'gestor_cobranza', name: 'María González' },
    { email: 'cobrador1@muebleria.com', role: 'cobrador', name: 'Juan Pérez' },
  ];

  for (const userData of users) {
    try {
      console.log(`👤 Probando acceso para: ${userData.name} (${userData.role})\n`);

      // Verificar usuario en BD
      const user = await prisma.user.findUnique({
        where: { email: userData.email, isActive: true }
      });

      if (!user) {
        console.log(`❌ Usuario ${userData.email} no encontrado o inactivo\n`);
        continue;
      }

      console.log(`✅ Usuario encontrado: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Activo: ${user.isActive}`);

      // Simular lógica de filtros del API /api/clientes según el rol
      let where = {};
      let description = '';

      if (user.role === 'cobrador') {
        // Cobradores solo ven sus clientes asignados
        where.cobradorAsignadoId = user.id;
        description = 'Solo clientes asignados';
      } else {
        // Admin y gestores ven todos los clientes
        description = 'Todos los clientes';
      }

      const clientes = await prisma.cliente.findMany({
        where,
        include: {
          cobradorAsignado: {
            select: { name: true }
          }
        },
        take: 5
      });

      console.log(`📋 Clientes que puede ver (${description}): ${clientes.length}`);
      
      if (clientes.length > 0) {
        console.log(`   Primeros clientes:`);
        clientes.forEach((cliente, i) => {
          console.log(`   ${i + 1}. ${cliente.nombreCompleto} - Cobrador: ${cliente.cobradorAsignado?.name || 'Sin asignar'}`);
        });
      }

      // Verificar permisos de acceso a diferentes secciones
      console.log(`\n🔑 Permisos de acceso:`);
      console.log(`   Dashboard: ✅ (todos)`);
      
      if (['admin', 'gestor_cobranza', 'cobrador'].includes(user.role)) {
        console.log(`   Gestión de Clientes: ✅ ${user.role === 'cobrador' ? '(solo lectura)' : '(completa)'}`);
      } else {
        console.log(`   Gestión de Clientes: ❌`);
      }

      if (['admin', 'gestor_cobranza'].includes(user.role)) {
        console.log(`   Crear/Editar Clientes: ✅`);
        console.log(`   Gestionar Usuarios: ✅`);
      } else {
        console.log(`   Crear/Editar Clientes: ❌`);
        console.log(`   Gestionar Usuarios: ❌`);
      }

      if (['admin', 'gestor_cobranza', 'reporte_cobranza'].includes(user.role)) {
        console.log(`   Reportes: ✅`);
      } else {
        console.log(`   Reportes: ❌ (limitados)`);
      }

      console.log(`   Cobranza Móvil: ${user.role === 'cobrador' ? '✅' : '❌'}`);

    } catch (error) {
      console.error(`❌ Error al probar ${userData.email}:`, error.message);
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }
}

async function checkClientesByRole() {
  console.log('📊 Resumen de clientes por rol:\n');

  // Total de clientes
  const totalClientes = await prisma.cliente.count();
  console.log(`📈 Total de clientes en el sistema: ${totalClientes}`);

  // Clientes por cobrador
  const clientesPorCobrador = await prisma.cliente.groupBy({
    by: ['cobradorAsignadoId'],
    _count: {
      id: true
    },
    where: {
      cobradorAsignadoId: {
        not: null
      }
    }
  });

  console.log(`\n👥 Distribución de clientes por cobrador:`);
  for (const grupo of clientesPorCobrador) {
    const cobrador = await prisma.user.findUnique({
      where: { id: grupo.cobradorAsignadoId },
      select: { name: true, role: true }
    });
    
    console.log(`   ${cobrador?.name || 'Desconocido'}: ${grupo._count.id} clientes`);
  }

  // Clientes sin asignar
  const clientesSinAsignar = await prisma.cliente.count({
    where: { cobradorAsignadoId: null }
  });
  
  console.log(`   Sin asignar: ${clientesSinAsignar} clientes`);
}

async function main() {
  try {
    await testUserAccess();
    await checkClientesByRole();
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();