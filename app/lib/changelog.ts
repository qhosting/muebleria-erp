
export interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    added?: string[];
    fixed?: string[];
    improved?: string[];
    removed?: string[];
  };
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.3.0",
    date: "25 Sep 2025",
    changes: {
      added: [
        "Sistema de control de versiones completo en toda la aplicación",
        "Banner automático de actualizaciones en el dashboard",
        "Dialog con información detallada de versión y changelog",
        "Información de versión visible en login y sidebar",
        "Sistema de tracking de última versión vista por el usuario",
        "Changelog integrado con historial de cambios"
      ],
      improved: [
        "Experiencia de usuario mejorada con información de actualizaciones",
        "Transparencia en las mejoras del sistema",
        "Mejor organización de información técnica"
      ]
    }
  },
  {
    version: "1.2.0", 
    date: "25 Sep 2025",
    changes: {
      fixed: [
        "Corregido problema donde el dashboard de clientes no cargaba información",
        "Solucionado error en el menú lateral que no se mostraba correctamente",
        "Reparada la conexión entre el DashboardLayout y el Sidebar"
      ],
      improved: [
        "Reinicializada la base de datos con datos de prueba limpia",
        "Agregados 200 clientes de ejemplo para testing",
        "Mejorada la navegación del menú según roles de usuario"
      ],
      added: [
        "Sistema de control de versiones integrado",
        "Banner de actualizaciones en el dashboard",
        "Información de versión visible en login y sidebar",
        "Dialog con detalles completos de la versión actual"
      ]
    }
  },
  {
    version: "1.1.0", 
    date: "24 Sep 2025",
    changes: {
      added: [
        "Sistema completo de gestión de clientes",
        "Panel de cobranza móvil para cobradores",
        "Reportes de morosidad y productividad",
        "Gestión de usuarios y roles",
        "API completa para sincronización offline",
        "Sistema de autenticación con NextAuth",
        "Base de datos PostgreSQL con Prisma"
      ]
    }
  }
];

export function getLatestVersion(): ChangelogEntry | undefined {
  return CHANGELOG[0];
}

export function getChangelogForVersion(version: string): ChangelogEntry | undefined {
  return CHANGELOG.find(entry => entry.version === version);
}
