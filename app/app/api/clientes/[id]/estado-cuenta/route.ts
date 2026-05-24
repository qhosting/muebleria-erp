import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getContpaqiService } from '@/lib/contpaqi-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: params.id }
    });

    if (!cliente || !cliente.codigoCliente) {
      return NextResponse.json({ error: 'Cliente no encontrado o sin código de Contpaqi' }, { status: 404 });
    }

    // --- DETECTAR EMPRESA POR PREFIJO DE CÓDIGO ---
    let empresaId = cliente.sucursalId || undefined;
    if (cliente.codigoCliente) {
      const prefix = cliente.codigoCliente.match(/^[a-zA-Z]+/)?.[0]?.toUpperCase();
      if (prefix && ['DP', 'DQ'].includes(prefix)) {
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
          empresaId = prefix;
        }
      }
    }

    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    // 1. Verificar si hay caché válida en la base de datos (tiempo de expiración: 15 minutos)
    const cache = cliente.estadoCuentaCache as any;
    if (!forceRefresh && cache && cache.cachedAt) {
      const cachedTime = new Date(cache.cachedAt).getTime();
      const now = Date.now();
      const maxAge = 15 * 60 * 1000; // 15 minutos en milisegundos
      if (now - cachedTime < maxAge) {
        console.log(`⚡ [Cache DB] Usando estado de cuenta en caché para cliente ${cliente.codigoCliente}`);
        return NextResponse.json(cache.data);
      }
    }

    const service = await getContpaqiService(prisma, empresaId);
    
    // 2. Obtener saldos generales (Estado de cuenta) en vivo
    const estadoCuenta = await service.getClienteEstadoCuenta(cliente.codigoCliente);

    if (!estadoCuenta) {
      return NextResponse.json({ error: 'No se pudo obtener el estado de cuenta de Contpaqi. Verifique la conexión con el servidor.' }, { status: 404 });
    }

    // 3. Obtener movimientos/documentos en detalle en vivo
    let documentos = [];
    try {
      documentos = await service.getClientDocumentos(cliente.codigoCliente);
    } catch (docError) {
      console.warn(`No se pudieron obtener documentos detallados para cliente ${cliente.codigoCliente}:`, docError);
    }

    const resultData = {
      cliente: {
        codigo: cliente.codigoCliente,
        nombre: cliente.nombreCompleto,
        saldoLocal: Number(cliente.saldoActual || 0)
      },
      estadoCuenta: {
        ...estadoCuenta,
        documentos: Array.isArray(documentos) ? documentos : []
      }
    };

    // 4. Guardar en base de datos de forma persistente (caché)
    try {
      await prisma.cliente.update({
        where: { id: cliente.id },
        data: {
          estadoCuentaCache: {
            cachedAt: new Date().toISOString(),
            data: resultData
          }
        }
      });
    } catch (cacheErr) {
      console.error('Error al guardar caché de estado de cuenta en DB:', cacheErr);
    }

    return NextResponse.json(resultData);
  } catch (error: any) {
    console.error('Error al obtener estado de cuenta de Contpaqi:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
