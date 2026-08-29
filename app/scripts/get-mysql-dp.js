import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || '198.251.65.176',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'admin_muebles',
  password: process.env.MYSQL_PASSWORD || 'Muebles2024!',
  database: process.env.MYSQL_DATABASE || 'admin_dasomuebles',
  connectTimeout: 5000,
};

async function main() {
  const cod = 'DP2602037';
  try {
    const connection = await mysql.createConnection(MYSQL_CONFIG);

    const [cli] = await connection.query('SELECT cod_cliente, nombre_ccliente, saldo_actualcli, dia_cobro, importe1, fecha_alta FROM cat_clientes WHERE cod_cliente = ?', [cod]);
    console.log('Cliente en MySQL cat_clientes:', cli);

    const [pagos] = await connection.query('SELECT idpag, fechap, montop, mora, gcob, ref_pago, saldo_actualcli FROM pagos WHERE cod_cliente = ? ORDER BY fechap DESC LIMIT 10', [cod]);
    console.log('\nÚltimos 10 pagos en MySQL:');
    console.log(pagos);

    await connection.end();
  } catch (err) {
    console.log('Error MySQL conexión externa:', err.message);
  }
}

main().catch(console.error);
