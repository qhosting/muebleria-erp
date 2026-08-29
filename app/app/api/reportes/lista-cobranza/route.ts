import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        if (!await checkPermission(userRole, 'reportes')) {
            return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const cobradorId = searchParams.get('cobradorId');
        const semanaStr = searchParams.get('semana');
        const anioStr = searchParams.get('anio');

        if (!cobradorId || !semanaStr) {
            return NextResponse.json({ error: 'Faltan parámetros requeridos: cobradorId y semana' }, { status: 400 });
        }

        const semana = parseInt(semanaStr);
        const anio = anioStr ? parseInt(anioStr) : new Date().getFullYear();

        // 1. Obtener calendario para determinar periodicidades activas en esa semana
        const calendario = await prisma.calendarioCobranza.findUnique({
            where: {
                anio_semana: {
                    anio: anio,
                    semana: semana
                }
            }
        });

        const periodicidadesPermitidas = (calendario?.periodicidadesActivas as string[]) || ['diario', 'semanal', 'catorcenal', 'quincenal', 'mensual'];

        // 2. Obtener clientes asignados que cumplan con la periodicidad activa y estén activos
        const clientes = await prisma.cliente.findMany({
            where: {
                cobradorAsignadoId: cobradorId,
                statusCuenta: 'activo',
                periodicidad: {
                    in: periodicidadesPermitidas as any
                }
            },
            include: {
                cobradorAsignado: {
                    select: {
                        id: true,
                        name: true,
                        codigoGestor: true
                    }
                }
            },
            orderBy: {
                diaPago: 'asc'
            }
        });

        // 3. Serializar montos decimales para JSON
        const clientesSerializados = clientes.map((c: any) => {
            const montoPagoNum = parseFloat(c.montoPago.toString());
            const saldoVencidoNum = c.saldoVencido ? parseFloat(c.saldoVencido.toString()) : 0;
            const pvNum = montoPagoNum > 0 && saldoVencidoNum > 0
                ? Math.round(saldoVencidoNum / montoPagoNum)
                : (c.diasVencidos > 0 ? Math.ceil(c.diasVencidos / 7) : 0);

            return {
                ...c,
                montoPago: montoPagoNum,
                saldoActual: parseFloat(c.saldoActual.toString()),
                saldoVencido: saldoVencidoNum,
                diasVencidos: c.diasVencidos || 0,
                pv: pvNum,
                gestor: c.cobradorAsignado?.codigoGestor || c.cobradorAsignado?.name || '-',
                importe1: c.importe1 ? parseFloat(c.importe1.toString()) : null,
                importe2: c.importe2 ? parseFloat(c.importe2.toString()) : null,
                importe3: c.importe3 ? parseFloat(c.importe3.toString()) : null,
                importe4: c.importe4 ? parseFloat(c.importe4.toString()) : null,
                ingresosMensuales: c.ingresosMensuales ? parseFloat(c.ingresosMensuales.toString()) : null,
                limiteCredito: c.limiteCredito ? parseFloat(c.limiteCredito.toString()) : null,
            };
        });

        return NextResponse.json({
            calendario,
            clientes: clientesSerializados
        });
    } catch (error: any) {
        console.error('Error en reporte de lista de cobranza:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
