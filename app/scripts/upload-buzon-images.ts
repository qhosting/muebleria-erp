import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const db = prisma as any;

async function uploadImages() {
  const baseDir = path.join(process.cwd(), '..', 'recibos', 'procesados');
  
  if (!fs.existsSync(baseDir)) {
    console.error(`Directorio no encontrado: ${baseDir}`);
    return;
  }

  const files = fs.readdirSync(baseDir).filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg'));

  console.log(`Iniciando carga de ${files.length} imágenes al buzón...`);

  for (const file of files) {
    const contractId = path.parse(file).name;
    const filePath = path.join(baseDir, file);
    
    console.log(`Procesando ${file} para contrato ${contractId}...`);
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    
    const existing = await db.buzonTesoreria.findFirst({
      where: { contractId: contractId }
    });

    if (existing) {
      await db.buzonTesoreria.update({
        where: { id: existing.id },
        data: { base64Data: base64 }
      });
    } else {
      // Crear uno nuevo como PENDIENTE para que el usuario pueda probar el flujo
      await db.buzonTesoreria.create({
        data: {
          telefono: '521999000000',
          monto: 0, // El usuario lo verá y podrá corregir o el bot lo llenaría
          referencia: 'CARGA MANUAL RECIBOS',
          contractId: contractId,
          estado: 'PENDIENTE',
          base64Data: base64,
          hash: `MANUAL_IMG_${contractId}_${Date.now()}`
        }
      });
    }
  }

  console.log('✅ Imágenes cargadas exitosamente.');
}

uploadImages()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
