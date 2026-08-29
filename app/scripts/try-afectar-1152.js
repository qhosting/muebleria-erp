async function main() {
  const baseUrl = 'http://vortex520.qhosting.net:5000';
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';
  const docId = 42557;
  const empresa = 'DP';

  console.log(`Intentando POST /api/Documentos/afectar para ID ${docId}...`);
  const res = await fetch(`${baseUrl}/api/Documentos/afectar?empresa=${empresa}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'X-Company-Id': empresa,
      'X-Contpaqi-Empresa': empresa
    },
    body: JSON.stringify({ id: docId })
  });

  console.log(`Status: ${res.status} ${res.statusText}`);
  const text = await res.text();
  console.log('Respuesta:', text);

  // Volver a consultar documento
  const checkRes = await fetch(`${baseUrl}/api/Documentos/${docId}?empresa=${empresa}`, {
    headers: {
      'Accept': 'application/json',
      'X-API-Key': apiKey,
      'X-Company-Id': empresa,
      'X-Contpaqi-Empresa': empresa
    }
  });
  const checkData = await checkRes.json();
  console.log(`\nEstado actual del documento: Cancelado = ${checkData.cancelado} (0 = Activo, 1 = Cancelado)`);
}

main().catch(console.error);
