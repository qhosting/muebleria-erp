
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/reasignar-cobradores
 * 
 * Re-asigna cobradorAsignadoId a todos los clientes activos sin cobrador.
 * Cruza el campo "vendedor" del cliente (que viene de cNombreAgente de Contpaqi)
 * con el nombre del usuario cobrador, O si se proporciona un mapeo manual.
 *
 * Body:
 * {
 *   force?: boolean,          // default false - si true, re-asigna aunque ya tengan cobrador
 *   mapeo?: [                 // opcional: mapeo manual nombre_agente → cobradorId
 *     { agente: "JUAN", cobradorId: "clxxxxxxx" }
 *   ]
 * }
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== 'admin') {
            return NextResponse.json({ error: 'Solo administradores pueden ejecutar esta operación' }, { status: 403 });
        }

        const body = await req.json().catch(() => ({}));
        const force = body.force === true;
        const mapeoManual: { agente: string; cobradorId: string }[] = body.mapeo || [];

        // 1. Cargar todos los cobradores activos
        const cobradores = await prisma.user.findMany({
            where: { isActive: true, role: { in: ['cobrador', 'gestor_cobranza'] } },
            select: { id: true, codigoGestor: true, name: true }
        });

        // Construir mapa por codigoGestor y por nombre
        const gestorPorCodigo = new Map<string, string>(); // codigoGestor → userId
        const gestorPorNombre = new Map<string, string>(); // nombre.toLowerCase() → userId
        for (const u of cobradores) {
            if (u.codigoGestor) gestorPorCodigo.set(u.codigoGestor.trim().toLowerCase(), u.id);
            if (u.name) gestorPorNombre.set(u.name.trim().toLowerCase(), u.id);
        }

        // Agregar mapeo manual si se proporcionó
        for (const m of mapeoManual) {
            gestorPorNombre.set(m.agente.trim().toLowerCase(), m.cobradorId);
        }

        // 2. Obtener clientes a procesar
        const whereClientes: any = { statusCuenta: 'activo' };
        if (!force) whereClientes.cobradorAsignadoId = null;

        const clientes = await prisma.cliente.findMany({
            where: whereClientes,
            select: { id: true, codigoCliente: true, vendedor: true, cobradorAsignadoId: true }
        });

        console.log(`📋 [Re-asignar] ${clientes.length} clientes a procesar (force=${force})`);

        let actualizados = 0;
        let noEncontrados = 0;
        const noEncontradasList: string[] = [];

        for (const cliente of clientes) {
            const vendedorNombre = (cliente.vendedor || '').trim().toLowerCase();
            let cobradorId: string | undefined;

            // Buscar por nombre exacto primero
            if (vendedorNombre) {
                cobradorId = gestorPorNombre.get(vendedorNombre);
                // Si no encontró por nombre exacto, buscar por código
                if (!cobradorId) {
                    cobradorId = gestorPorCodigo.get(vendedorNombre);
                }
            }

            if (cobradorId) {
                await prisma.cliente.update({
                    where: { id: cliente.id },
                    data: { cobradorAsignadoId: cobradorId }
                });
                actualizados++;
            } else {
                noEncontrados++;
                if (noEncontradasList.length < 10 && vendedorNombre) {
                    noEncontradasList.push(vendedorNombre);
                }
            }
        }

        // Valores únicos de agentes no encontrados
        const agentesUnicos = [...new Set(noEncontradasList)];

        return NextResponse.json({
            success: true,
            message: `Re-asignación completada. ${actualizados} clientes actualizados, ${noEncontrados} sin coincidencia.`,
            actualizados,
            noEncontrados,
            totalProcesados: clientes.length,
            cobradores: cobradores.map(c => ({ nombre: c.name, codigoGestor: c.codigoGestor, id: c.id })),
            agentesNoEncontrados: agentesUnicos
        });

    } catch (error: any) {
        console.error('Error en re-asignación de cobradores:', error);
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
    }
}

/**
 * GET /api/admin/reasignar-cobradores
 * Diagnóstico: cuántos clientes no tienen cobrador asignado y qué agentes hay
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== 'admin') {
            return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
        }

        const [totalActivos, sinCobrador] = await Promise.all([
            prisma.cliente.count({ where: { statusCuenta: 'activo' } }),
            prisma.cliente.count({ where: { statusCuenta: 'activo', cobradorAsignadoId: null } }),
        ]);

        // Agentes únicos en clientes sin cobrador
        const sinCobradorConAgente = await prisma.cliente.findMany({
            where: { statusCuenta: 'activo', cobradorAsignadoId: null, vendedor: { not: null } },
            select: { vendedor: true },
            distinct: ['vendedor'],
            take: 50
        });

        const cobradores = await prisma.user.findMany({
            where: { isActive: true, role: { in: ['cobrador', 'gestor_cobranza'] } },
            select: { id: true, codigoGestor: true, name: true }
        });

        return NextResponse.json({
            resumen: {
                totalClientesActivos: totalActivos,
                sinCobradorAsignado: sinCobrador,
                conCobrador: totalActivos - sinCobrador,
            },
            agentesEnClientesSinCobrador: sinCobradorConAgente.map(c => c.vendedor).filter(Boolean),
            cobradores: cobradores.map(c => ({ nombre: c.name, codigoGestor: c.codigoGestor, id: c.id })),
            instrucciones: 'Ejecuta POST con body {} para re-asignar por nombre, o con mapeo: [{agente, cobradorId}] para asignación manual'
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
