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

  const docs = await res.json();

  console.log(`\n=== DOCUMENTOS DE ${cod} EN CONTPAQI (${empresa}) ===`);
  console.log(`Total documentos: ${docs.length}\n`);

  let cargos = [];
  let abonos = [];
  let otros = [];

  docs.forEach((d) => {
    const c = (d.codigoConcepto || '').toString().trim();
    const docObj = {
      id: d.id,
      concepto: c,
      serie: d.serie,
      folio: d.folio,
      fecha: d.fecha ? d.fecha.slice(0, 10) : '',
      total: parseFloat(d.total) || 0,
      saldo: parseFloat(d.pendiente || d.saldo || 0),
      cancelado: d.cancelado,
      referencia: d.referencia,
      extra1: d.textoExtra1
    };

    if (c === '16') {
      cargos.push(docObj);
    } else if (c === '101' || c === '102') {
      abonos.push(docObj);
    } else {
      otros.push(docObj);
    }
  });

  console.log('--- CARGOS / PAGARÉS (Concepto 16) ---');
  let sumaCargos = 0;
  cargos.forEach((d, i) => {
    console.log(`[${i+1}] ${d.fecha} | Folio: ${d.serie || ''}-${d.folio} | Total: $${d.total.toFixed(2)} | Pendiente: $${d.saldo.toFixed(2)} | Cancelado: ${d.cancelado ? 'SI' : 'NO'}`);
    if (!d.cancelado) sumaCargos += d.total;
  });

  console.log('\n--- ABONOS DE COBRANZA (Concepto 101 / 102) ---');
  let sumaAbonos = 0;
  abonos.forEach((d, i) => {
    console.log(`[${i+1}] ${d.fecha} | Concepto: ${d.concepto} | Folio: ${d.serie || ''}-${d.folio} | Total: $${d.total.toFixed(2)} | Ref: ${d.referencia || ''} | Extra1: ${d.extra1 || ''} | Cancelado: ${d.cancelado ? 'SI' : 'NO'}`);
    if (!d.cancelado) sumaAbonos += d.total;
  });

  if (otros.length > 0) {
    console.log('\n--- OTROS DOCUMENTOS ---');
    otros.forEach((d, i) => {
      console.log(`[${i+1}] ${d.fecha} | Concepto: ${d.concepto} | Folio: ${d.serie || ''}-${d.folio} | Total: $${d.total.toFixed(2)} | Ref: ${d.referencia || ''}`);
    });
  }

  // Consultar también estado-cuenta
  const resEc = await fetch(`http://vortex520.qhosting.net:5000/api/clientes/${cod}/estado-cuenta?empresa=${empresa}`, {
    headers: {
      'Accept': 'application/json',
      'X-API-Key': apiKey,
      'X-Company-Id': empresa,
      'X-Contpaqi-Empresa': empresa
    }
  });
  const ec = await resEc.json();

  console.log('\n=============================================');
  console.log(`CLIENTE: ${cod} - ${docs[0]?.razonSocial || ''}`);
  console.log(`TOTAL CARGOS (Pagarés):       $${sumaCargos.toFixed(2)} (${cargos.length} pagarés)`);
  console.log(`TOTAL ABONOS REGISTRADOS:     $${sumaAbonos.toFixed(2)} (${abonos.length} abonos)`);
  console.log(`---------------------------------------------`);
  console.log(`SALDO AUDITADO (Cargos - Abonos): $${(sumaCargos - sumaAbonos).toFixed(2)}`);
  console.log(`SALDO ENDPOINT ESTADO DE CUENTA:  $${parseFloat(ec?.saldoActual || 0).toFixed(2)}`);
  console.log(`SALDO VENCIDO:                    $${parseFloat(ec?.saldoVencido || 0).toFixed(2)} (${ec?.diasVencidos || 0} días)`);
  console.log('=============================================\n');
}

main().catch(console.error);
