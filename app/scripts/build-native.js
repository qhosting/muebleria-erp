const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ajuste de rutas basándose en que el script está en app/scripts/
// La carpeta de la aplicación Next.js está en app/app/
const rootDir = path.join(__dirname, '../');
const appRouterDir = path.join(rootDir, 'app');

console.log('🚀 Iniciando build nativo optimizado...');
console.log('📁 Directorio Root:', rootDir);

// Carpetas exclusivas de servidor que causan fallas de exportación estática
const foldersToHide = [
    { dir: path.join(appRouterDir, 'api'), backup: path.join(appRouterDir, '_api_backup'), name: 'API' },
    { dir: path.join(appRouterDir, 'dashboard'), backup: path.join(appRouterDir, '_dashboard_backup'), name: 'Dashboard' },
    { dir: path.join(appRouterDir, 'importar'), backup: path.join(appRouterDir, '_importar_backup'), name: 'Importar' },
    { dir: path.join(appRouterDir, 'portal'), backup: path.join(appRouterDir, '_portal_backup'), name: 'Portal' },
    { dir: path.join(appRouterDir, 'debug-session'), backup: path.join(appRouterDir, '_debug-session_backup'), name: 'Debug Session' },
    { dir: path.join(appRouterDir, 'test-auth'), backup: path.join(appRouterDir, '_test-auth_backup'), name: 'Test Auth' },
    { dir: path.join(appRouterDir, 'public'), backup: path.join(appRouterDir, '_public_backup'), name: 'Public Receipts' }
];

const ocultadas = [];

try {
    // 1. "Ocultar" las carpetas usando robocopy /MOVE
    for (const folder of foldersToHide) {
        if (fs.existsSync(folder.dir)) {
            console.log(`📦 Ocultando carpeta ${folder.name} temporalmente para evitar errores de exportación estática...`);
            try {
                execSync(`robocopy "${folder.dir}" "${folder.backup}" /MOVE /S /R:1 /W:1`, { stdio: 'ignore' });
                ocultadas.push(folder);
            } catch (e) {
                // Robocopy devuelve códigos > 0 que execSync interpreta como error, pero a menudo significa éxito
                if (fs.existsSync(folder.backup)) {
                    ocultadas.push(folder);
                } else {
                    console.error(`⚠️ Advertencia: No se pudo mover la carpeta ${folder.name}.`);
                }
            }
        }
    }

    // 1.5 Ocultar force-dynamic para permitir exportación estática en archivos raíz
    const filesToModify = [
        path.join(appRouterDir, 'page.tsx'),
        path.join(appRouterDir, 'login', 'page.tsx'),
        path.join(appRouterDir, 'cobrador-app', 'page.tsx')
    ];

    filesToModify.forEach(file => {
        if (fs.existsSync(file)) {
            let content = fs.readFileSync(file, 'utf8');
            if (content.includes("export const dynamic = 'force-dynamic';")) {
                content = content.replace(/export const dynamic = 'force-dynamic';/g, "// export const dynamic = 'force-dynamic';");
                fs.writeFileSync(file, content);
            }
        }
    });

    // 2. Ejecutar el build de Next.js
    console.log('🏗️  Compilando Next.js (Static Export)...');

    execSync('npx next build', {
        stdio: 'inherit',
        shell: true,
        env: {
            ...process.env,
            BUILD_TARGET: 'capacitor',
            NEXT_PUBLIC_APP_MODE: 'cobrador',
            NEXT_TELEMETRY_DISABLED: '1'
        }
    });

    console.log('✅ Build de Next.js completado.');

} catch (error) {
    console.error('❌ Error durante el build:', error.message);
    process.exit(1);
} finally {
    // 3. Restaurar las carpetas siempre en orden inverso
    for (const folder of [...ocultadas].reverse()) {
        if (fs.existsSync(folder.backup)) {
            console.log(`🔙 Restaurando carpeta ${folder.name} para desarrollo/servidor...`);
            try {
                execSync(`robocopy "${folder.backup}" "${folder.dir}" /MOVE /S /R:1 /W:1`, { stdio: 'ignore' });
            } catch (e) {
                if (!fs.existsSync(folder.dir)) {
                    console.error(`⚠️ Error al restaurar ${folder.name}. Por favor, renombra ${folder.backup} a ${folder.name} manualmente.`);
                }
            }
        }
    }

    // 4. Restaurar force-dynamic
    const filesToModify = [
        path.join(appRouterDir, 'page.tsx'),
        path.join(appRouterDir, 'login', 'page.tsx'),
        path.join(appRouterDir, 'cobrador-app', 'page.tsx')
    ];

    filesToModify.forEach(file => {
        if (fs.existsSync(file)) {
            let content = fs.readFileSync(file, 'utf8');
            if (content.includes("// export const dynamic = 'force-dynamic';")) {
                content = content.replace(/\/\/ export const dynamic = 'force-dynamic';/g, "export const dynamic = 'force-dynamic';");
                fs.writeFileSync(file, content);
            }
        }
    });
}
