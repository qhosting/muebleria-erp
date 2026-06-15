import { PrismaClient } from '@prisma/client';

// Initialize prisma using the environment variable
const prisma = new PrismaClient();

async function main() {
  try {
    const count22 = await prisma.movimientoSantander22001022837.count();
    const count65 = await prisma.movimientoSantander65505732541.count();
    
    console.log(`=== REPORTE DE MOVIMIENTOS SANTANDER ===`);
    console.log(`Total movimientos Santander 22001022837: ${count22}`);
    console.log(`Total movimientos Santander 65505732541: ${count65}`);
    
    // Buscar si hay movimientos cruzados
    const mixedIn22 = await prisma.movimientoSantander22001022837.findMany({
      where: {
        descripcionDetallada: {
          contains: '65505732541'
        }
      },
      take: 5
    });
    console.log(`Movimientos en tabla 22001022837 que hacen referencia a '65505732541': ${mixedIn22.length}`);
    if (mixedIn22.length > 0) {
      mixedIn22.forEach((m, i) => {
        console.log(`  [${i+1}] ID: ${m.id}, Concepto: ${m.concepto}, Importe (Abono): ${m.abono}, Fecha: ${m.fechaOperacion}`);
      });
    }

    const mixedIn65 = await prisma.movimientoSantander65505732541.findMany({
      where: {
        descripcionDetallada: {
          contains: '22001022837'
        }
      },
      take: 5
    });
    console.log(`Movimientos en tabla 65505732541 que hacen referencia a '22001022837': ${mixedIn65.length}`);
    if (mixedIn65.length > 0) {
      mixedIn65.forEach((m, i) => {
        console.log(`  [${i+1}] ID: ${m.id}, Concepto: ${m.concepto}, Importe (Abono): ${m.abono}, Fecha: ${m.fechaOperacion}`);
      });
    }
  } catch (e) {
    console.error('Error durante el diagnóstico:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
