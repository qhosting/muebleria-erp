import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  calcularSemanaCobranzaSabadoViernes,
  calcularRangoSemanaSabadoViernes,
  obtenerInfoCalendarioCobranza
} from '@/lib/calendario-cobranza-utils';
import { normalizarDiaSemana } from '@/lib/corte-cej-utils';

export const dynamic = 'force-dynamic';

const GESTORES_ALIAS: Record<string, string> = {
  DQR1M: 'ADRIAN GONZALEZ',
  DQRLC: 'RENE',
  DQJSP: 'JOSE SILVA',
  DQMIDE: 'MISAEL DE JESUS',
  DQCEJ: 'CEJ',
  DQBOT: 'BOT',
  RUTA3: 'SULEN RUIZ',
  DQR3: 'SULEN RUIZ'
};

const PROYECCION_DEFAULT_DP: Record<string, number> = {
  SABADO: 20000,
  LUNES: 22000,
  MARTES: 24000,
  MIERCOLES: 23000,
  JUEVES: 13000,
  VIERNES: 7000,
  DOMINGO: 0
};

const PROYECCION_DEFAULT_DQ: Record<string, number> = {
  SABADO: 9000,
  LUNES: 15000,
  MARTES: 12000,
  MIERCOLES: 9000,
  JUEVES: 7000,
  VIERNES: 5000,
  DOMINGO: 0
};

