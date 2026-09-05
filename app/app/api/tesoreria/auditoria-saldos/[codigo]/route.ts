import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  auditarSaldosCliente,
  actualizarSaldosCliente,
  ajustarSaldoManualYCascada,
  insertarPagoContpaqi,
  insertarPagosPendientesClienteContpaqi
} from '@/lib/auditoria-saldos-service';

export const dynamic = 'force-dynamic';

/**
 * GET: Obtiene el diagnóstico detallado paso a paso de la cadena de saldos de un cliente
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { codigo: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { codigo } = params;
    if (!codigo) {
      return NextResponse.json({ error: 'Código de cliente requerido' }, { status: 400 });
    }

    const diagnostico = await auditarSaldosCliente(codigo, prisma);
    return NextResponse.json({ success: true, diagnostico });
  } catch (error: any) {
    console.error(`Error al auditar cliente ${params?.codigo}:`, error);
    return NextResponse.json({ error: error.message || 'Error al obtener diagnóstico' }, { status: 500 });
  }
}

/**
 * POST: Ejecuta la corrección de saldos o la inserción de pagos a ContPAQi para este cliente individual
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { codigo: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const allowedRoles = ['admin', 'auditor', 'tesorero', 'tesoreria', 'direccion', 'jefe_ventas', 'gerente', 'supervisor'];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Acceso restringido a administradores y tesorería' }, { status: 403 });
    }

    const { codigo } = params;
    if (!codigo) {
      return NextResponse.json({ error: 'Código de cliente requerido' }, { status: 400 });
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const accion = body?.accion || 'actualizar_saldo';
    const pagoId = body?.pagoId;

    // ACCIÓN: Edición manual de saldo por Super Administrador y recalcular cascada histórica
    if (accion === 'editar_saldo_manual' || accion === 'ajustar_saldo_manual') {
      const isSuperAdmin = ['admin', 'direccion', 'superadmin', 'super_admin'].includes(userRole);
      if (!isSuperAdmin) {
        return NextResponse.json({ error: 'Acción restringida. Solo Super Administradores pueden editar el saldo manualmente.' }, { status: 403 });
      }

      const nuevoSaldo = parseFloat(body?.nuevoSaldo?.toString() || '');
      if (isNaN(nuevoSaldo) || nuevoSaldo < 0) {
        return NextResponse.json({ error: 'El nuevo saldo debe ser un número mayor o igual a 0.' }, { status: 400 });
      }

      const resultado = await ajustarSaldoManualYCascada(codigo, nuevoSaldo, prisma);
      return NextResponse.json(resultado);
    }

    // ACCIÓN: Insertar un pago específico o todos los pagos pendientes en ContPAQi
    if (accion === 'insertar_pago_contpaqi' || accion === 'insertar_pagos_contpaqi') {
      if (pagoId) {
        const resultado = await insertarPagoContpaqi(pagoId, prisma);
        const diagnostico = await auditarSaldosCliente(codigo, prisma);
        return NextResponse.json({ ...resultado, diagnostico });
      } else {
        const resultado = await insertarPagosPendientesClienteContpaqi(codigo, prisma);
        return NextResponse.json(resultado);
      }
    }

    // ACCIÓN DEFAULT: Actualizar y alinear saldo en ERP
    const resultado = await actualizarSaldosCliente(codigo, prisma);
    return NextResponse.json({ ...resultado });
  } catch (error: any) {
    console.error(`Error en acción POST para cliente ${params?.codigo}:`, error);
    return NextResponse.json({ error: error.message || 'Error al procesar solicitud' }, { status: 500 });
  }
}

