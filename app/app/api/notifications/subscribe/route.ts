
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const subscription = await req.json();

        if (!subscription.endpoint) {
            return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
        }

        const userId = (session.user as any).id;

        // Guardar o actualizar suscripción
        await prisma.pushSubscription.upsert({
            where: { endpoint: subscription.endpoint },
            update: {
                userId: userId,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                updatedAt: new Date()
            },
            create: {
                userId: userId,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth
            }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error al guardar suscripción push:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
