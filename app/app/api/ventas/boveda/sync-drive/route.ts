import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { action, accessToken, folderId, documentId, nombreCliente, codigoCliente, pdfBase64 } = body;

        // Cargar variables de entorno para Google Drive
        const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
        const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID; // Opcional

        // 1. ACCIÓN: AUTENTICAR
        if (action === 'auth') {
            if (!clientId || !clientSecret || !refreshToken) {
                return NextResponse.json({ 
                    error: 'Credenciales de Google Drive incompletas. Por favor configure GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET y GOOGLE_DRIVE_REFRESH_TOKEN en su archivo .env' 
                }, { status: 400 });
            }

            try {
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
                    return NextResponse.json({ 
                        error: `Error de Google Auth: ${tokenData.error_description || tokenData.error}` 
                    }, { status: 400 });
                }

                return NextResponse.json({ 
                    success: true, 
                    accessToken: tokenData.access_token 
                });
            } catch (authErr: any) {
                return NextResponse.json({ 
                    error: `Fallo de red al conectar con Google OAuth: ${authErr.message}` 
                }, { status: 500 });
            }
        }

        // Para las siguientes acciones, requerimos el token de acceso
        if (!accessToken) {
            return NextResponse.json({ error: 'Token de acceso de Google no provisto' }, { status: 400 });
        }

        // Helper para llamadas fetch a la API de Drive
        const driveFetch = async (url: string, options: RequestInit = {}) => {
            const headers = {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers
            };
            const response = await fetch(url, { ...options, headers });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`API de Google Drive devolvió código ${response.status}: ${errText}`);
            }
            return response.json();
        };

        // 2. ACCIÓN: CREAR O DETECTAR CARPETAS
        if (action === 'create-folder') {
            if (!nombreCliente) {
                return NextResponse.json({ error: 'Nombre de cliente es requerido' }, { status: 400 });
            }

            let rootFolderId = parentFolderId;

            // Si no hay carpeta raíz configurada, buscamos o creamos la carpeta 'EXPEDIENTES_DIGITALES'
            if (!rootFolderId) {
                const query = "name = 'EXPEDIENTES_DIGITALES' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
                const searchRes = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`);
                
                if (searchRes.files && searchRes.files.length > 0) {
                    rootFolderId = searchRes.files[0].id;
                } else {
                    // Crear carpeta principal
                    const createRoot = await driveFetch('https://www.googleapis.com/drive/v3/files', {
                        method: 'POST',
                        body: JSON.stringify({
                            name: 'EXPEDIENTES_DIGITALES',
                            mimeType: 'application/vnd.google-apps.folder'
                        })
                    });
                    rootFolderId = createRoot.id;
                }
            }

            // Buscar carpeta para el cliente específico
            const folderName = `[${codigoCliente || 'S_CODE'}] ${nombreCliente}`.toUpperCase();
            const clientQuery = `name = '${folderName.replace(/'/g, "\\'")}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
            const clientSearchRes = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(clientQuery)}`);

            let clientFolderId;
            if (clientSearchRes.files && clientSearchRes.files.length > 0) {
                clientFolderId = clientSearchRes.files[0].id;
            } else {
                // Crear carpeta para el cliente
                const createClientFolder = await driveFetch('https://www.googleapis.com/drive/v3/files', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: folderName,
                        mimeType: 'application/vnd.google-apps.folder',
                        parents: [rootFolderId]
                    })
                });
                clientFolderId = createClientFolder.id;
            }

            return NextResponse.json({ 
                success: true, 
                folderId: clientFolderId 
            });
        }

        // 3. ACCIÓN: SUBIR ARCHIVO INDIVIDUAL
        if (action === 'upload-file') {
            if (!folderId || !documentId) {
                return NextResponse.json({ error: 'folderId y documentId son requeridos' }, { status: 400 });
            }

            const db = prisma as any;
            const doc = await db.documentoBoveda.findUnique({
                where: { id: documentId }
            });

            if (!doc) {
                return NextResponse.json({ error: 'Documento no encontrado en base de datos' }, { status: 404 });
            }

            const filePath = join(process.cwd(), 'public', doc.url);
            let fileBuffer;
            try {
                fileBuffer = await readFile(filePath);
            } catch (readErr) {
                return NextResponse.json({ error: 'El archivo físico del documento no se encuentra en el servidor' }, { status: 404 });
            }

            const fileExtension = doc.url.split('.').pop()?.toLowerCase() || 'jpg';
            const mimeType = fileExtension === 'png' ? 'image/png' : 
                             (fileExtension === 'pdf' ? 'application/pdf' : 
                             (fileExtension === 'json' ? 'application/json' : 'image/jpeg'));

            const fileName = `${doc.tipoDocumento}_${codigoCliente || 'DOC'}_${doc.id.substring(0, 8)}.${fileExtension}`.toUpperCase();

            // Cargar archivo vía Multipart Upload
            const metadata = {
                name: fileName,
                parents: [folderId]
            };

            const boundary = 'v_boundary_identifier';
            const delimiter = `\r\n--${boundary}\r\n`;
            const closeDelimiter = `\r\n--${boundary}--`;

            const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
            const mediaPartHeaders = `${delimiter}Content-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n`;

            const base64Content = fileBuffer.toString('base64');

            const multipartBody = Buffer.concat([
                Buffer.from(metadataPart),
                Buffer.from(mediaPartHeaders),
                Buffer.from(base64Content, 'base64'),
                Buffer.from(closeDelimiter)
            ]);

            const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`,
                    'Content-Length': multipartBody.length.toString()
                },
                body: multipartBody
            });

            if (!uploadRes.ok) {
                const errTxt = await uploadRes.text();
                throw new Error(`Google Drive Upload falló con código ${uploadRes.status}: ${errTxt}`);
            }

            const driveFileData = await uploadRes.json();
            const webViewLink = `https://drive.google.com/open?id=${driveFileData.id}`;

            // Actualizar registro en base de datos
            await db.documentoBoveda.update({
                where: { id: documentId },
                data: {
                    driveFileId: driveFileData.id,
                    driveUrl: webViewLink
                }
            });

            return NextResponse.json({
                success: true,
                fileId: driveFileData.id,
                driveUrl: webViewLink
            });
        }

        // 4. ACCIÓN: SUBIR EXPEDIENTE PDF CONSOLIDADO
        if (action === 'upload-pdf') {
            if (!folderId || !pdfBase64 || !codigoCliente) {
                return NextResponse.json({ error: 'folderId, pdfBase64 y codigoCliente son requeridos' }, { status: 400 });
            }

            const fileName = `EXPEDIENTE_${codigoCliente.toUpperCase()}.PDF`;
            const mimeType = 'application/pdf';

            // Cargar archivo vía Multipart Upload
            const metadata = {
                name: fileName,
                parents: [folderId]
            };

            const boundary = 'v_boundary_identifier';
            const delimiter = `\r\n--${boundary}\r\n`;
            const closeDelimiter = `\r\n--${boundary}--`;

            const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
            const mediaPartHeaders = `${delimiter}Content-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n`;

            const multipartBody = Buffer.concat([
                Buffer.from(metadataPart),
                Buffer.from(mediaPartHeaders),
                Buffer.from(pdfBase64, 'base64'),
                Buffer.from(closeDelimiter)
            ]);

            const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`,
                    'Content-Length': multipartBody.length.toString()
                },
                body: multipartBody
            });

            if (!uploadRes.ok) {
                const errTxt = await uploadRes.text();
                throw new Error(`Google Drive PDF Upload falló con código ${uploadRes.status}: ${errTxt}`);
            }

            const driveFileData = await uploadRes.json();
            const webViewLink = `https://drive.google.com/open?id=${driveFileData.id}`;

            return NextResponse.json({
                success: true,
                fileId: driveFileData.id,
                driveUrl: webViewLink
            });
        }

        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });

    } catch (error: any) {
        console.error('Error en sync-drive endpoint:', error);
        return NextResponse.json({ 
            error: error.message || 'Error inesperado al sincronizar con Google Drive'
        }, { status: 500 });
    }
}
