import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export interface RutaCobranzaPeriodo {
  id: number;
  periodicidad: 'SEMANAL' | 'QUINCENAL' | 'CATORCENAL' | 'MENSUAL' | string;
  fecha_inicio_periodo: string; // YYYY-MM-DD
  fecha_fin_periodo: string;   // YYYY-MM-DD
  status: 'ACTIVO' | 'INACTIVO';
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDefaultRutas(): RutaCobranzaPeriodo[] {
  const now = new Date();
  
  // Semanal: Sábado anterior a Viernes próximo
  const day = now.getDay(); // 0: Dom, 1: Lun, ..., 6: Sab
  const daysSinceSaturday = (day + 1) % 7;
  const startSemanal = new Date(now);
  startSemanal.setDate(now.getDate() - daysSinceSaturday);
  const endSemanal = new Date(startSemanal);
  endSemanal.setDate(startSemanal.getDate() + 6);

  // Quincenal: 1 al 15, o 16 al fin de mes
  const isSecondHalf = now.getDate() > 15;
  const startQuincenal = new Date(now.getFullYear(), now.getMonth(), isSecondHalf ? 16 : 1);
  const endQuincenal = isSecondHalf 
    ? new Date(now.getFullYear(), now.getMonth() + 1, 0)
    : new Date(now.getFullYear(), now.getMonth(), 15);

  // Catorcenal: 14 días
  const startCatorcenal = new Date(startSemanal);
  const endCatorcenal = new Date(startSemanal);
  endCatorcenal.setDate(startCatorcenal.getDate() + 13);

  // Mensual: 1 al fin de mes
  const startMensual = new Date(now.getFullYear(), now.getMonth(), 1);
  const endMensual = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return [
    {
      id: 1,
      periodicidad: 'SEMANAL',
      fecha_inicio_periodo: formatDate(startSemanal),
      fecha_fin_periodo: formatDate(endSemanal),
      status: 'ACTIVO'
    },
    {
      id: 2,
      periodicidad: 'QUINCENAL',
      fecha_inicio_periodo: formatDate(startQuincenal),
      fecha_fin_periodo: formatDate(endQuincenal),
      status: 'ACTIVO'
    },
    {
      id: 3,
      periodicidad: 'CATORCENAL',
      fecha_inicio_periodo: formatDate(startCatorcenal),
      fecha_fin_periodo: formatDate(endCatorcenal),
      status: 'INACTIVO'
    },
    {
      id: 4,
      periodicidad: 'MENSUAL',
      fecha_inicio_periodo: formatDate(startMensual),
      fecha_fin_periodo: formatDate(endMensual),
      status: 'INACTIVO'
    }
  ];
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Intentar leer desde tabla cobranzaruta si existe
    try {
      const rawRutas: any[] = await prisma.$queryRawUnsafe(`
        SELECT id, periodicidad, 
               TO_CHAR(fecha_inicio_periodo, 'YYYY-MM-DD') as fecha_inicio_periodo, 
               TO_CHAR(fecha_fin_periodo, 'YYYY-MM-DD') as fecha_fin_periodo, 
               status 
        FROM cobranzaruta 
        ORDER BY id ASC
      `);

      if (rawRutas && rawRutas.length > 0) {
        return NextResponse.json(rawRutas.map(r => ({
          id: Number(r.id),
          periodicidad: String(r.periodicidad).toUpperCase(),
          fecha_inicio_periodo: r.fecha_inicio_periodo || '',
          fecha_fin_periodo: r.fecha_fin_periodo || '',
          status: String(r.status).toUpperCase() === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO'
        })));
      }
    } catch {
      // Ignorar si la tabla directa no existe en postgres
    }

    // 2. Intentar leer desde configuracion_sistema
    const config = await prisma.configuracionSistema.findUnique({
      where: { clave: 'sms_rutas' }
    });

    if (config && config.cobranza && Array.isArray((config.cobranza as any)?.rutas)) {
      return NextResponse.json((config.cobranza as any).rutas);
    }

    // 3. Fallback inteligente a periodos actuales por defecto
    const defaults = getDefaultRutas();
    return NextResponse.json(defaults);
  } catch (error) {
    console.error('Error fetching SMS rutas:', error);
    return NextResponse.json(getDefaultRutas());
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session?.user as any)?.role;
  const allowedRoles = ['admin', 'gestor_cobranza', 'direccion', 'cobrador', 'reporte_cobranza'];
  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json({ error: 'Permiso denegado' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, periodicidad, fecha_inicio_periodo, fecha_fin_periodo, status } = body;

    if (!id || !periodicidad || !fecha_inicio_periodo || !fecha_fin_periodo) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const normStatus = status === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO';

    // 1. Intentar actualizar en tabla cobranzaruta si existe
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE cobranzaruta 
        SET status = $1, 
            fecha_inicio_periodo = $2::date, 
            fecha_fin_periodo = $3::date 
        WHERE id = $4
      `, normStatus, fecha_inicio_periodo, fecha_fin_periodo, Number(id));
    } catch {
      // Ignorar si la tabla física no existe
    }

    // 2. Guardar en configuracion_sistema para persistencia garantizada
    const existing = await prisma.configuracionSistema.findUnique({
      where: { clave: 'sms_rutas' }
    });

    let currentList: RutaCobranzaPeriodo[] = getDefaultRutas();
    if (existing && Array.isArray((existing.cobranza as any)?.rutas)) {
      currentList = (existing.cobranza as any).rutas;
    }

    const updatedList = currentList.map(r => {
      if (r.id === Number(id) || r.periodicidad.toUpperCase() === periodicidad.toUpperCase()) {
        return {
          ...r,
          fecha_inicio_periodo,
          fecha_fin_periodo,
          status: normStatus as 'ACTIVO' | 'INACTIVO'
        };
      }
      return r;
    });

    await prisma.configuracionSistema.upsert({
      where: { clave: 'sms_rutas' },
      update: {
        cobranza: { rutas: updatedList }
      },
      create: {
        clave: 'sms_rutas',
        empresa: {},
        cobranza: { rutas: updatedList },
        notificaciones: {},
        sincronizacion: {},
        impresion: {}
      }
    });

    return NextResponse.json({
      success: true,
      ruta: { id, periodicidad, fecha_inicio_periodo, fecha_fin_periodo, status: normStatus }
    });
  } catch (error: any) {
    console.error('Error saving ruta:', error);
    return NextResponse.json({ error: error.message || 'Error al guardar la ruta' }, { status: 500 });
  }
}
