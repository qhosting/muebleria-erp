import { ContpaqiService } from '../lib/contpaqi-service';

async function main() {
  const apiUrl = 'http://vortex520.qhosting.net:5000';
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';
  const empresa = 'DP';
  const codigo = 'DP2603022';

  const service = new ContpaqiService({ apiUrl, apiKey, empresa });

  console.log(`\n=== 1. BUSCANDO DOCUMENTOS DE ${codigo} ===`);
  try {
    const docs = await service.getClientDocumentos(codigo);
    console.log('Documentos:', JSON.stringify(docs, null, 2));
  } catch (err: any) {
    console.error('Error al obtener getClientDocumentos:', err.message);
  }

  // Intentar probar endpoints comunes de documentos o cargos/abonos
  const testEndpoints = [
    `/api/documentos?codigoCliente=${codigo}&empresa=DP`,
    `/api/documentos?cliente=${codigo}&empresa=DP`,
    `/api/Comercial/Documentos?codigoCliente=${codigo}&empresa=DP`,
    `/api/clientes/${codigo}/documentos?empresa=DP`,
    `/api/clientes/${codigo}/movimientos?empresa=DP`,
    `/api/clientes/${codigo}/estado-cuenta-detallado?empresa=DP`,
    `/api/pagos?codigoCliente=${codigo}&empresa=DP`,
    `/api/cargos?codigoCliente=${codigo}&empresa=DP`
  ];

  for (const ep of testEndpoints) {
    try {
      console.log(`\nProbing: ${ep}`);
      // @ts-ignore
      const res = await service.request(ep);
      console.log(`Respuesta de ${ep}:`, JSON.stringify(res, null, 2));
    } catch (e: any) {
      console.log(`Fallo ${ep}:`, e.message);
    }
  }
}

main().catch(console.error);
