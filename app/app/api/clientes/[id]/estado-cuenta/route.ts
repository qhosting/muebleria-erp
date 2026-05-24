import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getContpaqiService } from '@/lib/contpaqi-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: params.id }
    });

    if (!cliente || !cliente.codigoCliente) {
      return NextResponse.json({ error: 'Cliente no encontrado o sin código de Contpaqi' }, { status: 404 });
    }

    // --- DETECTAR EMPRESA POR PREFIJO DE CÓDIGO ---
    let empresaId = cliente.sucursalId || undefined;
    if (cliente.codigoCliente) {
      const prefix = cliente.codigoCliente.match(/^[a-zA-Z]+/)?.[0]?.toUpperCase();
      if (prefix && ['DP', 'DQ'].includes(prefix)) {
        const configRaw = await prisma.configuracionSistema.findUnique({ where: { clave: 'sistema' } });
        const empresas = (configRaw as any)?.contpaqi?.empresas || [];
        const matchedEmpresa = empresas.find((e: any) => 
          e.nombre?.toUpperCase().startsWith(prefix) || 
          e.baseDatos?.toUpperCase().startsWith(prefix) ||
          e.id?.toUpperCase() === prefix
        );
        if (matchedEmpresa) {
          empresaId = matchedEmpresa.id;
        } else {
          empresaId = prefix;
        }
      }
    }

    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    // 1. Verificar si hay caché válida en la base de datos (tiempo de expiración: 15 minutos)
    const cache = cliente.estadoCuentaCache as any;
    if (!forceRefresh && cache && cache.cachedAt) {
      const cachedTime = new Date(cache.cachedAt).getTime();
      const now = Date.now();
      const maxAge = 15 * 60 * 1000; // 15 minutos en milisegundos
      if (now - cachedTime < maxAge) {
        console.log(`⚡ [Cache DB] Usando estado de cuenta en caché para cliente ${cliente.codigoCliente}`);
        return NextResponse.json(cache.data);
      }
    }

    const service = await getContpaqiService(prisma, empresaId);
    
    // 2. Obtener saldos generales (Estado de cuenta) en vivo
    const estadoCuenta = await service.getClienteEstadoCuenta(cliente.codigoCliente);

    if (!estadoCuenta) {
      return NextResponse.json({ error: 'No se pudo obtener el estado de cuenta de Contpaqi. Verifique la conexión con el servidor.' }, { status: 404 });
    }

    // 3. Obtener movimientos/documentos en detalle en vivo
    let documentos = [];
    try {
      documentos = await service.getClientDocumentos(cliente.codigoCliente);
    } catch (docError) {
      console.warn(`No se pudieron obtener documentos detallados para cliente ${cliente.codigoCliente}:`, docError);
    }

    // --- LÓGICA DE AMORTIZACIÓN Y CONCILIACIÓN ---
    const periodicidad = cliente.periodicidad || 'semanal';
    const montoPago = Number(cliente.montoPago || 100);
    const fechaVentaDate = new Date(cliente.fechaVenta);

    let montoFactura = 0;
    let pagoInicial = 0;
    let pagoInicialDocId = null;

    const cargos: any[] = [];
    const abonos: any[] = [];

    const getConceptNameLocal = (doc: any): string => {
      if (!doc) return 'Venta / Cargo';
      if (doc.concepto && typeof doc.concepto === 'object') {
        const nested = doc.concepto;
        const name = nested.nombre || nested.Nombre || nested.cNombre || 
                     nested.cNombreConcepto || nested.CNOMBRECONCEPTO || 
                     nested.nombreConcepto || nested.NombreConcepto || 
                     nested.cNombreClasificacion || nested.codigo || 
                     nested.cCodigoConcepto || nested.codigoConcepto ||
                     nested.cnombreconcepto;
        if (name) return String(name);
      }
      const directName = doc.CNOMBRECONCEPTO || doc.cNombreConcepto || doc.cnombreconcepto || doc.nombreConcepto || doc.NombreConcepto || doc.cNombreClasificacion || doc.conceptoNombre || doc.ConceptoNombre || doc.cNombre || doc.Nombre || doc.nombre;
      if (directName) return String(directName);
      return 'Venta / Cargo';
    };

    const isAbonoDoc = (doc: any, conceptName: string) => {
      const name = conceptName.toUpperCase();
      const code = String(doc.codigoConcepto || doc.Concepto || doc.concepto || doc.CCODIGOCONCEPTO || '').trim();
      
      // Códigos numéricos de conceptos conocidos que representan abonos/pagos/devoluciones del cliente
      const abonoCodes = ['101', '102', '103', '112', '122', '130', '135', '6', '8', '13', '15', '16', '18', '45'];
      
      const total = Number(doc.cTotal || doc.ctotal || doc.total || doc.importe || doc.CTOTAL || 0);
      const pending = Number(doc.cSaldo || doc.csaldo || doc.saldo || doc.pendiente || doc.cPendiente || doc.CSALDO || doc.CPENDIENTE || 0);
      
      return abonoCodes.includes(code) ||
             name.includes('PAGO') || 
             name.includes('ABONO') || 
             name.includes('RECIBO') || 
             name.includes('DEV SOBRE VENTA') || 
             name.includes('NOTA DE CREDITO') || 
             name.includes('NC QUERETARO') || 
             name.startsWith('PC') || 
             name.includes('PC ') || 
             total < 0 || 
             (total > 0 && pending === 0 && (name.toLowerCase().includes('recibo') || name.startsWith('PC') || abonoCodes.includes(code)));
    };

    const parsedDocs = Array.isArray(documentos) ? documentos : [];
    parsedDocs.forEach((doc: any) => {
      const conceptName = getConceptNameLocal(doc);
      
      // Excluir "Abono por Letras" (concepto 17) ya que es una contra-partida técnica del sistema y no un abono real
      const conceptCode = String(doc.codigoConcepto || doc.Concepto || doc.concepto || doc.CCODIGOCONCEPTO || '').trim();
      if (conceptCode === '17' || conceptName.toUpperCase().includes('LETRAS')) {
        return;
      }

      if (isAbonoDoc(doc, conceptName)) {
        abonos.push(doc);
      } else {
        cargos.push(doc);
      }
    });

    cargos.sort((a, b) => new Date(a.cFecha || a.cfecha || a.fecha || a.CFECHA || 0).getTime() - new Date(b.cFecha || b.cfecha || b.fecha || b.CFECHA || 0).getTime());
    abonos.sort((a, b) => new Date(a.cFecha || a.cfecha || a.fecha || a.CFECHA || 0).getTime() - new Date(b.cFecha || b.cfecha || b.fecha || b.CFECHA || 0).getTime());

    if (cargos.length > 0) {
      montoFactura = Number(cargos[0].cTotal || cargos[0].ctotal || cargos[0].total || cargos[0].importe || cargos[0].CTOTAL || 0);
    } else {
      montoFactura = Number(cliente.saldoActual || 1800);
    }

    let foundPagoInicial = false;
    for (const abono of abonos) {
      const conceptName = getConceptNameLocal(abono).toUpperCase();
      
      // Combinar códigos y nombres de agente para una búsqueda exhaustiva y segura
      const codeAgente = String(
        abono.codigoAgente || 
        abono.CodigoAgente || 
        abono.nombreAgente || 
        abono.NombreAgente || 
        abono.cCodigoAgente || 
        abono.cCodigoCobrador || 
        abono.agente || 
        abono.cNombreAgente || 
        ''
      ).toUpperCase();
      
      const textExtra = String(abono.cTextoExtra1 || abono.cObservaciones || abono.observaciones || '').toUpperCase();
      const dateStr = abono.cFecha || abono.cfecha || abono.fecha || abono.CFECHA || '';
      
      // Detección por agente: códigos específicos de Pago Inicial/Enganche, o nombres que contengan "PAGO INICIAL" o "ENGANCHE"
      const isPIByAgent = 
        codeAgente.includes('PAGO INICIAL') || 
        codeAgente.includes('ENGANCHE') || 
        codeAgente.includes('DQPI1') || 
        codeAgente.includes('DQPI2') || 
        codeAgente.includes('DQPI') || 
        codeAgente.includes('DPPI') || 
        codeAgente.includes('DQPIA') || 
        codeAgente.includes('DQBFINI') || 
        codeAgente === 'PI' || 
        codeAgente === 'PI1' || 
        codeAgente === 'PI2';
        
      const isPIByText = 
        textExtra.includes('PAGO INICIAL') || 
        textExtra.includes('ENGANCHE') || 
        textExtra.includes('DQPI1') || 
        textExtra.includes('DQPI2') || 
        textExtra.includes('DQPI') || 
        textExtra.includes('DPPI') || 
        textExtra.includes('DQPIA') || 
        textExtra.includes('DQBFINI');
        
      const isPIByConcept = conceptName.includes('INICIAL') || conceptName.includes('ENGANCHE');
      
      const abonoDate = new Date(dateStr);
      const isSameDate = Math.abs(abonoDate.getTime() - fechaVentaDate.getTime()) <= 24 * 60 * 60 * 1000;

      if (isPIByAgent || isPIByText || isPIByConcept || (isSameDate && !foundPagoInicial)) {
        pagoInicial = Number(abono.cTotal || abono.ctotal || abono.total || abono.importe || abono.CTOTAL || 0);
        pagoInicialDocId = abono.cIdDocumento || abono.ciddocumento || abono.id || abono.CIDDOCUMENTO || null;
        foundPagoInicial = true;
        break;
      }
    }

    if (!foundPagoInicial && abonos.length > 0) {
      const firstAbono = abonos[0];
      pagoInicial = Number(firstAbono.cTotal || firstAbono.ctotal || firstAbono.total || firstAbono.importe || firstAbono.CTOTAL || 0);
      pagoInicialDocId = firstAbono.cIdDocumento || firstAbono.ciddocumento || firstAbono.id || firstAbono.CIDDOCUMENTO || null;
    }

    const deudaFinanciada = Math.max(0, montoFactura - pagoInicial);

    let totalAbonosSubsecuentes = 0;
    abonos.forEach((abono) => {
      const id = abono.cIdDocumento || abono.ciddocumento || abono.id || abono.CIDDOCUMENTO || null;
      if (id !== pagoInicialDocId) {
        totalAbonosSubsecuentes += Math.abs(Number(abono.cTotal || abono.ctotal || abono.total || abono.importe || abono.CTOTAL || 0));
      }
    });

    const tablaAmortizacion: any[] = [];
    const numCuotas = montoPago > 0 ? Math.ceil(deudaFinanciada / montoPago) : 0;
    
    let primerPagoDate = new Date(fechaVentaDate);
    if (periodicidad === 'semanal') {
      primerPagoDate.setDate(fechaVentaDate.getDate() + 14);
    } else if (periodicidad === 'catorcenal') {
      primerPagoDate.setDate(fechaVentaDate.getDate() + 28);
    } else if (periodicidad === 'quincenal') {
      primerPagoDate.setDate(fechaVentaDate.getDate() + 30);
    } else if (periodicidad === 'mensual') {
      primerPagoDate.setMonth(fechaVentaDate.getMonth() + 2);
    } else {
      primerPagoDate.setDate(fechaVentaDate.getDate() + 2);
    }

    let saldoRestante = deudaFinanciada;
    let abonoRestanteParaRepartir = totalAbonosSubsecuentes;
    const hoy = new Date();

    for (let i = 1; i <= numCuotas; i++) {
      const fechaVencimiento = new Date(primerPagoDate);
      if (i > 1) {
        const offset = i - 1;
        if (periodicidad === 'semanal') {
          fechaVencimiento.setDate(primerPagoDate.getDate() + (offset * 7));
        } else if (periodicidad === 'catorcenal') {
          fechaVencimiento.setDate(primerPagoDate.getDate() + (offset * 14));
        } else if (periodicidad === 'quincenal') {
          fechaVencimiento.setDate(primerPagoDate.getDate() + (offset * 15));
        } else if (periodicidad === 'mensual') {
          fechaVencimiento.setMonth(primerPagoDate.getMonth() + offset);
        } else {
          fechaVencimiento.setDate(primerPagoDate.getDate() + offset);
        }
      }

      const cuotaMonto = Math.min(montoPago, saldoRestante);
      saldoRestante -= cuotaMonto;

      let pagado = 0;
      let status = 'pendiente';

      if (abonoRestanteParaRepartir >= cuotaMonto) {
        pagado = cuotaMonto;
        status = 'saldado';
        abonoRestanteParaRepartir -= cuotaMonto;
      } else if (abonoRestanteParaRepartir > 0) {
        pagado = abonoRestanteParaRepartir;
        status = 'parcial';
        abonoRestanteParaRepartir = 0;
      } else {
        pagado = 0;
        status = 'pendiente';
      }

      const vencido = fechaVencimiento < hoy;
      let tipoVencimiento = 'al_corriente';
      
      if (vencido) {
        if (status === 'pendiente' || status === 'parcial') {
          tipoVencimiento = 'vencido';
        }
      } else {
        if (status === 'saldado' || status === 'parcial') {
          tipoVencimiento = 'adelantado';
        }
      }

      tablaAmortizacion.push({
        numPago: i,
        fechaVencimiento: fechaVencimiento.toISOString(),
        monto: cuotaMonto,
        pagado,
        pendiente: cuotaMonto - pagado,
        status,
        tipoVencimiento
      });
    }

    const resultData = {
      cliente: {
        codigo: cliente.codigoCliente,
        nombre: cliente.nombreCompleto,
        saldoLocal: Number(cliente.saldoActual || 0),
        periodicidad: cliente.periodicidad,
        montoPago: Number(cliente.montoPago || 0),
        fechaVenta: cliente.fechaVenta.toISOString(),
        montoFactura,
        pagoInicial,
        deudaFinanciada,
        totalAbonosSubsecuentes,
        tablaAmortizacion
      },
      estadoCuenta: {
        ...estadoCuenta,
        documentos: Array.isArray(documentos) ? documentos : []
      }
    };

    // 4. Guardar en base de datos de forma persistente (caché)
    try {
      await prisma.cliente.update({
        where: { id: cliente.id },
        data: {
          estadoCuentaCache: {
            cachedAt: new Date().toISOString(),
            data: resultData
          }
        }
      });
    } catch (cacheErr) {
      console.error('Error al guardar caché de estado de cuenta en DB:', cacheErr);
    }

    return NextResponse.json(resultData);
  } catch (error: any) {
    console.error('Error al obtener estado de cuenta de Contpaqi:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
