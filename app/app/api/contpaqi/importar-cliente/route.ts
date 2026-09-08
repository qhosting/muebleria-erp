import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getContpaqiService } from '@/lib/contpaqi-service';
import { Periodicidad, ClasificacionCobranza, StatusCuenta } from '@prisma/client';

function parseDateSafely(val: any): Date {
    if (!val) return new Date();
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * GET: Buscar y previsualizar cliente en ContPAQi API sin guardar
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions) as any;
        if (!session || !['admin', 'gestor_cobranza', 'gestor', 'cobrador'].includes(session.user?.role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const codigoRaw = searchParams.get('codigo');
        if (!codigoRaw) {
            return NextResponse.json({ error: 'El código de cliente es obligatorio' }, { status: 400 });
        }

        const codigo = codigoRaw.trim().toUpperCase();
        let empresaId = searchParams.get('empresaId')?.trim();

        // Auto-detección de empresa por prefijo si no se especifica
        if (!empresaId) {
            if (codigo.startsWith('DQ')) empresaId = 'DQ';
            else if (codigo.startsWith('DP')) empresaId = 'DP';
        }

        const service = await getContpaqiService(prisma, empresaId);

        // 1. Consultar datos básicos en ContPAQi
        const contpaqiClient = await service.getCliente(codigo, empresaId);
        if (!contpaqiClient) {
            return NextResponse.json({
                encontrado: false,
                codigo,
                mensaje: `No se encontró ningún cliente con el código ${codigo} en ContPAQi (${empresaId || 'Default'}).`
            }, { status: 404 });
        }

        // 2. Consultar Estado de Cuenta en ContPAQi para saldo real y vencido
        let estadoCuenta: any = null;
        try {
            estadoCuenta = await service.getClienteEstadoCuenta(codigo, empresaId);
        } catch (e) {
            console.warn(`[ImportarCliente] No se pudo obtener estado de cuenta para ${codigo}:`, (e as Error).message);
        }

        // 3. Verificar si ya existe en la base de datos local
        const clienteLocal = await prisma.cliente.findUnique({
            where: { codigoCliente: codigo },
            include: {
                cobradorAsignado: {
                    select: { id: true, name: true, codigoGestor: true }
                }
            }
        });

        const saldoActual = estadoCuenta?.saldoActual !== undefined 
            ? parseFloat(estadoCuenta.saldoActual) 
            : (parseFloat(contpaqiClient.saldoActual) || 0);

        const saldoVencido = estadoCuenta?.saldoVencido !== undefined 
            ? parseFloat(estadoCuenta.saldoVencido) 
            : 0;

        const diasVencidos = estadoCuenta?.diasVencidos !== undefined 
            ? parseInt(estadoCuenta.diasVencidos) 
            : 0;

        return NextResponse.json({
            encontrado: true,
            codigo,
            empresa: contpaqiClient.empresa || empresaId || 'DP',
            yaExisteEnBd: !!clienteLocal,
            clienteLocal,
            preview: {
                codigoCliente: codigo,
                nombreCompleto: contpaqiClient.razonSocial || contpaqiClient.nombre || 'SIN NOMBRE',
                rfc: contpaqiClient.rfc || '',
                saldoActual,
                saldoVencido,
                diasVencidos,
                fechaUltimoMovimiento: estadoCuenta?.fechaUltimoMovimiento || null,
                telefono: contpaqiClient.telefono1 || contpaqiClient.telefono2 || null,
                direccion: contpaqiClient.direccion || null,
                vendedor: contpaqiClient.vendedor || null,
                clasificacion: contpaqiClient.clasificacion || null,
                estatus: contpaqiClient.estatus
            }
        });

    } catch (error: any) {
        console.error('[ImportarCliente GET] Error:', error);
        return NextResponse.json({ error: error.message || 'Error al consultar ContPAQi' }, { status: 500 });
    }
}

