async function main() {
  const baseUrl = 'http://vortex520.qhosting.net:5000';
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';
  const docId = 42557;
  const empresa = 'DP';

  console.log(`=== DETALLES DE DOCUMENTO ${docId} (Factura 1152) ===`);
  const resDoc = await fetch(`${baseUrl}/api/Documentos/${docId}?empresa=${empresa}`, {
    headers: {
      'Accept': 'application/json',
      'X-API-Key': apiKey,
      'X-Company-Id': empresa,
      'X-Contpaqi-Empresa': empresa
    }
  });

  console.log(`Doc Status: ${resDoc.status} ${resDoc.statusText}`);
  const docData = await resDoc.json();
  console.log('Documento:', JSON.stringify(docData, null, 2));

  const resMovs = await fetch(`${baseUrl}/api/Documentos/${docId}/movimientos?empresa=${empresa}`, {
    headers: {
      'Accept': 'application/json',
      'X-API-Key': apiKey,
      'X-Company-Id': empresa,
      'X-Contpaqi-Empresa': empresa
    }
  });

  console.log(`\nMovimientos Status: ${resMovs.status}`);
  const movsData = await resMovs.json();
  console.log('Movimientos:', JSON.stringify(movsData, null, 2));
}

main().catch(console.error);
