import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DEFAULT_PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const myPermissionsOnly = searchParams.get('my') === 'true';
    const userRole = (session.user as any).role;

    const db = prisma as any;

    if (myPermissionsOnly) {
      // Retornar un objeto llave-valor con los permisos del rol actual
      const permissionsMap: Record<string, boolean> = {};
      const modulos = ['clientes', 'cobranza', 'inventario', 'reportes', 'tesoreria', 'configuracion', 'ventas'];
      
      // Inicializar con fallback estático
      const defaults = DEFAULT_PERMISSIONS[userRole] || [];
      modulos.forEach(mod => {
        permissionsMap[mod] = userRole === 'admin' ? true : defaults.includes(mod);
      });

      // Si no es admin (admin tiene acceso a todo), intentar enriquecer con base de datos
      if (userRole !== 'admin') {
        const dbPerms = await db.permisoRol.findMany({
          where: { role: userRole }
        });
        dbPerms.forEach((p: any) => {
          permissionsMap[p.modulo] = p.permitido;
        });
      }

      return NextResponse.json(permissionsMap);
    }

    // El resto es solo para administradores
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    // Obtener la matriz completa desde la base de datos
    const dbPerms = await db.permisoRol.findMany();
    
    // Formatear la matriz con fallback a los defaults estáticos
    const rolesList = ['gestor_cobranza', 'reporte_cobranza', 'cobrador', 'vendedor', 'jefe_ventas', 'direccion'];
    const modulosList = ['clientes', 'cobranza', 'inventario', 'reportes', 'tesoreria', 'configuracion', 'ventas'];
    
    const matrix: any[] = [];
    
    rolesList.forEach(role => {
      modulosList.forEach(modulo => {
        const dbMatch = dbPerms.find((p: any) => p.role === role && p.modulo === modulo);
        const defaults = DEFAULT_PERMISSIONS[role] || [];
        const permitido = dbMatch ? dbMatch.permitido : defaults.includes(modulo);
        
        matrix.push({
          role,
          modulo,
          permitido
        });
      });
    });

    return NextResponse.json(matrix);
  } catch (error: any) {
    console.error('Error en GET /api/configuracion/permisos:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const body = await request.json();
    const { permissions } = body; // Array de objetos { role, modulo, permitido }

    if (!permissions || !Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Datos de entrada inválidos' }, { status: 400 });
    }

    const db = prisma as any;

    // Realizar los upserts en lote
    const operations = permissions.map((p: any) => {
      return db.permisoRol.upsert({
        where: {
          role_modulo: {
            role: p.role,
            modulo: p.modulo
          }
        },
        update: {
          permitido: p.permitido
        },
        create: {
          role: p.role,
          modulo: p.modulo,
          permitido: p.permitido
        }
      });
    });

    await Promise.all(operations);

    return NextResponse.json({ success: true, message: 'Permisos de roles actualizados exitosamente' });
  } catch (error: any) {
    console.error('Error en POST /api/configuracion/permisos:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}
