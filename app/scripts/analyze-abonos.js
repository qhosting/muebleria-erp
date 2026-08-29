async function main() {
  const cod = 'DP2602037';
  const empresa = 'DP';
  const url = `http://vortex520.qhosting.net:5000/api/Documentos/cliente/${cod}?empresa=${empresa}`;
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'X-API-Key': apiKey,
      'X-Company-Id': empresa,
      'X-Contpaqi-Empresa': empresa
    }
  });
  const contpaDocs = await res.json();

  let cargos = 16490;
  let abonos = [];

  contpaDocs.forEach(d => {
    const c = (d.codigoConcepto || '').toString().trim();
    if (c === '101' || c === '102' || c === '14' || c === '8') {
      abonos.push({
        id: d.id,
        fecha: d.fecha ? d.fecha.slice(0, 10) : '',
        concepto: c,
        folio: `${d.serie || ''}-${d.folio}`,
        total: parseFloat(d.total) || 0,
        ref: d.referencia || '',
        extra1: d.textoExtra1 || ''
      });
    }
  });

  // Ordenar por fecha asc
  abonos.sort((a, b) => a.fecha.localeCompare(b.fecha));

  console.log(`=== ANALISIS DETALLADO DE ABONOS CONTPAQI PARA ${cod} ===`);
  console.log(`Total Cargo Inicial Pagarés: $${cargos.toFixed(2)}\n`);

  let acum = 0;
  abonos.forEach((a, idx) => {
    acum += a.total;
    const saldoRestante = cargos - acum;
    console.log(`[${idx+1}] ${a.fecha} | Concepto: ${a.concepto} | Folio: ${a.folio} | Monto: $${a.total.toFixed(2)} | Acumulado: $${acum.toFixed(2)} | Saldo Restante: $${saldoRestante.toFixed(2)} | Ref: ${a.ref} | Extra1: ${a.extra1}`);
  });
}

main().catch(console.error);
