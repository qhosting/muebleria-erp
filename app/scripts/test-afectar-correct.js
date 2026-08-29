async function main() {
  const baseUrl = 'http://vortex520.qhosting.net:5000';
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';
  const empresa = 'DP';

  console.log('Enviando afectación con codigoConcepto, serie, folio...');
  const res = await fetch(`${baseUrl}/api/Documentos/afectar?empresa=${empresa}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'X-Company-Id': empresa,
      'X-Contpaqi-Empresa': empresa
    },
    body: JSON.stringify({
      codigoConcepto: '100',
      serie: '',
      folio: 1152
    })
  });

  console.log(`Status: ${res.status} ${res.statusText}`);
  const text = await res.text();
  console.log('Respuesta:', text);

  // Consultar estado de la factura 1152
  const checkRes = await fetch(`${baseUrl}/api/Documentos/42557?empresa=${empresa}`, {
    headers: {
      'Accept': 'application/json',
      'X-API-Key': apiKey,
      'X-Company-Id': empresa,
      'X-Contpaqi-Empresa': empresa
    }
  });
  const doc = await checkRes.json();
  console.log(`\nEstado Factura 1152: Cancelado = ${doc.cancelado} (0 = ACTIVA, 1 = CANCELADA)`);
}

main().catch(console.error);
