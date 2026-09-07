import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkPermission } from "@/lib/permissions";
import { procesarDetallesYResumenCEJ, ClienteCorteRaw, PagoCorteRaw } from "@/lib/corte-cej-utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/cobranza/cortes/[id]
 * Devuelve el corte con todos sus detalles congelados y sus métricas
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = params;
    const corte = await prisma.corteCobranza.findUnique({
      where: { id },
      include: {
        detalles: {
          orderBy: [{ gestor: "asc" }, { diaPago: "asc" }, { codigoCliente: "asc" }]
        }
      }
    });

    if (!corte) {
      return NextResponse.json({ error: "Corte no encontrado" }, { status: 404 });
    }

    // Serializar montos decimales
    const detallesSerializados = corte.detalles.map((d) => ({
      ...d,
      pagoSugerido: parseFloat(d.pagoSugerido.toString()),
      saldoVencido: parseFloat(d.saldoVencido.toString()),
      saldoActual: parseFloat(d.saldoActual.toString()),
      moratorio: parseFloat(d.moratorio.toString()),
      pvr: d.pvr ? parseFloat(d.pvr.toString()) : 0,
      pagoReal: parseFloat(d.pagoReal.toString()),
      pagoDoble: parseFloat(d.pagoDoble.toString()),
      recuperadoPv: parseFloat(d.recuperadoPv.toString()),
      comisionAnalista: parseFloat(d.comisionAnalista.toString()),
      periodoInicial: d.periodoInicial ? d.periodoInicial.toISOString().split("T")[0] : "-"
    }));

    return NextResponse.json({
      corte: {
        ...corte,
        totalSugerido: parseFloat(corte.totalSugerido.toString()),
        totalCobrado: parseFloat(corte.totalCobrado.toString()),
        totalVencido: parseFloat(corte.totalVencido.toString()),
        totalCartera: parseFloat(corte.totalCartera.toString()),
        porcentajeCobro: parseFloat(corte.porcentajeCobro.toString()),
        detalles: detallesSerializados
      }
    });
  } catch (error: any) {
    console.error("Error al obtener detalle del corte:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/cobranza/cortes/[id]
 * Actualiza clasificación de problema, estatus o recalcula pagos de la semana
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { action, estatus, observaciones, detalleId, nuevoProblema } = body;

    const corte = await prisma.corteCobranza.findUnique({
      where: { id },
      include: { detalles: true }
    });

    if (!corte) {
      return NextResponse.json({ error: "Corte no encontrado" }, { status: 404 });
    }

    // Acción 1: Cambiar clasificación de problema de un cliente en el corte
    if (action === "actualizarProblema" && detalleId && nuevoProblema) {
      await prisma.corteCobranzaDetalle.update({
        where: { id: detalleId },
        data: { problema: nuevoProblema.toUpperCase().trim() }
      });

      // Recalcular métricas de problemas para la cabecera
      const detallesActualizados = await prisma.corteCobranzaDetalle.findMany({
        where: { corteId: id }
      });

      const clientesRaw: ClienteCorteRaw[] = detallesActualizados.map((d) => ({
        codigoCliente: d.codigoCliente,
        nombreCompleto: d.nombreCliente,
        periodicidad: d.periodicidad,
        montoPago: parseFloat(d.pagoSugerido.toString()),
        saldoVencido: parseFloat(d.saldoVencido.toString()),
        saldoActual: parseFloat(d.saldoActual.toString()),
        pv: d.pv,
        gestor: d.gestor,
        diaPago: d.diaPago,
        telefono: d.telefono,
        telefonoTrabajo: d.telefono2,
        clasificacionCobranza: d.problema,
        pagoAnalista: d.pagoAnalista
      }));

      const pagosRaw: PagoCorteRaw[] = detallesActualizados.map((d) => ({
        codigoCliente: d.codigoCliente,
        monto: parseFloat(d.pagoReal.toString()),
        moratorio: parseFloat(d.moratorio.toString()),
        tipo: d.tipoCobro,
        folio: d.serie
      }));

      const { resumen } = procesarDetallesYResumenCEJ(clientesRaw, pagosRaw);

      await prisma.corteCobranza.update({
        where: { id },
        data: {
          resumenProblemas: resumen.resumenProblemas as any,
          resumenPeriodos: resumen.matrizPeriodos as any,
          resumenDiario: resumen.resumenDiario as any
        }
      });

      return NextResponse.json({ success: true, message: "Problema actualizado y métricas recalculadas" });
    }

    // Acción 2: Actualizar estatus u observaciones
    const updateData: any = {};
    if (estatus) updateData.estatus = estatus;
    if (observaciones !== undefined) updateData.observaciones = observaciones;

    const actualizado = await prisma.corteCobranza.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, corte: actualizado });
  } catch (error: any) {
    console.error("Error al actualizar corte:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/cobranza/cortes/[id]
 * Elimina un corte de cobranza guardado
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = params;
    await prisma.corteCobranza.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Corte eliminado exitosamente" });
  } catch (error: any) {
    console.error("Error al eliminar corte:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
