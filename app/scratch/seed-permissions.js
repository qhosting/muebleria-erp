const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_PERMISSIONS = {
  direccion: ['clientes', 'cobranza', 'inventario', 'reportes', 'tesoreria', 'configuracion', 'ventas'],
  jefe_ventas: ['ventas'],
  vendedor: ['ventas'],
  gestor_cobranza: ['clientes', 'cobranza', 'inventario', 'reportes', 'tesoreria', 'configuracion', 'ventas'],
  reporte_cobranza: ['cobranza', 'reportes'],
  cobrador: ['clientes'],
};

async function main() {
  console.log('Iniciando carga de permisos por defecto en la base de datos...');
  
  const roles = Object.keys(DEFAULT_PERMISSIONS);
  const modulos = ['clientes', 'cobranza', 'inventario', 'reportes', 'tesoreria', 'configuracion', 'ventas'];
  
  let count = 0;
  for (const role of roles) {
    const allowed = DEFAULT_PERMISSIONS[role];
    for (const modulo of modulos) {
      const permitido = allowed.includes(modulo);
      
      // Usamos el mapping que definimos en Prisma
      await prisma.permisoRol.upsert({
        where: {
          role_modulo: {
            role: role,
            modulo: modulo
          }
        },
        update: {
          permitido
        },
        create: {
          role: role,
          modulo: modulo,
          permitido
        }
      });
      count++;
    }
  }
  
  console.log(`Se inicializaron/sincronizaron exitosamente ${count} registros de permisos.`);
}

main()
  .catch((e) => {
    console.error('Error durante la inicialización de permisos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
