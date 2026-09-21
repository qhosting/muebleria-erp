import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { normalizarDiaSemana } from '@/lib/corte-cej-utils';
import { 
  obtenerInfoCalendarioCobranza, 
  calcularRangoSemanaSabadoViernes 
} from '@/lib/calendario-cobranza-utils';

export const dynamic = 'force-dynamic';

interface HistorialPeriodo {
  periodoNum: number;
  label: string;
  estado: 'PAGADO' | 'NO_PAGO' | 'SIN_REGISTRO';
  detalle?: string;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const userRole = (session?.user as any)?.role;
  const allowedRoles = ['admin', 'gestor_cobranza', 'reporte_cobranza', 'cobrador', 'direccion'];
  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const gestorId = searchParams.get('gestorId') || 'TODOS';
    const periodicidadFiltro = (searchParams.get('periodicidad') || 'TODOS').toLowerCase();
    const costoUnitarioParam = parseFloat(searchParams.get('costoUnitario') || '0.45');
    const costoUnitario = isNaN(costoUnitarioParam) || costoUnitarioParam <= 0 ? 0.45 : costoUnitarioParam;

    // 1. Obtener información de la semana de cobranza objetivo
    const calInfo = await obtenerInfoCalendarioCobranza(prisma);
    const semanaParam = searchParams.get('semana');
    const anioParam = searchParams.get('anio');

    const semana = semanaParam ? parseInt(semanaParam, 10) : calInfo.semana;
    const anio = anioParam ? parseInt(anioParam, 10) : calInfo.anio;

    const rangoSemanaActual = calcularRangoSemanaSabadoViernes(semana, anio);
    const fechaInicioSemana = rangoSemanaActual.inicio;
    const fechaFinSemana = rangoSemanaActual.fin;

    // 2. Base query para clientes en RUTA activos
    const whereCliente: any = {
      statusCuenta: 'activo',
      clasificacionCobranza: 'RUTA',
      saldoActual: { gt: 0 },
      AND: [
        { telefono: { not: null } },
        { telefono: { not: '' } }
      ]
    };

    if (gestorId !== 'TODOS') {
      whereCliente.cobradorAsignadoId = gestorId;
    }

    if (periodicidadFiltro !== 'todos') {
      whereCliente.periodicidad = periodicidadFiltro;
    }

    const clientes = await prisma.cliente.findMany({
      where: whereCliente,
      select: {
        id: true,
        codigoCliente: true,
        nombreCompleto: true,
        telefono: true,
        diaPago: true,
        periodicidad: true,
        saldoActual: true,
        saldoVencido: true,
        diasVencidos: true,
        cobradorAsignadoId: true,
        cobradorAsignado: {
          select: {
            id: true,
            name: true,
            codigoGestor: true
          }
        }
      },
      take: 10000
    });

    if (clientes.length === 0) {
      return NextResponse.json({
        resumen: {
          semana,
          anio,
          fechaInicioStr: rangoSemanaActual.inicioStr,
          fechaFinStr: rangoSemanaActual.finStr,
          costoUnitario,
          totalClientesRuta: 0,
          totalSmsPreventivosSemana: 0,
          totalSmsCorrectivosSemana: 0,
          totalSmsSemana: 0,
          gastoPreventivoSemana: 0,
          gastoCorrectivoSemana: 0,
          gastoTotalSemana: 0,
          gastoMensualEstimado: 0,
          smsMensualEstimado: 0
        },
        desgloseDiario: ['SABADO', 'DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'].map(dia => ({
          dia,
          clientesTotal: 0,
          smsPreventivos: 0,
          smsCorrectivos: 0,
          smsTotal: 0,
          costoPreventivo: 0,
          costoCorrectivo: 0,
          costoTotal: 0
        })),
        clientes: []
      });
    }

    const clientIds = clientes.map(c => c.id);
    const clientCodes = clientes.map(c => c.codigoCliente);

    // 3. Pre-calcular ventanas de hasta 16 semanas atrás para evaluar los últimos 4 períodos
    const minSemanaHistorica = Math.max(1, semana - 16);
    const rangoLimiteHistorico = calcularRangoSemanaSabadoViernes(minSemanaHistorica, anio);
    const fechaMinimaHistorica = rangoLimiteHistorico.inicio;

