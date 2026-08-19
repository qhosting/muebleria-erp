import { PrismaClient } from '@prisma/client';
import { ContpaqiService } from '../lib/contpaqi-service';

const dbUrl = 'postgres://postgres:d0a4221856f4ba5ea1ec@212.56.42.193:1080/dasoplus-db?sslmode=disable';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

async function main() {
  const apiUrl = 'http://vortex520.qhosting.net:5000';
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';
  const codigo = 'DP2608003';

  console.log(`\n======================================================`);
  console.log(`🧪 PROBANDO CONSULTA DE SALDO PARA ${codigo} EN CONTPAQI`);
  console.log(`======================================================\n`);

  const empresasATestear = ['DP', 'adDASOPLUS16', 'DP - adDASOPLUS16'];

  for (const emp of empresasATestear) {
    console.log(`\n--- PROBANDO CON EMPRESA: "${emp}" ---`);
    const service = new ContpaqiService({ apiUrl, apiKey, empresa: emp });

    try {
      console.log(`1. getCliente("${codigo}"):`);
      const resCliente = await service.getCliente(codigo);
      console.log('Respuesta getCliente:', JSON.stringify(resCliente, null, 2));

      console.log(`2. getClienteEstadoCuenta("${codigo}"):`);
      const resEstadoCuenta = await service.getClienteEstadoCuenta(codigo);
      console.log('Respuesta getClienteEstadoCuenta:', JSON.stringify(resEstadoCuenta, null, 2));

      console.log(`3. getClientDocumentos("${codigo}"):`);
      const resDocs = await service.getClientDocumentos(codigo).catch(e => e.message);
      console.log('Respuesta getClientDocumentos:', JSON.stringify(resDocs, null, 2));
    } catch (err: any) {
      console.error(`❌ Error con empresa ${emp}:`, err.message);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
