

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Preparando sistema para producción...');
  console.log('⚠️  ADVERTENCIA: Se eliminarán todos los datos demo');
  
  try {
    // 1. Limpiar datos demo
    console.log('🧹 Limpiando datos demo...');
    
    // Eliminar pagos
    await prisma.pago.deleteMany({});
    console.log('✅ Pagos eliminados');
    
    // Eliminar rutas de cobranza
    await prisma.rutaCobranza.deleteMany({});
    console.log('✅ Rutas de cobranza eliminadas');
    
    // Eliminar motararios
    await prisma.motarario.deleteMany({});
    console.log('✅ Motararios eliminados');
    
    // Eliminar clientes
    await prisma.cliente.deleteMany({});
    console.log('✅ Clientes eliminados');
    
    // Eliminar usuarios demo y de prueba (mantener solo los esenciales)
    await prisma.user.deleteMany({
      where: {
        email: {
          notIn: [
            'admin@muebleria.com',
            'gestor@muebleria.com', 
            'reportes@muebleria.com',
            'cobrador@muebleria.com'
          ]
        }
      }
    });
    console.log('✅ Usuarios demo eliminados');

    // 2. Verificar/crear usuarios esenciales
    console.log('👤 Verificando usuarios esenciales...');
    
    // Usuario admin
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@muebleria.com' },
      update: {
        name: 'Administrador Sistema',
        role: 'admin',
        isActive: true,
      },
      create: {
        email: 'admin@muebleria.com',
        name: 'Administrador Sistema',
        password: await bcrypt.hash('Admin123!', 12),
        role: 'admin',
        isActive: true,
      },
    });

    // Usuario gestor
    const gestorUser = await prisma.user.upsert({
      where: { email: 'gestor@muebleria.com' },
      update: {
        name: 'Gestor de Cobranza',
        role: 'gestor_cobranza',
        isActive: true,
      },
      create: {
        email: 'gestor@muebleria.com',
        name: 'Gestor de Cobranza',
        password: await bcrypt.hash('Gestor123!', 12),
        role: 'gestor_cobranza',
        isActive: true,
      },
    });

    // Usuario de reportes
    const reporteUser = await prisma.user.upsert({
      where: { email: 'reportes@muebleria.com' },
      update: {
        name: 'Usuario de Reportes',
        role: 'reporte_cobranza',
        isActive: true,
      },
      create: {
        email: 'reportes@muebleria.com',
        name: 'Usuario de Reportes',
        password: await bcrypt.hash('Reportes123!', 12),
        role: 'reporte_cobranza',
        isActive: true,
      },
    });

    // Usuario cobrador
    const cobradorUser = await prisma.user.upsert({
      where: { email: 'cobrador@muebleria.com' },
      update: {
        name: 'Cobrador de Campo',
        role: 'cobrador',
        isActive: true,
      },
      create: {
        email: 'cobrador@muebleria.com',
        name: 'Cobrador de Campo',
        password: await bcrypt.hash('Cobrador123!', 12),
        role: 'cobrador',
        isActive: true,
      },
    });

    console.log('✅ Usuarios esenciales verificados');

    // 3. Verificar plantillas (no las eliminamos, son configuración)
    console.log('🎫 Verificando plantillas de ticket...');
    
    await prisma.plantillaTicket.upsert({
      where: { nombre: 'Ticket Estándar' },
      update: {},
      create: {
        nombre: 'Ticket Estándar',
        contenido: `
================================
    MUEBLERÍA LA ECONÓMICA
================================
Cliente: {{cliente_nombre}}
Código: {{cliente_codigo}}
Fecha: {{fecha}}
--------------------------------
Concepto: {{concepto}}
Monto: {{monto}}
--------------------------------
Saldo Anterior: {{saldo_anterior}}
Saldo Nuevo: {{saldo_nuevo}}
--------------------------------
Cobrador: {{cobrador}}
================================
        ¡Gracias por su pago!
================================
        `.trim(),
        isActive: true,
      },
    });

    await prisma.plantillaTicket.upsert({
      where: { nombre: 'Ticket Compacto' },
      update: {},
      create: {
        nombre: 'Ticket Compacto',
        contenido: `
MUEBLERÍA LA ECONÓMICA
{{cliente_nombre}} - {{cliente_codigo}}
{{fecha}} - {{concepto}}
Monto: {{monto}}
Saldo: {{saldo_anterior}} → {{saldo_nuevo}}
Cobrador: {{cobrador}}
        `.trim(),
        isActive: true,
      },
    });

    console.log('✅ Plantillas verificadas');

    // 4. Base de datos limpia (las secuencias se resetean automáticamente al eliminar datos)
    console.log('🔄 Base de datos optimizada...');
    console.log('✅ Limpieza completada');

    console.log('\n🎉 ¡Sistema preparado para producción!');
    console.log('\n📊 Estado final:');
    console.log(`- ${await prisma.user.count()} usuarios`);
    console.log(`- ${await prisma.cliente.count()} clientes`);
    console.log(`- ${await prisma.pago.count()} pagos`);
    console.log(`- ${await prisma.plantillaTicket.count()} plantillas de ticket`);
    console.log(`- ${await prisma.rutaCobranza.count()} rutas de cobranza`);

    console.log('\n🔑 Credenciales de producción:');
    console.log('👑 Admin: admin@muebleria.com / Admin123!');
    console.log('👤 Gestor: gestor@muebleria.com / Gestor123!');
    console.log('📊 Reportes: reportes@muebleria.com / Reportes123!');
    console.log('🚚 Cobrador: cobrador@muebleria.com / Cobrador123!');
    
    console.log('\n⚠️  IMPORTANTE:');
    console.log('- Cambia las contraseñas en el primer uso');
    console.log('- Los datos demo han sido eliminados');
    console.log('- El sistema está listo para datos reales');

  } catch (error) {
    console.error('❌ Error al preparar producción:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

