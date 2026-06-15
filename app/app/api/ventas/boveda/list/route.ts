
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const curp = searchParams.get('curp');
        const codigo = searchParams.get('codigo');
        const folio = searchParams.get('folio');
        const search = searchParams.get('search');
        const mine = searchParams.get('mine') === 'true';
        const status = searchParams.get('status');

        const db = prisma as any;

        // Si se consulta un expediente específico por identificador único
        if (curp || codigo || folio) {
            const documentos = await db.documentoBoveda.findMany({
                where: {
                    OR: [
                        curp ? { clienteCurp: curp } : undefined,
                        codigo ? { codigoCliente: codigo } : undefined,
                        folio ? { folioContrato: folio } : undefined
                    ].filter(Boolean) as any
                },
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    validadoPor: {
                        select: {
                            name: true
                        }
                    }
                }
            });
            return NextResponse.json(documentos);
        }

        const userRole = ((session.user as any).role || '').toLowerCase();
        const isAdmin = ['admin', 'jefe_ventas', 'gestor_cobranza', 'administrador', 'direccion'].includes(userRole);

        // Para búsquedas o listados generales:
        // 1. Determinar si se restringe al vendedor actual
        const restrictToSeller = !isAdmin || mine;
        const sellerId = (session.user as any).id;

        // 2. Construir filtros para la consulta de DocumentoBoveda
        const bovedaWhere: any = {};
        if (restrictToSeller) {
            bovedaWhere.vendedorId = sellerId;
        }
        if (status) {
            bovedaWhere.status = status;
        }
        if (search) {
            bovedaWhere.OR = [
                { nombreCliente: { contains: search, mode: 'insensitive' } },
                { clienteCurp: { contains: search, mode: 'insensitive' } },
                { codigoCliente: { contains: search, mode: 'insensitive' } },
                { folioContrato: { contains: search, mode: 'insensitive' } },
                { telefono: { contains: search, mode: 'insensitive' } }
            ];
        }

        // Consultamos DocumentoBoveda sin un límite tan pequeño como 50 (usamos 5000)
        const documentos = await db.documentoBoveda.findMany({
            where: bovedaWhere,
            orderBy: { createdAt: 'desc' },
            take: 5000
        });

        // 3. Consultar la tabla Cliente para incluir clientes del sistema
        // Solo si no se ha filtrado por estado de documento (o si se quiere buscar de forma amplia)
        // ya que los clientes de la tabla Cliente no tienen estado de documento en sí
        const clienteWhere: any = {
            statusCuenta: 'activo'
        };
        if (restrictToSeller) {
            clienteWhere.vendedorId = sellerId;
        }
        if (search) {
            clienteWhere.OR = [
                { nombreCompleto: { contains: search, mode: 'insensitive' } },
                { curp: { contains: search, mode: 'insensitive' } },
                { codigoCliente: { contains: search, mode: 'insensitive' } },
                { numContrato: { contains: search, mode: 'insensitive' } },
                { telefono: { contains: search, mode: 'insensitive' } }
            ];
        }

        // Obtenemos clientes que coincidan
        const clientes = await db.cliente.findMany({
            where: clienteWhere,
            orderBy: { createdAt: 'desc' },
            take: 200 // Limitar para optimizar velocidad
        });

        // 4. Agrupar y unificar resultados por expediente (CURP o Código o Contrato)
        const expedientesMap = new Map<string, any>();

        // Primero agregamos los expedientes que ya tienen documentos (ordenados por fecha de documento más reciente)
        documentos.forEach((doc: any) => {
            const key = doc.clienteCurp || doc.codigoCliente || doc.folioContrato || doc.nombreCliente;
            if (!key) return;

            const normalizedKey = key.trim().toUpperCase();
            if (!expedientesMap.has(normalizedKey)) {
                expedientesMap.set(normalizedKey, {
                    nombreCompleto: doc.nombreCliente || 'Sin Nombre',
                    curp: doc.clienteCurp || '',
                    codigoCliente: doc.codigoCliente || '',
                    folioContrato: doc.folioContrato || '',
                    telefono: doc.telefono || '',
                    recent: true,
                    hasDocuments: true,
                    lastDocCreatedAt: doc.createdAt
                });
            }
        });

        // Luego agregamos los clientes de la base de datos que coincidan con la búsqueda
        // (y que no tengan documentos aún)
        clientes.forEach((cli: any) => {
            const key = cli.curp || cli.codigoCliente || cli.numContrato || cli.nombreCompleto;
            if (!key) return;

            const normalizedKey = key.trim().toUpperCase();
            if (!expedientesMap.has(normalizedKey)) {
                // Si el usuario explícitamente filtró por estatus de documento (ej. PENDIENTE),
                // no debemos mostrar clientes que no tienen ningún documento subido.
                if (status) return;

                expedientesMap.set(normalizedKey, {
                    nombreCompleto: cli.nombreCompleto || 'Sin Nombre',
                    curp: cli.curp || '',
                    codigoCliente: cli.codigoCliente || '',
                    folioContrato: cli.numContrato || '',
                    telefono: cli.telefono || '',
                    recent: false,
                    hasDocuments: false,
                    lastDocCreatedAt: new Date(0)
                });
            } else {
                // Si ya existe por documento, enriquecemos la información si es necesario
                const existing = expedientesMap.get(normalizedKey);
                existing.nombreCompleto = existing.nombreCompleto || cli.nombreCompleto;
                existing.curp = existing.curp || cli.curp;
                existing.codigoCliente = existing.codigoCliente || cli.codigoCliente;
                existing.folioContrato = existing.folioContrato || cli.numContrato;
                existing.telefono = existing.telefono || cli.telefono;
                existing.hasDocuments = true;
            }
        });

        // Convertir mapa a array
        let expedientes = Array.from(expedientesMap.values());

        // Ordenar expedientes:
        // Los expedientes con actividad reciente de documentos primero, luego los clientes sin documentos
        expedientes.sort((a, b) => {
            if (a.hasDocuments && b.hasDocuments) {
                return new Date(b.lastDocCreatedAt).getTime() - new Date(a.lastDocCreatedAt).getTime();
            }
            if (a.hasDocuments) return -1;
            if (b.hasDocuments) return 1;
            return 0;
        });

        // Si no es una búsqueda con texto, limitamos el tamaño de la respuesta para optimizar la carga
        if (!search) {
            expedientes = expedientes.slice(0, 150);
        }

        return NextResponse.json(expedientes);

    } catch (error: any) {
        console.error('Error en boveda list:', error);
        return NextResponse.json({ 
            error: 'Error al listar documentos',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
