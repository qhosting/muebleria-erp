import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Comparte un documento PDF generado por jsPDF de forma nativa en Android/iOS.
 * Guarda el archivo temporalmente en la caché y lanza el diálogo nativo de compartición.
 * Retorna true si se compartió exitosamente de forma nativa, false si no es nativo o falló.
 */
export async function sharePdfNative(
    pdfDoc: any, 
    fileName: string, 
    title: string, 
    text: string
): Promise<boolean> {
    try {
        if (!Capacitor.isNativePlatform()) {
            return false;
        }

        // 1. Obtener la cadena en base64 del PDF generado por jsPDF
        const pdfDataUri = pdfDoc.output('datauristring');
        const base64Data = pdfDataUri.split(',')[1];

        // 2. Guardar el archivo temporalmente en la caché del dispositivo
        await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache
        });

        // 3. Obtener la URI nativa del archivo guardado
        const uriResult = await Filesystem.getUri({
            directory: Directory.Cache,
            path: fileName
        });

        // 4. Compartir usando el plugin nativo
        await Share.share({
            title: title,
            text: text,
            files: [uriResult.uri]
        });

        return true;
    } catch (error) {
        console.error('Error al compartir PDF de forma nativa:', error);
        return false;
    }
}
