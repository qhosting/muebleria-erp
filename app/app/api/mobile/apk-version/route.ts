import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Obtenemos los valores desde variables de entorno o valores por defecto
        const versionCode = parseInt(process.env.LATEST_APK_VERSION_CODE || '45', 10);
        const versionName = process.env.LATEST_APK_VERSION_NAME || '2.9.41';
        const minVersionCode = parseInt(process.env.MIN_APK_VERSION_CODE || '40', 10);
        const apkUrl = process.env.LATEST_APK_URL || '/CobranzaDASO.apk';
        const fileSize = process.env.LATEST_APK_FILE_SIZE || '9.1 MB';
        const isMandatory = process.env.LATEST_APK_MANDATORY === 'true';
        const requireWifi = process.env.LATEST_APK_REQUIRE_WIFI !== 'false'; // Por defecto requiere WiFi

        let releaseNotes: string[] = [
            'Botón de actualización directa de APK desde Mi Perfil.',
            'Optimización en sincronización y cobranza offline.',
            'Mayor estabilidad de conexión en ruta y mejoras generales.',
        ];

        if (process.env.LATEST_APK_RELEASE_NOTES) {
            try {
                if (process.env.LATEST_APK_RELEASE_NOTES.startsWith('[')) {
                    releaseNotes = JSON.parse(process.env.LATEST_APK_RELEASE_NOTES);
                } else {
                    releaseNotes = process.env.LATEST_APK_RELEASE_NOTES.split('|').map(s => s.trim());
                }
            } catch (e) {
                // Mantener notas por defecto si falla el parseo
            }
        }

        return NextResponse.json({
            success: true,
            versionCode,
            versionName,
            minVersionCode,
            apkUrl,
            fileSize,
            isMandatory,
            requireWifi,
            timestamp: Date.now()
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: 'Error al obtener versión de APK' },
            { status: 500 }
        );
    }
}
