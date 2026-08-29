import mysql from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || '198.251.65.176',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'admin_muebles',
  password: process.env.MYSQL_PASSWORD || 'Muebles2024!',
  database: process.env.MYSQL_DATABASE || 'admin_dasomuebles',
};

async function main() {
  const cod = 'DP2602037';
  console.log(`=== COMPARATIVA COMPLETA DE SALDOS PARA ${cod} ===`);

  // 1. ERP PostgreSQL
  const erpCliente = await prisma.cliente.findFirst({
    where: { codigoCliente: { equals: cod, mode: 'insensitive' } },
    include: { pagos: true }
  });

  const totalAbonosErp = erpCliente?.pagos?.reduce((sum, p) => sum + parseFloat(p.monto.toString()), 0) || 0;

  console.log(`\n--- ERP POSTGRESQL ---`);
  console.log(`Existe en ERP: ${erpCliente ? 'SI' : 'NO'}`);
  console.log(`Nombre: ${erpCliente?.nombreCompleto || 'N/A'}`);
  console.log(`Saldo Actual ERP: $${parseFloat(erpCliente?.saldoActual?.toString() || '0').toFixed(2)}`);
  console.log(`Total Pagos ERP: ${erpCliente?.pagos?.length || 0} pagos (Suma abonos: $${totalAbonosErp.toFixed(2)})`);

  // 2. MySQL
  const connection = await mysql.createConnection(MYSQL_CONFIG);
  const [catRows]: any = await connection.query('SELECT * FROM cat_clientes WHERE cod_cliente = ? LIMIT 1', [cod]);
  const [pagRows]: any = await connection.query('SELECT * FROM pagos WHERE cod_cliente = ? ORDER BY fechap ASC', [cod]);

  const totalAbonosMysql = pagRows.reduce((sum: number, p: any) => sum + (parseFloat(p.montop) || 0), 0);

  console.log(`\n--- MYSQL DASOMUEBLES ---`);
  console.log(`Existe en cat_clientes: ${catRows.length > 0 ? 'SI' : 'NO'}`);
  console.log(`Saldo en cat_clientes: $${parseFloat(catRows[0]?.saldo_actualcli || '0').toFixed(2)}`);
  console.log(`Total Pagos MySQL: ${pagRows.length} pagos (Suma abonos: $${totalAbonosMysql.toFixed(2)})`);

  await connection.end();
  await prisma.$disconnect();
}

main().catch(console.error);
