import { ContpaqiService } from '../lib/contpaqi-service';

async function main() {
  const apiUrl = 'http://vortex520.qhosting.net:5000';
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';
  const empresa = 'DP';
  const codigo = 'DP2603022';

  const service = new ContpaqiService({ apiUrl, apiKey, empresa });

  console.log(`\n=== 1. OBTENIENDO DOCUMENTOS ESPECÍFICOS DE DP2603022 ===`);
  const docs = await service.getClientDocumentos(codigo);
  
  console.log(`Total documentos devueltos por el endpoint: ${docs.length}`);

  // Filtrar si el endpoint devolvió todo o sólo del cliente
  const docsCliente = docs.filter((d: any) => 
    d.idClienteProveedor === 185 || 
    d.razonSocial?.toUpperCase().includes('CECILIA') || 
    d.codigoCliente === codigo
  );

  console.log(`Documentos correspondientes a CECILIA TREJO SANCHEZ (ID 185): ${docsCliente.length}`);

  console.log('\n--- DETALLE DE DOCUMENTOS ---');
  let sumaCargos = 0;
  let sumaAbonos = 0;
  let sumaPendiente = 0;

  docsCliente.sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  for (const doc of docsCliente) {
    console.log(`ID: ${doc.id} | Concepto: ${doc.codigoConcepto?.trim() || doc.idConceptoDocumento} | Folio: ${doc.folio} | Fecha: ${doc.fecha} | Total: $${doc.total} | Pendiente: $${doc.pendiente} | Cancelado: ${doc.cancelado} | Ref: ${doc.referencia} | Obs: ${doc.observaciones?.trim()}`);
    
    if (doc.cancelado !== 1) {
      // Concepto 16 suele ser cargo / pagaré / factura / letra
      // Concepto 101 o 17 o abonos
      sumaPendiente += (doc.pendiente || 0);
    }
  }

  console.log(`\n--- RESUMEN ---`);
  console.log(`Suma de pendientes: $${sumaPendiente.toFixed(2)}`);

  // También veamos qué otros documentos hay con ID 185 en general si existieran
  const docsTodos185 = docs.filter((d: any) => d.idClienteProveedor === 185);
  console.log(`Total con idClienteProveedor === 185: ${docsTodos185.length}`);
}

main().catch(console.error);
