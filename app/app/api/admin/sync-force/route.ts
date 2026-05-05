
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import webpush from 'web-push';

// Configurar WebPush
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:soporte@muebleriaeconomica.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }

    // Buscar suscripciones push del usuario
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({ error: 'El usuario no tiene dispositivos registrados para notificaciones' }, { status: 404 });
    }

    const payload = JSON.stringify({
      title: 'Sincronización Requerida',
      body: 'El administrador ha solicitado una sincronización forzada de tus datos.',
      type: 'FORCE_SYNC',
      url: '/mobile/sync'
    });

    const results = await Promise.allSettled(
      subscriptions.map(sub => 
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth,
              p256dh: sub.p256dh
            }
          },
          payload
        )
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Limpiar suscripciones fallidas (opcional pero recomendado)
    // results.forEach((r, i) => { if (r.status === 'rejected') ... })

    return NextResponse.json({ 
      success: true, 
      message: `Se envió la señal de sincronización a ${successful} dispositivos.`,
      failed 
    });

  } catch (error) {
    console.error('Error enviando force-sync:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
