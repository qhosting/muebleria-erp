import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkPermission } from "@/lib/permissions";
import {
  procesarDetallesYResumenCEJ,
  separarYCalcularResumenesCEJ,
  ClienteCorteRaw,
  PagoCorteRaw,
  normalizarDiaSemana,
  calcularSUP,
  calcularPagoDoble,
  calcularRecuperadoPV,
  calcularComisionAnalista,
  clasificarCanalPago,
  clasificarCanalDesdeTipoCobro
} from "@/lib/corte-cej-utils";
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

    // Si existe corte guardado
    if (corteGuardado) {
      const debeRecalcular = corteGuardado.estatus === "abierto" || forzarEnVivo;

      if (!debeRecalcular) {
        // Corte cerrado y no forzado en vivo: devolver corte histórico estático
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
          tipCob: d.tipCob || "0",
          canalCobro: clasificarCanalDesdeTipoCobro(d.tipoCobro || ""),
          montoBot: clasificarCanalDesdeTipoCobro(d.tipoCobro || "") === "BANCOS_BOT" ? parseFloat(d.pagoReal.toString()) : 0,
          montoBancosGestor: clasificarCanalDesdeTipoCobro(d.tipoCobro || "") === "BANCOS_GESTOR" ? parseFloat(d.pagoReal.toString()) : 0,
          montoGestor: clasificarCanalDesdeTipoCobro(d.tipoCobro || "") === "GESTOR" ? parseFloat(d.pagoReal.toString()) : 0
        }));

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

        const { global: resGlobal, dq: resDQ, dp: resDP } = separarYCalcularResumenesCEJ(detallesSerializados);

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
          resumenCEJ: resGlobal,
          resumenDQ: resDQ,
          resumenDP: resDP,
          clientes: detallesSerializados
        });
      }

      // RECALCULAR PAGOS EN VIVO PARA CORTE ABIERTO O FORZADO EN VIVO
      // 1. Obtener clientes activos actualmente asignados a este cobrador
      const clientesActivos = await prisma.cliente.findMany({
        where: {
          statusCuenta: "activo",
          ...(cobradorId && cobradorId !== "TODOS" && cobradorId !== "all"
            ? { cobradorAsignadoId: cobradorId }
            : {})
        },
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

      const codigosEnCorte = new Set(corteGuardado.detalles.map((d) => d.codigoCliente.toUpperCase().trim()));
      const codigosTodos = Array.from(
        new Set([
          ...corteGuardado.detalles.map((d) => d.codigoCliente.toUpperCase().trim()),
          ...clientesActivos.map((c) => c.codigoCliente.toUpperCase().trim())
        ])
      );

      // 2. Rango de búsqueda de pagos según la semana y fechas oficiales
      const fInicioBusqueda = new Date(fechaInicio);
      fInicioBusqueda.setHours(0, 0, 0, 0);
      const fFinBusqueda = new Date(fechaFin);
      fFinBusqueda.setHours(23, 59, 59, 999);

      const pagos = await prisma.pago.findMany({
        where: {
          cliente: { codigoCliente: { in: codigosTodos } },
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
          ticketId: true,
          banco: true,
          concepto: true,
          cliente: { select: { codigoCliente: true } }
        }
      });

      // 3. Mapear y totalizar pagos por cliente con desglose por canal de cobro
      const pagosMap = new Map<
        string,
        {
          monto: number;
          moratorio: number;
          fechaPago: string | null;
          tipoCobro: string;
          serie: string;
          montoBot: number;
          montoBancosGestor: number;
          montoGestor: number;
          canalCobro: string;
        }
      >();

      pagos.forEach((p) => {
        const cod = p.cliente.codigoCliente.toUpperCase().trim();
        const canal = clasificarCanalPago(p);
        const m = Number(p.monto) || 0;
        const entry = pagosMap.get(cod) || {
          monto: 0,
          moratorio: 0,
          fechaPago: null,
          tipoCobro: canal === "BANCOS_BOT" ? "BANCOS BOT" : canal === "BANCOS_GESTOR" ? "BANCOS GESTOR" : "GESTOR",
          serie: "",
          montoBot: 0,
          montoBancosGestor: 0,
          montoGestor: 0,
          canalCobro: canal
        };
        entry.monto += m;
        entry.moratorio += Number(p.interesMoratorio) || 0;
        if (p.fechaPago) {
          const fIso = new Date(p.fechaPago).toISOString();
          if (!entry.fechaPago || fIso > entry.fechaPago) {
            entry.fechaPago = fIso;
          }
        }
        const folio = p.numeroRecibo || p.ticketId || "";
        if (folio && !entry.serie.includes(folio)) {
          entry.serie = entry.serie ? `${entry.serie}, ${folio}` : folio;
        }
        if (canal === "BANCOS_BOT") entry.montoBot += m;
        else if (canal === "BANCOS_GESTOR") entry.montoBancosGestor += m;
        else entry.montoGestor += m;

        // Canal dominante
        if (entry.montoBot >= entry.montoBancosGestor && entry.montoBot >= entry.montoGestor && entry.montoBot > 0) {
          entry.canalCobro = "BANCOS_BOT";
          entry.tipoCobro = "BANCOS BOT";
        } else if (entry.montoBancosGestor >= entry.montoGestor && entry.montoBancosGestor > 0) {
          entry.canalCobro = "BANCOS_GESTOR";
          entry.tipoCobro = "BANCOS GESTOR";
        } else {
          entry.canalCobro = "GESTOR";
          entry.tipoCobro = "GESTOR";
        }

        pagosMap.set(cod, entry);
      });

      // 4. Actualizar detalles existentes conservando problemas manuales (K, IT, DL, AD)
      const detallesModificadosParaBD: any[] = [];
      const detallesSerializados = corteGuardado.detalles.map((d) => {
        const cod = d.codigoCliente.toUpperCase().trim();
        const pagoInfo = pagosMap.get(cod);
        const pagoReal = pagoInfo ? pagoInfo.monto : 0;
        const pagoSugerido = parseFloat(d.pagoSugerido.toString());
        const saldoVencido = parseFloat(d.saldoVencido.toString());
        const saldoActual = parseFloat(d.saldoActual.toString());

        const pagoDoble = calcularPagoDoble(pagoReal, pagoSugerido, saldoVencido);
        const recuperadoPv = calcularRecuperadoPV(pagoReal, pagoSugerido, saldoVencido);
        const comisionAnalista = calcularComisionAnalista(pagoReal, d.pagoAnalista || d.diaPago);
        const pvr = Math.max(0, saldoVencido - pagoReal);
        const fechaPago = pagoInfo?.fechaPago || (d.fechaPago ? d.fechaPago.toISOString() : null);
        const serie = pagoInfo ? pagoInfo.serie : (d.serie || "");
        const tipoCobro = pagoInfo ? pagoInfo.tipoCobro : (d.tipoCobro || "0");
        const canalCobro = pagoInfo ? pagoInfo.canalCobro : clasificarCanalDesdeTipoCobro(tipoCobro);
        const montoBot = pagoInfo ? pagoInfo.montoBot : 0;
        const montoBancosGestor = pagoInfo ? pagoInfo.montoBancosGestor : 0;
        const montoGestor = pagoInfo ? pagoInfo.montoGestor : 0;

        // Regla: si tenía 'PE' y pagó, asciende a 'RUTA'. Si tenía K, IT, DL, AD, se respeta estrictamente.
        let problema = (d.problema || "RUTA").toUpperCase().trim();
        if (pagoReal > 0 && problema === "PE") {
          problema = "RUTA";
        }

        // Detectar si varió respecto a la BD para persistir
        const pagoPrevio = parseFloat(d.pagoReal.toString());
        if (pagoPrevio !== pagoReal || d.problema !== problema || d.tipoCobro !== tipoCobro) {
          detallesModificadosParaBD.push({
            id: d.id,
            pagoReal,
            pagoDoble,
            recuperadoPv,
            comisionAnalista,
            pvr,
            fechaPago: fechaPago ? new Date(fechaPago) : null,
            serie,
            tipoCobro,
            problema
          });
        }

        return {
          id: d.id,
          clienteId: d.clienteId,
          codigoCliente: d.codigoCliente,
          numContrato: d.numContrato || "-",
          periodoInicial: d.periodoInicial ? d.periodoInicial.toISOString().split("T")[0] : "-",
          nombreCompleto: d.nombreCliente,
          periodicidad: d.periodicidad,
          montoPago: pagoSugerido,
          saldoVencido,
          pv: d.pv,
          saldoActual,
          gestor: d.gestor || "-",
          sup: d.sup,
          moratorio: parseFloat(d.moratorio.toString()),
          pvr,
          pagoReal,
          diaPago: normalizarDiaSemana(d.diaPago || d.pagoAnalista),
          tipoCobro,
          telefono: d.telefono || "-",
          telefonoTrabajo: d.telefono2 || "-",
          c: d.c,
          pagoAnalista: normalizarDiaSemana(d.diaPago || d.pagoAnalista),
          problema,
          pagoDoble,
          numPagosDobles: d.numPagosDobles,
          recuperadoPv,
          numPagosDobles2: d.numPagosDobles2,
          comisionAnalista,
          fechaPago,
          serie,
          tipCob: d.tipCob || "0",
          canalCobro,
          montoBot,
          montoBancosGestor,
          montoGestor
        };
      });

      // 5. Agregar nuevos clientes activos que no estaban en el corte al guardarse
      const nuevosDetallesParaBD: any[] = [];
      const clientesNuevos = clientesActivos.filter((c) => !codigosEnCorte.has(c.codigoCliente.toUpperCase().trim()));

      for (const c of clientesNuevos) {
        const cod = c.codigoCliente.toUpperCase().trim();
        const pagoInfo = pagosMap.get(cod);
        const montoPagoNum = parseFloat(c.montoPago.toString());
        const saldoVencidoNum = c.saldoVencido ? parseFloat(c.saldoVencido.toString()) : 0;
        const saldoActualNum = parseFloat(c.saldoActual.toString());
        const pvNum =
          montoPagoNum > 0 && saldoVencidoNum > 0
            ? Math.round(saldoVencidoNum / montoPagoNum)
            : c.diasVencidos > 0
            ? Math.ceil(c.diasVencidos / 7)
            : 0;

        const pagoReal = pagoInfo ? pagoInfo.monto : 0;
        const pagoDoble = calcularPagoDoble(pagoReal, montoPagoNum, saldoVencidoNum);
        const recuperadoPv = calcularRecuperadoPV(pagoReal, montoPagoNum, saldoVencidoNum);
        const comisionAnalista = calcularComisionAnalista(pagoReal, c.diaPago);
        const pvr = Math.max(0, saldoVencidoNum - pagoReal);
        const sup = calcularSUP(c.periodicidad || "SEMANAL", pvNum);
        const diaNormalizado = normalizarDiaSemana(c.diaPago);
        const fechaPago = pagoInfo?.fechaPago || null;
        const serie = pagoInfo?.serie || "";
        const tipoCobro = pagoInfo?.tipoCobro || "0";
        const canalCobro = pagoInfo?.canalCobro || "GESTOR";
        const montoBot = pagoInfo?.montoBot || 0;
        const montoBancosGestor = pagoInfo?.montoBancosGestor || 0;
        const montoGestor = pagoInfo?.montoGestor || 0;
        const problema = pagoReal > 0 ? "RUTA" : (c.clasificacionCobranza || "PE");

        const nuevoDetalle = {
          id: `new-${c.id || c.codigoCliente}`,
          clienteId: c.id,
          codigoCliente: c.codigoCliente,
          numContrato: c.numContrato || "-",
          periodoInicial: c.fechaVenta ? c.fechaVenta.toISOString().split("T")[0] : "-",
          nombreCompleto: c.nombreCompleto,
          periodicidad: c.periodicidad || "SEMANAL",
          montoPago: montoPagoNum,
          saldoVencido: saldoVencidoNum,
          pv: pvNum,
          saldoActual: saldoActualNum,
          gestor: c.cobradorAsignado?.codigoGestor || c.cobradorAsignado?.name || corteGuardado.nombreGestor,
          sup,
          moratorio: 0,
          pvr,
          pagoReal,
          diaPago: diaNormalizado,
          tipoCobro,
          telefono: c.telefono || "-",
          telefonoTrabajo: c.telefonoTrabajo || "-",
          c: 0,
          pagoAnalista: diaNormalizado,
          problema,
          pagoDoble,
          numPagosDobles: 0,
          recuperadoPv,
          numPagosDobles2: 0,
          comisionAnalista,
          fechaPago,
          serie,
          tipCob: "0",
          canalCobro,
          montoBot,
          montoBancosGestor,
          montoGestor
        };

        detallesSerializados.push(nuevoDetalle);

        nuevosDetallesParaBD.push({
          corteId: corteGuardado.id,
          clienteId: c.id,
          codigoCliente: c.codigoCliente,
          numContrato: c.numContrato || null,
          nombreCliente: c.nombreCompleto,
          periodoInicial: c.fechaVenta || null,
          periodicidad: c.periodicidad || "SEMANAL",
          pagoSugerido: montoPagoNum,
          saldoVencido: saldoVencidoNum,
          pv: pvNum,
          saldoActual: saldoActualNum,
          gestor: c.cobradorAsignado?.codigoGestor || c.cobradorAsignado?.name || corteGuardado.nombreGestor,
          sup,
          moratorio: 0,
          pvr,
          pagoReal,
          diaPago: diaNormalizado,
          tipoCobro,
          telefono: c.telefono || null,
          telefono2: c.telefonoTrabajo || null,
          c: 0,
          pagoAnalista: diaNormalizado,
          problema,
          pagoDoble,
          numPagosDobles: 0,
          recuperadoPv,
          numPagosDobles2: 0,
          comisionAnalista,
          fechaPago: fechaPago ? new Date(fechaPago) : null,
          serie
        });
      }

      // 6. Recalcular resúmenes oficiales CEJ (GLOBAL, DQ, DP)
      const { global: resGlobal, dq: resDQ, dp: resDP } = separarYCalcularResumenesCEJ(detallesSerializados);

      // 7. Sincronizar en Base de Datos si el corte está abierto
      if (corteGuardado.estatus === "abierto") {
        try {
          await prisma.$transaction(async (tx) => {
            await tx.corteCobranza.update({
              where: { id: corteGuardado.id },
              data: {
                totalCuentas: resGlobal.totalCuentas,
                totalSugerido: resGlobal.totalSugerido,
                totalCobrado: resGlobal.totalCobrado,
                totalVencido: resGlobal.totalVencido,
                totalCartera: resGlobal.totalCartera,
                porcentajeCobro: resGlobal.porcentajeCtasSinDobles,
                resumenProblemas: resGlobal.resumenProblemas as any,
                resumenPeriodos: resGlobal.matrizPeriodos as any,
                resumenCanales: {
                  efectivo: resGlobal.cobranzaEfectivo,
                  bancos: resGlobal.cobranzaBancos,
                  bancosBot: resGlobal.cobranzaBancosBot,
                  bancosGestor: resGlobal.cobranzaBancosGestor,
                  gestor: resGlobal.cobranzaGestor
                } as any,
                resumenDiario: resGlobal.resumenDiario as any
              }
            });

            for (const dm of detallesModificadosParaBD) {
              await tx.corteCobranzaDetalle.update({
                where: { id: dm.id },
                data: {
                  pagoReal: dm.pagoReal,
                  pagoDoble: dm.pagoDoble,
                  recuperadoPv: dm.recuperadoPv,
                  comisionAnalista: dm.comisionAnalista,
                  pvr: dm.pvr,
                  fechaPago: dm.fechaPago,
                  serie: dm.serie,
                  tipoCobro: dm.tipoCobro,
                  problema: dm.problema
                }
              });
            }

            if (nuevosDetallesParaBD.length > 0) {
              await tx.corteCobranzaDetalle.createMany({
                data: nuevosDetallesParaBD
              });
            }
          });
        } catch (errSync) {
          console.error("Error sincronizando corte con pagos en vivo:", errSync);
        }
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
          totalCuentas: resGlobal.totalCuentas,
          totalSugerido: resGlobal.totalSugerido,
          totalCobrado: resGlobal.totalCobrado,
          totalVencido: resGlobal.totalVencido,
          totalCartera: resGlobal.totalCartera,
          porcentajeCobro: resGlobal.porcentajeCtasSinDobles,
          resumenProblemas: resGlobal.resumenProblemas,
          resumenPeriodos: resGlobal.matrizPeriodos,
          resumenCanales: {
            efectivo: resGlobal.cobranzaEfectivo,
            bancos: resGlobal.cobranzaBancos,
            bancosBot: resGlobal.cobranzaBancosBot,
            bancosGestor: resGlobal.cobranzaBancosGestor,
            gestor: resGlobal.cobranzaGestor
          },
          resumenDiario: resGlobal.resumenDiario,
          observaciones: corteGuardado.observaciones,
          updatedAt: new Date()
        },
        calendario,
        resumenCEJ: resGlobal,
        resumenDQ: resDQ,
        resumenDP: resDP,
        clientes: detallesSerializados
      });
    }

    // 3. CONSULTA EN VIVO: Obtener clientes asignados (cartera completa activa)
    const whereClause: any = {
      statusCuenta: "activo"
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
        ticketId: true,
        banco: true,
        concepto: true,
        cliente: { select: { codigoCliente: true } }
      }
    });

    const pagosRaw: PagoCorteRaw[] = pagos.map((p) => ({
      codigoCliente: p.cliente.codigoCliente,
      monto: parseFloat(p.monto.toString()),
      moratorio: p.interesMoratorio ? parseFloat(p.interesMoratorio.toString()) : 0,
      fechaPago: p.fechaPago,
      folio: p.numeroRecibo || "",
      tipo: p.metodoPago || "EFECTIVO",
      metodoPago: p.metodoPago,
      ticketId: p.ticketId,
      banco: p.banco,
      concepto: p.concepto
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

    const { detalles, resumen } = procesarDetallesYResumenCEJ(clientesRaw, pagosRaw, periodicidadesPermitidas);
    const { dq: resumenDQ, dp: resumenDP } = separarYCalcularResumenesCEJ(detalles);

    return NextResponse.json({
      esCorteGuardado: false,
      corteGuardadoExistenteId: null,
      calendario,
      nombreGestor,
      codigoGestor,
      resumenCEJ: resumen,
      resumenDQ,
      resumenDP,
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
