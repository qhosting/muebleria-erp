import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendSMS } from '@/lib/sms-utils';
import { normalizarDiaSemana } from '@/lib/corte-cej-utils';
import { obtenerInfoCalendarioCobranza, getDiasCicloHastaHoy, DIAS_COBRANZA_CICLO } from '@/lib/calendario-cobranza-utils';

const COSTO_POR_SMS = 0.45; // MXN estimado

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  const allowedRoles = ['admin', 'gestor_cobranza', 'direccion', 'cobrador', 'reporte_cobranza'];
  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json({ error: 'Permisos insuficientes para lanzar campañas SMS' }, { status: 403 });
  }

  try {
    const body = await req.json();
    let { campaignKey, clients: selectedClients, templateText, diaCobro } = body;

    if (!campaignKey) {
      return NextResponse.json({ error: 'Falta el parámetro campaignKey' }, { status: 400 });
    }

    // 1. Obtener plantilla si no se proporcionó templateText
    const template = await prisma.smsTemplate.findUnique({
      where: { campaignKey }
    });

    if (!templateText) {
      templateText = template?.templateText || '';
    }

    if (!templateText) {
      return NextResponse.json({ error: 'No se encontró texto para la plantilla del mensaje' }, { status: 400 });
    }

    // 2. Si no se enviaron clientes explícitos, resolver automáticamente según la campaña y el calendario
    if (!selectedClients || selectedClients.length === 0) {
      const calInfo = await obtenerInfoCalendarioCobranza(prisma);

      const whereClause: any = {
        statusCuenta: 'activo',
        clasificacionCobranza: 'RUTA', // Solo cuentas asignadas a RUTA
        saldoActual: { gt: 0 },
        AND: [
          { telefono: { not: null } },
          { telefono: { not: '' } }
        ]
      };

      if (calInfo.periodicidadesActivas.length > 0) {
        whereClause.periodicidad = { in: calInfo.periodicidadesActivas as any };
      }

      if (campaignKey === 'no_pagos') {
        whereClause.OR = [
          { saldoVencido: { gt: 0 } },
          { diasVencidos: { gt: 0 } }
        ];
      }

      const foundClients = await prisma.cliente.findMany({
        where: whereClause,
        select: {
          id: true,
          codigoCliente: true,
          nombreCompleto: true,
          telefono: true,
          diaPago: true,
          saldoVencido: true,
          saldoActual: true,
        },
        take: 10000
      });

      // Filtrar por día:
      // Para 'inicio_semana': toda la semana oficial (Sábado a Viernes)
      // Para 'no_pagos': acumulado desde Sábado hasta hoy
      let diasPermitidos: string[];
      if (campaignKey.startsWith('inicio_semana')) {
        if (!diaCobro || diaCobro === 'TODOS') {
          diasPermitidos = [...DIAS_COBRANZA_CICLO];
        } else {
          diasPermitidos = [normalizarDiaSemana(diaCobro)];
        }
      } else {
        if (!diaCobro || diaCobro === 'TODOS') {
          diasPermitidos = getDiasCicloHastaHoy();
        } else {
          diasPermitidos = [normalizarDiaSemana(diaCobro)];
        }
      }

      let finalClients = foundClients.filter(c => diasPermitidos.includes(normalizarDiaSemana(c.diaPago)));

      // Excluir clientes que ya pagaron en la semana de cobranza actual
      if (campaignKey === 'no_pagos' && finalClients.length > 0) {
        const clientIds = finalClients.map(c => c.id);
        const clientCodes = finalClients.map(c => c.codigoCliente);

        const pagosSemana = await prisma.pago.findMany({
          where: {
            clienteId: { in: clientIds },
            fechaPago: {
              gte: calInfo.fechaInicio,
              lte: calInfo.fechaFin
            },
            monto: { gt: 0 }
          },
          select: { clienteId: true }
        }).catch(() => []);

        const clienteIdsConPago = new Set<string>(pagosSemana.map(p => p.clienteId));

        try {
          const ticketsSemana = await prisma.ticket.findMany({
            where: {
              clienteId: { in: clientIds },
              fecha: {
                gte: calInfo.fechaInicio,
                lte: calInfo.fechaFin
              },
              conciliado: true
            },
            select: { clienteId: true }
          });
          ticketsSemana.forEach(t => { if (t.clienteId) clienteIdsConPago.add(t.clienteId); });
        } catch {}

        try {
          const corteActivo = await prisma.corteCobranza.findFirst({
            where: {
              anio: calInfo.anio,
              semana: calInfo.semana
            },
            include: {
              detalles: {
                where: {
                  codigoCliente: { in: clientCodes },
                  pagoReal: { gt: 0 }
                },
                select: { clienteId: true, codigoCliente: true }
              }
            }
          });
          if (corteActivo?.detalles) {
            const codeToIdMap = new Map(finalClients.map(c => [c.codigoCliente, c.id]));
            corteActivo.detalles.forEach(d => {
              if (d.clienteId) clienteIdsConPago.add(d.clienteId);
              const foundId = codeToIdMap.get(d.codigoCliente);
              if (foundId) clienteIdsConPago.add(foundId);
            });
          }
        } catch {}

        finalClients = finalClients.filter(c => !clienteIdsConPago.has(c.id));
      }

      selectedClients = finalClients.filter(c => {
        const digits = (c.telefono || '').replace(/\D/g, '');
        return digits.length >= 10;
      });
    }

    if (!selectedClients || selectedClients.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No se encontraron destinatarios con teléfono válido para enviar la campaña' 
      }, { status: 400 });
    }

    const campaignName = template?.name || `Campaña ${campaignKey}` + (diaCobro && diaCobro !== 'TODOS' ? ` (${diaCobro})` : '');

    // 3. Crear el log de la campaña
    const campaign = await prisma.smsCampaign.create({
      data: {
        name: campaignName,
        createdBy: session?.user?.name || (session?.user as any)?.email || 'Sistema',
      }
    });

    let totalSent = 0;
    let totalFailed = 0;

    // 4. Procesar envíos
    for (const client of selectedClients) {
      if (!client.telefono) {
        totalFailed++;
        continue;
      }

      const message = templateText.replace(/\[nombre\]/g, client.nombreCompleto || 'Cliente');
      
      try {
        const response = await sendSMS(client.telefono, message);
        const isSent = Boolean(response.subid || (!response.error && response.code === '0'));

        if (isSent) {
          totalSent++;
        } else {
          totalFailed++;
        }

        // Guardar log individual
        await prisma.smsLog.create({
          data: {
            campaignId: campaign.id,
            clienteId: client.id || null,
            phoneNumber: client.telefono,
            messageSent: message,
            status: isSent ? 'SENT' : 'FAILED',
            apiResponse: JSON.stringify(response),
          }
        }).catch(e => console.warn('Error saving sms log:', e));
      } catch (err: any) {
        totalFailed++;
        await prisma.smsLog.create({
          data: {
            campaignId: campaign.id,
            clienteId: client.id || null,
            phoneNumber: client.telefono,
            messageSent: message,
            status: 'FAILED',
            apiResponse: JSON.stringify({ error: err?.message || 'Error en envío' }),
          }
        }).catch(() => {});
      }
    }

    // 5. Actualizar resumen de campaña
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

    // 6. Actualizar saldo local (si existe cuenta DASO)
    if (totalSent > 0) {
      await prisma.smsBalance.update({
        where: { cuenta: 'DASO' },
        data: {
          saldo: { decrement: totalSent }
        }
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      name: campaignName,
      sent: totalSent,
      failed: totalFailed,
      cost: totalCost,
      totalRecipients: selectedClients.length
    });

  } catch (error: any) {
    console.error('Campaign Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
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
