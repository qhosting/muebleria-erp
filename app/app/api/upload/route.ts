
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'productos';

    if (!file) {
      return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Definir ruta de guardado (dentro de public para que sea accesible)
    const uploadDir = join(process.cwd(), 'public', 'uploads', folder);
    
    // Asegurar que el directorio existe
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {}

    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = join(uploadDir, fileName);

    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${folder}/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl
    });

  } catch (error: any) {
    console.error('Error en upload:', error);
    return NextResponse.json({ 
      error: 'Error al subir la imagen',
      details: error.message 
    }, { status: 500 });
  }
}
