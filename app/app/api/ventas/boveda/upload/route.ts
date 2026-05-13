
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const tipoDocumento = formData.get('tipoDocumento') as string; // INE_FRONT, etc.
        const clienteCurp = formData.get('clienteCurp') as string;
        const codigoCliente = formData.get('codigoCliente') as string;
        const folioContrato = formData.get('folioContrato') as string;
        const nombreCliente = formData.get('nombreCliente') as string;

        if (!file || !tipoDocumento) {
            return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Directorio de la boveda
        const folder = 'boveda';
        const uploadDir = join(process.cwd(), 'public', 'uploads', folder);
        
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {}

        const fileExtension = file.name.split('.').pop() || 'jpg';
        const fileName = `${uuidv4()}.${fileExtension}`;
        const filePath = join(uploadDir, fileName);

        await writeFile(filePath, buffer as any);

        const publicUrl = `/uploads/${folder}/${fileName}`;

        const db = prisma as any;

        // Guardar en base de datos
        const documento = await db.documentoBoveda.create({
            data: {
                clienteCurp,
                codigoCliente,
                folioContrato,
                nombreCliente,
                tipoDocumento,
                url: publicUrl,
                status: 'PENDIENTE'
            }
        });

        return NextResponse.json({
            success: true,
            documento
        });

    } catch (error: any) {
        console.error('Error en boveda upload:', error);
        return NextResponse.json({ 
            error: 'Error al subir documento',
            details: error.message 
        }, { status: 500 });
    }
}
