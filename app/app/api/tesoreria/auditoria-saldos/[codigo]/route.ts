import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { auditarSaldosCliente, actualizarSaldosCliente } from '@/lib/auditoria-saldos-service';

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
 * POST: Ejecuta la corrección del saldo y la cascada histórica de pagos para este cliente individual
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

    const resultado = await actualizarSaldosCliente(codigo, prisma);
    return NextResponse.json({ ...resultado });
  } catch (error: any) {
    console.error(`Error al actualizar saldo para cliente ${params?.codigo}:`, error);
    return NextResponse.json({ error: error.message || 'Error al actualizar saldo' }, { status: 500 });
  }
}
