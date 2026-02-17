
import { prisma } from '../lib/db';

async function cleanDatabase() {
  try {
    console.log('🧹 Limpiando base de datos...');
    
    // Eliminar en el orden correcto para evitar errores de FK
    await prisma.pago.deleteMany();
    await prisma.rutaCobranza.deleteMany();
    await prisma.cliente.deleteMany();
    await prisma.plantillaTicket.deleteMany();
    await prisma.user.deleteMany();
    
    console.log('✅ Base de datos limpiada');
  } catch (error) {
    console.error('❌ Error al limpiar base de datos:', error);
    throw error;
  }
}

cleanDatabase()
  .then(() => {
    console.log('🎉 Limpieza completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
