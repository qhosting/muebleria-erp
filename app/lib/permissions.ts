import { prisma } from './db';

export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin: ['clientes', 'cobranza', 'inventario', 'reportes', 'tesoreria', 'configuracion', 'ventas'],
  gestor_cobranza: ['clientes', 'cobranza', 'inventario', 'reportes', 'tesoreria', 'configuracion', 'ventas'],
  reporte_cobranza: ['cobranza', 'reportes'],
  cobrador: ['clientes'],
  vendedor: ['ventas'],
  jefe_ventas: ['ventas'],
  direccion: ['clientes', 'cobranza', 'inventario', 'reportes', 'tesoreria', 'configuracion', 'ventas'],
};

export async function checkPermission(userRole: string, modulo: string): Promise<boolean> {
  // admin siempre tiene acceso a todo
  if (userRole === 'admin') return true;

  try {
    const db = prisma as any;
    const perm = await db.permisoRol.findUnique({
      where: {
        role_modulo: {
          role: userRole as any,
          modulo
        }
      }
    });

    if (perm) {
      return perm.permitido;
    }
  } catch (error) {
    console.error(`Error fetching dynamic permission for role ${userRole} and module ${modulo}:`, error);
  }

  // Fallback to static defaults
  const allowedModules = DEFAULT_PERMISSIONS[userRole] || [];
  return allowedModules.includes(modulo);
}
