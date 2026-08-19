import { ContpaqiService } from '../lib/contpaqi-service';

async function main() {
  const apiUrl = 'http://vortex520.qhosting.net:5000';
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';

  const codigos = ['DP2608003', 'DP2608001', 'DQ2601071', 'DP2605137'];

  console.log('🧪 VERIFICANDO OBTENCIÓN DE SALDO CONTPAQI API:\n');

  for (const cod of codigos) {
    const empresa = cod.startsWith('DP') ? 'DP' : 'DQ';
    const service = new ContpaqiService({ apiUrl, apiKey, empresa });

    const ec = await service.getClienteEstadoCuenta(cod, empresa);
    const rawSaldo = ec?.saldoActual ?? ec?.saldoTotal ?? ec?.cSaldoActual;
    const saldoFinal = parseFloat(rawSaldo?.toString() || '0');

    console.log(`✅ Contrato: ${cod} (${empresa}) | Cliente: ${ec?.razonSocial}`);
    console.log(`   Saldo ContPAQi obtenido: $${saldoFinal.toFixed(2)}`);
    console.log(`   Último movimiento: ${ec?.fechaUltimoMovimiento || 'N/A'}\n`);
  }
}

main().catch(console.error);
