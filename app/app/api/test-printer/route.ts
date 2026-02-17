
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!['admin', 'gestor_cobranza'].includes(userRole)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    // Simular test de impresora
    // En producción, aquí se conectaría con la impresora real
    console.log('Test de impresora solicitado por:', session.user.email);
    
    // Por ahora solo retornamos success
    // En el futuro se puede integrar con hardware real de impresión
    return NextResponse.json({ 
      success: true,
      message: 'Test de impresora simulado correctamente',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en test de impresora:', error);
    return NextResponse.json(
      { error: 'Error al probar la impresora' },
      { status: 500 }
    );
  }
}
