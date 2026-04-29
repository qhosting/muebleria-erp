import { Capacitor } from '@capacitor/core';
import { CapacitorSms } from '@byteowls/capacitor-sms';
import { toast } from 'sonner';

/**
 * Wrapper para envío de SMS nativos usando el plugin @byteowls/capacitor-sms
 * 
 * Nota: Este plugin abre la aplicación de mensajería predeterminada con
 * el número y el texto pre-cargados. El usuario debe presionar "Enviar".
 */
export async function sendNativeSMS(phoneNumber: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (!Capacitor.isNativePlatform()) {
    console.log('--- MODO WEB: Simulando envío de SMS ---');
    console.log(`Para: ${phoneNumber}`);
    console.log(`Mensaje: ${message}`);
    return { success: true };
  }

  try {
    // Limpiar número de teléfono
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    
    await CapacitorSms.send({
      numbers: [cleanPhone],
      text: message,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error enviando SMS nativo:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al abrir SMS';
    return { success: false, error: errorMessage };
  }
}

/**
 * Verifica si la plataforma soporta envío de SMS
 */
export function canSendSMS(): boolean {
  return Capacitor.isNativePlatform();
}
