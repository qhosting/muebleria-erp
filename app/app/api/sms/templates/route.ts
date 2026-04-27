
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const templates = await prisma.smsTemplate.findMany({
      orderBy: { updatedAt: 'desc' }
    });
    
    // Si no hay plantillas, crear las básicas del ejemplo legacy
    if (templates.length === 0) {
      const basicTemplates = [
        {
          campaignKey: 'inicio_semana',
          name: 'Recordatorio Inicio de Semana',
          templateText: 'Hola [nombre], te recordamos que tu pago esta proximo. ¡Que tengas excelente semana!',
          description: 'Se envia los lunes a toda la cartera activa.'
        },
        {
          campaignKey: 'no_pagos',
          name: 'Recordatorio a No Pagos',
          templateText: 'Estimado [nombre], no recibimos tu pago. Favor de regularizar tu cuenta hoy mismo para evitar cargos.',
          description: 'Se envia a clientes que no realizaron su pago en el periodo.'
        }
      ];

      for (const t of basicTemplates) {
        await prisma.smsTemplate.create({ data: t });
      }
      return NextResponse.json(await prisma.smsTemplate.findMany());
    }

    return NextResponse.json(templates);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching templates' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { campaignKey, name, templateText, description } = await req.json();

    const template = await prisma.smsTemplate.upsert({
      where: { campaignKey },
      update: { name, templateText, description },
      create: { campaignKey, name, templateText, description }
    });

    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json({ error: 'Error saving template' }, { status: 500 });
  }
}
