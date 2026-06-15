import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { StatusCuenta, Periodicidad } from '@prisma/client';
import { RecomprasService } from '@/lib/recompras-service';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions) as any;
        if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'gestor_cobranza' && session.user?.role !== 'gestor')) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const { clientes, enableCleanup = false } = body;

        let createdCount = 0;
        let failedCount = 0;

        // Recolectar códigos DQ/DP importados (para comparar después)
        const codigosImportados = new Set<string>();

        // ── Fase 1: Obtener códigos DQ/DP activos ANTES del upsert (solo si cleanup activo) ──
        let codigosActivosEnBD: string[] = [];
        if (enableCleanup) {
            const clientesActivosDQDP = await prisma.cliente.findMany({
                where: {
                    statusCuenta: StatusCuenta.activo,
                    OR: [
                        { codigoCliente: { startsWith: 'DQ' } },
                        { codigoCliente: { startsWith: 'DP' } },
                    ],
                },
                select: { codigoCliente: true },
            });
            codigosActivosEnBD = clientesActivosDQDP.map(c => c.codigoCliente);
        }
        
        // ── Fase 1.5: Obtener mapeo de códigos de gestores a IDs de usuarios ──
        const codigosGestoresUnicos = Array.from(new Set(
            clientes.map((c: any) => c.codigoGestor?.toString().trim()).filter(Boolean)
        )) as string[];
        
        const gestores = await prisma.user.findMany({
            where: {
                codigoGestor: { in: codigosGestoresUnicos },
                isActive: true
            },
            select: { id: true, codigoGestor: true }
        });
        
        const gestorMap = new Map(gestores.map(g => [g.codigoGestor, g.id]));

        // ── Fase 2: Upsert de clientes importados ──
        for (const c of clientes) {
            try {
                const codigoCliente = c.codigoCliente?.toString().trim();
                if (!codigoCliente) {
                    failedCount++;
                    continue;
                }

                // Registrar código para la comparación posterior
                const codigoUpper = codigoCliente.toUpperCase();
                if (codigoUpper.startsWith('DQ') || codigoUpper.startsWith('DP')) {
                    codigosImportados.add(codigoCliente);
                }

                const data = {
                    nombreCompleto: c.nombreCompleto,
                    direccionCompleta: c.direccionCompleta,
                    telefono: c.telefono?.toString() || null,
                    fechaVenta: c.fechaVenta ? new Date(c.fechaVenta) : new Date(),
                    diaPago: String(c.diaPago || "1"),
                    montoPago: parseFloat(c.montoPago) || 0,
                    saldoActual: parseFloat(c.saldoActual) || 0,
                    periodicidad: (c.periodicidad as Periodicidad) || Periodicidad.semanal,
                    statusCuenta: StatusCuenta.activo,
                    descripcionProducto: c.descripcionProducto || "Importación Masiva",
                    importe1: parseFloat(c.importe1) || null,
                    importe2: parseFloat(c.importe2) || null,
                    importe3: parseFloat(c.importe3) || null,
                    importe4: parseFloat(c.importe4) || null,
                    diasVencidos: parseInt(c.diasVencidos) || 0,
                    saldoVencido: parseFloat(c.saldoVencido) || 0,
                    vendedor: c.vendedor || null,
                    // Asignar cobrador si se encontró el código
                    cobradorAsignadoId: c.codigoGestor ? (gestorMap.get(c.codigoGestor.toString().trim()) || null) : null,
                    // Al reimportar un cliente activo, limpiar fecha de inactivación si existía
                    fechaInactivacion: null,
                };

                await prisma.cliente.upsert({
                    where: { codigoCliente },
                    update: data,
                    create: {
                        ...data,
                        codigoCliente,
                    }
                });
                createdCount++;
            } catch (e) {
                console.error("Error creating/updating client:", e);
                failedCount++;
            }
        }

        // ── Fase 3: Depurar clientes DQ/DP que ya no aparecen en el archivo ──
        let deletedCount = 0;
        let deletedClientes: any[] = [];

        if (enableCleanup && codigosActivosEnBD.length > 0) {
            // Códigos que estaban activos en BD pero NO llegaron en el archivo
            const codigosAInactivar = codigosActivosEnBD.filter(
                codigo => !codigosImportados.has(codigo)
            );

            if (codigosAInactivar.length > 0) {
                // Obtener datos completos de los que se van a inactivar (para el reporte)
                const clientesAInactivar = await prisma.cliente.findMany({
                    where: {
                        codigoCliente: { in: codigosAInactivar },
                    },
                    include: {
                        cobradorAsignado: {
                            select: { name: true, codigoGestor: true },
                        },
                    },
                });

                const fechaInactivacion = new Date();

                // Inactivar en lote
                await prisma.cliente.updateMany({
                    where: {
                        codigoCliente: { in: codigosAInactivar },
                    },
                    data: {
                        statusCuenta: StatusCuenta.inactivo,
                        fechaInactivacion,
                    },
                });

                deletedCount = codigosAInactivar.length;
                deletedClientes = clientesAInactivar.map(c => ({
                    codigoCliente: c.codigoCliente,
                    nombreCompleto: c.nombreCompleto,
                    saldoActual: parseFloat(c.saldoActual.toString()),
                    montoPago: parseFloat(c.montoPago.toString()),
                    diasVencidos: c.diasVencidos,
                    saldoVencido: parseFloat(c.saldoVencido.toString()),
                    cobrador: c.cobradorAsignado?.name || null,
                    codigoGestor: c.cobradorAsignado?.codigoGestor || null,
                    fechaInactivacion: fechaInactivacion.toISOString(),
                }));

                // ── Crear leads de recompra para los clientes inactivados ──
                // Se ejecuta en paralelo sin bloquear la respuesta si alguno falla
                const leadsPromises = clientesAInactivar.map(c =>
                    RecomprasService.crearLeadPorLiquidacion(
                        c.id,
                        'Cuenta inactivada en importación masiva de clientes'
                    ).catch(err => {
                        console.warn(`[Recompras] No se pudo crear lead para ${c.codigoCliente}:`, err);
                    })
                );
                await Promise.allSettled(leadsPromises);
                console.log(`[Recompras] Leads creados para ${clientesAInactivar.length} clientes inactivados.`);
            }
        }

        return NextResponse.json({
            success: true,
            created: createdCount,
            failed: failedCount,
            deleted: deletedCount,
            deletedClientes,
        });

    } catch (error) {
        console.error('Error importing clients:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
