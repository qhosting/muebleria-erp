
/**
 * SEED INTELIGENTE Y SEGURO
 * Solo inserta datos si la base de datos está vacía
 * NO elimina datos existentes
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed inteligente...');

  try {
    // Verificar si ya hay datos en el sistema
    const userCount = await prisma.user.count();
    const clienteCount = await prisma.cliente.count();
    
    console.log(`📊 Estado actual de la base de datos:`);
    console.log(`   - Usuarios: ${userCount}`);
    console.log(`   - Clientes: ${clienteCount}`);

    if (userCount > 0) {
      console.log('⚠️  La base de datos ya contiene usuarios.');
      console.log('   El seed NO eliminará datos existentes.');
      console.log('   Solo se crearán usuarios si no existen.');
    }

    // Crear usuarios esenciales (solo si no existen)
    console.log('\n👤 Verificando usuarios esenciales...');
    
    // Usuario admin
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@vertexerp.local' },
      update: {},
      create: {
        email: 'admin@vertexerp.local',
        name: 'Administrador Sistema',
        password: await bcrypt.hash('admin123', 12),
        role: 'admin',
        isActive: true,
      },
    });
    console.log('✅ Admin verificado: admin@vertexerp.local');

    // Usuario gestor de cobranza
    const gestorUser = await prisma.user.upsert({
      where: { email: 'gestor@vertexerp.local' },
      update: {},
      create: {
        email: 'gestor@vertexerp.local',
        name: 'Gestor de Cobranza',
        password: await bcrypt.hash('gestor123', 12),
        role: 'gestor_cobranza',
        isActive: true,
      },
    });
    console.log('✅ Gestor verificado: gestor@vertexerp.local');

    // Usuario cobrador
    const cobradorUser = await prisma.user.upsert({
      where: { email: 'cobrador@vertexerp.local' },
      update: {},
      create: {
        email: 'cobrador@vertexerp.local',
        name: 'Cobrador de Campo',
        password: await bcrypt.hash('cobrador123', 12),
        role: 'cobrador',
        isActive: true,
      },
    });
    console.log('✅ Cobrador verificado: cobrador@vertexerp.local');

    // Usuario de reportes
    const reporteUser = await prisma.user.upsert({
      where: { email: 'reportes@vertexerp.local' },
      update: {},
      create: {
        email: 'reportes@vertexerp.local',
        name: 'Usuario de Reportes',
        password: await bcrypt.hash('reportes123', 12),
        role: 'reporte_cobranza',
        isActive: true,
      },
    });
    console.log('✅ Reportes verificado: reportes@vertexerp.local');

    // Crear plantillas de ticket (solo si no existen)
    console.log('\n🎫 Verificando plantillas de ticket...');
    
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
Firma: _______________
================================
      Gracias por su pago
================================`,
        isActive: true,
      },
    });
    console.log('✅ Plantilla estándar verificada');

    await prisma.plantillaTicket.upsert({
      where: { nombre: 'Ticket Compacto' },
      update: {},
      create: {
        nombre: 'Ticket Compacto',
        contenido: `
MUEBLERÍA LA ECONÓMICA
{{cliente_nombre}}
Fecha: {{fecha}}
Monto: {{monto}}
Saldo: {{saldo_nuevo}}
Cobrador: {{cobrador}}
================`,
        isActive: true,
      },
    });
    console.log('✅ Plantilla compacta verificada');

    // Resumen final
    const finalUserCount = await prisma.user.count();
    const finalClienteCount = await prisma.cliente.count();
    const finalPlantillaCount = await prisma.plantillaTicket.count();

    console.log('\n📊 Resumen final:');
    console.log(`   ✅ Usuarios: ${finalUserCount}`);
    console.log(`   ✅ Clientes: ${finalClienteCount}`);
    console.log(`   ✅ Plantillas: ${finalPlantillaCount}`);
    console.log('\n✅ Seed completado exitosamente');
    console.log('   Los datos existentes fueron preservados.');

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
