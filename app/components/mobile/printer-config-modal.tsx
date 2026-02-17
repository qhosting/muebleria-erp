
// Modal de configuración de impresora Bluetooth
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bluetooth, 
  BluetoothConnected,
  BluetoothSearching,
  Printer,
  TestTube2,
  Settings,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';
import { useBluetoothPrinter } from '@/hooks/use-bluetooth-printer';

interface PrinterConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrinterConfigModal({ isOpen, onClose }: PrinterConfigModalProps) {
  const {
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
    printTestPage
  } = useBluetoothPrinter();

  const [isTesting, setIsTesting] = useState(false);

  const handleConnect = async () => {
    await connectToPrinter();
  };

  const handleReconnect = async () => {
    await reconnectToPrinter();
  };

  const handleDisconnect = async () => {
    await disconnectFromPrinter();
  };

  const handleTestPrint = async () => {
    setIsTesting(true);
    try {
      await printTestPage();
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Configurar Impresora
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Estado de Bluetooth */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bluetooth className="w-4 h-4" />
                Estado de Bluetooth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Disponibilidad
                </span>
                <Badge variant={isBluetoothAvailable ? 'default' : 'destructive'}>
                  {isBluetoothAvailable ? 'Disponible' : 'No Disponible'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {!isBluetoothAvailable && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg border-l-2 border-orange-400">
              <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800">
                <div className="font-medium">Bluetooth no disponible</div>
                <div className="text-xs mt-1">
                  Asegúrate de que tu dispositivo tenga Bluetooth y que el navegador lo soporte.
                </div>
              </div>
            </div>
          )}

          {/* 🔧 NUEVO: Mensaje de conexión previa */}
          {!isConnected && wasConnectedBefore && previousDeviceName && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border-l-2 border-blue-400">
              <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <div className="font-medium">Impresora desconectada</div>
                <div className="text-xs mt-1">
                  Última conexión: <strong>{previousDeviceName}</strong>. Presiona "Conectar Impresora" para reconectar.
                </div>
              </div>
            </div>
          )}

          {/* Estado de Conexión */}
          {isBluetoothAvailable && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {isConnected ? (
                    <BluetoothConnected className="w-4 h-4" />
                  ) : (
                    <BluetoothSearching className="w-4 h-4" />
                  )}
                  Estado de Impresora
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Conexión
                  </span>
                  <Badge variant={isConnected ? 'default' : 'secondary'}>
                    {isConnected ? 'Conectada' : 'Desconectada'}
                  </Badge>
                </div>

                {connectedDevice && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Dispositivo
                    </span>
                    <span className="text-sm font-medium">
                      {connectedDevice}
                    </span>
                  </div>
                )}

                <Separator />

                {/* Botones de conexión */}
                <div className="space-y-2">
                  {!isConnected ? (
                    <>
                      {canReconnect && (
                        <Button
                          onClick={handleReconnect}
                          disabled={isConnecting}
                          className="w-full"
                          variant="default"
                        >
                          {isConnecting ? (
                            <>
                              <BluetoothSearching className="w-4 h-4 mr-2 animate-pulse" />
                              Reconectando...
                            </>
                          ) : (
                            <>
                              <BluetoothConnected className="w-4 h-4 mr-2" />
                              Reconectar {previousDeviceName || 'Impresora'}
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        onClick={handleConnect}
                        disabled={isConnecting}
                        className="w-full"
                        variant={canReconnect ? "outline" : "default"}
                      >
                        {isConnecting ? (
                          <>
                            <BluetoothSearching className="w-4 h-4 mr-2 animate-pulse" />
                            Conectando...
                          </>
                        ) : (
                          <>
                            <Bluetooth className="w-4 h-4 mr-2" />
                            {canReconnect ? 'Conectar Otra Impresora' : 'Conectar Impresora'}
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        onClick={handleTestPrint}
                        disabled={isTesting}
                        variant="outline"
                        className="w-full"
                      >
                        {isTesting ? (
                          <>
                            <TestTube2 className="w-4 h-4 mr-2 animate-pulse" />
                            Imprimiendo...
                          </>
                        ) : (
                          <>
                            <TestTube2 className="w-4 h-4 mr-2" />
                            Imprimir Prueba
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={handleDisconnect}
                        variant="destructive"
                        className="w-full"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Desconectar
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instrucciones */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Instrucciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 flex items-center justify-center bg-primary/10 rounded-full text-primary text-[10px] font-bold flex-shrink-0">
                    1
                  </div>
                  <span>Enciende tu impresora Bluetooth y asegúrate de que esté en modo de emparejamiento</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 flex items-center justify-center bg-primary/10 rounded-full text-primary text-[10px] font-bold flex-shrink-0">
                    2
                  </div>
                  <span>Presiona "Conectar Impresora" y selecciona tu dispositivo de la lista</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 flex items-center justify-center bg-primary/10 rounded-full text-primary text-[10px] font-bold flex-shrink-0">
                    3
                  </div>
                  <span>Prueba la impresión antes de registrar pagos</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {isConnected && (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border-l-2 border-green-400">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div className="text-sm text-green-800">
                <div className="font-medium">Impresora lista</div>
                <div className="text-xs mt-1">
                  Ahora puedes imprimir tickets de pago automáticamente.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
