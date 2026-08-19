import { ContpaqiService } from '../lib/contpaqi-service';

async function main() {
  const apiUrl = 'http://vortex520.qhosting.net:5000';
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';

  const testCodigos = ['DP2608003', 'DP2608001', 'DQ2601071', 'DP2605137', 'DP2602035'];

  for (const cod of testCodigos) {
    const emp = cod.startsWith('DP') ? 'DP' : 'DQ';
    const service = new ContpaqiService({ apiUrl, apiKey, empresa: emp });

    console.log(`\n========================================`);
    console.log(`🔍 Probando saldo para: ${cod} (Empresa: ${emp})`);
    console.log(`========================================`);

    const ec = await service.getClienteEstadoCuenta(cod, emp);
    console.log('getClienteEstadoCuenta:', ec);
  }
}

main().catch(console.error);
