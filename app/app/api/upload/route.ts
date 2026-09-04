import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ALLOWED_FOLDERS = ['productos', 'comprobantes', 'documentos', 'solicitudes', 'general'] as const;
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf']);
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  try {
    // 1. Verificación de Autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado para subir archivos' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const rawFolder = (formData.get('folder') as string) || 'general';

    if (!file) {
      return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
    }

    // 2. Blindaje contra Path Traversal: validación de carpeta permitida
    const cleanFolder = rawFolder.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
    const folder = ALLOWED_FOLDERS.includes(cleanFolder as any) ? cleanFolder : 'general';

    // 3. Validación de tamaño
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'El archivo excede el tamaño máximo permitido de 10 MB' },
        { status: 400 }
      );
    }

    // 4. Validación de extensión y tipo MIME
    const parts = file.name.split('.');
    const fileExtension = (parts.pop() || '').toLowerCase();
    
    if (!ALLOWED_EXTENSIONS.has(fileExtension) || !ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Solo se aceptan imágenes (JPG, PNG, WebP) o PDF.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 5. Directorio de guardado seguro dentro de public/uploads/
    const uploadDir = join(process.cwd(), 'public', 'uploads', folder);
    
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {}

    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = join(uploadDir, fileName);

    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${folder}/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl
    });

  } catch (error: any) {
    console.error('Error en upload seguro:', error);
    return NextResponse.json({ 
      error: 'Error al subir la imagen',
      details: error.message 
    }, { status: 500 });
  }
}
