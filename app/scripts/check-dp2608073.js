async function main() {
  const cod = 'DP2608073';
  const empresa = 'DP';
  const baseUrl = 'http://vortex520.qhosting.net:5000';
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';

  console.log(`=== CONSULTANDO DOCUMENTOS DE ${cod} (${empresa}) ===`);

  const res = await fetch(`${baseUrl}/api/Documentos/cliente/${cod}?empresa=${empresa}`, {
    headers: {
      'Accept': 'application/json',
      'X-API-Key': apiKey,
      'X-Company-Id': empresa,
      'X-Contpaqi-Empresa': empresa
    }
  });

  console.log(`Status: ${res.status} ${res.statusText}`);
  const docs = await res.json();
  console.log(`Total documentos: ${Array.isArray(docs) ? docs.length : 0}`);

  if (Array.isArray(docs)) {
    docs.forEach((d) => {
      console.log(`ID: ${d.id} | Concepto: [${d.codigoConcepto}] | Folio: ${d.serie || ''}-${d.folio} | Fecha: ${d.fecha?.slice(0, 10)} | Total: $${d.total} | Saldo: $${d.pendiente || d.saldo} | Cancelado: ${d.cancelado} | Ref: ${d.referencia || ''}`);
    });
  } else {
    console.log(docs);
  }
}

main().catch(console.error);
