import { PrismaClient } from '@prisma/client';
import { ContpaqiService } from '../lib/contpaqi-service';
import { toCdmxDateString, obtenerEmpresaPorCodigo } from '../lib/auditoria-saldos-service';

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgres://postgres:d0a4221856f4ba5ea1ec@212.56.42.193:1080/dasoplus-db?sslmode=disable' } }
});

async function main() {
  const pago = await prisma.pago.findFirst({
    where: { id: { startsWith: 'cmtgpyuz' } },
    include: {
      cliente: true,
      ticket: true,
      cobrador: true
    }
  });

  if (!pago) {
    console.log('No se encontró el pago que empiece con cmtgpyuz');
    return;
  }

  const cod = pago.cliente?.codigoCliente!;
  const emp = obtenerEmpresaPorCodigo(cod);
  const srv = new ContpaqiService({
    apiUrl: 'http://vortex520.qhosting.net:5000',
    apiKey: 'VERTEX123_CONTPAQI_ERP_2024',
    empresa: emp
  });

  console.log(`--- SUBIENDO PAGO ${pago.id} (${cod} - ${emp}) ---`);
  const conceptoAbono = emp === 'DQ' ? '102' : '101';
  const abonoMonto = parseFloat(pago.monto.toString());
  const effectiveDate = pago.fechaPago ? new Date(pago.fechaPago) : (pago.ticket?.fecha ? new Date(pago.ticket.fecha) : new Date(pago.createdAt));
  const fechaStr = toCdmxDateString(effectiveDate);
  const referencia = pago.ticket?.folio || pago.ticket?.referencia || pago.numeroRecibo || pago.ticket?.id || `PAGO ERP #${pago.id.slice(0, 8)}`;
  const cobradorNombre = pago.cobrador?.name || 'Cobrador';

  console.log('Registrando pago en ContPAQi...');
  const resPago = await srv.registrarPago({
    codigoCliente: cod,
    monto: abonoMonto,
    fecha: effectiveDate,
    folioTicket: referencia,
    referencia: referencia,
    observaciones: `Registrado desde Mueblería ERP por ${cobradorNombre}`,
    codigoConceptoAbono: conceptoAbono
  }, emp);

  console.log('Resultado registrarPago:', resPago);
  const newDocId = resPago?.idPago || resPago?.id || resPago?.cIdDocumento;
  const newDocFolio = resPago?.folioDocumento || resPago?.folio;

  if (newDocId || resPago?.exito) {
    const docIdStr = newDocId ? `#${newDocId}` : (newDocFolio ? `Folio ${newDocFolio}` : '#OK');
    const baseConcepto = (pago.concepto || 'ABONO').replace(/\s*\(ContPAQi Doc #\d+\)/gi, '').trim();
    const nuevoConcepto = `${baseConcepto} (ContPAQi Doc ${docIdStr})`;

    await prisma.pago.update({
      where: { id: pago.id },
      data: {
        sincronizado: true,
        concepto: nuevoConcepto
      }
    });
    console.log(`Pago ${pago.id} actualizado exitosamente en DB con concepto "${nuevoConcepto}" y sincronizado=true`);
  }
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
