
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeders...');

  try {
    // Limpiar datos existentes
    console.log('🧹 Limpiando datos existentes...');
    await prisma.pago.deleteMany();
    await prisma.rutaCobranza.deleteMany();
    await prisma.cliente.deleteMany();
    await prisma.plantillaTicket.deleteMany();
    await prisma.user.deleteMany();

    // Crear usuarios esenciales únicamente
    console.log('👤 Creando usuarios esenciales...');
    
    // Usuario admin
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@economica.local' },
      update: {},
      create: {
        email: 'admin@economica.local',
        name: 'Administrador Sistema',
        password: await bcrypt.hash('admin123', 12),
        role: 'admin',
        isActive: true,
      },
    });

    // Usuario gestor de cobranza
    const gestorUser = await prisma.user.upsert({
      where: { email: 'gestor@economica.local' },
      update: {},
      create: {
        email: 'gestor@economica.local',
        name: 'Gestor de Cobranza',
        password: await bcrypt.hash('gestor123', 12),
        role: 'gestor_cobranza',
        isActive: true,
      },
    });

    // Usuario de reportes
    const reporteUser = await prisma.user.upsert({
      where: { email: 'reportes@economica.local' },
      update: {},
      create: {
        email: 'reportes@economica.local',
        name: 'Usuario de Reportes',
        password: await bcrypt.hash('reportes123', 12),
        role: 'reporte_cobranza',
        isActive: true,
      },
    });

    console.log('✅ Usuarios esenciales creados');

    // Crear 5 gestores de campo (RUTA0 a RUTA4)
    console.log('👥 Creando 5 gestores de campo...');
    const gestoresCampo = [];
    
    for (let i = 0; i < 5; i++) {
      const gestor = await prisma.user.upsert({
        where: { email: `ruta${i}@local.com` },
        update: {},
        create: {
          email: `ruta${i}@local.com`,
          name: `ruta${i}`,
          password: await bcrypt.hash('ruta123', 12),
          role: 'cobrador',
          codigoGestor: `RUTA${i}`,
          isActive: true,
        },
      });
      gestoresCampo.push(gestor);
      console.log(`✅ Gestor ${i + 1}/5 creado: ${gestor.email} (${gestor.codigoGestor})`);
    }

    const cobradores = [...gestoresCampo];

    console.log('✅ Todos los usuarios creados exitosamente');

    // Crear plantillas de ticket
    console.log('🎫 Creando plantillas de ticket...');
    
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

    console.log('✅ Plantillas de ticket creadas');

    // Crear 1000 clientes con estructura CL1, CL2, ..., CL1000
    console.log('👥 Creando 1000 clientes...');

    const clientes = [];
    
    // Direcciones de ejemplo
    const calles = [
      'Av. Benito Juárez', 'Calle Miguel Hidalgo', 'Av. Insurgentes', 'Calle Morelos',
      'Av. Revolución', 'Calle Allende', 'Av. Constitución', 'Calle Aldama',
      'Av. Independencia', 'Calle Victoria', 'Av. Reforma', 'Calle Guerrero',
      'Av. Madero', 'Calle Zaragoza', 'Av. Cuauhtémoc', 'Calle Matamoros'
    ];

    const colonias = [
      'Centro', 'Reforma', 'Industrial', 'San José', 'Moderna', 'Libertad',
      'Progreso', 'Nueva', 'Esperanza', 'Popular', 'Obrera', 'Jardines',
      'Valle', 'Lomas', 'Vista Hermosa', 'Las Flores'
    ];

    const productos = [
      'Sala 3 piezas moderna', 'Recámara matrimonial completa', 'Comedor 6 personas',
      'Juego de sala esquinera', 'Ropero 4 puertas', 'Mesa de centro cristal',
      'Recámara individual', 'Comedor redondo', 'Sala reclinable', 'Centro entretenimiento',
      'Tocador con espejo', 'Mesa de computadora', 'Librero 5 repisas', 'Cama king size',
      'Juego de mesas nido', 'Bancas de cocina'
    ];

    // Crear 1000 clientes distribuidos entre los 5 gestores
    for (let i = 1; i <= 1000; i++) {
      // Distribuir clientes equitativamente entre los 5 gestores (200 clientes por gestor)
      const gestorIndex = Math.floor((i - 1) / 200);
      const gestor = gestoresCampo[gestorIndex];
      
      const calle = calles[Math.floor(Math.random() * calles.length)];
      const colonia = colonias[Math.floor(Math.random() * colonias.length)];
      const producto = productos[Math.floor(Math.random() * productos.length)];
      
      const cliente = await prisma.cliente.create({
        data: {
          codigoCliente: `CL${i}`,
          fechaVenta: new Date(Date.now() - Math.floor(Math.random() * 180) * 24 * 60 * 60 * 1000),
          nombreCompleto: `CL${i}`,
          telefono: `555-${Math.floor(Math.random() * 9000) + 1000}`,
          vendedor: 'TIENDA',
          cobradorAsignadoId: gestor.id,
          statusCuenta: 'activo',
          direccionCompleta: `${calle} ${Math.floor(Math.random() * 999) + 100}, Col. ${colonia}`,
          descripcionProducto: producto,
          diaPago: (Math.floor(Math.random() * 7) + 1).toString(),
          montoPago: 500, // Pago semanal de 500
          periodicidad: 'semanal',
          saldoActual: 5000, // Saldo de 5000 como solicitaste
          importe1: 10000, // Total estimado del crédito
        },
      });
      clientes.push(cliente);
      
      // Mostrar progreso cada 100 clientes
      if (i % 100 === 0) {
        console.log(`✅ ${i}/1000 clientes creados (Gestor: ${gestor.codigoGestor})`);
      }
    }

    console.log('✅ 1000 clientes creados exitosamente');

    // Crear algunos pagos de ejemplo
    console.log('💰 Creando pagos de ejemplo...');

    const pagosEjemplo = [
      {
        clienteId: clientes[0].id,
        cobradorId: gestoresCampo[0].id,
        monto: 500,
        tipoPago: 'regular' as const,
        concepto: 'Pago semanal',
        fechaPago: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Hace 7 días
        saldoAnterior: 5500,
        saldoNuevo: 5000,
      },
      {
        clienteId: clientes[1].id,
        cobradorId: gestoresCampo[0].id,
        monto: 500,
        tipoPago: 'regular' as const,
        concepto: 'Pago semanal',
        fechaPago: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // Hace 14 días
        saldoAnterior: 5500,
        saldoNuevo: 5000,
      },
      {
        clienteId: clientes[2].id,
        cobradorId: gestoresCampo[0].id,
        monto: 500,
        tipoPago: 'regular' as const,
        concepto: 'Pago semanal',
        fechaPago: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Hace 3 días
        saldoAnterior: 5500,
        saldoNuevo: 5000,
      },
      {
        clienteId: clientes[0].id,
        cobradorId: gestoresCampo[0].id,
        monto: 100,
        tipoPago: 'moratorio' as const,
        concepto: 'Recargo por atraso',
        fechaPago: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Hace 2 días
        saldoAnterior: 5000,
        saldoNuevo: 5000, // No afecta saldo principal
      },
    ];

    for (const pagoData of pagosEjemplo) {
      await prisma.pago.create({
        data: {
          ...pagoData,
          ticketImpreso: true,
          sincronizado: true,
        },
      });
    }

    // Generar más pagos distribuidos en los últimos 30 días
    // Crear 100 pagos aleatorios
    for (let i = 0; i < 100; i++) {
      const cliente = clientes[Math.floor(Math.random() * clientes.length)];
      const cobrador = cobradores.find(c => c.id === cliente.cobradorAsignadoId);
      
      if (cobrador) {
        const fechaPago = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000);
        const montoClientePago = Number(cliente.montoPago);
        const montoPago = Math.random() > 0.8 ? montoClientePago / 2 : montoClientePago; // 20% pagos parciales
        const saldoAnterior = Number(cliente.saldoActual) + montoPago;
        
        await prisma.pago.create({
          data: {
            clienteId: cliente.id,
            cobradorId: cobrador.id,
            monto: montoPago,
            tipoPago: Math.random() > 0.9 ? 'moratorio' : 'regular', // 10% moratorios
            concepto: Math.random() > 0.9 ? 'Pago moratorio' : 'Pago de cuota',
            fechaPago,
            saldoAnterior,
            saldoNuevo: saldoAnterior - montoPago,
            ticketImpreso: Math.random() > 0.2,
            sincronizado: true,
          },
        });
      }
    }

    console.log('✅ Pagos de ejemplo creados');

    // Crear rutas de cobranza
    console.log('🛣️ Creando rutas de cobranza...');

    for (let i = 0; i < 10; i++) {
      const cobrador = cobradores[Math.floor(Math.random() * cobradores.length)];
      const fecha = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000);
      const clientesVisitados = Math.floor(Math.random() * 8) + 3; // 3-10 clientes
      const totalCobrado = (Math.floor(Math.random() * 3000) + 1000); // 1000-4000 pesos

      await prisma.rutaCobranza.create({
        data: {
          cobradorId: cobrador.id,
          fecha,
          clientesVisitados: {
            total: clientesVisitados,
            exitosos: Math.floor(clientesVisitados * 0.7),
            fallidos: Math.floor(clientesVisitados * 0.3),
          },
          totalCobrado,
        },
      });
    }

    console.log('✅ Rutas de cobranza creadas');

    console.log('\n🎉 ¡Seeders completados exitosamente!');
    console.log('\n📊 Resumen de datos creados:');
    console.log(`- ${await prisma.user.count()} usuarios`);
    console.log(`- ${await prisma.cliente.count()} clientes`);
    console.log(`- ${await prisma.pago.count()} pagos`);
    console.log(`- ${await prisma.plantillaTicket.count()} plantillas de ticket`);
    console.log(`- ${await prisma.rutaCobranza.count()} rutas de cobranza`);

    console.log('\n🔑 Credenciales de acceso:');
    console.log('👑 Admin:    admin@economica.local / admin123');
    console.log('👤 Gestor:   gestor@economica.local / gestor123');
    console.log('📊 Reportes: reportes@economica.local / reportes123');
    console.log('\n🚚 Gestores de Campo (5):');
    console.log('   ruta0@local.com / ruta123 (RUTA0) - 200 clientes: CL1-CL200');
    console.log('   ruta1@local.com / ruta123 (RUTA1) - 200 clientes: CL201-CL400');
    console.log('   ruta2@local.com / ruta123 (RUTA2) - 200 clientes: CL401-CL600');
    console.log('   ruta3@local.com / ruta123 (RUTA3) - 200 clientes: CL601-CL800');
    console.log('   ruta4@local.com / ruta123 (RUTA4) - 200 clientes: CL801-CL1000');

  } catch (error) {
    console.error('❌ Error al ejecutar seeders:', error);
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
