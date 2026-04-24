const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ajuste de rutas basándose en que el script está en app/scripts/
// La carpeta de la aplicación Next.js está en app/app/
const rootDir = path.join(__dirname, '../');
const appRouterDir = path.join(rootDir, 'app');
const apiDir = path.join(appRouterDir, 'api');
const apiBackupDir = path.join(appRouterDir, '_api_backup');

console.log('🚀 Iniciando build nativo optimizado...');
console.log('📁 Directorio Root:', rootDir);

let apiOcultado = false;

try {
    // 1. "Ocultar" la carpeta API usando robocopy /MOVE (más robusto en Windows para evitar bloqueos)
    if (fs.existsSync(apiDir)) {
        console.log('📦 Ocultando carpeta API temporalmente para evitar errores de exportación estática...');
        try {
            // En Windows, robocopy es más fiable que fs.renameSync ante bloqueos de archivos
            execSync(`robocopy "${apiDir}" "${apiBackupDir}" /MOVE /S /R:1 /W:1`, { stdio: 'ignore' });
            apiOcultado = true;
        } catch (e) {
            // Robocopy devuelve códigos > 0 que execSync interpreta como error, pero a menudo significa éxito
            if (fs.existsSync(apiBackupDir)) {
                apiOcultado = true;
            } else {
                throw new Error('No se pudo mover la carpeta API. Asegúrate de que ningún proceso la esté usando.');
            }
        }
    }

    // 1.5 Ocultar force-dynamic para permitir exportación estática
    const filesToModify = [
        path.join(appRouterDir, 'page.tsx'),
        path.join(appRouterDir, 'login', 'page.tsx'),
        path.join(appRouterDir, 'dashboard', 'page.tsx')
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
    // 3. Restaurar la carpeta API siempre
    if (apiOcultado && fs.existsSync(apiBackupDir)) {
        console.log('🔙 Restaurando carpeta API para desarrollo/servidor...');
        try {
            execSync(`robocopy "${apiBackupDir}" "${apiDir}" /MOVE /S /R:1 /W:1`, { stdio: 'ignore' });
        } catch (e) {
            if (!fs.existsSync(apiDir)) {
                console.error('⚠️ No se pudo restaurar la carpeta API automáticamente. Por favor, renombra _api_backup a api manualmente.');
            }
        }
    }

    // 4. Restaurar force-dynamic
    const filesToModify = [
        path.join(appRouterDir, 'page.tsx'),
        path.join(appRouterDir, 'login', 'page.tsx'),
        path.join(appRouterDir, 'dashboard', 'page.tsx')
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
