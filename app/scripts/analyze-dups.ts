import { ContpaqiService } from '../lib/contpaqi-service';

async function main() {
  const apiUrl = 'http://vortex520.qhosting.net:5000';
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';
  const empresa = 'DP';
  const codigo = 'DP2603022';

  const service = new ContpaqiService({ apiUrl, apiKey, empresa });
  const docs = await service.getClientDocumentos(codigo);

  console.log('--- DETALLE DE FACTURAS (CONCEPTO 17 Y OTROS) ---');
  docs.forEach((d: any) => {
    const cto = d.codigoConcepto?.trim() || String(d.idConceptoDocumento);
    if (cto !== '16' && cto !== '101') {
      console.log(`ID: ${d.id} | Concepto: ${cto} | Folio: ${d.folio} | Fecha: ${d.fecha} | Total: $${d.total} | Cancelado: ${d.cancelado} | Obs: ${d.observaciones}`);
    }
  });

  console.log('\n--- DETALLE DE LOS 2 PAQUETES DE PAGARÉS (CONCEPTO 16) ---');
  const c16 = docs.filter((d: any) => (d.codigoConcepto?.trim() || String(d.idConceptoDocumento)) === '16');
  console.log(`Total pagarés: ${c16.length}`);
  
  const grupo1 = c16.filter((d: any) => d.folio >= 7327 && d.folio <= 7370);
  const grupo2 = c16.filter((d: any) => d.folio >= 9808 && d.folio <= 9851);
  const otrosGrupo = c16.filter((d: any) => !(d.folio >= 7327 && d.folio <= 7370) && !(d.folio >= 9808 && d.folio <= 9851));

  console.log(`Grupo 1 (Folios 7327 - 7370, 16-Mar-2026): ${grupo1.length} pagarés, Suma: $${grupo1.reduce((s: number, x: any) => s + x.total, 0)}`);
  console.log(`Grupo 2 (Folios 9808 - 9851, 26-Mar-2026): ${grupo2.length} pagarés, Suma: $${grupo2.reduce((s: number, x: any) => s + x.total, 0)}`);
  console.log(`Otros pagarés: ${otrosGrupo.length}`);

  console.log('\n--- OBSERVACIONES / NOTAS DE LOS PAGARÉS DE CADA GRUPO ---');
  if (grupo1[0]) console.log('Muestra Grupo 1 Obs:', grupo1[0].observaciones, '| Ref:', grupo1[0].referencia, '| TextoExtra1:', grupo1[0].textoExtra1);
  if (grupo2[0]) console.log('Muestra Grupo 2 Obs:', grupo2[0].observaciones, '| Ref:', grupo2[0].referencia, '| TextoExtra1:', grupo2[0].textoExtra1);

  // Si la cuenta era de una sola venta de 15,290:
  // Venta real: 15,290
  // Abonos recibidos: 8,115 (18 abonos) (Wait! Let's check abonos total: 8,115 - enganche/pagos)
  // 15,290 - 8,115 = 7,175 (o con ajustes = 7,875).
  // Y 30,580 - 8,115 = 22,465 !!
}

main().catch(console.error);
