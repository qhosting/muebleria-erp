import { ContpaqiService } from '../lib/contpaqi-service';

async function main() {
  const apiUrl = 'http://vortex520.qhosting.net:5000';
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';
  const service = new ContpaqiService({ apiUrl, apiKey, empresa: 'DP' });

  try {
    const webhooks = await service.getWebhooks();
    console.log('Webhooks registrados en ContPAQi API:', JSON.stringify(webhooks, null, 2));
  } catch (e: any) {
    console.log('Webhooks endpoint:', e.message);
  }
}

main().catch(console.error);
