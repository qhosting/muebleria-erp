async function main() {
  const baseUrl = 'http://vortex520.qhosting.net:5000';
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';
  const empresa = 'DP';
  const cod = 'DP2608073';

  console.log(`=== VERIFICANDO FACTURA 1152 VÍA CONTPAQI API ===`);
  const resDoc = await fetch(`${baseUrl}/api/Documentos/42557?empresa=${empresa}`, {
    headers: {
      'Accept': 'application/json',
      'X-API-Key': apiKey,
      'X-Company-Id': empresa,
      'X-Contpaqi-Empresa': empresa
    }
  });

  const doc = await resDoc.json();
  console.log(`\nFactura Folio: ${doc.folio}`);
  console.log(`Cliente: ${doc.razonSocial}`);
  console.log(`Total: $${doc.total}`);
  console.log(`Cancelado en API: ${doc.cancelado} (0 = ACTIVA, 1 = CANCELADA)`);

  const resCli = await fetch(`${baseUrl}/api/Documentos/cliente/${cod}?empresa=${empresa}`, {
    headers: {
      'Accept': 'application/json',
      'X-API-Key': apiKey,
      'X-Company-Id': empresa,
      'X-Contpaqi-Empresa': empresa
    }
  });

  const docs = await resCli.json();
  console.log(`\nDocumentos activos del cliente ${cod}:`);
  docs.forEach(d => {
    console.log(`- Folio: ${d.serie || ''}-${d.folio} | Concepto: ${d.codigoConcepto} | Total: $${d.total} | Cancelado: ${d.cancelado}`);
  });
}

main().catch(console.error);
