import { ContpaqiService } from '../lib/contpaqi-service';

async function main() {
  const apiUrl = 'http://vortex520.qhosting.net:5000';
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';
  const empresa = 'DP';
  const codigo = 'DP2603022';

  const service = new ContpaqiService({ apiUrl, apiKey, empresa });

  const docs = await service.getClientDocumentos(codigo);
  
  console.log(`\n======================================================`);
  console.log(`ANÁLISIS DETALLADO DE MOVIMIENTOS CONTPAQI PARA ${codigo}`);
  console.log(`======================================================\n`);

  let cargosTotal = 0;
  let abonosTotal = 0;
  let facturasTotal = 0;
  let abonosList: any[] = [];
  let cargosList: any[] = [];
  let otrosList: any[] = [];

  for (const doc of docs) {
    const cto = doc.codigoConcepto?.trim() || String(doc.idConceptoDocumento);
    if (cto === '16') {
      cargosTotal += doc.total;
      cargosList.push(doc);
    } else if (cto === '101') {
      abonosTotal += doc.total;
      abonosList.push(doc);
    } else if (cto === '17') {
      facturasTotal += doc.total;
      otrosList.push(doc);
    } else {
      otrosList.push(doc);
    }
  }

  console.log(`📦 TOTAL CARGOS (Concepto 16 - Letras/Pagarés): $${cargosTotal.toFixed(2)} (${cargosList.length} documentos)`);
  console.log(`📄 TOTAL FACTURAS (Concepto 17): $${facturasTotal.toFixed(2)} (${otrosList.length} documentos)`);
  console.log(`💵 TOTAL ABONOS REGISTRADOS (Concepto 101): $${abonosTotal.toFixed(2)} (${abonosList.length} abonos)`);
  console.log(`\n🧮 CÁLCULO MATEMÁTICO REAL:`);
  console.log(`   Cargos ($${cargosTotal.toFixed(2)}) - Abonos ($${abonosTotal.toFixed(2)}) = $${(cargosTotal - abonosTotal).toFixed(2)}`);

  console.log(`\n--- LISTA DE ABONOS ---`);
  abonosList.forEach(a => {
    console.log(`Folio: ${a.folio} | Fecha: ${a.fecha.substring(0, 10)} | Monto: $${a.total} | Agente: ${a.nombreAgente?.trim()} | Ref: ${a.referencia}`);
  });

  console.log(`\n--- CARGOS QUE APARECEN CON PENDIENTE > 0 ---`);
  const cargosPendientes = cargosList.filter(c => c.pendiente > 0);
  console.log(`Total cargos con pendiente: ${cargosPendientes.length} de ${cargosList.length}`);
  cargosPendientes.forEach(c => {
    console.log(`Folio: ${c.folio} | Fecha: ${c.fecha.substring(0,10)} | Total: $${c.total} | Pendiente: $${c.pendiente}`);
  });

  console.log(`\n--- CARGOS CON PENDIENTE == 0 (SALDADOS) ---`);
  const cargosSaldados = cargosList.filter(c => c.pendiente === 0);
  console.log(`Total cargos saldados: ${cargosSaldados.length}`);
  let sumaSaldados = 0;
  cargosSaldados.forEach(c => {
    sumaSaldados += c.total;
    console.log(`Folio: ${c.folio} | Fecha: ${c.fecha.substring(0,10)} | Total: $${c.total}`);
  });
  console.log(`Suma de cargos saldados en Contpaqi: $${sumaSaldados.toFixed(2)}`);
}

main().catch(console.error);
