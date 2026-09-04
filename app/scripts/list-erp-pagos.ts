import { PrismaClient } from '@prisma/client';

const dbUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function main() {
  const codigo = 'DP2603022';
  const cliente = await prisma.cliente.findUnique({
    where: { codigoCliente: codigo },
    include: {
      pagos: { orderBy: { createdAt: 'asc' } }
    }
  });

  console.log('--- TODOS LOS PAGOS EN ERP ---');
  cliente?.pagos.forEach((p, idx) => {
    console.log(`[#${idx+1}] ID: ${p.id} | Fecha: ${p.fechaPago} | Creado: ${p.createdAt} | Monto: $${p.monto} | Ant: $${p.saldoAnterior} -> Nvo: $${p.saldoNuevo} | Concepto: ${p.concepto}`);
  });
}

main().finally(() => prisma.$disconnect());
