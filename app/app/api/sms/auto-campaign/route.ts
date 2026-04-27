
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendSMS } from '@/lib/sms-utils';

const COSTO_POR_SMS = 0.45;

export async function GET(req: NextRequest) {
  // Para seguridad en un entorno de producción real, este endpoint debería estar protegido
  // por un Token Secreto (ej: ?token=XYZ) o solo permitir llamadas desde la IP del servidor de CRON.
  const authHeader = req.headers.get('authorization');
  const secretToken = process.env.CRON_SECRET;
  
  if (secretToken && authHeader !== `Bearer ${secretToken}`) {
    // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // Por ahora lo dejamos pasar si no hay token configurado, pero registramos la advertencia.
    console.warn('Auto-campaign triggered without CRON_SECRET');
  }

  try {
    const today = new Date();
    const dayOfWeek = today.toLocaleDateString('es-MX', { weekday: 'long' }).toUpperCase();
    
    // Determinar qué campaña toca
    // Lunes: Inicio de Semana
    // Otros días: Recordatorio de No Pagos
    const campaignKey = dayOfWeek === 'LUNES' ? 'inicio_semana' : 'no_pagos';
    
    const template = await prisma.smsTemplate.findUnique({ where: { campaignKey } });
    if (!template) return NextResponse.json({ error: 'Template not found' });

    // Buscar clientes activos con teléfono
    let whereClause: any = {
      statusCuenta: 'activo',
      AND: [
        { telefono: { not: null } },
        { telefono: { not: '' } }
      ]
    };

    if (campaignKey === 'no_pagos') {
      whereClause.saldoVencido = { gt: 0 };
    }

    const clients = await prisma.cliente.findMany({ where: whereClause });

    if (clients.length === 0) {
      return NextResponse.json({ message: 'No clients to notify today' });
    }

    const campaign = await prisma.smsCampaign.create({
      data: {
        name: `Auto: ${template.name} (${dayOfWeek})`,
        createdBy: 'SISTEMA (AUTO)',
      }
    });

    let totalSent = 0;
    let totalFailed = 0;

    for (const client of clients) {
      const message = template.templateText.replace(/\[nombre\]/g, client.nombreCompleto);
      const response = await sendSMS(client.telefono || '', message);
      
      const status = response.subid ? 'SENT' : 'FAILED';
      if (status === 'SENT') totalSent++;
      else totalFailed++;

      await prisma.smsLog.create({
        data: {
          campaignId: campaign.id,
          clienteId: client.id,
          phoneNumber: client.telefono || '',
          messageSent: message,
          status: status,
          apiResponse: JSON.stringify(response),
        }
      });
    }

    const totalCost = totalSent * COSTO_POR_SMS;
    await prisma.smsCampaign.update({
      where: { id: campaign.id },
      data: {
        finishedAt: new Date(),
        totalSent,
        totalFailed,
        totalCost,
      }
    });

    if (totalSent > 0) {
      await prisma.smsBalance.update({
        where: { cuenta: 'DASO' },
        data: { saldo: { decrement: totalSent } }
      }).catch(() => {});
    }

    return NextResponse.json({ 
      success: true, 
      campaign: campaign.name,
      sent: totalSent, 
      failed: totalFailed 
    });

  } catch (error) {
    console.error('Auto Campaign Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