    // A) Pagos históricos de los clientes
    const pagosRaw = await prisma.pago.findMany({
      where: {
        clienteId: { in: clientIds },
        fechaPago: {
          gte: fechaMinimaHistorica,
          lt: fechaInicioSemana
        },
        monto: { gt: 0 }
      },
      select: {
        clienteId: true,
        fechaPago: true,
        monto: true,
        semanaCobranza: true,
        anioCobranza: true
      }
    });

    // Indexar pagos por clienteId
    const pagosPorCliente = new Map<string, { fecha: Date; monto: number; semana?: number; anio?: number }[]>();
    pagosRaw.forEach(p => {
      const arr = pagosPorCliente.get(p.clienteId) || [];
      arr.push({
        fecha: new Date(p.fechaPago),
        monto: Number(p.monto) || 0,
        semana: p.semanaCobranza || undefined,
        anio: p.anioCobranza || undefined
      });
      pagosPorCliente.set(p.clienteId, arr);
    });

    // B) Visitas infructuosas (Motararios) históricas
    const motarariosRaw = await prisma.motarario.findMany({
      where: {
        clienteId: { in: clientIds },
        fecha: {
          gte: fechaMinimaHistorica,
          lt: fechaInicioSemana
        }
      },
      select: {
        clienteId: true,
        fecha: true,
        motivo: true
      }
    });

    const motarariosPorCliente = new Map<string, { fecha: Date; motivo: string }[]>();
    motarariosRaw.forEach(m => {
      const arr = motarariosPorCliente.get(m.clienteId) || [];
      arr.push({
        fecha: new Date(m.fecha),
        motivo: m.motivo
      });
      motarariosPorCliente.set(m.clienteId, arr);
    });

    // C) Detalles de Cortes Semanales históricos
    const cortesRaw = await prisma.corteCobranzaDetalle.findMany({
      where: {
        codigoCliente: { in: clientCodes },
        corte: {
          anio: anio,
          semana: { gte: minSemanaHistorica, lt: semana }
        }
      },
      select: {
        codigoCliente: true,
        pagoReal: true,
        pagoSugerido: true,
        saldoVencido: true,
        corte: {
          select: {
            semana: true,
            anio: true,
            fechaInicio: true,
            fechaFin: true
          }
        }
      }
    });

    const cortesPorCodigo = new Map<string, any[]>();
    cortesRaw.forEach(c => {
      const arr = cortesPorCodigo.get(c.codigoCliente) || [];
      arr.push({
        semana: c.corte.semana,
        pagoReal: Number(c.pagoReal) || 0,
        saldoVencido: Number(c.saldoVencido) || 0,
        pagoSugerido: Number(c.pagoSugerido) || 0,
        fechaInicio: new Date(c.corte.fechaInicio),
        fechaFin: new Date(c.corte.fechaFin)
      });
      cortesPorCodigo.set(c.codigoCliente, arr);
    });

