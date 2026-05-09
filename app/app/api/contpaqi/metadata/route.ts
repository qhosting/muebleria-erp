
import { NextRequest, NextResponse } from 'next/server';
import { ContpaqiService } from '@/lib/contpaqi-service';

/**
 * API para obtener metadatos de Contpaqi (Empresas, Conceptos, Clasificaciones)
 * Útil para la configuración dinámica
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { apiUrl, apiKey, type, empresa, id } = body;

        if (!apiUrl || !apiKey) {
            return NextResponse.json({ error: 'Faltan credenciales (URL o API Key)' }, { status: 400 });
        }

        console.log(`🔍 [Contpaqi Metadata] Solicitando ${type} para empresa: "${empresa}" en ${apiUrl}`);
        const service = new ContpaqiService({ apiUrl, apiKey });

        let data: any = null;

        switch (type) {
            case 'empresas':
                data = await service.getEmpresas();
                break;
            case 'discovery':
                data = await service.getMetadata();
                break;
            case 'conceptos':
                data = await service.getConceptos(empresa);
                break;
            case 'clasificaciones':
                data = await service.getClasificaciones(empresa);
                break;
            case 'valores_clasificacion':
                data = await service.getValoresClasificacion(id, empresa);
                break;
            case 'campos_clientes':
                data = await service.getCampos('clientes', empresa);
                break;
            case 'campos_productos':
                data = await service.getCampos('productos', empresa);
                break;
            default:
                return NextResponse.json({ error: 'Tipo de metadato no válido' }, { status: 400 });
        }

        console.log(`✅ [Contpaqi Metadata] Respuesta para ${type}:`, Array.isArray(data) ? `${data.length} elementos` : 'Objeto');
        if (Array.isArray(data) && data.length > 0) {
            console.log(`📌 [Contpaqi Metadata] Ejemplo de ${type}[0]:`, JSON.stringify(data[0]));
        }

        return NextResponse.json(data);

    } catch (error: any) {
        // Log detallado para diagnóstico
        console.error(`❌ [Contpaqi Metadata Error]`, {
            url: request.url,
            message: error.message,
            stack: error.stack
        });
        return NextResponse.json({ 
            error: error.message,
            details: 'Asegúrese de que el servidor Contpaqi REST API esté en ejecución y sea accesible desde este servidor.'
        }, { status: 500 });
    }
}
