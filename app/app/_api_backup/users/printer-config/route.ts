import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Obtener configuración de impresora del usuario actual
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        impresoraNombre: true,
        impresoraAnchoPapel: true,
        impresoraTamanoFuente: true,
        impresoraAutoImprimir: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      printerConfig: {
        impresoraNombre: user.impresoraNombre || '',
        impresoraAnchoPapel: user.impresoraAnchoPapel || 80,
        impresoraTamanoFuente: user.impresoraTamanoFuente || 'mediana',
        impresoraAutoImprimir: user.impresoraAutoImprimir || false,
      }
    });
  } catch (error) {
    console.error('Error al obtener configuración de impresora:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}

// POST - Actualizar configuración de impresora del usuario actual
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const body = await request.json();

    const {
      impresoraNombre,
      impresoraAnchoPapel,
      impresoraTamanoFuente,
      impresoraAutoImprimir
    } = body;

    // Validar ancho de papel
    if (impresoraAnchoPapel && ![58, 80].includes(impresoraAnchoPapel)) {
      return NextResponse.json(
        { error: 'Ancho de papel debe ser 58 o 80 mm' },
        { status: 400 }
      );
    }

    // Validar tamaño de fuente
    if (impresoraTamanoFuente && !['pequena', 'mediana', 'grande'].includes(impresoraTamanoFuente)) {
      return NextResponse.json(
        { error: 'Tamaño de fuente inválido' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        impresoraNombre: impresoraNombre || null,
        impresoraAnchoPapel: impresoraAnchoPapel || 80,
        impresoraTamanoFuente: impresoraTamanoFuente || 'mediana',
        impresoraAutoImprimir: impresoraAutoImprimir || false,
      },
      select: {
        id: true,
        name: true,
        impresoraNombre: true,
        impresoraAnchoPapel: true,
        impresoraTamanoFuente: true,
        impresoraAutoImprimir: true,
      }
    });

    return NextResponse.json({
      message: 'Configuración de impresora actualizada exitosamente',
      printerConfig: {
        impresoraNombre: updatedUser.impresoraNombre,
        impresoraAnchoPapel: updatedUser.impresoraAnchoPapel,
        impresoraTamanoFuente: updatedUser.impresoraTamanoFuente,
        impresoraAutoImprimir: updatedUser.impresoraAutoImprimir,
      }
    });
  } catch (error) {
    console.error('Error al actualizar configuración de impresora:', error);
    return NextResponse.json(
      { error: 'Error al actualizar configuración' },
      { status: 500 }
    );
  }
}
