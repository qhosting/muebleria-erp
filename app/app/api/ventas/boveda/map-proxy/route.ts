import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        // 1. Validar sesión
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // 2. Obtener parámetros lng y lat
        const { searchParams } = new URL(request.url);
        const lngStr = searchParams.get('lng');
        const latStr = searchParams.get('lat');

        if (!lngStr || !latStr) {
            return NextResponse.json({ error: 'La longitud (lng) y latitud (lat) son requeridas' }, { status: 400 });
        }

        const lng = parseFloat(lngStr);
        const lat = parseFloat(latStr);

        if (isNaN(lng) || isNaN(lat)) {
            return NextResponse.json({ error: 'Coordenadas GPS no válidas' }, { status: 400 });
        }

        // 3. Consultar mapa estático de Yandex
        // pt: marcador con pin rojo y centrado en las coordenadas
        const yandexMapUrl = `https://static-maps.yandex.ru/1.x/?ll=${lng},${lat}&z=16&l=map&size=600,450&pt=${lng},${lat},pm2rdl`;

        const response = await fetch(yandexMapUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[Map Proxy] Error al obtener mapa estático de Yandex (Status ${response.status}):`, errText);
            return NextResponse.json({ 
                error: `Fallo al recuperar el mapa estático de Yandex (Status ${response.status})` 
            }, { status: 502 });
        }

        // 4. Leer datos binarios de la imagen y servirla
        const arrayBuffer = await response.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000, immutable'
            }
        });

    } catch (error: any) {
        console.error('[Map Proxy] Error interno:', error);
        return NextResponse.json({ 
            error: 'Error interno del servidor al procesar el proxy de mapa',
            details: error.message 
        }, { status: 500 });
    }
}
