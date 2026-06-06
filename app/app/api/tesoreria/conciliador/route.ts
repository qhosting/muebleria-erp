import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // 1. Obtener Tickets no conciliados
        const ticketsPendientes = await prisma.ticket.findMany({
            where: { conciliado: false },
            include: {
                cliente: { 
                    select: { 
                        id: true,
                        nombreCompleto: true, 
                        codigoCliente: true,
                        // @ts-ignore
                        cuentasBancarias: true 
                    } 
                } as any,
                gestor: { select: { name: true } },
            },
            orderBy: { creadoEn: 'desc' },
            take: 100
        });

        // 2. Obtener Movimientos Bancarios no conciliados
        const movimientosPendientes = await prisma.movimientoBancario.findMany({
            where: { ticketId: null },
            orderBy: { fechaOperacion: 'desc' },
            take: 100
        });

        // 3. Obtener Catálogo de Cuentas para búsqueda inversa
        const cuentasConocidas = await (prisma as any).cuentaBancariaCliente.findMany({
            include: { cliente: { select: { id: true, nombreCompleto: true, codigoCliente: true } } }
        });

        // 4. Algoritmo de Sugerencia Inteligente (Scoring)
        const sugerencias = [];
        const movimientosDisponibles = [...movimientosPendientes];

        // Función auxiliar para normalizar cadenas (remueve acentos, mayúsculas, etc.)
        const normalizarTexto = (text: string) => {
            if (!text) return "";
            return text
                .toUpperCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .trim();
        };

        for (const ticket of ticketsPendientes) {
            let bestMatch: any = null;
            let bestPriority = 10;
            let razon = "";

            const monto = Number(ticket.monto);
            const contrato = (ticket.cliente?.codigoCliente || "").toUpperCase();
            const normalizedContrato = contrato.replace(/[^A-Z0-9]/g, "");
            
            const nombre = normalizarTexto(ticket.cliente?.nombreCompleto || "");
            const nombreSubstr = nombre.substring(0, 15);
            
            const cuentaTicket = ticket.cuentaOrigen ? ticket.cuentaOrigen.trim() : null;
            const refTicket = (ticket.referencia || "").replace(/^0+/, "").trim().toUpperCase();
            const folioTicket = (ticket.folio || "").replace(/^0+/, "").trim().toUpperCase();
            const rastreoTicket = ticket.claveRastreo ? ticket.claveRastreo.trim().toUpperCase() : null;

            for (const mov of movimientosDisponibles) {
                // Solo sugerimos si el monto coincide exactamente
                if (Number(mov.abono) !== monto) continue;

                const concepto = (mov.concepto || "").toUpperCase();
                const descripcion = (mov.descripcionDetallada || "").toUpperCase();
                const general = (mov.descripcionGeneral || "").toUpperCase();
                const dataPool = `${concepto} ${descripcion} ${general}`;
                const dataPoolNormalized = normalizarTexto(dataPool);

                let currentPriority = 8; // Coincidencia de monto (base)
                let currentRazon = "Monto exacto (Prioridad 8)";

                // A. Prioridad 0: Coincidencia por Clave de Rastreo (idéntica y única)
                const rastreoMov = mov.claveRastreo ? mov.claveRastreo.trim().toUpperCase() : null;
                if (rastreoTicket && rastreoMov && rastreoTicket === rastreoMov) {
                    currentPriority = 0;
                    currentRazon = "Clave de Rastreo idéntica (Prioridad 0)";
                }
                // B. Prioridad 1: Búsqueda por Cuenta Bancaria Histórica (Inteligencia)
                else {
                    const matchCuentaDirecta = cuentasConocidas.find((c: any) => 
                        c.clienteId === ticket.clienteId && (
                            (mov.clabeEmisor && c.clabe === mov.clabeEmisor) || 
                            (mov.cuentaEmisor && c.cuenta === mov.cuentaEmisor)
                        )
                    );
                    
                    const matchCuentaPool = cuentasConocidas.find((c: any) => 
                        c.clienteId === ticket.clienteId && (
                            (c.clabe && dataPool.includes(c.clabe)) || 
                            (c.cuenta && dataPool.includes(c.cuenta))
                        )
                    );

                    if (matchCuentaDirecta || matchCuentaPool) {
                        currentPriority = 1;
                        currentRazon = "Cuenta Bancaria Conocida del Cliente (Prioridad 1)";
                    } 
                    // C. Prioridad 2: Búsqueda por Código de Contrato (Regex y Alfanumérico Normalizado)
                    else {
                        const contractMatch = dataPool.match(/[A-Z]{2}\d{4,}/);
                        const normalizedDataPool = dataPool.replace(/[^A-Z0-9]/g, "");
                        const contractInPool = normalizedContrato && normalizedDataPool.includes(normalizedContrato);
                        
                        if ((contractMatch && contractMatch[0] === contrato) || contractInPool) {
                            currentPriority = 2;
                            currentRazon = "Código de Contrato en Concepto (Prioridad 2)";
                        } 
                        // D. Prioridad 3: Búsqueda por Referencia o Folio (sin ceros a la izquierda)
                        else {
                            const refMov = (mov.referencia || "").replace(/^0+/, "").trim().toUpperCase();
                            const matchReferencia = (refMov && refTicket && refMov === refTicket) ||
                                                    (refMov && folioTicket && refMov === folioTicket);
                            
                            if (matchReferencia) {
                                currentPriority = 3;
                                currentRazon = "Referencia o Folio coincide (Prioridad 3)";
                            }
                            // E. Prioridad 4: Búsqueda por Nombre (Mínimo 15 caracteres, sin acentos)
                            else if (nombreSubstr && dataPoolNormalized.includes(nombreSubstr)) {
                                currentPriority = 4;
                                currentRazon = "Nombre del Cliente detectado (Prioridad 4)";
                            }
                            // F. Prioridad 5: Búsqueda por CLABE en Ticket vs Concepto
                            else if (cuentaTicket && dataPool.includes(cuentaTicket)) {
                                currentPriority = 5;
                                currentRazon = "CLABE del Ticket coincide con Banco (Prioridad 5)";
                            }
                        }
                    }
                }

                if (currentPriority < bestPriority) {
                    bestPriority = currentPriority;
                    bestMatch = mov;
                    razon = currentRazon;
                }
            }

            if (bestMatch && bestPriority <= 8) {
                sugerencias.push({
                    ticket,
                    movimiento: bestMatch,
                    prioridad: bestPriority,
                    razon: razon
                });

                // Remover para no duplicar sugerencias en este batch
                const idx = movimientosDisponibles.findIndex(m => m.id === bestMatch.id);
                if (idx > -1) movimientosDisponibles.splice(idx, 1);
            }
        }

        return NextResponse.json({
            tickets: ticketsPendientes,
            movimientos: movimientosDisponibles,
            sugerencias,
            totalCuentasConocidas: cuentasConocidas.length
        });

    } catch (error) {
        console.error('Error al cargar datos del conciliador:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

// Para ejecutar un Emparejamiento Manual y APRENDIZAJE
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const body = await request.json();
        const { ticketId, movimientoId } = body;

        const ticket: any = await prisma.ticket.findUnique({ 
            where: { id: ticketId },
            include: { cliente: true }
        });
        const movimiento: any = await prisma.movimientoBancario.findUnique({ where: { id: movimientoId } });

        if (!ticket || !movimiento) return NextResponse.json({ error: 'Datos no encontrados' }, { status: 404 });

        // Intentar extraer CLABE/Cuenta del movimiento para el "Catálogo Inteligente"
        const dataPool = `${movimiento.concepto} ${movimiento.descripcionDetallada} ${movimiento.descripcionGeneral}`.toUpperCase();
        const clabeMatch = dataPool.match(/\d{18}/); // CLABE standard
        const cuentaMatch = dataPool.match(/\d{10,11}/); // Cuenta standard

        const operations: any[] = [
            prisma.ticket.update({
                where: { id: ticketId },
                data: { conciliado: true }
            }),
            prisma.movimientoBancario.update({
                where: { id: movimientoId },
                data: { 
                    ticketId: ticketId, 
                    clienteId: ticket.clienteId,
                    fechaIdentificado: new Date(),
                    clabeEmisor: clabeMatch ? clabeMatch[0] : (movimiento.clabeEmisor || null),
                    cuentaEmisor: cuentaMatch ? cuentaMatch[0] : (movimiento.cuentaEmisor || null)
                } as any
            })
        ];

        // Si detectamos una nueva CLABE para este cliente, la guardamos/actualizamos
        if (ticket.clienteId && (clabeMatch || cuentaMatch)) {
            const clabe = clabeMatch ? clabeMatch[0] : null;
            if (clabe) {
                operations.push((prisma as any).cuentaBancariaCliente.upsert({
                    where: { clabe: clabe },
                    update: { 
                        clienteId: ticket.clienteId, 
                        nombreTitular: ticket.cliente?.nombreCompleto 
                    },
                    create: {
                        clabe: clabe,
                        clienteId: ticket.clienteId,
                        nombreTitular: ticket.cliente?.nombreCompleto,
                        banco: movimiento.bancoOrigen
                    }
                }));
            }
        }

        await prisma.$transaction(operations);

        return NextResponse.json({ success: true, message: 'Conciliación y aprendizaje exitosos' });
    } catch (error) {
        console.error('Error al conciliar:', error);
        return NextResponse.json({ error: 'Error al forzar conciliación' }, { status: 500 });
    }
}
