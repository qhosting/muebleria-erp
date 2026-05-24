
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getContpaqiService } from '@/lib/contpaqi-service';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { leadId } = body;

        if (!leadId) {
            return NextResponse.json({ error: 'Falta leadId' }, { status: 400 });
        }

        const lead = await prisma.lead.findUnique({
            where: { id: leadId }
        });

        if (!lead) {
            return NextResponse.json({ error: 'Lead no válido' }, { status: 404 });
        }

        // Obtener el código de cliente sin consultar obligatoriamente el catálogo local
        let codigoCliente = (lead.datosExtraidos as any)?.codigoCliente || null;
        let sucursalId = undefined;

        if (!codigoCliente && lead.clienteId) {
            // Fallback: Si no está en datosExtraidos pero hay clienteId, buscamos en catálogo local
            const cliente = await prisma.cliente.findUnique({
                where: { id: lead.clienteId }
            });
            if (cliente) {
                codigoCliente = cliente.codigoCliente;
                sucursalId = cliente.sucursalId || undefined;
            }
        }

        // Si aún no se encuentra, buscar por expresión regular en las notas
        if (!codigoCliente && lead.notas) {
            const match = lead.notas.match(/(DQ|DP)\d+/i);
            if (match) {
                codigoCliente = match[0].toUpperCase();
            }
        }

        if (!codigoCliente) {
            return NextResponse.json({ error: 'No se pudo determinar el código de cliente de Contpaqi' }, { status: 400 });
        }

        // --- DETECTAR EMPRESA POR PREFIJO DE CÓDIGO ---
        let empresaId = sucursalId;
        
        // Si el código de cliente tiene un prefijo identificador como 'DQ' o 'DP', lo usamos con prioridad
        if (codigoCliente) {
            const prefix = codigoCliente.match(/^[a-zA-Z]+/)?.[0]?.toUpperCase();
            if (prefix && ['DP', 'DQ'].includes(prefix)) {
                // Buscamos si hay una empresa configurada cuyo nombre o baseDatos coincida o empiece con ese prefijo
                const configRaw = await prisma.configuracionSistema.findUnique({ where: { clave: 'sistema' } });
                const empresas = (configRaw as any)?.contpaqi?.empresas || [];
                const matchedEmpresa = empresas.find((e: any) => 
                    e.nombre?.toUpperCase().startsWith(prefix) || 
                    e.baseDatos?.toUpperCase().startsWith(prefix) ||
                    e.id?.toUpperCase() === prefix
                );
                if (matchedEmpresa) {
                    empresaId = matchedEmpresa.id;
                } else {
                    // Si no está configurada explícitamente en la DB, forzamos el prefijo como alias directo
                    empresaId = prefix;
                }
            }
        }

        const service = await getContpaqiService(prisma, empresaId);
        const contpaqiCliente = await service.getCliente(codigoCliente);

        if (!contpaqiCliente) {
            return NextResponse.json({ error: 'No se encontró el cliente en Contpaqi' }, { status: 404 });
        }

        // --- NUEVA BÚSQUEDA DE CUENTA ACTIVA ---
        // Buscamos si el cliente ya tiene una cuenta activa en nuestro sistema (posible recompra ya realizada)
        // Buscamos por nombre aproximado para mayor seguridad
        const cuentasActivas = await prisma.cliente.findMany({
            where: {
                nombreCompleto: {
                    contains: lead.nombre,
                    mode: 'insensitive'
                },
                statusCuenta: 'activo',
                id: { not: lead.clienteId || '' } // Que no sea la misma cuenta liquidada
            },
            select: {
                id: true,
                codigoCliente: true,
                descripcionProducto: true,
                fechaVenta: true,
                saldoActual: true
            }
        });

        // Extraer clasificaciones
        const clasificaciones = {
            cNombreClasificacion1: contpaqiCliente.cNombreClasificacion1 || contpaqiCliente.cnombreclasificacion1 || 'N/A',
            cNombreClasificacion2: contpaqiCliente.cNombreClasificacion2 || contpaqiCliente.cnombreclasificacion2 || 'N/A',
            cNombreClasificacion3: contpaqiCliente.cNombreClasificacion3 || contpaqiCliente.cnombreclasificacion3 || 'N/A',
            cNombreClasificacion4: contpaqiCliente.cNombreClasificacion4 || contpaqiCliente.cnombreclasificacion4 || 'N/A',
            cNombreClasificacion5: contpaqiCliente.cNombreClasificacion5 || contpaqiCliente.cnombreclasificacion5 || 'N/A',
            cNombreClasificacion6: contpaqiCliente.cNombreClasificacion6 || contpaqiCliente.cnombreclasificacion6 || 'N/A',
        };

        return NextResponse.json({ 
            codigoCliente: cliente.codigoCliente,
            nombre: contpaqiCliente.cNombreCliente || contpaqiCliente.cnombrecliente,
            clasificaciones,
            recompraActiva: cuentasActivas.length > 0 ? cuentasActivas[0] : null
        });
    } catch (error: any) {
        console.error('Error al validar cliente en Contpaqi:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
