import { ContpaqiService } from '../lib/contpaqi-service';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const cod = 'DP2602037';
  const empresa = 'DP';
  const apiUrl = process.env.CONTPAQI_API_URL || 'http://vortex520.qhosting.net:5000';
  const apiKey = process.env.CONTPAQI_API_KEY || 'VERTEX123_CONTPAQI_ERP_2024';

  console.log(`=== CONSULTANDO CONTPAQI API PARA CLIENTE ${cod} (${empresa}) ===`);
  console.log(`URL: ${apiUrl}`);

  const service = new ContpaqiService({ apiUrl, apiKey, empresa });

  try {
    const docs = await service.getClientDocumentos(cod);
    console.log(`\nDocumentos obtenidos: ${Array.isArray(docs) ? docs.length : 0}`);

    if (!Array.isArray(docs) || docs.length === 0) {
      console.log('No se encontraron documentos en ContPAQi para este cliente.');
      return;
    }

    console.log('\n--- DETALLE DE DOCUMENTOS CONTPAQI ---');
    let totalCargos = 0;
    let totalAbonos = 0;

    docs.forEach((d: any, idx: number) => {
      const folio = `${d.serie || ''}-${d.folio || ''}`;
      const concepto = d.codigoConcepto?.trim();
      const total = parseFloat(d.total) || 0;
      const saldo = parseFloat(d.saldo) || 0;
      const fecha = d.fecha ? new Date(d.fecha).toISOString().slice(0, 10) : 'S/F';
      const cancelado = d.cancelado ? '[CANCELADO]' : '[ACTIVO]';

      let tipoDoc = 'OTRO';
      if (concepto === '16') {
        tipoDoc = 'PAGARÉ (CARGO)';
        if (!d.cancelado) totalCargos += total;
      } else if (concepto === '101' || concepto === '102') {
        tipoDoc = 'ABONO (COBRANZA)';
        if (!d.cancelado) totalAbonos += total;
      } else if (concepto === '100') {
        tipoDoc = 'FACTURA INICIAL';
      }

      console.log(
        `#${idx + 1} | ${fecha} | Concepto: ${concepto} (${tipoDoc}) | Folio: ${folio} | Total: $${total.toFixed(
          2
        )} | Pendiente Doc: $${saldo.toFixed(2)} | Ref: ${d.referencia || 'N/A'} | Extra1: ${
          d.textoExtra1 || 'N/A'
        } ${cancelado}`
      );
    });

    const saldoCalculado = totalCargos - totalAbonos;

    console.log('\n==========================================');
    console.log(`TOTAL CARGOS (Pagarés Concepto 16):  $${totalCargos.toFixed(2)}`);
    console.log(`TOTAL ABONOS (Cobranza Concepto 101): $${totalAbonos.toFixed(2)}`);
    console.log(`------------------------------------------`);
    console.log(`SALDO CONTPAQI CALCULADO:            $${saldoCalculado.toFixed(2)}`);
    console.log('==========================================\n');
  } catch (error: any) {
    console.error('Error al consultar ContPAQi API:', error.message);
  }
}

main().catch(console.error);
