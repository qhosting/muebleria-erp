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
};

async function main() {
  const cod = 'DP2602037';
  const empresa = 'DP';

  console.log(`=== ANALIZANDO SALDO DE ${cod} (OBJETIVO: $9,115.00) ===\n`);

  // 1. Obtener de ContPAQi
  const url = `http://vortex520.qhosting.net:5000/api/Documentos/cliente/${cod}?empresa=${empresa}`;
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'X-API-Key': apiKey,
      'X-Company-Id': empresa,
      'X-Contpaqi-Empresa': empresa
    }
  });
  const contpaDocs = await res.json();

  console.log('--- DOCUMENTOS DE CONTPAQI (TODOS) ---');
  contpaDocs.forEach((d) => {
    const c = (d.codigoConcepto || '').toString().trim();
    console.log(`ID: ${d.id} | Fecha: ${d.fecha ? d.fecha.slice(0,10) : ''} | Concepto: [${c}] | Folio: ${d.serie || ''}-${d.folio} | Total: $${d.total} | SaldoDoc: $${d.pendiente || d.saldo} | Cancelado: ${d.cancelado} | Ref: ${d.referencia || ''} | Extra1: ${d.textoExtra1 || ''}`);
  });

  // 2. Obtener de MySQL
  const connection = await mysql.createConnection(MYSQL_CONFIG);
  const [catRows] = await connection.query('SELECT * FROM cat_clientes WHERE cod_cliente = ? LIMIT 1', [cod]);
  const [pagRows] = await connection.query('SELECT * FROM pagos WHERE cod_cliente = ? ORDER BY fechap ASC', [cod]);

  console.log('\n--- DATOS DE MYSQL ---');
  console.log('cat_clientes:', catRows[0]);
  console.log(`\nPagos en MySQL (${pagRows.length} registros):`);
  let sumaAbonosMysql = 0;
  pagRows.forEach((p) => {
    const ab = parseFloat(p.montop) || 0;
    sumaAbonosMysql += ab;
    console.log(`ID: ${p.idpag} | Fecha: ${p.fechap ? new Date(p.fechap).toISOString().slice(0,10) : ''} | Monto: $${ab} | Mora: $${p.mora} | Ref: ${p.ref_pago} | SaldoTrasPago: $${p.saldo_actualcli}`);
  });
  console.log(`\nSuma total montop en MySQL: $${sumaAbonosMysql.toFixed(2)}`);

  await connection.end();
}

main().catch(console.error);
