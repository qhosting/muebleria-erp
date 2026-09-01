
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

import { checkPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !await checkPermission((session.user as any).role, 'reportes')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const fechaDesde = searchParams.get('fechaDesde') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const fechaHasta = searchParams.get('fechaHasta') || new Date().toISOString();

        const result: any[] = await prisma.$queryRaw`
          SELECT 
            u.name as gestor,
            u."codigoGestor" as codigo,
            COUNT(CASE WHEN LOWER(COALESCE(p."metodoPago", '')) IN ('bancario', 'transferencia', 'bancos bot', 'transferencia banorte', 'transferencia santander', 'bancario_bot', 'gestor bancos') OR p."ticketId" IS NOT NULL THEN 1 END) as ctas_banco,
            COUNT(CASE WHEN (LOWER(COALESCE(p."metodoPago", '')) NOT IN ('bancario', 'transferencia', 'bancos bot', 'transferencia banorte', 'transferencia santander', 'bancario_bot', 'gestor bancos') AND p."ticketId" IS NULL) OR p."metodoPago" IS NULL THEN 1 END) as ctas_gestor,
            COALESCE(SUM(CASE WHEN LOWER(COALESCE(p."metodoPago", '')) IN ('bancario', 'transferencia', 'bancos bot', 'transferencia banorte', 'transferencia santander', 'bancario_bot', 'gestor bancos') OR p."ticketId" IS NOT NULL THEN p.monto ELSE 0 END), 0) as monto_banco,
            COALESCE(SUM(CASE WHEN (LOWER(COALESCE(p."metodoPago", '')) NOT IN ('bancario', 'transferencia', 'bancos bot', 'transferencia banorte', 'transferencia santander', 'bancario_bot', 'gestor bancos') AND p."ticketId" IS NULL) OR p."metodoPago" IS NULL THEN p.monto ELSE 0 END), 0) as monto_gestor,
            COUNT(p.id) as total_ctas,
            COALESCE(SUM(p.monto), 0) as total_monto
          FROM users u
          LEFT JOIN pagos p ON u.id = p."cobradorId" AND p."fechaPago" >= ${new Date(fechaDesde)} AND p."fechaPago" <= ${new Date(fechaHasta)}
          WHERE u.role = 'cobrador'
          GROUP BY u.id, u.name, u."codigoGestor"
          HAVING COUNT(p.id) > 0
          ORDER BY total_monto DESC
        `;

        // Convertir BigInt y Decimal a Numbers para serialización JSON segura
        const formatted = result.map((row: any) => ({
            gestor: row.gestor,
            codigo: row.codigo || 'N/A',
            ctas_banco: Number(row.ctas_banco || 0),
            ctas_gestor: Number(row.ctas_gestor || 0),
            monto_banco: Number(row.monto_banco || 0),
            monto_gestor: Number(row.monto_gestor || 0),
            total_ctas: Number(row.total_ctas || 0),
            total_monto: Number(row.total_monto || 0)
        }));

        return NextResponse.json(formatted);
    } catch (error: any) {
        console.error('Error en reporte de gestores:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
