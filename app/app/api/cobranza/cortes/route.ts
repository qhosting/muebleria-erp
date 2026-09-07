import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkPermission } from "@/lib/permissions";
import { procesarDetallesYResumenCEJ, ClienteCorteRaw, PagoCorteRaw } from "@/lib/corte-cej-utils";
import { calcularRangoSemanaSabadoViernes } from "@/lib/calendario-cobranza-utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/cobranza/cortes
 * Consulta cortes de cobranza guardados
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const anioStr = searchParams.get("anio");
    const semanaStr = searchParams.get("semana");
    const cobradorId = searchParams.get("cobradorId");

    const where: any = {};
    if (anioStr) where.anio = parseInt(anioStr);
    if (semanaStr) where.semana = parseInt(semanaStr);
    if (cobradorId && cobradorId !== "ALL") where.cobradorId = cobradorId;

    const cortes = await prisma.corteCobranza.findMany({
      where,
      orderBy: [{ anio: "desc" }, { semana: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        anio: true,
        semana: true,
        fechaInicio: true,
        fechaFin: true,
        cobradorId: true,
        nombreGestor: true,
        estatus: true,
        totalCuentas: true,
        totalSugerido: true,
        totalCobrado: true,
        totalVencido: true,
        totalCartera: true,
        porcentajeCobro: true,
        observaciones: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ cortes });
  } catch (error: any) {
    console.error("Error al consultar cortes de cobranza:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/cobranza/cortes
 * Genera y guarda (congela) el corte semanal de cobranza
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!(await checkPermission(userRole, "reportes"))) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const body = await request.json();
    const { anio, semana, cobradorId = "TODOS", observaciones } = body;

    if (!semana || !anio) {
      return NextResponse.json({ error: "Parámetros anio y semana son requeridos" }, { status: 400 });
    }

    const anioInt = parseInt(anio);
    const semanaInt = parseInt(semana);

    // 1. Obtener calendario de cobranza para determinar fechas oficiales y periodicidades
    let calendario = await prisma.calendarioCobranza.findUnique({
      where: {
        anio_semana: {
          anio: anioInt,
          semana: semanaInt
        }
      }
    });

    let fechaInicio: Date;
    let fechaFin: Date;
    let periodicidadesPermitidas: string[];

    if (calendario) {
      fechaInicio = new Date(calendario.fechaInicio);
      fechaFin = new Date(calendario.fechaFin);
      periodicidadesPermitidas = (calendario.periodicidadesActivas as string[]) || ["diario", "semanal", "catorcenal", "quincenal", "mensual"];
    } else {
      const rango = calcularRangoSemanaSabadoViernes(semanaInt, anioInt);
      fechaInicio = rango.inicio;
      fechaFin = rango.fin;
      periodicidadesPermitidas = ["diario", "semanal", "catorcenal", "quincenal", "mensual"];
    }

    // 2. Obtener clientes para la ruta
    const whereClientes: any = {
      statusCuenta: "activo",
      periodicidad: {
        in: periodicidadesPermitidas as any
      }
    };

    let nombreGestor = "GENERAL - TODOS LOS COBRADORES";
    let codigoGestor = "TODOS";

    if (cobradorId && cobradorId !== "TODOS" && cobradorId !== "all") {
      whereClientes.cobradorAsignadoId = cobradorId;
      const gestorUser = await prisma.user.findUnique({
        where: { id: cobradorId },
        select: { name: true, codigoGestor: true }
      });
      if (gestorUser) {
        nombreGestor = gestorUser.name;
        codigoGestor = gestorUser.codigoGestor || gestorUser.name;
      }
    }

    const clientes = await prisma.cliente.findMany({
      where: whereClientes,
      include: {
        cobradorAsignado: {
          select: { id: true, name: true, codigoGestor: true }
        }
      },
      orderBy: [
        { cobradorAsignado: { codigoGestor: "asc" } },
        { diaPago: "asc" },
        { codigoCliente: "asc" }
      ]
    });

    // 3. Obtener pagos registrados dentro de la semana de corte
    // Inicio a las 00:00:00 y fin a las 23:59:59
    const fInicioBusqueda = new Date(fechaInicio);
    fInicioBusqueda.setHours(0, 0, 0, 0);
    const fFinBusqueda = new Date(fechaFin);
    fFinBusqueda.setHours(23, 59, 59, 999);

    const codigosClientes = clientes.map((c) => c.codigoCliente);

    const pagos = await prisma.pago.findMany({
      where: {
        cliente: {
          codigoCliente: { in: codigosClientes }
        },
        OR: [
          { semanaCobranza: semanaInt, anioCobranza: anioInt },
          { fechaPago: { gte: fInicioBusqueda, lte: fFinBusqueda } }
        ]
      },
      select: {
        monto: true,
        interesMoratorio: true,
        fechaPago: true,
        numeroRecibo: true,
        metodoPago: true,
        cliente: {
          select: { codigoCliente: true }
        }
      }
    });

    // 4. Mapear pagos para procesamiento
    const pagosRaw: PagoCorteRaw[] = pagos.map((p) => ({
      codigoCliente: p.cliente.codigoCliente,
      monto: parseFloat(p.monto.toString()),
      moratorio: p.interesMoratorio ? parseFloat(p.interesMoratorio.toString()) : 0,
      fechaPago: p.fechaPago,
      folio: p.numeroRecibo || "",
      tipo: p.metodoPago || "EFECTIVO"
    }));

    // 5. Mapear clientes para procesamiento analítico CEJ
    const clientesRaw: ClienteCorteRaw[] = clientes.map((c: any) => {
      const montoPagoNum = parseFloat(c.montoPago.toString());
      const saldoVencidoNum = c.saldoVencido ? parseFloat(c.saldoVencido.toString()) : 0;
      const pvNum =
        montoPagoNum > 0 && saldoVencidoNum > 0
          ? Math.round(saldoVencidoNum / montoPagoNum)
          : c.diasVencidos > 0
          ? Math.ceil(c.diasVencidos / 7)
          : 0;

      return {
        id: c.id,
        codigoCliente: c.codigoCliente,
        numContrato: c.numContrato,
        fechaVenta: c.fechaVenta,
        nombreCompleto: c.nombreCompleto,
        periodicidad: c.periodicidad,
        montoPago: montoPagoNum,
        saldoVencido: saldoVencidoNum,
        saldoActual: parseFloat(c.saldoActual.toString()),
        pv: pvNum,
        diasVencidos: c.diasVencidos || 0,
        gestor: c.cobradorAsignado?.codigoGestor || c.cobradorAsignado?.name || codigoGestor,
        diaPago: c.diaPago,
        telefono: c.telefono,
        telefonoTrabajo: c.telefonoTrabajo,
        clasificacionCobranza: c.clasificacionCobranza,
        pagoAnalista: c.diaPago
      };
    });

    // 6. Procesar cálculos CEJ
    const { detalles, resumen } = procesarDetallesYResumenCEJ(clientesRaw, pagosRaw);

    // 7. Guardar en Base de Datos vía transacción / upsert
    const corteGuardado = await prisma.$transaction(async (tx) => {
      // Upsert cabecera de corte
      const corte = await tx.corteCobranza.upsert({
        where: {
          anio_semana_cobradorId: {
            anio: anioInt,
            semana: semanaInt,
            cobradorId: cobradorId
          }
        },
        update: {
          fechaInicio,
          fechaFin,
          nombreGestor,
          estatus: "abierto",
          totalCuentas: resumen.totalCuentas,
          totalSugerido: resumen.totalSugerido,
          totalCobrado: resumen.totalCobrado,
          totalVencido: resumen.totalVencido,
          totalCartera: resumen.totalCartera,
          porcentajeCobro: resumen.porcentajeCtasSinDobles,
          resumenProblemas: resumen.resumenProblemas as any,
          resumenPeriodos: resumen.matrizPeriodos as any,
          resumenCanales: { efectivo: resumen.cobranzaEfectivo, bancos: resumen.cobranzaBancos } as any,
          resumenDiario: resumen.resumenDiario as any,
          observaciones: observaciones || null,
          creadoPorId: (session.user as any).id || null
        },
        create: {
          anio: anioInt,
          semana: semanaInt,
          fechaInicio,
          fechaFin,
          cobradorId,
          nombreGestor,
          estatus: "abierto",
          totalCuentas: resumen.totalCuentas,
          totalSugerido: resumen.totalSugerido,
          totalCobrado: resumen.totalCobrado,
          totalVencido: resumen.totalVencido,
          totalCartera: resumen.totalCartera,
          porcentajeCobro: resumen.porcentajeCtasSinDobles,
          resumenProblemas: resumen.resumenProblemas as any,
          resumenPeriodos: resumen.matrizPeriodos as any,
          resumenCanales: { efectivo: resumen.cobranzaEfectivo, bancos: resumen.cobranzaBancos } as any,
          resumenDiario: resumen.resumenDiario as any,
          observaciones: observaciones || null,
          creadoPorId: (session.user as any).id || null
        }
      });

      // Eliminar detalles previos de este corte si ya existía
      await tx.corteCobranzaDetalle.deleteMany({
        where: { corteId: corte.id }
      });

      // Crear nuevos detalles congelados
      if (detalles.length > 0) {
        await tx.corteCobranzaDetalle.createMany({
          data: detalles.map((d) => ({
            corteId: corte.id,
            clienteId: d.clienteId || null,
            codigoCliente: d.codigoCliente,
            numContrato: d.numContrato || null,
            periodoInicial: d.periodoInicial !== "-" ? new Date(d.periodoInicial) : null,
            nombreCliente: d.nombreCliente,
            periodicidad: d.periodicidad,
            pagoSugerido: d.pagoSugerido,
            saldoVencido: d.saldoVencido,
            pv: d.pv,
            saldoActual: d.saldoActual,
            gestor: d.gestor,
            sup: d.sup,
            moratorio: d.moratorio,
            pvr: d.pvr,
            pagoReal: d.pagoReal,
            diaPago: d.diaPago,
            tipoCobro: d.tipoCobro,
            telefono: d.telefono,
            telefono2: d.telefono2,
            c: d.c,
            pagoAnalista: d.pagoAnalista,
            problema: d.problema,
            pagoDoble: d.pagoDoble,
            numPagosDobles: d.numPagosDobles,
            recuperadoPv: d.recuperadoPv,
            numPagosDobles2: d.numPagosDobles2,
            comisionAnalista: d.comisionAnalista,
            fechaPago: d.fechaPago ? new Date(d.fechaPago) : null,
            serie: d.serie,
            tipCob: d.tipCob
          }))
        });
      }

      return corte;
    });

    return NextResponse.json({
      success: true,
      message: `Corte de cobranza para la Semana ${semanaInt} (${anioInt}) guardado exitosamente`,
      corte: corteGuardado,
      totalCuentas: detalles.length,
      resumen
    });
  } catch (error: any) {
    console.error("Error al guardar corte de cobranza:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
