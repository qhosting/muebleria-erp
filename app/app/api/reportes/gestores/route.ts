
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !['admin', 'gestor_cobranza'].includes((session.user as any).role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const fechaDesde = searchParams.get('fechaDesde') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const fechaHasta = searchParams.get('fechaHasta') || new Date().toISOString();

        const result = await prisma.$queryRaw`
      SELECT 
        u.name as gestor,
        u."codigoGestor" as codigo,
        COUNT(CASE WHEN p."metodoPago" = 'bancario' THEN 1 END) as ctas_banco,
        COUNT(CASE WHEN p."metodoPago" = 'gestor' THEN 1 END) as ctas_gestor,
        SUM(CASE WHEN p."metodoPago" = 'bancario' THEN p.monto ELSE 0 END) as monto_banco,
        SUM(CASE WHEN p."metodoPago" = 'gestor' THEN p.monto ELSE 0 END) as monto_gestor,
        COUNT(p.id) as total_ctas,
        SUM(p.monto) as total_monto
      FROM users u
      LEFT JOIN pagos p ON u.id = p."cobradorId" AND p."fechaPago" >= ${new Date(fechaDesde)} AND p."fechaPago" <= ${new Date(fechaHasta)}
      WHERE u.role = 'cobrador'
      GROUP BY u.id, u.name, u."codigoGestor"
      HAVING COUNT(p.id) > 0
      ORDER BY total_monto DESC
    `;

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error en reporte de gestores:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
