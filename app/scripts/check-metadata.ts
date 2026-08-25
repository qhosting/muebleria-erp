import { ContpaqiService } from '../lib/contpaqi-service';

async function main() {
  const apiUrl = 'http://vortex520.qhosting.net:5000';
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';
  const service = new ContpaqiService({ apiUrl, apiKey, empresa: 'DP' });

  try {
    const meta = await service.getMetadata();
    console.log('API Metadata / Endpoints:', JSON.stringify(meta, null, 2));
  } catch (e: any) {
    console.log('Error metadata:', e.message);
  }
}

main().catch(console.error);