const DIAS_ORDEN = ['SABADO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    // 1. Calendario y Semana de Cobranza (default a semana actual operativa)
    const calInfo = await obtenerInfoCalendarioCobranza(prisma);
    const semParam = searchParams.get('semana');
    const anioParam = searchParams.get('anio');

    const semana = semParam ? parseInt(semParam, 10) : calInfo.semana;
    const anio = anioParam ? parseInt(anioParam, 10) : calInfo.anio;

    const cartera = (searchParams.get('cartera') || 'DP').toUpperCase().trim(); // 'DP' | 'DQ' | 'TODAS'
    const diaFiltro = (searchParams.get('dia') || 'TODOS').toUpperCase().trim(); // 'TODOS' | 'SABADO' | ...

    const rangoSemana = calcularRangoSemanaSabadoViernes(semana, anio);

    // 2. Obtener clientes activos con sus gestores asignados
    const clientes = await prisma.cliente.findMany({
      where: {
        statusCuenta: 'activo'
      },
      select: {
        id: true,
        codigoCliente: true,
        numContrato: true,
        nombreCompleto: true,
        diaPago: true,
        montoPago: true,
        saldoActual: true,
        clasificacionCobranza: true,
        cobradorAsignadoId: true,
        cobradorAsignado: {
          select: {
            id: true,
            name: true,
            codigoGestor: true
          }
        }
      }
    });

    // Separar por cartera
    const esDPFn = (c: { codigoCliente?: string | null; numContrato?: string | null }) => {
      const cod = (c.codigoCliente || '').toUpperCase();
      const cont = (c.numContrato || '').toUpperCase();
      return cod.startsWith('DP') || cont.startsWith('DP');
    };

    const clientesCartera = clientes.filter((c) => {
      if (cartera === 'TODAS' || cartera === 'GLOBAL') return true;
      const isDP = esDPFn(c);
      return cartera === 'DP' ? isDP : !isDP;
    });

    // 3. Obtener pagos de la semana (por semana/año asignados o por rango de fecha oficial)
    const pagos = await prisma.pago.findMany({
      where: {
        OR: [
          {
            semanaCobranza: semana,
            anioCobranza: anio
          },
          {
            fechaPago: {
              gte: rangoSemana.inicio,
              lte: rangoSemana.fin
            }
          }
        ]
      },
      select: {
        id: true,
        monto: true,
        interesMoratorio: true,
        fechaPago: true,
        clienteId: true,
        cobradorId: true,
        metodoPago: true,
        cliente: {
          select: {
            id: true,
            codigoCliente: true,
            numContrato: true,
            diaPago: true,
            cobradorAsignadoId: true
          }
        },
        cobrador: {
          select: {
            id: true,
            name: true,
            codigoGestor: true
          }
        }
      }
    });

    // Filtrar pagos por cartera
    const pagosCartera = pagos.filter((p) => {
      if (cartera === 'TODAS' || cartera === 'GLOBAL') return true;
      if (!p.cliente) return false;
      const isDP = esDPFn(p.cliente);
      return cartera === 'DP' ? isDP : !isDP;
    });

    // Mapa de pagos por cliente
    const pagosPorCliente = new Map<string, { total: number; pagos: typeof pagosCartera }>();
    pagosCartera.forEach((p) => {
      const cid = p.clienteId;
      const monto = Number(p.monto || 0) + Number(p.interesMoratorio || 0);
      const prev = pagosPorCliente.get(cid) || { total: 0, pagos: [] };
      prev.total += monto;
      prev.pagos.push(p);
      pagosPorCliente.set(cid, prev);
    });

    // 4. Mapear pagos por día
    // Considerar ciclo Sabado a Viernes. Dom se agrupa con Sabado si la operativa no corre domingos
    const dayIndexToName = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

    const logrosPorDia: Record<string, number> = {
      SABADO: 0,
      LUNES: 0,
      MARTES: 0,
      MIERCOLES: 0,
      JUEVES: 0,
      VIERNES: 0,
      DOMINGO: 0
    };

    const ctasCobradasPorDia: Record<string, Set<string>> = {
      SABADO: new Set(),
      LUNES: new Set(),
      MARTES: new Set(),
      MIERCOLES: new Set(),
      JUEVES: new Set(),
      VIERNES: new Set(),
      DOMINGO: new Set()
    };

    pagosCartera.forEach((p) => {
      const f = new Date(p.fechaPago);
      const dayName = dayIndexToName[f.getUTCDay()];
      const monto = Number(p.monto || 0) + Number(p.interesMoratorio || 0);
      // Mapear Domingo a Sabado para la vista operativa estándar
      const targetDia = dayName === 'DOMINGO' ? 'SABADO' : dayName;
      if (logrosPorDia[targetDia] !== undefined) {
        logrosPorDia[targetDia] += monto;
        ctasCobradasPorDia[targetDia].add(p.clienteId);
      }
    });

    // 5. Presupuesto / Proyección por defecto y calculada
    const defaultProyeccion =
      cartera === 'DP'
        ? PROYECCION_DEFAULT_DP
        : cartera === 'DQ'
        ? PROYECCION_DEFAULT_DQ
        : DIAS_ORDEN.reduce((acc, d) => {
            acc[d] = (PROYECCION_DEFAULT_DP[d] || 0) + (PROYECCION_DEFAULT_DQ[d] || 0);
            return acc;
          }, {} as Record<string, number>);

    // Proyección calculada por diaPago de los clientes en RUTA
    const proyeccionCalculadaPorDia: Record<string, { dinero: number; cuentas: number }> = {
      SABADO: { dinero: 0, cuentas: 0 },
      LUNES: { dinero: 0, cuentas: 0 },
      MARTES: { dinero: 0, cuentas: 0 },
      MIERCOLES: { dinero: 0, cuentas: 0 },
      JUEVES: { dinero: 0, cuentas: 0 },
      VIERNES: { dinero: 0, cuentas: 0 },
      DOMINGO: { dinero: 0, cuentas: 0 }
    };

    clientesCartera.forEach((c) => {
      const isRuta = (c.clasificacionCobranza || 'RUTA') === 'RUTA';
      if (isRuta) {
        const diaNorm = normalizarDiaSemana(c.diaPago);
        const targetDia = diaNorm === 'DOMINGO' ? 'SABADO' : diaNorm;
        if (proyeccionCalculadaPorDia[targetDia]) {
          proyeccionCalculadaPorDia[targetDia].dinero += Number(c.montoPago || 0);
          proyeccionCalculadaPorDia[targetDia].cuentas++;
        }
      }
    });

    // Construir tabla de Proyección vs Logro Diario (Imagen 2 y Imagen 3)
    const desgloseDiario = DIAS_ORDEN.map((dia) => {
      const proyeccionObjetivo = defaultProyeccion[dia] || 0;
      const proyeccionSistema = proyeccionCalculadaPorDia[dia]?.dinero || 0;
      const logro = logrosPorDia[dia] || 0;
      const diferencia = logro - proyeccionObjetivo;
      const porcentaje = proyeccionObjetivo > 0 ? (logro / proyeccionObjetivo) * 100 : 0;
      const ctasCobradas = ctasCobradasPorDia[dia]?.size || 0;
      const ctasProyectadas = proyeccionCalculadaPorDia[dia]?.cuentas || 0;

      return {
        dia,
        proyeccion: proyeccionObjetivo,
        proyeccionSistema,
        logro,
        diferencia,
        porcentaje: Math.round(porcentaje * 10) / 10,
        ctasCobradas,
        ctasProyectadas
      };
    });

    // Totales diarios
    const totalProyeccion = desgloseDiario.reduce((acc, d) => acc + d.proyeccion, 0);
    const totalLogro = desgloseDiario.reduce((acc, d) => acc + d.logro, 0);
    const totalDiferencia = totalLogro - totalProyeccion;
    const totalPorcentaje = totalProyeccion > 0 ? Math.round((totalLogro / totalProyeccion) * 1000) / 10 : 0;

    // 6. Construir tabla de Gestores (Imagen 1)
    // Se filtran los clientes si hay un día seleccionado (diaFiltro !== 'TODOS')
    const gestoresMap = new Map<
      string,
      {
        gestorId: string;
        codigoGestor: string;
        nombreDisplay: string;
        carteraAsig: number;
        ruta: number;
        presupuesto: number;
        acCtas: number;
        acumulado: number;
      }
    >();

    // Inicializar los gestores conocidos para mantener consistencia con los reportes oficiales
    const gestoresBase = ['ADRIAN GONZALEZ', 'RENE', 'JOSE SILVA', 'MISAEL DE JESUS', 'CEJ', 'BOT', 'SULEN RUIZ'];
    gestoresBase.forEach((g) => {
      gestoresMap.set(g, {
        gestorId: g,
        codigoGestor: g,
        nombreDisplay: g,
        carteraAsig: 0,
        ruta: 0,
        presupuesto: 0,
        acCtas: 0,
        acumulado: 0
      });
    });

    // Recorrer clientes para acumular cuentas y presupuestos
    clientesCartera.forEach((c) => {
      // Si hay filtro de día activo, comprobar si el día de pago del cliente coincide
      if (diaFiltro !== 'TODOS') {
        const diaNorm = normalizarDiaSemana(c.diaPago);
        const diaTarget = diaNorm === 'DOMINGO' ? 'SABADO' : diaNorm;
        if (diaTarget !== diaFiltro) {
          return;
        }
      }

      const rawCode = (c.cobradorAsignado?.codigoGestor || c.cobradorAsignado?.name || '').toUpperCase().trim();
      const alias = GESTORES_ALIAS[rawCode] || c.cobradorAsignado?.name || rawCode || 'SIN ASIGNAR';

      let item = gestoresMap.get(alias);
      if (!item) {
        item = {
          gestorId: c.cobradorAsignadoId || alias,
          codigoGestor: rawCode,
          nombreDisplay: alias,
          carteraAsig: 0,
          ruta: 0,
          presupuesto: 0,
          acCtas: 0,
          acumulado: 0
        };
        gestoresMap.set(alias, item);
      }

      item.carteraAsig++;
      const isRuta = (c.clasificacionCobranza || 'RUTA') === 'RUTA';
      if (isRuta) {
        item.ruta++;
      }
      item.presupuesto += Number(c.montoPago || 0);

      // Revisar si tuvo pago
      const pagoCli = pagosPorCliente.get(c.id);
      if (pagoCli && pagoCli.total > 0) {
        if (diaFiltro === 'TODOS') {
          item.acCtas++;
          item.acumulado += pagoCli.total;
        } else {
          // Filtrar pagos que ocurrieron en el día seleccionado
          const pagosDia = pagoCli.pagos.filter((p) => {
            const f = new Date(p.fechaPago);
            const dName = dayIndexToName[f.getUTCDay()];
            const dTarget = dName === 'DOMINGO' ? 'SABADO' : dName;
            return dTarget === diaFiltro;
          });
          if (pagosDia.length > 0) {
            item.acCtas++;
            const subtotalDia = pagosDia.reduce(
              (acc, p) => acc + (Number(p.monto || 0) + Number(p.interesMoratorio || 0)),
              0
            );
            item.acumulado += subtotalDia;
          }
        }
      }
    });

    // Transformar a lista de gestores con métricas y porcentajes exactos
    const filasGestores = Array.from(gestoresMap.values())
      .filter((g) => g.carteraAsig > 0 || g.acumulado > 0 || gestoresBase.includes(g.nombreDisplay))
      .map((g) => {
        const p87 = Math.round(g.ruta * 0.87);
        const p85 = Math.round(g.ruta * 0.85);
        const p83 = Math.round(g.ruta * 0.83);
        const difRuta = g.carteraAsig - g.ruta;
        const difCuentas = g.ruta - g.acCtas;
        const diferencia = g.presupuesto - g.acumulado;
        const porcCuentas = g.ruta > 0 ? Math.round((g.acCtas / g.ruta) * 100) : 0;
        const porcDinero = g.presupuesto > 0 ? Math.round((g.acumulado / g.presupuesto) * 100) : 0;

        return {
          gestor: g.nombreDisplay,
          codigoGestor: g.codigoGestor,
          carteraAsig: g.carteraAsig,
          p87,
          p85,
          p83,
          ruta: g.ruta,
          dif: difRuta,
          presupuesto: Math.round(g.presupuesto),
          acCtas: g.acCtas,
          difCuentas,
          acumulado: Math.round(g.acumulado),
          diferencia: Math.round(diferencia),
          porcCuentas,
          porcDinero
        };
      });

    // Ordenar respetando el orden oficial de la imagen si coincide, luego por cartera
    filasGestores.sort((a, b) => {
      const idxA = gestoresBase.indexOf(a.gestor);
      const idxB = gestoresBase.indexOf(b.gestor);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return b.carteraAsig - a.carteraAsig;
    });

    // Totales Gestores
    const totalesGestores = filasGestores.reduce(
      (acc, g) => {
        acc.carteraAsig += g.carteraAsig;
        acc.p87 += g.p87;
        acc.p85 += g.p85;
        acc.p83 += g.p83;
        acc.ruta += g.ruta;
        acc.dif += g.dif;
        acc.presupuesto += g.presupuesto;
        acc.acCtas += g.acCtas;
        acc.difCuentas += g.difCuentas;
        acc.acumulado += g.acumulado;
        acc.diferencia += g.diferencia;
        return acc;
      },
      {
        gestor: 'TOTALES',
        codigoGestor: 'TOTALES',
        carteraAsig: 0,
        p87: 0,
        p85: 0,
        p83: 0,
        ruta: 0,
        dif: 0,
        presupuesto: 0,
        acCtas: 0,
        difCuentas: 0,
        acumulado: 0,
        diferencia: 0,
        porcCuentas: 0,
        porcDinero: 0
      }
    );

    totalesGestores.porcCuentas =
      totalesGestores.ruta > 0 ? Math.round((totalesGestores.acCtas / totalesGestores.ruta) * 100) : 0;
    totalesGestores.porcDinero =
      totalesGestores.presupuesto > 0
        ? Math.round((totalesGestores.acumulado / totalesGestores.presupuesto) * 100)
        : 0;

    return NextResponse.json({
      semana,
      anio,
      esSemanaActual: semana === calInfo.semana && anio === calInfo.anio,
      rangoSemana: {
        inicioStr: rangoSemana.inicioStr,
        finStr: rangoSemana.finStr,
        label: `${rangoSemana.inicioStr.split('-').reverse().join('/')} al ${rangoSemana.finStr.split('-').reverse().join('/')}`
      },
      cartera,
      diaFiltro,
      proyeccionDiaria: {
        filas: desgloseDiario,
        totales: {
          proyeccion: totalProyeccion,
          logro: totalLogro,
          diferencia: totalDiferencia,
          porcentaje: totalPorcentaje
        }
      },
      gestores: {
        filas: filasGestores,
        totales: totalesGestores
      }
    });
  } catch (error: any) {
    console.error('Error en api/reportes/cobranza-semanal:', error);
    return NextResponse.json({ error: error.message || 'Error al generar reporte' }, { status: 500 });
  }
}
