
import webpush from 'web-push';
import { prisma } from './db';

// En un entorno real, estas llaves se generan una vez y se guardan en .env
// publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
// privateVapidKey = process.env.VAPID_PRIVATE_KEY

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BEl62i4nZSk9zjP_96S1x-N2p-4wYc_487F0X43hC9vJ5V-GRoA5S_R7Z5_89523';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'your-private-key-here';

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
            ).catch(err => {
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
            where: { role },
            select: { id: true }
        });

        const notifications = users.map(user => sendPushNotification(user.id, title, body, url));
        await Promise.all(notifications);
    } catch (error) {
        console.error('Error en notifyByRole:', error);
    }
}
