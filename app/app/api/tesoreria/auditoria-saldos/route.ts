import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { auditarSaldosCliente, actualizarSaldosCliente, insertarPagosPendientesMasivoContpaqi } from '@/lib/auditoria-saldos-service';

export const dynamic = 'force-dynamic';

/**
 * GET: Obtiene la lista de clientes para auditoría de saldos (muebleria-erp vs ContPAQi API)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'admin' && userRole !== 'auditor' && userRole !== 'tesorero' && userRole !== 'direccion') {
      return NextResponse.json({ error: 'Acceso restringido a administradores y tesorería' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const empresaFiltro = searchParams.get('empresa') || 'all'; // all, DP, DQ
    const cobradorFiltro = searchParams.get('cobrador') || 'all';
    const estadoFiltro = searchParams.get('estado') || 'all'; // all, DESFASE, CUADRADO, PENDIENTES
    const statusCuentaFiltro = searchParams.get('statusCuenta') || 'activo'; // activo, inactivo, all
    const search = (searchParams.get('search') || '').trim();
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');

    // 1. Obtener lista de cobradores disponibles desde PostgreSQL
    const cobradoresUsers = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'cobrador' },
          { codigoGestor: { not: null } }
        ]
      },
      select: { codigoGestor: true, name: true, email: true }
    });

    const cobradoresList = Array.from(
      new Set(cobradoresUsers.map(u => u.codigoGestor || u.name).filter(Boolean))
    ).sort() as string[];

    // 2. Construir filtros Prisma
    const where: any = {};

    if (statusCuentaFiltro !== 'all') {
      where.statusCuenta = statusCuentaFiltro;
    }

    if (empresaFiltro !== 'all') {
      where.codigoCliente = {
        startsWith: empresaFiltro,
        mode: 'insensitive'
      };
    }

    if (cobradorFiltro !== 'all') {
      where.cobradorAsignado = {
        OR: [
          { codigoGestor: { equals: cobradorFiltro, mode: 'insensitive' } },
          { name: { equals: cobradorFiltro, mode: 'insensitive' } }
        ]
      };
    }

    if (search) {
      where.OR = [
        { codigoCliente: { contains: search, mode: 'insensitive' } },
        { nombreCompleto: { contains: search, mode: 'insensitive' } }
      ];
    }

    const totalCount = await prisma.cliente.count({ where });

    // 3. Obtener clientes paginados desde PostgreSQL
    const clientesBase = await prisma.cliente.findMany({
      where,
      select: {
        id: true,
        codigoCliente: true,
        nombreCompleto: true,
        saldoActual: true,
        cobradorAsignado: {
          select: { name: true, codigoGestor: true }
        }
      },
      orderBy: { codigoCliente: 'asc' },
      skip: (page - 1) * limit,
      take: limit
    });

    // 4. Auditar cada cliente en paralelo (lotes de 10)
    const auditados: any[] = [];
    const BATCH_SIZE = 10;
    for (let i = 0; i < clientesBase.length; i += BATCH_SIZE) {
      const batch = clientesBase.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((c) => auditarSaldosCliente(c.codigoCliente, prisma))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const res = batchResults[j];
        if (res.status === 'fulfilled') {
          auditados.push(res.value);
        } else {
          const fallback = batch[j];
          auditados.push({
            codigo: fallback.codigoCliente,
            nombre: fallback.nombreCompleto,
            empresa: fallback.codigoCliente.toUpperCase().startsWith('DQ') ? 'DQ' : 'DP',
            cobrador: fallback.cobradorAsignado?.codigoGestor || fallback.cobradorAsignado?.name || 'Sin Asignar',
            saldoContpaqiApi: 0,
            saldoErpActual: parseFloat(fallback.saldoActual?.toString() || '0') || 0,
            saldoMysqlActual: parseFloat(fallback.saldoActual?.toString() || '0') || 0,
            saldoRealCalculado: parseFloat(fallback.saldoActual?.toString() || '0') || 0,
            diferenciaErp: 0,
            diferenciaMysql: 0,
            diferenciaContpaqi: 0,
            estadoCuadre: 'CUADRADO',
            totalPagosAuditados: 0,
            pagosPendientesContpaqi: 0,
            pagosAplicadosContpaqi: 0,
            cadenaPagos: []
          });
        }
      }
    }

    // Filtrar por estado si se especificó
    let resultadosFiltrados = auditados;
    if (estadoFiltro === 'DESFASE') {
      resultadosFiltrados = auditados.filter((a) => a.estadoCuadre === 'DESFASE_SALDO');
    } else if (estadoFiltro === 'CUADRADO') {
      resultadosFiltrados = auditados.filter((a) => a.estadoCuadre === 'CUADRADO');
    } else if (estadoFiltro === 'PENDIENTES') {
      resultadosFiltrados = auditados.filter((a) => a.estadoCuadre === 'PAGOS_PENDIENTES_CONTPAQI');
    }

    // Resumen estadístico
    const totalConDesfase = auditados.filter((a) => a.estadoCuadre === 'DESFASE_SALDO').length;
    const totalCuadrados = auditados.filter((a) => a.estadoCuadre === 'CUADRADO').length;
    const totalConPendientes = auditados.filter((a) => a.estadoCuadre === 'PAGOS_PENDIENTES_CONTPAQI').length;
    const sumaDiscrepanciaTotal = auditados.reduce((acc, a) => acc + Math.abs(a.diferenciaErp || 0), 0);

    return NextResponse.json({
      success: true,
      resumen: {
        totalAuditados: totalCount,
        totalEnPagina: auditados.length,
        totalCuadrados,
        totalConDesfase,
        totalConPendientes,
        sumaDiscrepanciaTotal: parseFloat(sumaDiscrepanciaTotal.toFixed(2))
      },
      cobradores: cobradoresList,
      clientes: resultadosFiltrados,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1
      }
    });
  } catch (error: any) {
    console.error('Error al ejecutar auditoría de saldos:', error);
    return NextResponse.json({ error: error.message || 'Error interno en auditoría' }, { status: 500 });
  }
}

/**
 * POST: Ejecuta acciones masivas (actualización de saldos o inserción de pagos a ContPAQi)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const allowedRoles = ['admin', 'auditor', 'tesorero', 'tesoreria', 'direccion', 'jefe_ventas', 'gerente', 'supervisor'];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Acceso restringido a administradores' }, { status: 403 });
    }

    const body = await request.json();
    const { codigosClientes, accion = 'actualizar_saldos' } = body;

    if (!Array.isArray(codigosClientes) || codigosClientes.length === 0) {
      return NextResponse.json({ error: 'Debe especificar al menos un código de cliente' }, { status: 400 });
    }

    // ACCIÓN: Insertar pagos pendientes en ContPAQi Comercial API
    if (accion === 'insertar_pagos_contpaqi') {
      const res = await insertarPagosPendientesMasivoContpaqi(codigosClientes, prisma);
      return NextResponse.json(res);
    }

    // ACCIÓN DEFAULT: Actualizar y alinear saldos en ERP
    const resultados: any[] = [];
    let totalActualizados = 0;
    let totalPagosCorregidos = 0;

    for (const codigo of codigosClientes) {
      try {
        const res = await actualizarSaldosCliente(codigo, prisma);
        resultados.push({
          codigo,
          success: true,
          saldoReal: res.saldoReal,
          pagosActualizados: res.pagosActualizados
        });
        totalActualizados++;
        totalPagosCorregidos += res.pagosActualizados;
      } catch (err: any) {
        resultados.push({
          codigo,
          success: false,
          error: err.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      mensaje: `Actualización masiva completada: ${totalActualizados} clientes actualizados (${totalPagosCorregidos} pagos en cascada reajustados).`,
      totalActualizados,
      totalPagosCorregidos,
      detalles: resultados
    });
  } catch (error: any) {
    console.error('Error al ejecutar acción masiva en auditoría de saldos:', error);
    return NextResponse.json({ error: error.message || 'Error en acción masiva' }, { status: 500 });
  }
}
