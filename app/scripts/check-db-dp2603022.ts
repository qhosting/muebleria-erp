import { PrismaClient } from '@prisma/client';

const dbUrl = process.env.DATABASE_URL?.includes('212.56.42.193') 
  ? process.env.DATABASE_URL 
  : 'postgres://postgres:d0a4221856f4ba5ea1ec@212.56.42.193:1080/dasoplus-db?sslmode=disable';

const prisma = new PrismaClient({
  datasources: {
    db: { url: dbUrl }
  }
});

async function main() {
  const codigo = 'DP2603022';
  console.log(`\n🔍 Verificando cliente ${codigo} en la Base de Datos PostgreSQL...`);
  
  const cliente = await prisma.cliente.findUnique({
    where: { codigoCliente: codigo },
    include: {
      pagos: { orderBy: { createdAt: 'desc' } },
      tickets: { orderBy: { creadoEn: 'desc' } }
    }
  });

  if (!cliente) {
    console.log('❌ Cliente no encontrado en DB local.');
    return;
  }

  console.log(`✅ Cliente: ${cliente.nombreCompleto}`);
  console.log(`💰 Saldo Actual en DB: $${cliente.saldoActual}`);
  console.log(`📊 Total Pagos en DB: ${cliente.pagos.length}`);
  console.log(`🎫 Total Tickets en DB: ${cliente.tickets.length}`);

  console.log('\n--- ÚLTIMOS PAGOS EN ERP ---');
  cliente.pagos.slice(0, 5).forEach(p => {
    console.log(`ID: ${p.id} | Monto: $${p.monto} | Fecha: ${p.fechaPago} | SaldoAnt: ${p.saldoAnterior} | SaldoNvo: ${p.saldoNuevo}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
