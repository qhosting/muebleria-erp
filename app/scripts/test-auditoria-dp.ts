import { PrismaClient } from '@prisma/client';
import { auditarSaldosCliente } from '../lib/auditoria-saldos-service';

const dbUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function main() {
  console.log('--- AUDITANDO SALDOS DP2603022 ---');
  const resultado = await auditarSaldosCliente('DP2603022', prisma);
  console.log('Resultado de auditoría:');
  console.log('Codigo:', resultado.codigo);
  console.log('Nombre:', resultado.nombre);
  console.log('Saldo ERP Actual (Postgres):', resultado.saldoErpActual);
  console.log('Saldo MySQL Actual (cat_clientes):', resultado.saldoMysqlActual);
  console.log('Saldo ContPAQi API (en vivo):', resultado.saldoContpaqiApi);
  console.log('Saldo Real Calculado:', resultado.saldoRealCalculado);
  console.log('Estado Cuadre:', resultado.estadoCuadre);
  console.log('Diferencia ERP:', resultado.diferenciaErp);
  console.log('Diferencia MySQL:', resultado.diferenciaMysql);
  console.log('Detalles Contpaqi:', resultado.detallesContpaqi);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
