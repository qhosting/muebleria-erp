
// Configuración de versión de la aplicación
export const APP_VERSION = '2.0.0';
export const BUILD_DATE = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
export const BUILD_NUMBER = Date.now().toString().slice(-6); // Últimos 6 dígitos del timestamp

export const VERSION_INFO = {
  version: APP_VERSION,
  buildDate: BUILD_DATE,
  buildNumber: BUILD_NUMBER,
  fullVersion: `${APP_VERSION}.${BUILD_NUMBER}`,
  displayName: `v${APP_VERSION} Build ${BUILD_NUMBER}`
} as const;

export function getVersionInfo() {
  return VERSION_INFO;
}

// Para debugging - mostrar info de versión en consola
if (typeof window !== 'undefined') {
  console.log(`%c🏠 Mueblería La Económica PWA`, 
    'color: #0F172A; font-weight: bold; font-size: 14px');
  console.log(`%c📱 Versión: ${VERSION_INFO.displayName}`, 
    'color: #3B82F6; font-weight: bold');
  console.log(`%c📅 Build: ${VERSION_INFO.buildDate}`, 
    'color: #6B7280');
}
