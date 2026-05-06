
import { NextRequest, NextResponse } from 'next/server';
import { ContpaqiService } from '@/lib/contpaqi-service';

/**
 * API para obtener metadatos de Contpaqi (Empresas, Conceptos, Clasificaciones)
 * Útil para la configuración dinámica
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { apiUrl, apiKey, type, empresa } = body;

        if (!apiUrl || !apiKey) {
            return NextResponse.json({ error: 'Faltan credenciales (URL o API Key)' }, { status: 400 });
        }

        const service = new ContpaqiService({ apiUrl, apiKey });

        let data: any = null;

        switch (type) {
            case 'empresas':
                data = await service.getEmpresas();
                break;
            case 'conceptos':
                data = await service.getConceptos(empresa);
                break;
            case 'clasificaciones':
                data = await service.getClasificaciones(empresa);
                break;
            default:
                return NextResponse.json({ error: 'Tipo de metadato no válido' }, { status: 400 });
        }

        return NextResponse.json(data);

    } catch (error: any) {
        console.error(`❌ Contpaqi Metadata Error (${request.url}):`, error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
