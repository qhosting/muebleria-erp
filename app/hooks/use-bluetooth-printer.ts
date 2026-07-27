
// Hook para manejar la impresora Bluetooth
'use client';

import { useState, useEffect } from 'react';
import { bluetoothPrinter, TicketData } from '@/lib/bluetooth-printer';
import { toast } from 'sonner';

export function useBluetoothPrinter() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [isBluetoothAvailable, setIsBluetoothAvailable] = useState(false);
  const [wasConnectedBefore, setWasConnectedBefore] = useState(false);
  const [previousDeviceName, setPreviousDeviceName] = useState<string | null>(null);
  const [canReconnect, setCanReconnect] = useState(false);

  useEffect(() => {
    const init = async () => {
      await checkBluetoothAvailability();
      await loadPreviousConnectionState();
      updateConnectionStatus();
    };
    init();
    
    // 🔧 Verificar estado cada 5 segundos
    const intervalId = setInterval(() => {
      updateConnectionStatus();
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, []);

  const checkBluetoothAvailability = async () => {
    const available = await bluetoothPrinter.isBluetoothAvailable();
    setIsBluetoothAvailable(available);
  };

  // 🔧 Cargar estado previo de conexión y auto-reconectar de forma silenciosa
  const loadPreviousConnectionState = async () => {
    const stored = bluetoothPrinter.getStoredConnectionInfo();
    const hasDevice = bluetoothPrinter.hasDeviceForReconnection();
    
    setWasConnectedBefore(stored.wasConnected);
    setPreviousDeviceName(stored.deviceName);
    setCanReconnect(hasDevice);
    
    if (stored.deviceId) {
      console.log(`ℹ️ Intentando reconectar automáticamente a impresora guardada: ${stored.deviceName}`);
      try {
        const success = await bluetoothPrinter.reconnectToPrinter();
        if (success) {
          updateConnectionStatus();
          toast.success(`Impresora reconectada automáticamente: ${stored.deviceName}`);
        }
      } catch (err) {
        console.log('🔇 Auto-reconexión silenciosa falló (la impresora podría estar apagada o fuera de rango).');
      }
    }
  };

  const updateConnectionStatus = () => {
    const connected = bluetoothPrinter.isConnected();
    const device = bluetoothPrinter.getConnectedDevice();
    const hasDevice = bluetoothPrinter.hasDeviceForReconnection();
    
    setIsConnected(connected);
    setConnectedDevice(device);
    setCanReconnect(hasDevice && !connected);
  };

  const connectToPrinter = async (): Promise<boolean> => {
    if (!isBluetoothAvailable) {
      toast.error('Bluetooth no está disponible');
      return false;
    }

    setIsConnecting(true);

    try {
      const success = await bluetoothPrinter.connectToPrinter();
      
      if (success) {
        updateConnectionStatus();
        toast.success('Impresora conectada exitosamente');
        return true;
      }
      
      return false;
    } catch (error: any) {
      const message = error.message || 'Error conectando a la impresora';
      
      if (message.toLowerCase().includes('permission denied') || message.toLowerCase().includes('denegados')) {
        toast.error('Permisos de Bluetooth denegados. Por favor, revisa la configuración de permisos de la aplicación o tu navegador.');
      } else if (message.includes('User cancelled')) {
        toast.error('Cancelaste la selección de impresora.');
      } else {
        toast.error(message);
      }
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  // 🆕 NUEVO: Reconectar a la última impresora
  const reconnectToPrinter = async (): Promise<boolean> => {
    if (!isBluetoothAvailable) {
      toast.error('Bluetooth no está disponible');
      return false;
    }

    setIsConnecting(true);

    try {
      const success = await bluetoothPrinter.reconnectToPrinter();
      
      if (success) {
        updateConnectionStatus();
        toast.success('Impresora reconectada exitosamente');
        return true;
      }
      
      toast.error('No se pudo reconectar de forma automática. Por favor, vuelve a vincular la impresora.');
      return false;
    } catch (error: any) {
      const message = error.message || 'Error reconectando a la impresora';
      toast.error(message);
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectFromPrinter = async () => {
    try {
      await bluetoothPrinter.disconnect();
      updateConnectionStatus();
      toast.success('Impresora desconectada');
    } catch (error: any) {
      toast.error('Error desconectando impresora');
    }
  };

  const forgetPrinter = () => {
    bluetoothPrinter.forgetPrinter();
    updateConnectionStatus();
    setWasConnectedBefore(false);
    setPreviousDeviceName(null);
    setCanReconnect(false);
    toast.success('Impresora olvidada (borrada)');
  };

  const printTicket = async (ticketData: TicketData): Promise<boolean> => {
    if (!isConnected) {
      toast.error('Impresora no conectada');
      return false;
    }

    try {
      await bluetoothPrinter.printTicket(ticketData);
      toast.success('Ticket impreso exitosamente');
      return true;
    } catch (error: any) {
      const message = error.message || 'Error imprimiendo ticket';
      toast.error(message);
      return false;
    }
  };

  const printTestPage = async (): Promise<boolean> => {
    if (!isConnected) {
      toast.error('Impresora no conectada');
      return false;
    }

    try {
      await bluetoothPrinter.printTestPage();
      toast.success('Página de prueba impresa');
      return true;
    } catch (error: any) {
      toast.error('Error en prueba de impresión');
      return false;
    }
  };

  const printCollectionReport = async (stats: { 
    cobradoHoy: number, 
    efectivo: number, 
    bancarioManual: number, 
    bancarioBot: number,
    cuentasTotales: number,
    cuentasEfectivo: number,
    cuentasBancarioManual: number,
    cuentasBancarioBot: number,
    dp?: any,
    dq?: any
  }, pagos: any[], range?: { from: string, to: string }): Promise<boolean> => {
    if (!isConnected) {
      toast.error('Impresora no conectada');
      return false;
    }

    try {
      await bluetoothPrinter.printCollectionReport(stats, pagos, range);
      toast.success('Reporte impreso exitosamente');
      return true;
    } catch (error: any) {
      const message = error.message || 'Error imprimiendo reporte';
      toast.error(message);
      return false;
    }
  };

  const printCollectionNotice = async (cliente: any): Promise<boolean> => {
    if (!isConnected) {
      toast.error('Impresora no conectada');
      return false;
    }

    try {
      await bluetoothPrinter.printCollectionNotice(cliente);
      toast.success('Aviso de cobro impreso');
      return true;
    } catch (error: any) {
      const message = error.message || 'Error imprimiendo aviso';
      toast.error(message);
      return false;
    }
  };

  const printArqueo = async (data: { sistema: number, fisico: number, diferencia: number }): Promise<boolean> => {
    if (!isConnected) {
      toast.error('Impresora no conectada');
      return false;
    }

    try {
      await bluetoothPrinter.printArqueo(data);
      toast.success('Comprobante de arqueo impreso');
      return true;
    } catch (error: any) {
      toast.error('Error imprimiendo arqueo');
      return false;
    }
  };

  const printConvenio = async (convenio: any): Promise<boolean> => {
    if (!isConnected) {
      toast.error('Impresora no conectada');
      return false;
    }

    try {
      await bluetoothPrinter.printConvenio(convenio);
      toast.success('Convenio impreso exitosamente');
      return true;
    } catch (error: any) {
      const message = error.message || 'Error imprimiendo convenio';
      toast.error(message);
      return false;
    }
  };

  return {
    isConnected,
    isConnecting,
    connectedDevice,
    isBluetoothAvailable,
    wasConnectedBefore,
    previousDeviceName,
    canReconnect,
    connectToPrinter,
    reconnectToPrinter,
    disconnectFromPrinter,
    printTicket,
    printCollectionReport,
    printCollectionNotice,
    printArqueo,
    printConvenio,
    printTestPage,
    updateConnectionStatus,
    forgetPrinter
  };
}
