
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RecomprasService } from '@/lib/recompras-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const meses = parseInt(searchParams.get('meses') || '1');

        const predicciones = await RecomprasService.predecirProximasLiquidaciones(meses);

        return NextResponse.json(predicciones);
    } catch (error: any) {
        console.error('Error en análisis de recompras:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
