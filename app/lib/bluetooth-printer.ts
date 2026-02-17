
// Servicio de impresión por Bluetooth para tickets de cobranza
'use client';

// Definiciones de tipos para Web Bluetooth API
declare global {
  interface Navigator {
    bluetooth: Bluetooth;
  }

  interface Bluetooth {
    requestDevice(options: WebBluetoothRequestDeviceOptions): Promise<WebBluetoothDevice>;
  }

  interface WebBluetoothRequestDeviceOptions {
    filters?: WebBluetoothLEScanFilter[];
    optionalServices?: WebBluetoothServiceUUID[];
    acceptAllDevices?: boolean;
  }

  interface WebBluetoothLEScanFilter {
    services?: WebBluetoothServiceUUID[];
    name?: string;
    namePrefix?: string;
  }

  interface WebBluetoothDevice {
    id: string;
    name?: string;
    gatt?: WebBluetoothRemoteGATTServer;
    addEventListener(type: 'gattserverdisconnected', listener: () => void): void;
  }

  interface WebBluetoothRemoteGATTServer {
    device: WebBluetoothDevice;
    connected: boolean;
    connect(): Promise<WebBluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: WebBluetoothServiceUUID): Promise<WebBluetoothRemoteGATTService>;
  }

  interface WebBluetoothRemoteGATTService {
    device: WebBluetoothDevice;
    isPrimary: boolean;
    uuid: string;
    getCharacteristic(characteristic: WebBluetoothServiceUUID): Promise<WebBluetoothRemoteGATTCharacteristic>;
  }

  interface WebBluetoothRemoteGATTCharacteristic {
    service: WebBluetoothRemoteGATTService;
    uuid: string;
    value?: DataView;
    writeValue(value: BufferSource): Promise<void>;
  }

  type WebBluetoothServiceUUID = string;
}

export interface PrinterConnection {
  device: WebBluetoothDevice | null;
  server: WebBluetoothRemoteGATTServer | null;
  service: WebBluetoothRemoteGATTService | null;
  characteristic: WebBluetoothRemoteGATTCharacteristic | null;
  isConnected: boolean;
}

export interface TicketData {
  numeroRecibo?: string;
  cliente: {
    nombreCompleto: string;
    telefono?: string;
    direccion: string;
    diaPago: string;
  };
  cobrador: {
    nombre: string;
    id: string;
  };
  pago: {
    monto: number;
    tipoPago: string;
    metodoPago: string;
    concepto?: string;
    fechaPago: string;
  };
  saldos: {
    anterior: number;
    nuevo: number;
  };
  empresa: {
    nombre: string;
    direccion?: string;
    telefono?: string;
  };
}

class BluetoothPrinterService {
  private connection: PrinterConnection = {
    device: null,
    server: null,
    service: null,
    characteristic: null,
    isConnected: false
  };

  private readonly SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
  private readonly CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

  // 🔧 Storage keys para persistencia
  private readonly STORAGE_KEY_CONNECTED = 'bluetooth_printer_connected';
  private readonly STORAGE_KEY_DEVICE_NAME = 'bluetooth_printer_device_name';
  private readonly STORAGE_KEY_DEVICE_ID = 'bluetooth_printer_device_id';

  // 🆕 Variable para reconexión automática
  private lastConnectedDeviceId: string | null = null;

  // Comandos ESC/POS básicos
  private readonly ESC = '\x1b';
  private readonly LF = '\x0a';
  private readonly CR = '\x0d';
  private readonly FF = '\x0c';
  private readonly GS = '\x1d';

  // Comandos de formato
  private readonly COMMANDS = {
    INIT: this.ESC + '@',
    BOLD_ON: this.ESC + 'E' + '\x01',
    BOLD_OFF: this.ESC + 'E' + '\x00',
    CENTER: this.ESC + 'a' + '\x01',
    LEFT: this.ESC + 'a' + '\x00',
    RIGHT: this.ESC + 'a' + '\x02',
    CUT: this.GS + 'V' + '\x42' + '\x00',
    FEED: this.LF + this.LF + this.LF,
    UNDERLINE_ON: this.ESC + '-' + '\x01',
    UNDERLINE_OFF: this.ESC + '-' + '\x00',
  };

  async isBluetoothAvailable(): Promise<boolean> {
    return 'bluetooth' in navigator && 'requestDevice' in (navigator.bluetooth as any);
  }

