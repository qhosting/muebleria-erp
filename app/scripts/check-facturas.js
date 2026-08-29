async function main() {
  const baseUrl = 'http://vortex520.qhosting.net:5000';
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';
  const empresa = 'DP';

  for (const fol of [1150, 1151, 1152, 1153, 1154]) {
    const res = await fetch(`${baseUrl}/api/Documentos?codigoConcepto=100&folio=${fol}&empresa=${empresa}`, {
      headers: {
        'Accept': 'application/json',
        'X-API-Key': apiKey,
        'X-Company-Id': empresa,
        'X-Contpaqi-Empresa': empresa
      }
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`Folio 100-${fol}:`, Array.isArray(data) ? data.map(d => `ID:${d.id} Cliente:${d.razonSocial} Total:$${d.total} Cancelado:${d.cancelado}`) : data);
    }
  }
}

main().catch(console.error);
