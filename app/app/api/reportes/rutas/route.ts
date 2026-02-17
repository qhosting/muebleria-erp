

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { addDays, startOfDay, format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!['admin', 'gestor_cobranza', 'reporte_cobranza'].includes(userRole)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const periodo = parseInt(searchParams.get('periodo') || '30');
    const cobradorId = searchParams.get('cobradorId') || '';
    
    const fechaFin = startOfDay(new Date());
    const fechaInicio = startOfDay(addDays(fechaFin, -periodo));

    // Construir filtros
    let whereConditions: any = {
      fechaPago: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    };

    if (cobradorId) {
      whereConditions.cobradorId = cobradorId;
    }

    if (userRole === 'cobrador') {
      whereConditions.cobradorId = (session.user as any).id;
    }

    // Obtener pagos del período
    const pagos = await prisma.pago.findMany({
      where: whereConditions,
      include: {
        cliente: {
          select: {
            id: true,
            nombreCompleto: true,
            direccionCompleta: true,
            diaPago: true,
            codigoCliente: true,
          },
        },
        cobrador: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { fechaPago: 'desc' },
        { createdAt: 'desc' }
      ],
    });

    // Agrupar por cobrador y día
    const rutasPorCobrador: any = {};

    pagos.forEach((pago: any) => {
      const cobradorId = pago.cobradorId;
      const fecha = format(pago.fechaPago, 'yyyy-MM-dd');
      
      if (!rutasPorCobrador[cobradorId]) {
        rutasPorCobrador[cobradorId] = {
          cobrador: pago.cobrador,
          dias: {},
          estadisticas: {
            totalPagos: 0,
            totalImporte: 0,
            clientesVisitados: new Set(),
            diasTrabajados: new Set(),
          }
        };
      }

      if (!rutasPorCobrador[cobradorId].dias[fecha]) {
        rutasPorCobrador[cobradorId].dias[fecha] = {
          fecha,
          pagos: [],
          resumen: {
            totalPagos: 0,
            totalImporte: 0,
            clientesVisitados: 0,
          }
        };
      }

      // Agregar pago al día
      rutasPorCobrador[cobradorId].dias[fecha].pagos.push({
        id: pago.id,
        monto: pago.monto.toNumber(),
        tipoPago: pago.tipoPago,
        concepto: pago.concepto,
        hora: pago.createdAt,
        cliente: pago.cliente,
      });

      // Actualizar estadísticas del día
      rutasPorCobrador[cobradorId].dias[fecha].resumen.totalPagos++;
      rutasPorCobrador[cobradorId].dias[fecha].resumen.totalImporte += pago.monto.toNumber();
      
      // Actualizar estadísticas generales
      rutasPorCobrador[cobradorId].estadisticas.totalPagos++;
      rutasPorCobrador[cobradorId].estadisticas.totalImporte += pago.monto.toNumber();
      rutasPorCobrador[cobradorId].estadisticas.clientesVisitados.add(pago.clienteId);
      rutasPorCobrador[cobradorId].estadisticas.diasTrabajados.add(fecha);
    });

    // Procesar estadísticas finales
    Object.values(rutasPorCobrador).forEach((cobrador: any) => {
      // Contar clientes únicos por día
      Object.values(cobrador.dias).forEach((dia: any) => {
        const clientesUnicos = new Set();
        dia.pagos.forEach((pago: any) => {
          clientesUnicos.add(pago.cliente.id);
        });
        dia.resumen.clientesVisitados = clientesUnicos.size;
      });

      // Convertir Sets a números
      cobrador.estadisticas.clientesVisitados = cobrador.estadisticas.clientesVisitados.size;
      cobrador.estadisticas.diasTrabajados = cobrador.estadisticas.diasTrabajados.size;
      cobrador.estadisticas.promedioImportePorDia = cobrador.estadisticas.diasTrabajados > 0 
        ? cobrador.estadisticas.totalImporte / cobrador.estadisticas.diasTrabajados 
        : 0;
      cobrador.estadisticas.promedioPagosPorDia = cobrador.estadisticas.diasTrabajados > 0 
        ? cobrador.estadisticas.totalPagos / cobrador.estadisticas.diasTrabajados 
        : 0;

      // Convertir dias object a array ordenado
      cobrador.dias = Object.values(cobrador.dias).sort((a: any, b: any) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
    });

    // Obtener lista de cobradores para el filtro
    const cobradores = await prisma.user.findMany({
      where: {
        role: 'cobrador',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    });

    // Calcular estadísticas generales
    const estadisticasGenerales = {
      totalCobradores: Object.keys(rutasPorCobrador).length,
      totalPagos: Object.values(rutasPorCobrador).reduce((sum: number, c: any) => sum + c.estadisticas.totalPagos, 0),
      totalImporte: Object.values(rutasPorCobrador).reduce((sum: number, c: any) => sum + c.estadisticas.totalImporte, 0),
      promedioImportePorCobrador: Object.keys(rutasPorCobrador).length > 0 
        ? Object.values(rutasPorCobrador).reduce((sum: number, c: any) => sum + c.estadisticas.totalImporte, 0) / Object.keys(rutasPorCobrador).length 
        : 0,
    };

    const response = {
      rutasPorCobrador: Object.values(rutasPorCobrador),
      cobradores,
      estadisticasGenerales,
      filtros: {
        periodo,
        cobradorId,
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString(),
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error al obtener reporte de rutas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
