import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function clean() {
  try {
    console.log('--- INICIANDO LIMPIEZA DE DATOS OPERACIONALES ---');
    
    // Eliminar datos dependientes primero para evitar errores de clave foránea
    const d1 = await prisma.pago.deleteMany();
    console.log(`Eliminados ${d1.count} pagos.`);
    
    const d2 = await prisma.motarario.deleteMany();
    console.log(`Eliminados ${d2.count} registros de mora.`);
    
    const d3 = await prisma.convenioPago.deleteMany();
    console.log(`Eliminados ${d3.count} convenios.`);
    
    const d4 = await prisma.verificacionDomiciliaria.deleteMany();
    console.log(`Eliminados ${d4.count} verificaciones.`);
    
    const d5 = await prisma.smsLog.deleteMany();
    console.log(`Eliminados ${d5.count} logs de SMS.`);
    
    const d6 = await prisma.movimientoBancario.deleteMany();
    console.log(`Eliminados ${d6.count} movimientos bancarios.`);

    const d7 = await prisma.ticket.deleteMany();
    console.log(`Eliminados ${d7.count} tickets.`);
    
    const d8 = await prisma.rutaCobranza.deleteMany();
    console.log(`Eliminados ${d8.count} rutas de cobranza.`);

    const { count } = await prisma.cliente.deleteMany();
    console.log(`¡LIMPIEZA COMPLETADA! Se eliminaron ${count} clientes.`);
    
  } catch (e) {
    console.error('Error durante la limpieza:', e);
  } finally {
    await prisma.$disconnect();
  }
}

clean();
