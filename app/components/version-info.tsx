
'use client';

import { useState } from 'react';
import { getVersionInfo } from '@/lib/version';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Info, Smartphone, Calendar, Hash, Wifi, WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/use-network-status';

interface VersionInfoProps {
  compact?: boolean;
  showButton?: boolean;
}

export function VersionInfo({ compact = false, showButton = true }: VersionInfoProps) {
  const [open, setOpen] = useState(false);
  const versionInfo = getVersionInfo();
  const isOnline = useNetworkStatus();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (compact) {
    return (
      <Badge variant="secondary" className="text-xs">
        v{versionInfo.version}
      </Badge>
    );
  }

  if (!showButton) {
    return (
      <div className="text-xs text-muted-foreground">
        {versionInfo.displayName}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-blue-600" />
            Información de la App
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Estado de conexión */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm font-medium">
                Estado de conexión
              </span>
            </div>
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? "En línea" : "Sin conexión"}
            </Badge>
          </div>

          {/* Información de versión */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Versión</span>
              </div>
              <Badge variant="outline">
                {versionInfo.version}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Fecha de build</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatDate(versionInfo.buildDate)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Build</span>
              </div>
              <span className="text-sm font-mono text-muted-foreground">
                #{versionInfo.buildNumber}
              </span>
            </div>
          </div>

          {/* PWA Features */}
          <div className="pt-3 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Mueblería La Económica</strong><br />
              Sistema de Cobranza PWA<br />
              ✅ Funciona sin conexión<br />
              ✅ Instalable en móviles<br />
              ✅ Sincronización automática
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente compacto para footer
export function FooterVersion() {
  const versionInfo = getVersionInfo();
  
  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>
        Mueblería La Económica © 2025
      </span>
      <VersionInfo compact showButton={false} />
    </div>
  );
}
