
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getContpaqiService } from '@/lib/contpaqi-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/contpaqi/test?empresaId=xxx
 * 
 * Valida la conexión con la API de Contpaqi SIN sincronizar ni modificar
 * ningún dato en la base de datos local.
 * 
 * Devuelve:
 * - Estado de la conexión (ok/error)
 * - Muestra de los primeros campos disponibles (para verificar mapping)
 * - Conteo de registros disponibles en la API
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId') || undefined;
    const tipo = searchParams.get('tipo') || 'all'; // all, clientes, productos

    try {
        const service = await getContpaqiService(prisma, empresaId);
        const resultado: any = {
            conexion: 'ok',
            timestamp: new Date().toISOString(),
            empresa: empresaId || 'default',
        };

        // ─── PRODUCTOS ─────────────────────────────────────────────────────────
        if (tipo === 'all' || tipo === 'productos') {
            try {
                const productos = await service.getProductos();
                resultado.productos = {
                    ok: true,
                    total: Array.isArray(productos) ? productos.length : 0,
                    muestra: Array.isArray(productos) && productos.length > 0
                        ? {
                            campos: Object.keys(productos[0]),
                            primerRegistro: productos[0]
                        }
                        : null,
                    mensaje: Array.isArray(productos) && productos.length > 0
                        ? `Se encontraron ${productos.length} productos en la API`
                        : 'La API respondió pero no devolvió productos'
                };
            } catch (e: any) {
                resultado.productos = {
                    ok: false,
                    error: e.message
                };
            }
        }

        // ─── CLIENTES ──────────────────────────────────────────────────────────
        if (tipo === 'all' || tipo === 'clientes') {
            try {
                // Obtener config para aplicar los mismos filtros que el sync real
                const configRaw = await prisma.configuracionSistema.findUnique({ where: { clave: 'sistema' } });
                const contpaqiConfig = (configRaw as any)?.contpaqi || {};
                const empresaConfig = contpaqiConfig.empresas?.find((e: any) => e.id === empresaId) || contpaqiConfig.empresas?.[0];
                const clasificacion = empresaConfig?.clasificacion;
                const ruta = empresaConfig?.ruta;

                const clientes = await service.getClientes(1, { clasificacion, ruta });
                resultado.clientes = {
                    ok: true,
                    total: Array.isArray(clientes) ? clientes.length : 0,
                    muestra: Array.isArray(clientes) && clientes.length > 0
                        ? {
                            campos: Object.keys(clientes[0]),
                            primerRegistro: clientes[0]
                        }
                        : null,
                    mensaje: Array.isArray(clientes) && clientes.length > 0
                        ? `Se encontraron ${clientes.length} clientes en la API`
                        : 'La API respondió pero no devolvió clientes'
                };
            } catch (e: any) {
                resultado.clientes = {
                    ok: false,
                    error: e.message
                };
            }
        }

        return NextResponse.json({
            success: true,
            mensaje: '✅ Validación de conexión completada. NO se modificaron datos.',
            ...resultado
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            conexion: 'error',
            mensaje: '❌ No se pudo conectar con la API de Contpaqi.',
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 503 });
    }
}
