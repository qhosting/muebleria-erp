
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';

export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const userRole = (session?.user as any)?.role;
        const currentUserId = (session?.user as any)?.id;

        if (!session || !await checkPermission(userRole, 'ventas')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { id, status } = await request.json();

        if (!id || !status) {
            return NextResponse.json({ error: 'ID y Status son requeridos' }, { status: 400 });
        }

        const solicitud = await prisma.solicitudCredito.findUnique({
            where: { id },
            include: { vendedor: true }
        });

        if (!solicitud) {
            return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
        }

        // Si se aprueba la solicitud, formalizar la creación del Cliente en una transacción atómica
        let nuevoClienteId: string | null = null;

        await prisma.$transaction(async (tx) => {
            await tx.solicitudCredito.update({
                where: { id },
                data: { status }
            });

            if (status === 'APROBADA') {
                // Generar código de cliente único si no viene asignado de Contpaqi
                const codigoCliente = solicitud.contpaqiCodigo?.trim() || `CLI-${id.substring(0, 6).toUpperCase()}`;
                
                // Verificar si ya existe un cliente con ese código
                let clienteExistente = await tx.cliente.findUnique({
                    where: { codigoCliente }
                });

                const plazo = solicitud.plazoSemanas && solicitud.plazoSemanas > 0 ? solicitud.plazoSemanas : 24;
                const saldo = solicitud.montoSolicitado ? Number(solicitud.montoSolicitado) : 0;
                const montoPagoCalculado = saldo > 0 ? Math.ceil(saldo / plazo) : 0;

                const tipoPropiedadParsed = solicitud.tipoPropiedad === 'RENTADA' ? 'RENTA' 
                    : solicitud.tipoPropiedad === 'FAMILIAR' ? 'FAMILIAR' 
                    : 'PROPIA';

                if (!clienteExistente) {
                    const nuevoCliente = await tx.cliente.create({
                        data: {
                            codigoCliente,
                            fechaVenta: new Date(),
                            nombreCompleto: solicitud.nombreCompleto,
                            telefono: solicitud.telefono,
                            curp: solicitud.curp || null,
                            direccionCompleta: solicitud.direccion || 'Domicilio por verificar',
                            descripcionProducto: solicitud.productoInteres || 'Crédito Autorizado',
                            diaPago: '6', // Sábado por defecto en ruta
                            montoPago: montoPagoCalculado,
                            periodicidad: 'semanal',
                            saldoActual: saldo,
                            statusCuenta: 'activo',
                            statusAprobacion: 'AUTORIZADO',
                            tipoPropiedad: tipoPropiedadParsed as any,
                            scoreBuro: solicitud.scoreBuro || 0,
                            profesion: solicitud.profesion || null,
                            vendedorId: solicitud.vendedorId || currentUserId,
                            autorizadoPorId: currentUserId,
                            observaciones: solicitud.nombreAval 
                                ? `Aval: ${solicitud.nombreAval} (Tel: ${solicitud.telefonoAval || 'N/A'})` 
                                : `Solicitud aprobada el ${new Date().toLocaleDateString('es-MX')}`
                        }
                    });
                    nuevoClienteId = nuevoCliente.id;
                } else {
                    nuevoClienteId = clienteExistente.id;
                    await tx.cliente.update({
                        where: { id: clienteExistente.id },
                        data: {
                            statusAprobacion: 'AUTORIZADO',
                            autorizadoPorId: currentUserId
                        }
                    });
                }

                // Vincular documentos en Bóveda a este cliente
                await tx.documentoBoveda.updateMany({
                    where: {
                        OR: [
                            { folioContrato: id },
                            { clienteCurp: solicitud.curp },
                            { telefono: solicitud.telefono }
                        ]
                    },
                    data: {
                        codigoCliente,
                        status: 'VALIDADO',
                        validadoPorId: currentUserId,
                        fechaValidacion: new Date()
                    }
                });

                // Si se especificó producto, descontar del inventario principal
                if (solicitud.productoInteres) {
                    const productoMatch = await tx.producto.findFirst({
                        where: {
                            OR: [
                                { nombre: { contains: solicitud.productoInteres, mode: 'insensitive' } },
                                { codigo: { equals: solicitud.productoInteres, mode: 'insensitive' } }
                            ],
                            isActive: true
                        }
                    });

                    if (productoMatch) {
                        const sucursalPrincipal = await tx.sucursal.findFirst({
                            where: { isActive: true }
                        });

                        if (sucursalPrincipal) {
                            const stockRecord = await tx.stock.findUnique({
                                where: {
                                    productoId_sucursalId: {
                                        productoId: productoMatch.id,
                                        sucursalId: sucursalPrincipal.id
                                    }
                                }
                            });

                            if (stockRecord && stockRecord.cantidad > 0) {
                                await tx.stock.update({
                                    where: { id: stockRecord.id },
                                    data: { cantidad: { decrement: 1 } }
                                });

                                await tx.movimientoInventario.create({
                                    data: {
                                        productoId: productoMatch.id,
                                        tipoMovimiento: 'venta',
                                        cantidad: 1,
                                        sucursalOrigenId: sucursalPrincipal.id,
                                        motivo: `Venta crédito formalizado - ${codigoCliente}`,
                                        referencia: `SOL-${id.slice(0, 8)}`,
                                        usuarioId: currentUserId
                                    }
                                });
                            }
                        }
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            solicitudId: id,
            status,
            clienteId: nuevoClienteId,
            message: status === 'APROBADA' 
                ? 'Solicitud aprobada y cliente formalizado exitosamente en el sistema.' 
                : `Solicitud actualizada a ${status}.`
        });

    } catch (error: any) {
        console.error('Error al actualizar solicitud:', error);
        return NextResponse.json({ 
            error: 'Error al actualizar solicitud',
            details: error.message 
        }, { status: 500 });
    }
}

