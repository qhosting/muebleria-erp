import { ContpaqiService } from '../lib/contpaqi-service';

async function main() {
  const apiUrl = 'http://vortex520.qhosting.net:5000';
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';
  const service = new ContpaqiService({ apiUrl, apiKey, empresa: 'DP' });

  const cliente = await service.getCliente('DP2608003');
  console.log('Cliente ContPAQi:', cliente);

  const estado = await service.getClienteEstadoCuenta('DP2608003');
  console.log('Estado de cuenta ContPAQi:', estado);
}

main().catch(console.error);
