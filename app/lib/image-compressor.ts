/**
 * Utilidad premium para compresión de imágenes en el cliente (navegador/dispositivo móvil)
 * antes de subirlas al servidor para prevenir desconexiones (ECONNRESET/Aborted)
 * y ahorrar masivamente ancho de banda y almacenamiento en disco.
 */
export function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.7): Promise<File> {
    return new Promise((resolve) => {
        // Solo comprimimos imágenes. Si es PDF u otro formato, lo dejamos pasar intacto.
        if (!file.type.startsWith('image/')) {
            resolve(file);
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Redimensionar manteniendo aspecto proporcional
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(file);
                    return;
                }

                // Dibujar en el canvas
                ctx.drawImage(img, 0, 0, width, height);

                // Convertir canvas a Blob JPEG con calidad ajustada
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            resolve(file);
                            return;
                        }
                        
                        // Generar el nuevo archivo comprimido conservando el nombre original
                        // pero forzando extensión jpeg para máxima compatibilidad
                        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                        const compressedFile = new File([blob], `${baseName}.jpg`, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        
                        console.log(`[Compresión] Original: ${(file.size / 1024 / 1024).toFixed(2)}MB | Comprimido: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
                        resolve(compressedFile);
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
    });
}
