
import webpush from 'web-push';
import { prisma } from './db';
import { UserRole } from '@prisma/client';

// En un entorno real, estas llaves se generan una vez y se guardan en .env
// publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
// privateVapidKey = process.env.VAPID_PRIVATE_KEY

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BP6OyWqzh5Ah3ovavEBnz4Mz47WGowP6TJPdE3mO72Hd1LbRgzpj6oZvhk9X5On1Yvxia_MwLVb-BzL0_J8nCAc';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'Un1mwQxvEERfTtDXyttg-fMCg36ggDrdHlU-Jk-K5Ac';

webpush.setVapidDetails(
    'mailto:soporte@vertexerp.mx',
    publicVapidKey,
    privateVapidKey
);

export async function sendPushNotification(userId: string, title: string, body: string, url: string = '/dashboard') {
    try {
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId }
        });

        const notifications = subscriptions.map(sub => {
            const pushConfig = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            return webpush.sendNotification(
                pushConfig,
                JSON.stringify({ title, body, url })
            ).catch((err: any) => {
                if (err.statusCode === 404 || err.statusCode === 410) {
                    // Suscripción expirada o inválida, eliminarla
                    return prisma.pushSubscription.delete({ where: { id: sub.id } });
                }
                console.error('Error enviando push individual:', err);
            });
        });

        await Promise.all(notifications);
    } catch (error) {
        console.error('Error en sendPushNotification:', error);
    }
}

export async function notifyByRole(role: string, title: string, body: string, url: string = '/dashboard') {
    try {
        const users = await prisma.user.findMany({
            where: { role: role as UserRole },
            select: { id: true }
        });

        const notifications = users.map(user => sendPushNotification(user.id, title, body, url));
        await Promise.all(notifications);
    } catch (error) {
        console.error('Error en notifyByRole:', error);
    }
}
