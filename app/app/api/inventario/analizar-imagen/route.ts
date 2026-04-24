
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { extractProductsFromImage } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 });
    }

    // Extraer productos usando IA Real
    const productos = await extractProductsFromImage(image);

    return NextResponse.json({
      success: true,
      productos
    });

  } catch (error: any) {
    console.error('Error en análisis de imagen:', error);
    return NextResponse.json({ 
      error: 'Error al analizar la imagen con IA',
      details: error.message 
    }, { status: 500 });
  }
}
