import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkPermission } from "@/lib/permissions";
import { procesarDetallesYResumenCEJ, ClienteCorteRaw, PagoCorteRaw, normalizarDiaSemana } from "@/lib/corte-cej-utils";
import { calcularRangoSemanaSabadoViernes } from "@/lib/calendario-cobranza-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!(await checkPermission(userRole, "reportes"))) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const cobradorId = searchParams.get("cobradorId") || "TODOS";
    const semanaStr = searchParams.get("semana");
    const anioStr = searchParams.get("anio");
    const forzarEnVivo = searchParams.get("enVivo") === "true";

    if (!semanaStr) {
      return NextResponse.json({ error: "El parámetro semana es requerido" }, { status: 400 });
    }

    const semana = parseInt(semanaStr);
    const anio = anioStr ? parseInt(anioStr) : new Date().getFullYear();

    // 1. Obtener calendario para determinar periodicidades activas y fechas oficiales
    const calendario = await prisma.calendarioCobranza.findUnique({
      where: {
        anio_semana: {
          anio: anio,
          semana: semana
        }
      }
    });

    let fechaInicio: Date;
    let fechaFin: Date;
    let periodicidadesPermitidas: string[];

    if (calendario) {
      fechaInicio = new Date(calendario.fechaInicio);
      fechaFin = new Date(calendario.fechaFin);
      periodicidadesPermitidas = (calendario.periodicidadesActivas as string[]) || [
        "diario",
        "semanal",
        "catorcenal",
        "quincenal",
        "mensual"
      ];
    } else {
      const rango = calcularRangoSemanaSabadoViernes(semana, anio);
      fechaInicio = rango.inicio;
      fechaFin = rango.fin;
      periodicidadesPermitidas = ["diario", "semanal", "catorcenal", "quincenal", "mensual"];
    }

    // 2. Verificar si existe un corte guardado para esta semana y cobrador
    const corteGuardado = await prisma.corteCobranza.findUnique({
      where: {
        anio_semana_cobradorId: {
          anio,
          semana,
          cobradorId
        }
      },
      include: {
        detalles: {
          orderBy: [{ gestor: "asc" }, { diaPago: "asc" }, { codigoCliente: "asc" }]
        }
      }
    });

    // Si existe corte guardado y no se forzó "enVivo", devolver datos del corte congelado
    if (corteGuardado && !forzarEnVivo) {
      const detallesSerializados = corteGuardado.detalles.map((d) => ({
        id: d.id,
        clienteId: d.clienteId,
        codigoCliente: d.codigoCliente,
        numContrato: d.numContrato || "-",
        periodoInicial: d.periodoInicial ? d.periodoInicial.toISOString().split("T")[0] : "-",
        nombreCompleto: d.nombreCliente,
        periodicidad: d.periodicidad,
        montoPago: parseFloat(d.pagoSugerido.toString()),
        saldoVencido: parseFloat(d.saldoVencido.toString()),
        pv: d.pv,
        saldoActual: parseFloat(d.saldoActual.toString()),
        gestor: d.gestor || "-",
        sup: d.sup,
        moratorio: parseFloat(d.moratorio.toString()),
        pvr: d.pvr ? parseFloat(d.pvr.toString()) : 0,
        pagoReal: parseFloat(d.pagoReal.toString()),
        diaPago: normalizarDiaSemana(d.diaPago || d.pagoAnalista),
        tipoCobro: d.tipoCobro || "0",
        telefono: d.telefono || "-",
        telefonoTrabajo: d.telefono2 || "-",
        c: d.c,
        pagoAnalista: normalizarDiaSemana(d.diaPago || d.pagoAnalista),
        problema: d.problema,
        pagoDoble: parseFloat(d.pagoDoble.toString()),
        numPagosDobles: d.numPagosDobles,
        recuperadoPv: parseFloat(d.recuperadoPv.toString()),
        numPagosDobles2: d.numPagosDobles2,
        comisionAnalista: parseFloat(d.comisionAnalista.toString()),
        fechaPago: d.fechaPago ? d.fechaPago.toISOString() : null,
        serie: d.serie || "",
        tipCob: d.tipCob || "0"
      }));

      // Recalcular resumenDiario si no existe o sus cuentas sumaban cero
      let resumenDiario = corteGuardado.resumenDiario as any[];
      const totalPptoDiario = Array.isArray(resumenDiario)
        ? resumenDiario.reduce((acc: number, item: any) => acc + (Number(item.pptoCuentas) || 0), 0)
        : 0;

      if ((!totalPptoDiario || !Array.isArray(resumenDiario) || resumenDiario.length === 0) && corteGuardado.detalles.length > 0) {
        const diasDef = ["SABADO", "DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"];
        const diasMap = new Map<string, { pptoCuentas: number; avanceCuentas: number; pptoDinero: number; avanceDinero: number }>();
        diasDef.forEach((d) => diasMap.set(d, { pptoCuentas: 0, avanceCuentas: 0, pptoDinero: 0, avanceDinero: 0 }));

        corteGuardado.detalles.forEach((d) => {
          const prob = (d.problema || "RUTA").toUpperCase().trim();
          if (prob === "RUTA") {
            const matchDia = normalizarDiaSemana(d.diaPago || d.pagoAnalista);
            if (matchDia && diasMap.has(matchDia)) {
              const item = diasMap.get(matchDia)!;
              item.pptoCuentas++;
              item.pptoDinero += parseFloat(d.pagoSugerido.toString()) || 0;
              const pReal = parseFloat(d.pagoReal.toString()) || 0;
              if (pReal > 0) {
                item.avanceCuentas++;
                item.avanceDinero += pReal;
              }
            }
          }
        });

        resumenDiario = diasDef.map((d) => ({
          dia: d,
          ...diasMap.get(d)!
        }));
      }

      return NextResponse.json({
        esCorteGuardado: true,
        corte: {
          id: corteGuardado.id,
          anio: corteGuardado.anio,
          semana: corteGuardado.semana,
          fechaInicio: corteGuardado.fechaInicio,
          fechaFin: corteGuardado.fechaFin,
          nombreGestor: corteGuardado.nombreGestor,
          estatus: corteGuardado.estatus,
          totalCuentas: corteGuardado.totalCuentas,
          totalSugerido: parseFloat(corteGuardado.totalSugerido.toString()),
          totalCobrado: parseFloat(corteGuardado.totalCobrado.toString()),
          totalVencido: parseFloat(corteGuardado.totalVencido.toString()),
          totalCartera: parseFloat(corteGuardado.totalCartera.toString()),
          porcentajeCobro: parseFloat(corteGuardado.porcentajeCobro.toString()),
          resumenProblemas: corteGuardado.resumenProblemas,
          resumenPeriodos: corteGuardado.resumenPeriodos,
          resumenCanales: corteGuardado.resumenCanales,
          resumenDiario: resumenDiario,
          observaciones: corteGuardado.observaciones,
          updatedAt: corteGuardado.updatedAt
        },
        calendario,
        clientes: detallesSerializados
      });
    }

    // 3. CONSULTA EN VIVO: Obtener clientes asignados
    const whereClause: any = {
      statusCuenta: "activo",
      periodicidad: {
        in: periodicidadesPermitidas as any
      }
    };

    let nombreGestor = "GENERAL - TODOS LOS COBRADORES";
    let codigoGestor = "TODOS";

    if (cobradorId && cobradorId !== "TODOS" && cobradorId !== "all") {
      whereClause.cobradorAsignadoId = cobradorId;
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
      where: whereClause,
      include: {
        cobradorAsignado: {
          select: {
            id: true,
            name: true,
            codigoGestor: true
          }
        }
      },
      orderBy: [
        { cobradorAsignado: { codigoGestor: "asc" } },
        { diaPago: "asc" },
        { codigoCliente: "asc" }
      ]
    });

    // 4. Obtener pagos de la semana para los clientes
    const fInicioBusqueda = new Date(fechaInicio);
    fInicioBusqueda.setHours(0, 0, 0, 0);
    const fFinBusqueda = new Date(fechaFin);
    fFinBusqueda.setHours(23, 59, 59, 999);

    const codigosClientes = clientes.map((c) => c.codigoCliente);

    const pagos = await prisma.pago.findMany({
      where: {
        cliente: { codigoCliente: { in: codigosClientes } },
        OR: [
          { semanaCobranza: semana, anioCobranza: anio },
          { fechaPago: { gte: fInicioBusqueda, lte: fFinBusqueda } }
        ]
      },
      select: {
        monto: true,
        interesMoratorio: true,
        fechaPago: true,
        numeroRecibo: true,
        metodoPago: true,
        cliente: { select: { codigoCliente: true } }
      }
    });

    const pagosRaw: PagoCorteRaw[] = pagos.map((p) => ({
      codigoCliente: p.cliente.codigoCliente,
      monto: parseFloat(p.monto.toString()),
      moratorio: p.interesMoratorio ? parseFloat(p.interesMoratorio.toString()) : 0,
      fechaPago: p.fechaPago,
      folio: p.numeroRecibo || "",
      tipo: p.metodoPago || "EFECTIVO"
    }));

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

    const { detalles, resumen } = procesarDetallesYResumenCEJ(clientesRaw, pagosRaw);

    return NextResponse.json({
      esCorteGuardado: false,
      corteGuardadoExistenteId: corteGuardado ? corteGuardado.id : null,
      calendario,
      nombreGestor,
      codigoGestor,
      resumenCEJ: resumen,
      clientes: detalles.map((d) => ({
        ...d,
        montoPago: d.pagoSugerido,
        nombreCompleto: d.nombreCliente,
        telefonoTrabajo: d.telefono2
      }))
    });
  } catch (error: any) {
    console.error("Error en reporte de lista de cobranza:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