    // 4. Procesar a cada cliente y calcular sus últimos 4 períodos
    const clientesProcesados = clientes.map(c => {
      const periodicidad = (c.periodicidad || 'semanal').toLowerCase();

      // Determinar el paso de semanas según la periodicidad
      // semanal: cada 1 semana (Sem -1, Sem -2, Sem -3, Sem -4)
      // catorcenal: cada 2 semanas (Sem -2, Sem -4, Sem -6, Sem -8)
      // quincenal: cada 2 semanas (Sem -2, Sem -4, Sem -6, Sem -8)
      // mensual: cada 4 semanas (Sem -4, Sem -8, Sem -12, Sem -16)
      let pasoSemanas = 1;
      if (periodicidad === 'catorcenal' || periodicidad === 'quincenal') {
        pasoSemanas = 2;
      } else if (periodicidad === 'mensual') {
        pasoSemanas = 4;
      }

      const clientPagos = pagosPorCliente.get(c.id) || [];
      const clientMotararios = motarariosPorCliente.get(c.id) || [];
      const clientCortes = cortesPorCodigo.get(c.codigoCliente) || [];

      const historialPeriodos: HistorialPeriodo[] = [];

      for (let pIdx = 1; pIdx <= 4; pIdx++) {
        const targetSemanaFin = semana - (pIdx - 1) * pasoSemanas - 1;
        const targetSemanaInicio = targetSemanaFin - pasoSemanas + 1;

        if (targetSemanaFin < 1) {
          historialPeriodos.push({
            periodoNum: pIdx,
            label: `P-${pIdx}`,
            estado: 'SIN_REGISTRO',
            detalle: 'Fuera de rango anual'
          });
          continue;
        }

        const semFinRango = calcularRangoSemanaSabadoViernes(targetSemanaFin, anio);
        const semIniRango = calcularRangoSemanaSabadoViernes(Math.max(1, targetSemanaInicio), anio);
        const fechaInicioPeriodo = semIniRango.inicio;
        const fechaFinPeriodo = semFinRango.fin;

        const labelPeriodo = pasoSemanas === 1 
          ? `Sem ${targetSemanaFin}` 
          : `Sem ${Math.max(1, targetSemanaInicio)}-${targetSemanaFin}`;

        // Verificar si hubo pago en este rango
        const pagoEnRango = clientPagos.some(p => p.fecha >= fechaInicioPeriodo && p.fecha <= fechaFinPeriodo);
        const corteConPago = clientCortes.some(ct => 
          ct.semana >= targetSemanaInicio && ct.semana <= targetSemanaFin && ct.pagoReal > 0
        );

        if (pagoEnRango || corteConPago) {
          historialPeriodos.push({
            periodoNum: pIdx,
            label: labelPeriodo,
            estado: 'PAGADO',
            detalle: 'Pago registrado'
          });
          continue;
        }

        // Verificar si hubo visita infructuosa (motarario) o corte con pagoReal = 0 y saldo vencido
        const motararioEnRango = clientMotararios.some(m => m.fecha >= fechaInicioPeriodo && m.fecha <= fechaFinPeriodo);
        const corteSinPago = clientCortes.some(ct => 
          ct.semana >= targetSemanaInicio && ct.semana <= targetSemanaFin && ct.pagoReal === 0 && (ct.saldoVencido > 0 || ct.pagoSugerido > 0)
        );

        if (motararioEnRango || corteSinPago) {
          historialPeriodos.push({
            periodoNum: pIdx,
            label: labelPeriodo,
            estado: 'NO_PAGO',
            detalle: motararioEnRango ? 'Visita sin pago' : 'Corte sin cobro'
          });
          continue;
        }

        // Si no hay datos registrados en ese período
        historialPeriodos.push({
          periodoNum: pIdx,
          label: labelPeriodo,
          estado: 'SIN_REGISTRO',
          detalle: 'Sin registro'
        });
      }

      // Calcular la Tasa Histórica de No Pago (Tnp)
      const noPagosCount = historialPeriodos.filter(p => p.estado === 'NO_PAGO').length;
      const pagosCount = historialPeriodos.filter(p => p.estado === 'PAGADO').length;
      const periodosEvaluados = noPagosCount + pagosCount;

      let tasaNoPago = 0;
      if (periodosEvaluados > 0) {
        tasaNoPago = noPagosCount / periodosEvaluados;
      } else {
        // Si es cliente nuevo sin historial en esos períodos, usar estado actual de morosidad
        const tieneMoraActual = (Number(c.saldoVencido) || 0) > 0 || (c.diasVencidos || 0) > 0;
        tasaNoPago = tieneMoraActual ? 1.0 : 0.0;
      }

      const diaNorm = normalizarDiaSemana(c.diaPago);

      // Proyección para el cliente en la semana:
      // Preventivo: 1 SMS programado para su día de cobro
      // Correctivo: Tnp (probabilidad de requerir recordatorio de no pago)
      const smsPreventivos = 1;
      const smsCorrectivos = tasaNoPago; // valor ponderado
      const costoProyectadoSemana = (smsPreventivos + smsCorrectivos) * costoUnitario;

      return {
        id: c.id,
        codigoCliente: c.codigoCliente,
        nombreCompleto: c.nombreCompleto,
        telefono: c.telefono || '',
        diaPago: c.diaPago || 'SABADO',
        diaPagoNorm: diaNorm,
        periodicidad: periodicidad,
        saldoActual: Number(c.saldoActual) || 0,
        saldoVencido: Number(c.saldoVencido) || 0,
        diasVencidos: c.diasVencidos || 0,
        gestor: c.cobradorAsignado?.name || c.cobradorAsignado?.codigoGestor || 'Sin Asignar',
        gestorId: c.cobradorAsignadoId,
        historialPeriodos,
        noPagosCount,
        pagosCount,
        tasaNoPago: Math.round(tasaNoPago * 100) / 100,
        smsPreventivos,
        smsCorrectivos: Math.round(smsCorrectivos * 100) / 100,
        costoProyectadoSemana: Math.round(costoProyectadoSemana * 100) / 100
      };
    });

