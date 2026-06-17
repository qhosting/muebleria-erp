
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Solo admins pueden editar GPS
        const userRole = ((session.user as any).role || '').toLowerCase();
        const allowedRoles = ['admin', 'administrador'];
        if (!allowedRoles.includes(userRole)) {
            return NextResponse.json({ error: 'No tienes permisos para modificar coordenadas GPS' }, { status: 403 });
        }

        const body = await request.json();
        const { documentId, lat, lng } = body;

        if (!documentId) {
            return NextResponse.json({ error: 'El ID del documento es requerido' }, { status: 400 });
        }

        if (lat === undefined || lng === undefined || lat === '' || lng === '') {
            return NextResponse.json({ error: 'Latitud y longitud son requeridas' }, { status: 400 });
        }

        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);

        if (isNaN(latNum) || isNaN(lngNum)) {
            return NextResponse.json({ error: 'Latitud y longitud deben ser valores numéricos válidos' }, { status: 400 });
        }

        if (latNum < -90 || latNum > 90) {
            return NextResponse.json({ error: 'La latitud debe estar entre -90 y 90' }, { status: 400 });
        }

        if (lngNum < -180 || lngNum > 180) {
            return NextResponse.json({ error: 'La longitud debe estar entre -180 y 180' }, { status: 400 });
        }

        // Buscar el documento GPS en la base de datos
        const db = prisma as any;
        const doc = await db.documentoBoveda.findUnique({
            where: { id: documentId }
        });

        if (!doc) {
            return NextResponse.json({ error: 'Documento GPS no encontrado' }, { status: 404 });
        }

        if (doc.tipoDocumento !== 'GPS') {
            return NextResponse.json({ error: 'El documento no es de tipo GPS' }, { status: 400 });
        }

        // Leer el archivo JSON actual para preservar campos como accuracy
        const filePath = join(process.cwd(), 'public', doc.url);
        let existingData: any = {};

        if (existsSync(filePath)) {
            try {
                const content = await readFile(filePath, 'utf-8');
                existingData = JSON.parse(content);
            } catch (e) {
                console.warn('[GPS Update] No se pudo leer el archivo GPS existente, se creará uno nuevo');
            }
        }

        // Actualizar las coordenadas manteniendo los demás campos
        const updatedGpsData = {
            ...existingData,
            lat: latNum,
            lng: lngNum,
            timestamp: existingData.timestamp || new Date().toISOString(),
            lastModified: new Date().toISOString(),
            modifiedBy: (session.user as any).name || (session.user as any).email || 'Admin'
        };

        // Escribir el archivo JSON actualizado
        await writeFile(filePath, JSON.stringify(updatedGpsData), 'utf-8');

        console.log(`[GPS Update] Coordenadas actualizadas por ${(session.user as any).name}: lat=${latNum}, lng=${lngNum} para documento ${documentId}`);

        return NextResponse.json({
            success: true,
            message: 'Coordenadas GPS actualizadas correctamente',
            data: updatedGpsData
        });

    } catch (error: any) {
        console.error('Error en boveda update-gps:', error);
        return NextResponse.json({
            error: 'Error al actualizar coordenadas GPS',
            details: error.message
        }, { status: 500 });
    }
}