  // 🔧 Guardar estado de conexión en localStorage
  private saveConnectionState(connected: boolean, deviceName?: string, deviceId?: string): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.STORAGE_KEY_CONNECTED, connected.toString());
      if (connected && deviceName) {
        localStorage.setItem(this.STORAGE_KEY_DEVICE_NAME, deviceName);
      }
      if (connected && deviceId) {
        localStorage.setItem(this.STORAGE_KEY_DEVICE_ID, deviceId);
        this.lastConnectedDeviceId = deviceId;
      }

      if (!connected) {
        // No borrar el nombre del dispositivo, solo marcarlo como desconectado
        // Así el usuario sabe qué impresora reconectar
        localStorage.setItem(this.STORAGE_KEY_CONNECTED, 'false');
      }
    } catch (error) {
      console.error('Error guardando estado de conexión:', error);
    }
  }

  // 🔧 Cargar estado de conexión desde localStorage
  private loadConnectionState(): { wasConnected: boolean; deviceName: string | null; deviceId: string | null } {
    if (typeof window === 'undefined') {
      return { wasConnected: false, deviceName: null, deviceId: null };
    }

    try {
      const wasConnected = localStorage.getItem(this.STORAGE_KEY_CONNECTED) === 'true';
      const deviceName = localStorage.getItem(this.STORAGE_KEY_DEVICE_NAME);
      const deviceId = localStorage.getItem(this.STORAGE_KEY_DEVICE_ID);

      if (deviceId) {
        this.lastConnectedDeviceId = deviceId;
      }

      return { wasConnected, deviceName, deviceId };
    } catch (error) {
      console.error('Error cargando estado de conexión:', error);
      return { wasConnected: false, deviceName: null, deviceId: null };
    }
  }

  // 🔧 NUEVO: Verificar estado real de conexión GATT
  private checkRealConnectionStatus(): boolean {
    if (!this.connection.device || !this.connection.server) {
      return false;
    }

    // Verificar si el servidor GATT está realmente conectado
    return this.connection.server.connected === true;
  }

  async connectToPrinter(): Promise<boolean> {
    try {
      if (!await this.isBluetoothAvailable()) {
        throw new Error('Bluetooth no está disponible en este dispositivo');
      }

      // Buscar dispositivos Bluetooth
      this.connection.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [this.SERVICE_UUID] },
          { namePrefix: 'POS' },
          { namePrefix: 'Printer' },
          { namePrefix: 'RP' },
          { namePrefix: 'MTP' }
        ],
        optionalServices: ['battery_service', 'device_information']
      });

      if (!this.connection.device) {
        throw new Error('No se seleccionó ningún dispositivo');
      }

      // Conectar al servidor GATT
      if (!this.connection.device.gatt) {
        throw new Error('GATT no disponible en el dispositivo');
      }

      this.connection.server = await this.connection.device.gatt.connect();

      if (!this.connection.server) {
        throw new Error('No se pudo conectar al servidor GATT');
      }

      // Obtener el servicio
      this.connection.service = await this.connection.server.getPrimaryService(this.SERVICE_UUID);

      // Obtener la característica
      this.connection.characteristic = await this.connection.service.getCharacteristic(this.CHARACTERISTIC_UUID);

      this.connection.isConnected = true;

      // 🔧 MEJORADO: Guardar estado con ID y nombre del dispositivo
      this.saveConnectionState(true, this.connection.device.name, this.connection.device.id);

      // Listener para desconexión
      this.connection.device.addEventListener('gattserverdisconnected', () => {
        console.log('⚠️ Impresora desconectada (evento GATT)');
        this.connection.isConnected = false;
        this.saveConnectionState(false);
      });

      console.log('✅ Impresora conectada:', this.connection.device.name);
      return true;
    } catch (error) {
      console.error('❌ Error conectando a impresora:', error);
      this.connection.isConnected = false;
      this.saveConnectionState(false);
      throw error;
    }
  }

  // 🆕 NUEVO: Reconectar a la última impresora guardada
  async reconnectToPrinter(): Promise<boolean> {
    try {
      // Si ya hay un dispositivo conectado, solo reconectar GATT
      if (this.connection.device && !this.connection.isConnected) {
        console.log('🔄 Intentando reconectar a:', this.connection.device.name);

        if (!this.connection.device.gatt) {
          throw new Error('GATT no disponible en el dispositivo');
        }

        this.connection.server = await this.connection.device.gatt.connect();

        if (!this.connection.server) {
          throw new Error('No se pudo conectar al servidor GATT');
        }

        this.connection.service = await this.connection.server.getPrimaryService(this.SERVICE_UUID);
        this.connection.characteristic = await this.connection.service.getCharacteristic(this.CHARACTERISTIC_UUID);
        this.connection.isConnected = true;

        this.saveConnectionState(true, this.connection.device.name, this.connection.device.id);

        console.log('✅ Impresora reconectada:', this.connection.device.name);
        return true;
      }

      // Si no hay dispositivo guardado, hacer conexión normal
      return await this.connectToPrinter();

    } catch (error) {
      console.error('❌ Error reconectando a impresora:', error);
      this.connection.isConnected = false;
      this.saveConnectionState(false);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection.device && this.connection.isConnected) {
      this.connection.server?.disconnect();
      this.connection.isConnected = false;
      this.saveConnectionState(false);
      console.log('🔌 Impresora desconectada manualmente');
    }
  }

  // 🔧 MEJORADO: Verificar estado real de conexión
  isConnected(): boolean {
    // Primero verificar el estado local
    if (!this.connection.isConnected) {
      return false;
    }

    // Verificar el estado real del servidor GATT
    const realStatus = this.checkRealConnectionStatus();

    // Si hay discrepancia, actualizar el estado
    if (realStatus !== this.connection.isConnected) {
      console.log('⚠️ Estado de conexión actualizado:', realStatus);
      this.connection.isConnected = realStatus;
      this.saveConnectionState(realStatus, realStatus ? this.connection.device?.name : undefined);
    }

    return this.connection.isConnected;
  }

  getConnectedDevice(): string | null {
    // Verificar estado real antes de retornar el dispositivo
    if (!this.isConnected()) {
      return null;
    }
    return this.connection.device?.name || null;
  }

  // 🔧 Método para obtener información del estado guardado
  getStoredConnectionInfo(): { wasConnected: boolean; deviceName: string | null; deviceId: string | null } {
    return this.loadConnectionState();
  }

  // 🆕 NUEVO: Verificar si hay un dispositivo guardado para reconexión
  hasDeviceForReconnection(): boolean {
    return this.connection.device !== null || this.lastConnectedDeviceId !== null;
  }

  private async sendData(data: string): Promise<void> {
    if (!this.connection.characteristic || !this.connection.isConnected) {
      throw new Error('Impresora no conectada');
    }

    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(data);

    // Dividir en chunks para evitar problemas con MTU
    const chunkSize = 20;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      await this.connection.characteristic.writeValue(chunk);
      // Pequeña pausa entre chunks
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private getDayName(dayNumber: string): string {
    const days: { [key: string]: string } = {
      '1': 'LUNES',
      '2': 'MARTES',
      '3': 'MIÉRCOLES',
      '4': 'JUEVES',
      '5': 'VIERNES',
      '6': 'SÁBADO',
      '7': 'DOMINGO'
    };
    return days[dayNumber] || dayNumber;
  }

  private centerText(text: string, width: number = 32): string {
    if (text.length >= width) return text;
    const padding = Math.floor((width - text.length) / 2);
    return ' '.repeat(padding) + text;
  }

  private rightAlignText(text: string, width: number = 32): string {
    if (text.length >= width) return text;
    return ' '.repeat(width - text.length) + text;
  }

  private createDivider(char: string = '-', length: number = 32): string {
    return char.repeat(length);
  }

  async printTicket(ticketData: TicketData): Promise<void> {
    if (!this.connection.isConnected) {
      throw new Error('Impresora no conectada');
    }

    try {
      let ticket = '';

      // Inicializar impresora
      ticket += this.COMMANDS.INIT;

      // Encabezado de empresa
      ticket += this.COMMANDS.CENTER;
      ticket += this.COMMANDS.BOLD_ON;
      ticket += ticketData.empresa.nombre.toUpperCase() + this.LF;
      ticket += this.COMMANDS.BOLD_OFF;

      if (ticketData.empresa.direccion) {
        ticket += ticketData.empresa.direccion + this.LF;
      }
      if (ticketData.empresa.telefono) {
        ticket += 'Tel: ' + ticketData.empresa.telefono + this.LF;
      }

      // Separador
      ticket += this.COMMANDS.LEFT;
      ticket += this.createDivider() + this.LF;

      // Título
      ticket += this.COMMANDS.CENTER;
      ticket += this.COMMANDS.BOLD_ON;
      ticket += 'COMPROBANTE DE PAGO' + this.LF;
      ticket += this.COMMANDS.BOLD_OFF;

      if (ticketData.numeroRecibo) {
        ticket += 'No. ' + ticketData.numeroRecibo + this.LF;
      }

      // Separador
      ticket += this.COMMANDS.LEFT;
      ticket += this.createDivider() + this.LF;

      // Información del cliente
      ticket += this.COMMANDS.BOLD_ON;
      ticket += 'CLIENTE:' + this.LF;
      ticket += this.COMMANDS.BOLD_OFF;
      ticket += ticketData.cliente.nombreCompleto + this.LF;

      if (ticketData.cliente.telefono) {
        ticket += 'Tel: ' + ticketData.cliente.telefono + this.LF;
      }

      ticket += 'Dir: ' + ticketData.cliente.direccion + this.LF;
      ticket += 'Dia Pago: ' + this.getDayName(ticketData.cliente.diaPago) + this.LF;

      // Separador
      ticket += this.createDivider() + this.LF;

      // Información del pago
      ticket += this.COMMANDS.BOLD_ON;
      ticket += 'DETALLE DEL PAGO:' + this.LF;
      ticket += this.COMMANDS.BOLD_OFF;

      ticket += 'Fecha: ' + this.formatDate(ticketData.pago.fechaPago) + this.LF;
      ticket += 'Tipo: ' + ticketData.pago.tipoPago.toUpperCase() + this.LF;
      ticket += 'Metodo: ' + ticketData.pago.metodoPago.toUpperCase() + this.LF;

      if (ticketData.pago.concepto) {
        ticket += 'Concepto: ' + ticketData.pago.concepto + this.LF;
      }

      // Separador
      ticket += this.createDivider() + this.LF;

      // Importes
      ticket += this.COMMANDS.BOLD_ON;
      ticket += 'IMPORTES:' + this.LF;
      ticket += this.COMMANDS.BOLD_OFF;

      ticket += 'Saldo Anterior:' + this.rightAlignText(this.formatCurrency(ticketData.saldos.anterior)) + this.LF;
      ticket += 'Pago Recibido:' + this.rightAlignText(this.formatCurrency(ticketData.pago.monto)) + this.LF;
      ticket += this.createDivider() + this.LF;
      ticket += this.COMMANDS.BOLD_ON;
      ticket += 'Saldo Actual:' + this.rightAlignText(this.formatCurrency(ticketData.saldos.nuevo)) + this.LF;
      ticket += this.COMMANDS.BOLD_OFF;

      // Estado del cliente
      if (ticketData.saldos.nuevo <= 0) {
        ticket += this.LF;
        ticket += this.COMMANDS.CENTER;
        ticket += this.COMMANDS.BOLD_ON;
        ticket += '*** CLIENTE AL DIA ***' + this.LF;
        ticket += this.COMMANDS.BOLD_OFF;
      }

      // Separador
      ticket += this.COMMANDS.LEFT;
      ticket += this.createDivider() + this.LF;

      // Información del cobrador
      ticket += 'Cobrador: ' + ticketData.cobrador.nombre + this.LF;
      ticket += 'ID: ' + ticketData.cobrador.id + this.LF;

      // Separador final
      ticket += this.createDivider() + this.LF;

      // Mensaje final
      ticket += this.COMMANDS.CENTER;
      ticket += 'GRACIAS POR SU PAGO' + this.LF;
      ticket += this.formatDate(new Date().toISOString()) + this.LF;

      // Alimentar papel y cortar
      ticket += this.COMMANDS.FEED;
      ticket += this.COMMANDS.CUT;

      // Enviar a imprimir
      await this.sendData(ticket);

      console.log('Ticket impreso exitosamente');

    } catch (error) {
      console.error('Error imprimiendo ticket:', error);
      throw error;
    }
  }

  async printTestPage(): Promise<void> {
    if (!this.connection.isConnected) {
      throw new Error('Impresora no conectada');
    }

    try {
      let ticket = '';

      ticket += this.COMMANDS.INIT;
      ticket += this.COMMANDS.CENTER;
      ticket += this.COMMANDS.BOLD_ON;
      ticket += 'PRUEBA DE IMPRESION' + this.LF;
      ticket += this.COMMANDS.BOLD_OFF;
      ticket += this.createDivider() + this.LF;
      ticket += this.COMMANDS.LEFT;
      ticket += 'Fecha: ' + new Date().toLocaleString() + this.LF;
      ticket += 'Dispositivo: ' + (this.connection.device?.name || 'Desconocido') + this.LF;
      ticket += 'Estado: Conectado' + this.LF;
      ticket += this.createDivider() + this.LF;
      ticket += this.COMMANDS.CENTER;
      ticket += 'Prueba exitosa' + this.LF;
      ticket += this.COMMANDS.FEED;
      ticket += this.COMMANDS.CUT;

      await this.sendData(ticket);

    } catch (error) {
      console.error('Error en prueba de impresión:', error);
      throw error;
    }
  }
}

// Instancia singleton del servicio
export const bluetoothPrinter = new BluetoothPrinterService();
