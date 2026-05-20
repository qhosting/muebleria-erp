import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { existsSync } from 'fs';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
    try {
        // 1. Validar sesión
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // 2. Obtener el ID del documento
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'El ID del documento es requerido' }, { status: 400 });
        }

        // 3. Buscar el documento en la base de datos
        const db = prisma as any;
        const doc = await db.documentoBoveda.findUnique({
            where: { id }
        });

        if (!doc) {
            return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
        }

        // 4. Mapear tipo de contenido según la extensión
        const fileExtension = doc.url.split('.').pop()?.toLowerCase() || 'jpg';
        const contentType = fileExtension === 'png' ? 'image/png' : 
                            (fileExtension === 'pdf' ? 'application/pdf' : 
                            (fileExtension === 'json' ? 'application/json' : 'image/jpeg'));

        const filePath = join(process.cwd(), 'public', doc.url);
        let fileBuffer: Buffer;

        // 5. Verificar presencia en el disco local
        if (existsSync(filePath)) {
            try {
                fileBuffer = await readFile(filePath);
                return new NextResponse(fileBuffer, {
                    headers: {
                        'Content-Type': contentType,
                        'Cache-Control': 'public, max-age=31536000, immutable'
                    }
                });
            } catch (readErr: any) {
                console.error(`[Bóveda View] Error al leer archivo local en ${filePath}:`, readErr);
                // Si falla al leer por alguna razón pero existe en Drive, continuamos al fallback
            }
        }

        // 6. Fallback a Google Drive si no está localmente o falló su lectura
        if (!doc.driveFileId) {
            return NextResponse.json({ 
                error: 'El archivo físico no existe en el servidor local y no ha sido sincronizado con Google Drive' 
            }, { status: 404 });
        }

        console.log(`[Bóveda View] Archivo local ausente para ID ${id}. Intentando recuperar de Google Drive con ID: ${doc.driveFileId}`);

        const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

        if (!clientId || !clientSecret || !refreshToken) {
            return NextResponse.json({ 
                error: 'Configuración de Google Drive incompleta en el servidor' 
            }, { status: 500 });
        }

        // Obtener un access token de Google OAuth
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            })
        });

        const tokenData = await tokenRes.json();
        if (tokenData.error) {
            console.error('[Bóveda View] Error al refrescar token de Google:', tokenData.error_description || tokenData.error);
            return NextResponse.json({ 
                error: `Error de autenticación con Google Drive: ${tokenData.error}` 
            }, { status: 502 });
        }

        const accessToken = tokenData.access_token;

        // Descargar el archivo desde Google Drive API
        const downloadUrl = `https://www.googleapis.com/drive/v3/files/${doc.driveFileId}?alt=media`;
        const downloadRes = await fetch(downloadUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!downloadRes.ok) {
            const errText = await downloadRes.text();
            console.error(`[Bóveda View] Error de descarga en Google Drive API: ${downloadRes.status} - ${errText}`);
            return NextResponse.json({ 
                error: `Fallo al descargar el archivo desde Google Drive (Status ${downloadRes.status})` 
            }, { status: 502 });
        }

        // Leer datos binarios
        const arrayBuffer = await downloadRes.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);

        // 7. Escribir archivo de vuelta en caché local de forma asíncrona para no retrasar la respuesta
        try {
            const uploadDir = join(process.cwd(), 'public', 'uploads', 'boveda');
            await mkdir(uploadDir, { recursive: true });
            await writeFile(filePath, fileBuffer);
            console.log(`[Bóveda View] Archivo cacheado con éxito localmente en ${filePath}`);
        } catch (writeErr: any) {
            console.error('[Bóveda View] No se pudo escribir la caché local:', writeErr.message);
        }

        // 8. Responder con el buffer y el tipo MIME correspondiente
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable'
            }
        });

    } catch (error: any) {
        console.error('Error en el endpoint de previsualización de bóveda:', error);
        return NextResponse.json({ 
            error: 'Error interno del servidor al procesar la visualización del documento',
            details: error.message 
        }, { status: 500 });
    }
}