    // 5. Desglose Día por Día (Ciclo Sábado a Viernes)
    const DIAS_OFICIALES = ['SABADO', 'DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'] as const;

    const desgloseDiario = DIAS_OFICIALES.map(dia => {
      const clientesDelDia = clientesProcesados.filter(c => c.diaPagoNorm === dia);
      const clientesTotal = clientesDelDia.length;
      const smsPreventivos = clientesTotal;
      const smsCorrectivos = Math.round(clientesDelDia.reduce((sum, c) => sum + c.smsCorrectivos, 0));
      const smsTotal = smsPreventivos + smsCorrectivos;

      const costoPreventivo = Number((smsPreventivos * costoUnitario).toFixed(2));
      const costoCorrectivo = Number((smsCorrectivos * costoUnitario).toFixed(2));
      const costoTotal = Number((costoPreventivo + costoCorrectivo).toFixed(2));

      return {
        dia,
        clientesTotal,
        smsPreventivos,
        smsCorrectivos,
        smsTotal,
        costoPreventivo,
        costoCorrectivo,
        costoTotal
      };
    });

    // 6. Resumen Ejecutivo Global
    const totalClientesRuta = clientesProcesados.length;
    const totalSmsPreventivosSemana = desgloseDiario.reduce((sum, d) => sum + d.smsPreventivos, 0);
    const totalSmsCorrectivosSemana = desgloseDiario.reduce((sum, d) => sum + d.smsCorrectivos, 0);
    const totalSmsSemana = totalSmsPreventivosSemana + totalSmsCorrectivosSemana;

    const gastoPreventivoSemana = Number(desgloseDiario.reduce((sum, d) => sum + d.costoPreventivo, 0).toFixed(2));
    const gastoCorrectivoSemana = Number(desgloseDiario.reduce((sum, d) => sum + d.costoCorrectivo, 0).toFixed(2));
    const gastoTotalSemana = Number((gastoPreventivoSemana + gastoCorrectivoSemana).toFixed(2));

    // Proyección Mensual (4 semanas ponderadas según periodicidad):
    // Semanal: x4
    // Catorcenal / Quincenal: x2
    // Mensual: x1
    let smsMensualEstimado = 0;
    clientesProcesados.forEach(c => {
      let multiplicadorMes = 4;
      if (c.periodicidad === 'catorcenal' || c.periodicidad === 'quincenal') {
        multiplicadorMes = 2;
      } else if (c.periodicidad === 'mensual') {
        multiplicadorMes = 1;
      }
      const smsSemanaCliente = c.smsPreventivos + c.smsCorrectivos;
      smsMensualEstimado += smsSemanaCliente * multiplicadorMes;
    });

    smsMensualEstimado = Math.round(smsMensualEstimado);
    const gastoMensualEstimado = Number((smsMensualEstimado * costoUnitario).toFixed(2));

    return NextResponse.json({
      resumen: {
        semana,
        anio,
        fechaInicioStr: rangoSemanaActual.inicioStr,
        fechaFinStr: rangoSemanaActual.finStr,
        costoUnitario,
        totalClientesRuta,
        totalSmsPreventivosSemana,
        totalSmsCorrectivosSemana,
        totalSmsSemana,
        gastoPreventivoSemana,
        gastoCorrectivoSemana,
        gastoTotalSemana,
        gastoMensualEstimado,
        smsMensualEstimado
      },
      desgloseDiario,
      clientes: clientesProcesados
    });

  } catch (error: any) {
    console.error('Error en proyección de gasto SMS:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno al calcular la proyección de gasto' },
      { status: 500 }
    );
  }
}