/**
 * POST: Importar o re-sincronizar cliente desde ContPAQi a la BD local
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions) as any;
        if (!session || !['admin', 'gestor_cobranza', 'gestor'].includes(session.user?.role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const codigoRaw = body.codigo;
        if (!codigoRaw) {
            return NextResponse.json({ error: 'El código de cliente es requerido' }, { status: 400 });
        }

        const codigo = codigoRaw.trim().toUpperCase();
        let empresaId = body.empresaId?.trim();

        if (!empresaId) {
            if (codigo.startsWith('DQ')) empresaId = 'DQ';
            else if (codigo.startsWith('DP')) empresaId = 'DP';
        }

        const service = await getContpaqiService(prisma, empresaId);

        // 1. Obtener de ContPAQi
        const contpaqiClient = await service.getCliente(codigo, empresaId);
        if (!contpaqiClient) {
            return NextResponse.json({
                error: `No se encontró el cliente ${codigo} en la API de ContPAQi (${empresaId || 'Default'})`
            }, { status: 404 });
        }

        // 2. Obtener estado de cuenta
        let estadoCuenta: any = null;
        try {
            estadoCuenta = await service.getClienteEstadoCuenta(codigo, empresaId);
        } catch (e) {
            console.warn(`[ImportarCliente POST] No se pudo obtener estado de cuenta para ${codigo}:`, (e as Error).message);
        }

        const saldoActual = estadoCuenta?.saldoActual !== undefined 
            ? parseFloat(estadoCuenta.saldoActual) 
            : (parseFloat(contpaqiClient.saldoActual) || 0);

        const saldoVencido = estadoCuenta?.saldoVencido !== undefined 
            ? parseFloat(estadoCuenta.saldoVencido) 
            : 0;

        const diasVencidos = estadoCuenta?.diasVencidos !== undefined 
            ? parseInt(estadoCuenta.diasVencidos) 
            : 0;

        const fechaVenta = estadoCuenta?.fechaUltimoMovimiento 
            ? parseDateSafely(estadoCuenta.fechaUltimoMovimiento) 
            : new Date();

        const periodicidadVal = (function() {
            const p = String(body.periodicidad || contpaqiClient.periodicidad || '').toLowerCase();
            if (p.includes('quin')) return Periodicidad.quincenal;
            if (p.includes('men')) return Periodicidad.mensual;
            return Periodicidad.semanal;
        })();

        const clasificacionCobranzaVal = (function() {
            const c = String(body.clasificacionCobranza || 'RUTA').toUpperCase();
            if (Object.values(ClasificacionCobranza).includes(c as any)) {
                return c as ClasificacionCobranza;
            }
            return ClasificacionCobranza.RUTA;
        })();

        const diaPagoVal = String(body.diaPago || contpaqiClient.diaPago || '1');
        const cobradorId = body.cobradorAsignadoId || null;
        const nombreCompleto = contpaqiClient.razonSocial || contpaqiClient.nombre || 'SIN NOMBRE';
        const direccionCompleta = contpaqiClient.direccion || 'Sin dirección registrada en ContPAQi';
        const telefono = contpaqiClient.telefono1 || contpaqiClient.telefono2 || body.telefono || null;

        // 3. Upsert en la base de datos
        const clienteGuardado = await prisma.cliente.upsert({
            where: { codigoCliente: codigo },
            update: {
                nombreCompleto,
                saldoActual,
                saldoVencido,
                diasVencidos,
                statusCuenta: StatusCuenta.activo,
                fechaInactivacion: null,
                ...(cobradorId ? { cobradorAsignadoId: cobradorId } : {}),
                ...(body.diaPago ? { diaPago: diaPagoVal } : {}),
                ...(body.periodicidad ? { periodicidad: periodicidadVal } : {}),
                ...(body.clasificacionCobranza ? { clasificacionCobranza: clasificacionCobranzaVal } : {}),
                ...(telefono ? { telefono } : {}),
                ...(contpaqiClient.direccion ? { direccionCompleta } : {})
            },
            create: {
                codigoCliente: codigo,
                nombreCompleto,
                fechaVenta,
                direccionCompleta,
                descripcionProducto: `Importado de ContPAQi (${empresaId || contpaqiClient.empresa || 'DP'})`,
                diaPago: diaPagoVal,
                piezas: 1,
                montoPago: parseFloat(body.montoPago || contpaqiClient.cuota || 0) || 0,
                periodicidad: periodicidadVal,
                saldoActual,
                saldoVencido,
                diasVencidos,
                statusCuenta: StatusCuenta.activo,
                clasificacionCobranza: clasificacionCobranzaVal,
                cobradorAsignadoId: cobradorId,
                telefono,
                vendedor: contpaqiClient.vendedor || null
            },
            include: {
                cobradorAsignado: {
                    select: { id: true, name: true, codigoGestor: true }
                }
            }
        });

        return NextResponse.json({
            success: true,
            message: `Cliente ${codigo} (${nombreCompleto}) importado y activado exitosamente en el ERP`,
            cliente: clienteGuardado
        });

    } catch (error: any) {
        console.error('[ImportarCliente POST] Error:', error);
        return NextResponse.json({ error: error.message || 'Error al importar cliente' }, { status: 500 });
    }
}
