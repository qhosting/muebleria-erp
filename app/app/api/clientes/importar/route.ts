import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { StatusCuenta, Periodicidad, ClasificacionCobranza } from '@prisma/client';
import { RecomprasService } from '@/lib/recompras-service';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions) as any;
        if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'gestor_cobranza' && session.user?.role !== 'gestor')) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const { clientes, enableCleanup = false, isWelcomeMode = false } = body;

        let createdCount = 0;
        let failedCount = 0;

        // Recolectar códigos DQ/DP importados (para comparar después)
        const codigosImportados = new Set<string>();


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

                // Si es modo bienvenida o viene marcado como VD, clasificar como VD (Verificación Domiciliaria)
                const clasificacion = (isWelcomeMode || c.clasificacionCobranza === 'VD')
                    ? ClasificacionCobranza.VD
                    : (c.clasificacionCobranza ? (c.clasificacionCobranza as ClasificacionCobranza) : undefined);

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
                    ...(clasificacion ? { clasificacionCobranza: clasificacion } : {}),
                };

                await prisma.cliente.upsert({
                    where: { codigoCliente },
                    update: data,
                    create: {
                        ...data,
                        codigoCliente,
                        clasificacionCobranza: clasificacion || ClasificacionCobranza.RUTA,
                    }
                });
                createdCount++;
            } catch (e) {
                console.error("Error creating/updating client:", e);
                failedCount++;
            }
        }

        // ── Fase 3: Depurar y eliminar clientes DQ/DP que ya no aparecen en el archivo maestro ──
        let deletedCount = 0;
        let deletedClientes: any[] = [];

        if (enableCleanup) {
            const tieneDQ = Array.from(codigosImportados).some(c => c.toUpperCase().startsWith('DQ'));
            const tieneDP = Array.from(codigosImportados).some(c => c.toUpperCase().startsWith('DP'));

            const prefixConditions: any[] = [];
            if (tieneDQ) prefixConditions.push({ codigoCliente: { startsWith: 'DQ' } });
            if (tieneDP) prefixConditions.push({ codigoCliente: { startsWith: 'DP' } });

            if (prefixConditions.length > 0) {
                // Obtener todos los clientes en BD de las carteras importadas (activos o inactivos)
                const clientesEnBD = await prisma.cliente.findMany({
                    where: {
                        OR: prefixConditions,
                    },
                    select: {
                        id: true,
                        codigoCliente: true,
                        nombreCompleto: true,
                        saldoActual: true,
                        montoPago: true,
                        diasVencidos: true,
                        saldoVencido: true,
                        cobradorAsignado: {
                            select: { name: true, codigoGestor: true },
                        },
                    },
                });

                // Clientes que están en BD pero NO llegaron en el archivo actual
                const clientesAEliminar = clientesEnBD.filter(
                    c => !codigosImportados.has(c.codigoCliente)
                );

                if (clientesAEliminar.length > 0) {
                    const idsAEliminar = clientesAEliminar.map(c => c.id);
                    const codigosAEliminar = clientesAEliminar.map(c => c.codigoCliente);

                    // 1. Crear leads de recompra antes de eliminar (para no perder el historial de oportunidad)
                    const leadsPromises = clientesAEliminar.map(c =>
                        RecomprasService.crearLeadPorLiquidacion(
                            c.id,
                            'Cuenta retirada de cartera en importación masiva'
                        ).catch(err => {
                            console.warn(`[Recompras] No se pudo crear lead para ${c.codigoCliente}:`, err);
                        })
                    );
                    await Promise.allSettled(leadsPromises);

                    // 2. Eliminar en cascada transaccional para evitar fallos de claves foráneas
                    await prisma.$transaction([
                        prisma.smsLog.deleteMany({ where: { clienteId: { in: idsAEliminar } } }),
                        prisma.avisoCobro.deleteMany({ where: { clienteId: { in: idsAEliminar } } }),
                        prisma.cuentaBancariaCliente.deleteMany({ where: { clienteId: { in: idsAEliminar } } }),
                        prisma.verificacionDomiciliaria.deleteMany({ where: { clienteId: { in: idsAEliminar } } }),
                        prisma.convenioPago.deleteMany({ where: { clienteId: { in: idsAEliminar } } }),
                        prisma.ticket.deleteMany({ where: { clienteId: { in: idsAEliminar } } }),
                        prisma.pago.deleteMany({ where: { clienteId: { in: idsAEliminar } } }),
                        prisma.motarario.deleteMany({ where: { clienteId: { in: idsAEliminar } } }),
                        prisma.movimientoBancario.updateMany({ where: { clienteId: { in: idsAEliminar } }, data: { clienteId: null } }),
                        prisma.movimientoBanorte0330253963.updateMany({ where: { clienteId: { in: idsAEliminar } }, data: { clienteId: null } }),
                        prisma.movimientoSantander22001022837.updateMany({ where: { clienteId: { in: idsAEliminar } }, data: { clienteId: null } }),
                        prisma.movimientoSantander65505732541.updateMany({ where: { clienteId: { in: idsAEliminar } }, data: { clienteId: null } }),
                        // Quitar de los detalles de cortes de cobranza para que no figuren en la lista de cobranza ni sin pago
                        prisma.corteCobranzaDetalle.deleteMany({
                            where: {
                                OR: [
                                    { clienteId: { in: idsAEliminar } },
                                    { codigoCliente: { in: codigosAEliminar } }
                                ]
                            }
                        }),
                        // Eliminar definitivamente los clientes
                        prisma.cliente.deleteMany({ where: { id: { in: idsAEliminar } } }),
                    ]);

                    const fechaEliminacion = new Date().toISOString();
                    deletedCount = clientesAEliminar.length;
                    deletedClientes = clientesAEliminar.map(c => ({
                        codigoCliente: c.codigoCliente,
                        nombreCompleto: c.nombreCompleto,
                        saldoActual: parseFloat(c.saldoActual.toString()),
                        montoPago: parseFloat(c.montoPago.toString()),
                        diasVencidos: c.diasVencidos,
                        saldoVencido: parseFloat(c.saldoVencido.toString()),
                        cobrador: c.cobradorAsignado?.name || null,
                        codigoGestor: c.cobradorAsignado?.codigoGestor || null,
                        fechaInactivacion: fechaEliminacion,
                        fechaEliminacion,
                    }));
                }
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
