
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendSMS } from '@/lib/sms-utils';

const COSTO_POR_SMS = 0.45; // MXN estimado

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = session.user.role;
  const userId = session.user.id;

  try {
    const { campaignKey, clients: selectedClients, templateText } = await req.json();

    if (!campaignKey || !templateText) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Obtener la plantilla (o usar el texto enviado)
    const template = await prisma.smsTemplate.findUnique({
      where: { campaignKey }
    });

    const campaignName = template?.name || `Campaña ${campaignKey}`;

    // 2. Crear el log de la campaña
    const campaign = await prisma.smsCampaign.create({
      data: {
        name: campaignName,
        createdBy: session.user.name,
      }
    });

    let totalSent = 0;
    let totalFailed = 0;

    // 3. Procesar envíos
    // Nota: En una aplicación real con miles de clientes, esto debería ser un Background Job (BullMQ, Inngest, etc.)
    // Aquí lo hacemos secuencial o en pequeños lotes para seguir la lógica del usuario.
    
    for (const client of selectedClients) {
      // Reemplazar placeholders
      const message = templateText.replace(/\[nombre\]/g, client.nombreCompleto);
      
      const response = await sendSMS(client.telefono, message);
      
      const status = response.subid ? 'SENT' : 'FAILED';
      if (status === 'SENT') totalSent++;
      else totalFailed++;

      // Guardar log individual
      await prisma.smsLog.create({
        data: {
          campaignId: campaign.id,
          clienteId: client.id,
          phoneNumber: client.telefono,
          messageSent: message,
          status: status,
          apiResponse: JSON.stringify(response),
        }
      });
    }

    // 4. Actualizar resumen de campaña
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

    // 5. Actualizar saldo local (si existe)
    if (totalSent > 0) {
      await prisma.smsBalance.update({
        where: { cuenta: 'DASO' },
        data: {
          saldo: { decrement: totalSent }
        }
      }).catch(() => {
        // Si no existe la cuenta DASO en balance, lo ignoramos o creamos
        console.warn('SmsBalance account "DASO" not found');
      });
    }

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      sent: totalSent,
      failed: totalFailed,
      cost: totalCost
    });

  } catch (error) {
    console.error('Campaign Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const campaigns = await prisma.smsCampaign.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20,
    });
    return NextResponse.json(campaigns);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching campaigns' }, { status: 500 });
  }
}
